// Inti pembelian kursus: reservasi harga/promo, pemenuhan enrollment, dan pelepasan reservasi.
// Semua fungsi berjalan di dalam transaksi pemanggil (tx).
import { and, eq, gt, isNull, lte, sql } from "drizzle-orm";
import { courseDiscounts, discountRedemptions, enrollments } from "../schema/schema";
import { issueCard, notifyUser } from "./cards";
import { bestAutoDiscount, isDiscountActive, quotePrice, type PriceQuote } from "@shared/pricing";

export const PROMO_INVALID = "PROMO_INVALID";
export const PRICE_CHANGED = "PRICE_CHANGED";

type Tx = any;
type CourseLike = { id: string; price: number };

/**
 * Menghitung harga efektif lalu memakai (mereservasi) satu pemakaian diskon bila ada: kuota naik atomik dan
 * satu baris pemakaian per akun. Melempar PROMO_INVALID / PRICE_CHANGED.
 */
export const reservePrice = async (tx: Tx, course: CourseLike, userId: string, promoCode: string, expectedPrice: number | null, now = new Date()): Promise<PriceQuote> => {
  const autos = await tx.select().from(courseDiscounts).where(and(eq(courseDiscounts.courseId, course.id), eq(courseDiscounts.kind, "AUTO")));
  let codeDiscount: typeof courseDiscounts.$inferSelect | null = null;
  if (promoCode) {
    const [d] = await tx.select().from(courseDiscounts).where(and(eq(courseDiscounts.courseId, course.id), eq(courseDiscounts.code, promoCode))).for("update").limit(1);
    const [used] = d ? await tx.select({ id: discountRedemptions.id }).from(discountRedemptions).where(and(eq(discountRedemptions.discountId, d.id), eq(discountRedemptions.userId, userId))).limit(1) : [];
    if (!d || used || !isDiscountActive(d, now)) throw new Error(PROMO_INVALID);
    codeDiscount = d;
  }
  const quote = quotePrice(course.price, bestAutoDiscount(autos, now), codeDiscount);
  if (expectedPrice !== null && expectedPrice !== quote.finalPrice) throw new Error(PRICE_CHANGED);

  if (quote.discountId) {
    const taken = await tx
      .update(courseDiscounts)
      .set({ redemptionCount: sql`${courseDiscounts.redemptionCount} + 1` })
      .where(and(
        eq(courseDiscounts.id, quote.discountId),
        isNull(courseDiscounts.cancelledAt),
        lte(courseDiscounts.startsAt, now),
        gt(courseDiscounts.endsAt, now),
        sql`(${courseDiscounts.maxRedemptions} is null or ${courseDiscounts.redemptionCount} < ${courseDiscounts.maxRedemptions})`,
      ))
      .returning({ id: courseDiscounts.id });
    if (taken.length === 0) throw new Error(quote.viaCode ? PROMO_INVALID : PRICE_CHANGED);
    await tx.insert(discountRedemptions).values({ discountId: quote.discountId, userId, courseId: course.id, amountPaid: quote.finalPrice });
  }
  return quote;
};

/** Mengembalikan reservasi diskon (order batal/kedaluwarsa/ditolak) agar kuota tidak hilang sia-sia. */
export const releaseReservation = async (tx: Tx, discountId: string | null, userId: string): Promise<void> => {
  if (!discountId) return;
  const removed = await tx.delete(discountRedemptions).where(and(eq(discountRedemptions.discountId, discountId), eq(discountRedemptions.userId, userId))).returning({ id: discountRedemptions.id });
  if (removed.length > 0) {
    await tx.update(courseDiscounts).set({ redemptionCount: sql`greatest(${courseDiscounts.redemptionCount} - 1, 0)` }).where(eq(courseDiscounts.id, discountId));
  }
};

export interface FulfillInput {
  userId: string;
  role: string;
  courseId: string;
  basePrice: number;
  discountPercent: number;
  discountId: string | null;
  amountPaid: number;
}

/** Membuat enrollment dengan salinan harga, dan menerbitkan kartu student pada kursus pertama. Null bila sudah terdaftar. */
export const fulfillCourse = async (tx: Tx, f: FulfillInput): Promise<{ enrollmentId: string; cardNumber: string | null } | null> => {
  const [enr] = await tx
    .insert(enrollments)
    .values({ userId: f.userId, courseId: f.courseId, basePrice: f.basePrice, discountPercent: f.discountPercent, discountId: f.discountId, amountPaid: f.amountPaid })
    .onConflictDoNothing()
    .returning({ id: enrollments.id });
  if (!enr) return null;
  let cardNumber: string | null = null;
  if (f.role === "STUDENT") {
    const card = await issueCard(tx, f.userId, null);
    if (card) {
      cardNumber = card.cardNumber;
      await notifyUser(tx, f.userId, "Kartu Student Anda terbit", `Nomor kartu Anda ${card.cardNumber}.`, "AKUN");
    }
  }
  return { enrollmentId: enr.id, cardNumber };
};
