
import { successResponse, errorResponse } from "../utils/response";
import { db } from "../db";
import { enrollments, wishlists, courses, users, transactions, bankAccounts, notifications } from "../schema/schema";
import { eq, and, desc, sql, gte } from "drizzle-orm";
import { PRICE_CHANGED, PROMO_INVALID, fulfillCourse, reservePrice } from "../lib/enrollment";
import { PAYMENTS_ENABLED, PAYMENTS_CLOSED_MESSAGE } from "../lib/payments";
import { normalizeCode } from "@shared/pricing";
import { PROMO_INVALID_MESSAGE } from "./pricingController";

// --- ENROLLMENT ---
export const enrollCourse = async (req: any, res: any) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;
    const promoCode = normalizeCode(req.body?.promoCode);
    const expectedPrice = Number.isInteger(req.body?.expectedPrice) ? (req.body.expectedPrice as number) : null;

    const course = await db.query.courses.findFirst({
        where: (courses, { eq }) => eq(courses.id, courseId)
    });

    if (!course || course.status !== "PUBLISHED") return errorResponse(res, "Kursus tidak ditemukan", 404);

    // Pembelian dari dompet Academy dalam satu transaksi: harga efektif, promo, potong saldo, enrollment, kartu.
    const result = await db.transaction(async (tx) => {
        const existing = await tx.select({ id: enrollments.id }).from(enrollments)
            .where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, course.id))).limit(1);
        if (existing.length > 0) return { already: true as const };

        const quote = await reservePrice(tx, course, userId, promoCode, expectedPrice);

        if (quote.finalPrice > 0) {
            // Saldo dipotong secara atomik dan tidak boleh minus.
            const debited = await tx.update(users)
                .set({ walletBalance: sql`${users.walletBalance} - ${quote.finalPrice}` })
                .where(and(eq(users.id, userId), gte(users.walletBalance, quote.finalPrice)))
                .returning({ id: users.id });
            if (debited.length === 0) throw new Error("INSUFFICIENT_BALANCE");

            await tx.insert(transactions).values({
                userId,
                amount: quote.finalPrice,
                type: "DEBIT",
                status: "SUCCESS",
                description: quote.percent > 0 ? `Pembelian Kursus: ${course.title} (diskon ${quote.percent}%)` : `Pembelian Kursus: ${course.title}`,
                referenceId: course.id
            });
        }

        const done = await fulfillCourse(tx, {
            userId, role: req.user.role, courseId, basePrice: quote.basePrice, discountPercent: quote.percent,
            discountId: quote.discountId, amountPaid: quote.finalPrice,
        });
        if (!done) return { already: true as const };
        return { already: false as const, card: done.cardNumber ? { cardNumber: done.cardNumber } : null, paid: quote.finalPrice };
    });

    if (result.already) return errorResponse(res, "Anda sudah mengikuti kursus ini", 409);

    successResponse(res, { cardNumber: result.card?.cardNumber ?? null, amountPaid: result.paid }, "Berhasil mengikuti kursus", 201);
  } catch (error: any) {
    if (error?.message === "INSUFFICIENT_BALANCE") return errorResponse(res, "Saldo tidak mencukupi.", 400);
    if (error?.message === PROMO_INVALID) return errorResponse(res, PROMO_INVALID_MESSAGE, 400);
    if (error?.message === PRICE_CHANGED) return errorResponse(res, "Harga kursus berubah. Muat ulang halaman lalu coba lagi.", 409);
    errorResponse(res, "Gagal mengikuti kursus", 500, error);
  }
};

export const getMyCourses = async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    // Join Enrollment with Course
    const myCourses = await db.select({
        enrollment: enrollments,
        course: courses
    })
    .from(enrollments)
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .where(eq(enrollments.userId, userId));

    successResponse(res, myCourses, "My courses");
  } catch (error) {
    errorResponse(res, "Failed to fetch enrolled courses", 500, error);
  }
};

// --- WISHLIST ---
export const getMyWishlist = async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        const myWishlist = await db.select({
            id: wishlists.id,
            addedAt: wishlists.createdAt,
            course: courses
        })
        .from(wishlists)
        .innerJoin(courses, eq(wishlists.courseId, courses.id))
        .where(eq(wishlists.userId, userId))
        .orderBy(desc(wishlists.createdAt));

        successResponse(res, myWishlist, "User Wishlist");
    } catch (error) {
        errorResponse(res, "Failed to fetch wishlist", 500, error);
    }
};

export const toggleWishlist = async (req: any, res: any) => {
    try {
        const { courseId } = req.params;
        const userId = req.user.id;

        const existing = await db.select().from(wishlists)
            .where(and(eq(wishlists.userId, userId), eq(wishlists.courseId, courseId)))
            .limit(1);

        if (existing.length > 0) {
            // Remove
            await db.delete(wishlists)
                .where(and(eq(wishlists.userId, userId), eq(wishlists.courseId, courseId)));
            return successResponse(res, { status: 'REMOVED' }, "Removed from wishlist");
        } else {
            // Add
            await db.insert(wishlists).values({
                userId,
                courseId
            });
            return successResponse(res, { status: 'ADDED' }, "Added to wishlist");
        }
    } catch (error) {
        errorResponse(res, "Failed to update wishlist", 500, error);
    }
};

// --- REAL WALLET IMPLEMENTATION ---

export const getWallet = async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    
    // 1. Get Balance
    const user = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.id, userId),
        columns: { walletBalance: true, digitalcoopUserId: true }
    });

    // 2. Get Transactions
    const history = await db.select().from(transactions)
        .where(eq(transactions.userId, userId))
        .orderBy(desc(transactions.createdAt));

    // 3. Get Bank Accounts
    const banks = await db.select().from(bankAccounts)
        .where(eq(bankAccounts.userId, userId));

    // Anggota digitalcoop.id: dompet = Simpanan Sukarela (saldo asli disinkronkan dari digitalcoop.id).
    // Non-anggota: pembayaran kursus langsung lewat Virtual Account setelah payment gateway aktif.
    const isMember = Boolean(user?.digitalcoopUserId);

    successResponse(res, { 
        balance: user?.walletBalance || 0, 
        isMember,
        mode: isMember ? "SIMPANAN_SUKARELA" : "VA_INFO",
        paymentsEnabled: PAYMENTS_ENABLED,
        history, 
        banks 
    }, "Wallet data retrieved");
  } catch (error) {
    errorResponse(res, "Failed to fetch wallet", 500, error);
  }
};

// Top-up simulasi (tambah saldo tanpa pembayaran) sudah dihapus. Top-up kini lewat order pembayaran:
// POST /api/payments/orders {kind:"TOPUP", method:"VA"|"MANUAL", amount}. Saldo hanya bertambah setelah terkonfirmasi.
export const topUpWallet = async (_req: any, res: any) => {
  errorResponse(res, "Top-up dilakukan lewat menu Pembayaran (Virtual Account atau transfer manual).", 410);
};

export const withdrawWallet = async (req: any, res: any) => {
  try {
    if (!PAYMENTS_ENABLED) return errorResponse(res, PAYMENTS_CLOSED_MESSAGE, 403);
    const userId = req.user.id;
    const { amount, bankId } = req.body;
    if (!Number.isInteger(amount) || amount <= 0) return errorResponse(res, "Jumlah penarikan tidak valid.", 400);

    const user = await db.query.users.findFirst({ where: (users, { eq }) => eq(users.id, userId) });
    if ((user?.walletBalance || 0) < amount) {
        return errorResponse(res, "Insufficient balance", 400);
    }

    await db.transaction(async (tx) => {
        // Deduct Balance
        await tx.execute(sql`UPDATE academy.users SET wallet_balance = wallet_balance - ${amount} WHERE id = ${userId}`);
        
        // Record Transaction
        await tx.insert(transactions).values({
           userId,
           amount,
           type: "DEBIT",
           status: "PENDING", // Withdrawals usually need approval or batch processing
           description: "Penarikan Dana (Withdrawal)",
           referenceId: bankId
        });
    });

    successResponse(res, null, "Withdrawal requested");
  } catch (error) {
    errorResponse(res, "Withdraw failed", 500, error);
  }
};

export const addBankAccount = async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { bankName, accountNumber, holderName } = req.body;
    
    await db.insert(bankAccounts).values({
        userId,
        bankName,
        accountNumber,
        holderName
    });

    successResponse(res, null, "Bank account added");
  } catch (error) {
    errorResponse(res, "Failed to add bank", 500, error);
  }
};

// --- NOTIFIKASI ---
export const getNotifications = async (req: any, res: any) => {
  try {
    const rows = await db.select().from(notifications)
      .where(eq(notifications.userId, req.user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(50);
    successResponse(res, rows, "Notifikasi");
  } catch (error) {
    errorResponse(res, "Gagal memuat notifikasi", 500, error);
  }
};

export const markNotificationRead = async (req: any, res: any) => {
  try {
    await db.update(notifications).set({ readAt: new Date() })
      .where(and(eq(notifications.id, req.params.id), eq(notifications.userId, req.user.id)));
    successResponse(res, null, "Ditandai dibaca");
  } catch (error) {
    errorResponse(res, "Gagal memperbarui notifikasi", 500, error);
  }
};
