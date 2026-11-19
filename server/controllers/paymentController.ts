import crypto from "node:crypto";
import multer from "multer";
import { and, count, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { courses, enrollments, paymentOrders, users } from "../schema/schema";
import { successResponse, errorResponse } from "../utils/response";
import { notifyUser } from "../lib/cards";
import { getConfigValue } from "../lib/system-config";
import { deletePrivate, putPrivate } from "../lib/storage";
import { BridgeError, bridge, bridgeConfigured } from "../lib/digitalcoop-bridge";
import { MidtransError, midtrans, midtransConfigured, verifyNotificationSignature } from "../lib/midtrans";
import { PRICE_CHANGED, PROMO_INVALID, fulfillCourse, reservePrice } from "../lib/enrollment";
import { applyGatewayStatus, closeOrder, expireStaleOrders, lockOrder, markPaid, type OrderRow } from "../lib/order-service";
import { PROOF_MAX_BYTES, detectProofType } from "@shared/account-deletion";
import { normalizeCode } from "@shared/pricing";
import { MAX_OPEN_TOPUPS, ORDER_KINDS, ORDER_METHODS, OPEN_STATUSES, VA_BANKS, VA_EXPIRY_HOURS, expiryFor, validatePin, validateTopupAmount, type VaBank } from "@shared/payment";

const isUuid = (v: unknown): v is string => z.string().uuid().safeParse(v).success;
const isUniqueViolation = (e: any): boolean => e?.code === "23505" || e?.cause?.code === "23505";
const DEFINITE_BRIDGE_FAILURES = new Set([400, 403, 404, 409, 423]);

const manualBank = async () => {
  const [name, number, holder] = await Promise.all([getConfigValue("payment_bank_name"), getConfigValue("payment_bank_account_number"), getConfigValue("payment_bank_account_name")]);
  return name && number && holder ? { bankName: name, accountNumber: number, accountName: holder } : null;
};

/** Bentuk order untuk pemilik: tanpa kunci berkas bukti dan data internal. */
const publicOrder = async (o: OrderRow, courseTitle: string | null = null) => ({
  id: o.id, kind: o.kind, courseId: o.courseId, courseTitle, method: o.method, status: o.status, amount: o.amount,
  basePrice: o.basePrice, discountPercent: o.discountPercent, bank: o.bank, vaNumber: o.vaNumber, expiresAt: o.expiresAt,
  hasProof: !!o.proofKey, decisionNote: o.status === "REJECTED" || o.status === "CANCELLED" ? o.decisionNote : null,
  paidAt: o.paidAt, createdAt: o.createdAt,
  transferTo: o.method === "MANUAL" && (o.status === "PENDING" || o.status === "VERIFYING") ? await manualBank() : null,
});

export const getMethods = async (req: any, res: any) => {
  try {
    const [u] = await db.select({ dc: users.digitalcoopUserId }).from(users).where(eq(users.id, req.user.id)).limit(1);
    const bank = await manualBank();
    successResponse(res, {
      wallet: true,
      va: { enabled: midtransConfigured(), banks: VA_BANKS },
      manual: { enabled: !!bank },
      dcWallet: { enabled: bridgeConfigured() && !!u?.dc },
    }, "Metode pembayaran");
  } catch (error) {
    errorResponse(res, "Gagal memuat metode pembayaran", 500, error);
  }
};

export const getDcWallet = async (req: any, res: any) => {
  try {
    const [u] = await db.select({ dc: users.digitalcoopUserId }).from(users).where(eq(users.id, req.user.id)).limit(1);
    if (!u?.dc) return errorResponse(res, "Akun Anda tidak tertaut ke digitalcoop.id.", 400);
    const r = await bridge.saldo(u.dc);
    successResponse(res, { saldo: r.saldo, pinSet: r.pinSet }, "Saldo dompet digitalcoop.id");
  } catch (err) {
    if (err instanceof BridgeError) return errorResponse(res, err.message, err.status >= 500 ? 502 : err.status);
    errorResponse(res, "Gagal memuat saldo", 500, err);
  }
};

const createSchema = z.object({
  kind: z.enum(ORDER_KINDS),
  method: z.enum(ORDER_METHODS),
  courseId: z.string().uuid().optional(),
  promoCode: z.string().max(40).optional(),
  expectedPrice: z.number().int().nonnegative().optional(),
  amount: z.unknown().optional(),
  bank: z.string().max(10).optional(),
  pin: z.string().max(20).optional(),
});

export const createOrder = async (req: any, res: any) => {
  try {
    const p = createSchema.safeParse(req.body);
    if (!p.success) return errorResponse(res, "Data pesanan tidak valid.", 400);
    const b = p.data;
    const userId: string = req.user.id;
    await expireStaleOrders(userId);

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) return errorResponse(res, "Akun tidak ditemukan.", 404);

    // Pemeriksaan metode sebelum menyentuh data.
    let bank: VaBank | null = null;
    let pin = "";
    if (b.method === "VA") {
      if (!midtransConfigured()) return errorResponse(res, "Pembayaran Virtual Account belum tersedia.", 503);
      if (!b.bank || !(VA_BANKS as readonly string[]).includes(b.bank)) return errorResponse(res, "Pilih bank Virtual Account.", 400);
      bank = b.bank as VaBank;
    } else if (b.method === "MANUAL") {
      if (!(await manualBank())) return errorResponse(res, "Transfer manual belum tersedia.", 503);
    } else {
      if (b.kind !== "COURSE") return errorResponse(res, "Dompet digitalcoop.id hanya untuk pembelian kursus.", 400);
      if (!bridgeConfigured()) return errorResponse(res, "Dompet digitalcoop.id belum tersedia.", 503);
      if (!user.digitalcoopUserId) return errorResponse(res, "Akun Anda tidak tertaut ke digitalcoop.id.", 400);
      const v = validatePin(b.pin);
      if (!v.ok) return errorResponse(res, v.message, 400);
      pin = v.value;
    }

    const now = new Date();
    const expiresAt = expiryFor(b.method, now);
    let order: OrderRow;
    let courseTitle: string | null = null;

    try {
      const made = await db.transaction(async (tx) => {
        if (b.kind === "TOPUP") {
          const a = validateTopupAmount(b.amount);
          if (!a.ok) throw new Error(`BAD:${a.message}`);
          const [open] = await tx.select({ n: count() }).from(paymentOrders).where(and(eq(paymentOrders.userId, userId), eq(paymentOrders.kind, "TOPUP"), inArray(paymentOrders.status, [...OPEN_STATUSES])));
          if (Number(open?.n ?? 0) >= MAX_OPEN_TOPUPS) throw new Error(`BAD:Maksimal ${MAX_OPEN_TOPUPS} top-up yang belum selesai. Selesaikan atau batalkan dulu.`);
          const [o] = await tx.insert(paymentOrders).values({ userId, kind: "TOPUP", method: b.method, amount: a.value, bank, expiresAt }).returning();
          return { order: o, free: null as null | { cardNumber: string | null } };
        }
        if (!b.courseId) throw new Error("BAD:Kursus wajib dipilih.");
        const [course] = await tx.select().from(courses).where(eq(courses.id, b.courseId)).limit(1);
        if (!course || course.status !== "PUBLISHED") throw new Error("NOTFOUND");
        courseTitle = course.title;
        const [already] = await tx.select({ id: enrollments.id }).from(enrollments).where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, course.id))).limit(1);
        if (already) throw new Error("ALREADY");
        const quote = await reservePrice(tx, course, userId, normalizeCode(b.promoCode), b.expectedPrice ?? null, now);
        if (quote.finalPrice === 0) {
          // Gratis (harga 0 atau promo 100%): langsung terdaftar, tanpa order pembayaran.
          const f = await fulfillCourse(tx, { userId, role: user.role, courseId: course.id, basePrice: quote.basePrice, discountPercent: quote.percent, discountId: quote.discountId, amountPaid: 0 });
          if (!f) throw new Error("ALREADY");
          return { order: null as unknown as OrderRow, free: { cardNumber: f.cardNumber } };
        }
        const [o] = await tx.insert(paymentOrders).values({
          userId, kind: "COURSE", courseId: course.id, method: b.method, status: b.method === "DC_WALLET" ? "CONFIRMING" : "PENDING",
          amount: quote.finalPrice, basePrice: quote.basePrice, discountPercent: quote.percent, discountId: quote.discountId, bank, expiresAt,
        }).returning();
        return { order: o, free: null };
      });
      if (made.free) return successResponse(res, { enrolled: true, cardNumber: made.free.cardNumber, amountPaid: 0 }, "Berhasil mengikuti kursus", 201);
      order = made.order;
    } catch (e: any) {
      const m = String(e?.message ?? "");
      if (m.startsWith("BAD:")) return errorResponse(res, m.slice(4), 400);
      if (m === "NOTFOUND") return errorResponse(res, "Kursus tidak ditemukan", 404);
      if (m === "ALREADY") return errorResponse(res, "Anda sudah mengikuti kursus ini", 409);
      if (m === PROMO_INVALID) return errorResponse(res, "Kode promo tidak valid atau sudah tidak berlaku.", 400);
      if (m === PRICE_CHANGED) return errorResponse(res, "Harga kursus berubah. Muat ulang halaman lalu coba lagi.", 409);
      if (isUniqueViolation(e)) return errorResponse(res, "Anda masih memiliki pesanan terbuka untuk kursus ini. Selesaikan atau batalkan dulu.", 409);
      throw e;
    }

    // --- langkah khusus metode (di luar transaksi: memanggil layanan luar) ---
    if (b.method === "VA" && bank) {
      try {
        const va = await midtrans.createVa(order.id, order.amount, bank, now, VA_EXPIRY_HOURS, user.name);
        const [upd] = await db.update(paymentOrders).set({ bank, vaNumber: va.vaNumber, expiresAt: va.expiresAt, gatewayStatus: va.transactionStatus.slice(0, 30), updatedAt: new Date() }).where(eq(paymentOrders.id, order.id)).returning();
        order = upd;
      } catch (err: any) {
        await db.transaction(async (tx) => { const l = await lockOrder(tx, order.id); if (l) await closeOrder(tx, l, "CANCELLED", { decisionNote: "Gagal membuat Virtual Account." }); });
        return errorResponse(res, err instanceof MidtransError ? err.message : "Gagal membuat Virtual Account.", 502);
      }
    }

    if (b.method === "DC_WALLET" && user.digitalcoopUserId) {
      try {
        const r = await bridge.debit({ digitalcoopUserId: user.digitalcoopUserId, amount: order.amount, pin, idempotencyKey: order.id, description: `Pembelian kursus: ${courseTitle ?? ""}`.slice(0, 120) });
        const done = await db.transaction(async (tx) => {
          const l = await lockOrder(tx, order.id);
          return l ? markPaid(tx, l, { debitTxId: String(r.txId ?? "").slice(0, 100) || null }) : { done: false, cardNumber: null };
        });
        return successResponse(res, { status: "PAID", enrolled: true, cardNumber: done.cardNumber, amountPaid: order.amount }, "Pembayaran berhasil", 201);
      } catch (err: any) {
        if (err instanceof BridgeError && DEFINITE_BRIDGE_FAILURES.has(err.status)) {
          await db.transaction(async (tx) => { const l = await lockOrder(tx, order.id); if (l) await closeOrder(tx, l, "CANCELLED", { decisionNote: err.message.slice(0, 200) }); });
          return errorResponse(res, err.message, err.status === 423 ? 423 : err.status === 409 ? 400 : err.status);
        }
        // Tidak pasti: biarkan CONFIRMING; job rekonsiliasi memastikan lewat status debit.
        console.error(`[bayar] debit tak pasti order=${order.id}: ${err?.message}`);
        return res.status(202).json({ success: true, message: "Pembayaran sedang dikonfirmasi. Status akan diperbarui otomatis.", data: await publicOrder({ ...order, status: "CONFIRMING" }, courseTitle) });
      }
    }

    successResponse(res, await publicOrder(order, courseTitle), "Pesanan dibuat", 201);
  } catch (error) {
    errorResponse(res, "Gagal membuat pesanan", 500, error);
  }
};

export const listMyOrders = async (req: any, res: any) => {
  try {
    await expireStaleOrders(req.user.id);
    const rows = await db.select({ o: paymentOrders, title: courses.title }).from(paymentOrders).leftJoin(courses, eq(paymentOrders.courseId, courses.id))
      .where(eq(paymentOrders.userId, req.user.id)).orderBy(desc(paymentOrders.createdAt)).limit(50);
    successResponse(res, await Promise.all(rows.map((r) => publicOrder(r.o, r.title))), "Pesanan saya");
  } catch (error) {
    errorResponse(res, "Gagal memuat pesanan", 500, error);
  }
};

const loadMine = async (req: any, res: any): Promise<{ order: OrderRow; title: string | null } | null> => {
  if (!isUuid(req.params.id)) { errorResponse(res, "Pesanan tidak ditemukan", 404); return null; }
  await expireStaleOrders(req.user.id);
  const [r] = await db.select({ o: paymentOrders, title: courses.title }).from(paymentOrders).leftJoin(courses, eq(paymentOrders.courseId, courses.id))
    .where(and(eq(paymentOrders.id, req.params.id), eq(paymentOrders.userId, req.user.id))).limit(1);
  if (!r) { errorResponse(res, "Pesanan tidak ditemukan", 404); return null; }
  return { order: r.o, title: r.title };
};

export const getMyOrder = async (req: any, res: any) => {
  try {
    const m = await loadMine(req, res);
    if (m) successResponse(res, await publicOrder(m.order, m.title), "Pesanan");
  } catch (error) {
    errorResponse(res, "Gagal memuat pesanan", 500, error);
  }
};

export const cancelMyOrder = async (req: any, res: any) => {
  try {
    const m = await loadMine(req, res);
    if (!m) return;
    if (m.order.status !== "PENDING") return errorResponse(res, "Pesanan ini tidak dapat dibatalkan.", 409);
    if (m.order.method === "VA") {
      try {
        await midtrans.cancel(m.order.id);
      } catch (err: any) {
        if (err?.status !== 404) return errorResponse(res, "Tidak dapat membatalkan Virtual Account sekarang. Coba lagi sebentar.", 502);
      }
    }
    const closed = await db.transaction(async (tx) => { const l = await lockOrder(tx, m.order.id); return l ? closeOrder(tx, l, "CANCELLED", { decisionNote: "Dibatalkan oleh pemilik." }) : false; });
    if (!closed) return errorResponse(res, "Pesanan ini tidak dapat dibatalkan.", 409);
    successResponse(res, null, "Pesanan dibatalkan");
  } catch (error) {
    errorResponse(res, "Gagal membatalkan pesanan", 500, error);
  }
};

const proofUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: PROOF_MAX_BYTES, files: 1 } });
export const orderProofMiddleware = (req: any, res: any, next: any) => {
  proofUpload.single("proof")(req, res, (err: any) => {
    if (!err) return next();
    if (err.code === "LIMIT_FILE_SIZE") return errorResponse(res, "Ukuran bukti transfer maksimal 5 MB.", 400);
    return errorResponse(res, "Berkas bukti tidak dapat diproses.", 400);
  });
};

export const uploadOrderProof = async (req: any, res: any) => {
  let key: string | null = null;
  try {
    const m = await loadMine(req, res);
    if (!m) return;
    const o = m.order;
    if (o.method !== "MANUAL" || o.status !== "PENDING") return errorResponse(res, "Bukti hanya dapat diunggah pada pesanan transfer manual yang menunggu pembayaran.", 409);
    const file = req.file as { buffer: Buffer } | undefined;
    if (!file || file.buffer.length === 0) return errorResponse(res, "Pilih berkas bukti transfer.", 400);
    const type = detectProofType(file.buffer);
    if (!type) return errorResponse(res, "Bukti harus berupa JPG, PNG, WebP, atau PDF.", 400);
    const sha = crypto.createHash("sha256").update(file.buffer).digest("hex");
    key = `payment-proofs/${o.id}-${crypto.randomBytes(8).toString("hex")}.${type.ext}`;
    await putPrivate(key, file.buffer, type.mime);

    const done = await db.transaction(async (tx) => {
      const l = await lockOrder(tx, o.id);
      if (!l || l.status !== "PENDING") return false;
      await tx.update(paymentOrders).set({ status: "VERIFYING", proofKey: key, proofMime: type.mime, proofSha256: sha, proofUploadedAt: new Date(), updatedAt: new Date() }).where(eq(paymentOrders.id, o.id));
      const admins = await tx.select({ id: users.id }).from(users).where(eq(users.role, "ADMIN_SYSTEM"));
      for (const a of admins) await notifyUser(tx, a.id, "Bukti pembayaran menunggu verifikasi", `Pesanan Rp ${o.amount.toLocaleString("id-ID")} menunggu verifikasi di menu Verifikasi Pembayaran.`, "ADMIN");
      return true;
    });
    if (!done) { await deletePrivate(key); return errorResponse(res, "Status pesanan sudah berubah.", 409); }
    successResponse(res, null, "Bukti diunggah. Admin akan memverifikasi pembayaran Anda.");
  } catch (error) {
    if (key) await deletePrivate(key).catch(() => undefined);
    if (isUniqueViolation(error)) return errorResponse(res, "Bukti ini sudah pernah digunakan pada pesanan lain.", 409);
    errorResponse(res, "Gagal mengunggah bukti", 500, error);
  }
};

/**
 * Notifikasi Midtrans (tanpa login, tanpa cookie). Urutan: periksa tanda tangan -> tanyakan status resmi ke Midtrans ->
 * terapkan. Order tak dikenal dijawab 200 agar tidak dicoba ulang terus; galat kami sendiri dijawab 500 agar dicoba ulang.
 */
export const midtransNotify = async (req: any, res: any) => {
  try {
    const serverKey = process.env.MIDTRANS_SERVER_KEY ?? "";
    if (!midtransConfigured() || !verifyNotificationSignature(req.body ?? {}, serverKey)) return res.status(403).json({ success: false, message: "Tanda tangan tidak valid." });
    const orderId = String(req.body.order_id);
    if (!isUuid(orderId)) return res.status(200).json({ success: true });
    let st: Record<string, unknown>;
    try {
      st = await midtrans.status(orderId);
    } catch (err: any) {
      if (err?.status === 404) return res.status(200).json({ success: true });
      throw err;
    }
    const r = await applyGatewayStatus(orderId, st);
    console.info(`[bayar] notifikasi midtrans order=${orderId} status=${String(st.transaction_status)} hasil=${r}`);
    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error(`[bayar] notifikasi midtrans gagal: ${error?.message}`);
    res.status(500).json({ success: false, message: "Gagal memproses notifikasi." });
  }
};
