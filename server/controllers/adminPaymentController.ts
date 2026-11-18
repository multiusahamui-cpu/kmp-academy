import { count, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { courses, paymentOrders, users } from "../schema/schema";
import { successResponse, errorResponse } from "../utils/response";
import { notifyUser } from "../lib/cards";
import { privateAccess } from "../lib/storage";
import { closeOrder, lockOrder, markPaid } from "../lib/order-service";
import { ORDER_STATUSES, validateManualDecision } from "@shared/payment";

const PAGE_SIZE = 15;
const isUuid = (v: unknown): v is string => z.string().uuid().safeParse(v).success;
const todayWib = (): string => new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);

/** Antrean verifikasi: default VERIFYING; status lain untuk pemantauan. Paginasi 15 baris. */
export const listPaymentOrders = async (req: any, res: any) => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : "VERIFYING";
    if (status !== "ALL" && !(ORDER_STATUSES as readonly string[]).includes(status)) return errorResponse(res, "Status tidak valid", 400);
    const page = Math.max(1, Number.parseInt(String(req.query.page ?? "1"), 10) || 1);
    const where = status === "ALL" ? undefined : eq(paymentOrders.status, status);
    const [total] = await db.select({ n: count() }).from(paymentOrders).where(where);
    const rows = await db
      .select({
        id: paymentOrders.id, kind: paymentOrders.kind, method: paymentOrders.method, status: paymentOrders.status, amount: paymentOrders.amount,
        discountPercent: paymentOrders.discountPercent, bank: paymentOrders.bank, vaNumber: paymentOrders.vaNumber, hasProof: sql<boolean>`${paymentOrders.proofKey} is not null`,
        proofUploadedAt: paymentOrders.proofUploadedAt, paidReference: paymentOrders.paidReference, paidDate: paymentOrders.paidDate, decisionNote: paymentOrders.decisionNote,
        decidedAt: paymentOrders.decidedAt, createdAt: paymentOrders.createdAt, expiresAt: paymentOrders.expiresAt,
        userName: users.name, userEmail: users.email, courseTitle: courses.title,
      })
      .from(paymentOrders)
      .innerJoin(users, eq(paymentOrders.userId, users.id))
      .leftJoin(courses, eq(paymentOrders.courseId, courses.id))
      .where(where)
      .orderBy(status === "VERIFYING" ? paymentOrders.proofUploadedAt : desc(paymentOrders.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE);
    successResponse(res, { items: rows, page, pageSize: PAGE_SIZE, total: Number(total?.n ?? 0) }, "Daftar pembayaran");
  } catch (error) {
    errorResponse(res, "Gagal memuat pembayaran", 500, error);
  }
};

export const getPaymentProof = async (req: any, res: any) => {
  try {
    if (!isUuid(req.params.id)) return errorResponse(res, "Bukti tidak ditemukan", 404);
    const [o] = await db.select({ key: paymentOrders.proofKey, mime: paymentOrders.proofMime }).from(paymentOrders).where(eq(paymentOrders.id, req.params.id)).limit(1);
    if (!o?.key || !o.mime) return errorResponse(res, "Bukti tidak ditemukan", 404);
    const access = await privateAccess(o.key, o.mime);
    res.setHeader("Cache-Control", "private, no-store");
    if (access.type === "redirect") return res.redirect(302, access.url);
    res.setHeader("Content-Type", o.mime);
    res.setHeader("Content-Disposition", "inline");
    res.sendFile(access.path, (err: any) => { if (err && !res.headersSent) errorResponse(res, "Berkas tidak tersedia", 404); });
  } catch (error) {
    errorResponse(res, "Gagal membuka bukti", 500, error);
  }
};

/** Setuju: jumlah sama persis + tanggal + referensi, lalu order lunas dan isinya dipenuhi. Tolak: catatan wajib, reservasi diskon dilepas. */
export const decidePaymentOrder = async (req: any, res: any) => {
  try {
    if (!isUuid(req.params.id)) return errorResponse(res, "Pesanan tidak ditemukan", 404);
    const result = await db.transaction(async (tx) => {
      const o = await lockOrder(tx, req.params.id);
      if (!o) return { code: 404 as const, message: "Pesanan tidak ditemukan" };
      if (o.method !== "MANUAL" || o.status !== "VERIFYING") return { code: 409 as const, message: "Pesanan ini tidak sedang menunggu verifikasi." };
      if (o.userId === req.user.id) return { code: 403 as const, message: "Anda tidak dapat memverifikasi pesanan milik sendiri." };
      const v = validateManualDecision(req.body ?? {}, o.amount, todayWib());
      if (!v.ok) return { code: 400 as const, message: v.message };
      const now = new Date();
      const meta = { decidedBy: req.user.id, decidedAt: now, decisionNote: v.value.note || null };
      if (v.value.decision === "APPROVE") {
        await markPaid(tx, o, { ...meta, paidReference: v.value.reference, paidDate: v.value.paidDate });
        return { code: 200 as const, message: "Pembayaran dikonfirmasi", audit: `APPROVE ${o.amount}` };
      }
      await closeOrder(tx, o, "REJECTED", meta);
      await notifyUser(tx, o.userId, "Bukti pembayaran ditolak", `Bukti transfer ditolak. Catatan: ${v.value.note} Silakan buat pesanan baru dan unggah bukti yang benar.`);
      return { code: 200 as const, message: "Pembayaran ditolak", audit: "REJECT" };
    });
    if (result.code !== 200) return errorResponse(res, result.message, result.code);
    console.info(`[bayar] keputusan order=${req.params.id} ${result.audit} oleh=${req.user.id}`);
    successResponse(res, null, result.message);
  } catch (error) {
    errorResponse(res, "Gagal memproses keputusan", 500, error);
  }
};
