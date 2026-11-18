import crypto from "node:crypto";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { courseDiscounts, courses, discountRedemptions } from "../schema/schema";
import { successResponse, errorResponse } from "../utils/response";
import { BULK_MAX, bestAutoDiscount, generateCode, isDiscountActive, normalizeCode, quotePrice, validateDiscountInput } from "@shared/pricing";

const MANAGER_ROLES = ["ADMIN_SYSTEM", "DIRECTOR"];
export const PROMO_INVALID_MESSAGE = "Kode promo tidak valid atau sudah tidak berlaku.";
const isUuid = (v: unknown): v is string => z.string().uuid().safeParse(v).success;

/** Diskon otomatis yang sedang berlaku per kursus (untuk katalog dan detail). */
export const autoDiscountMap = async (courseIds: string[], now = new Date()) => {
  const map = new Map<string, { percent: number; endsAt: Date }>();
  if (courseIds.length === 0) return map;
  const rows = await db.select().from(courseDiscounts).where(and(inArray(courseDiscounts.courseId, courseIds), eq(courseDiscounts.kind, "AUTO")));
  for (const id of courseIds) {
    const best = bestAutoDiscount(rows.filter((r) => r.courseId === id), now);
    if (best) map.set(id, { percent: best.percent, endsAt: best.endsAt });
  }
  return map;
};

/** Pemilik (Creator) atau Admin/Direktur. Mengembalikan kursus dan apakah pemanggil pengelola koperasi. */
const loadManageable = async (req: any, res: any) => {
  if (!isUuid(req.params.id)) { errorResponse(res, "Kursus tidak ditemukan", 404); return null; }
  const [course] = await db.select().from(courses).where(eq(courses.id, req.params.id)).limit(1);
  const isManager = MANAGER_ROLES.includes(req.user.role);
  if (!course || (!isManager && course.instructorId !== req.user.id)) { errorResponse(res, "Kursus tidak ditemukan", 404); return null; }
  return { course, isManager };
};

export const listDiscounts = async (req: any, res: any) => {
  try {
    const ctx = await loadManageable(req, res);
    if (!ctx) return;
    const rows = await db.select().from(courseDiscounts).where(eq(courseDiscounts.courseId, ctx.course.id)).orderBy(desc(courseDiscounts.createdAt)).limit(500);
    const now = new Date();
    successResponse(res, rows.map((d) => ({ ...d, active: isDiscountActive(d, now), manageable: ctx.isManager || d.createdByRole === "CREATOR" })), "Daftar diskon");
  } catch (error) {
    errorResponse(res, "Gagal memuat diskon", 500, error);
  }
};

export const createDiscount = async (req: any, res: any) => {
  try {
    const ctx = await loadManageable(req, res);
    if (!ctx) return;
    const v = validateDiscountInput(req.body ?? {}, { now: new Date(), reasonRequired: ctx.isManager });
    if (!v.ok) return errorResponse(res, v.message, 400);
    const [row] = await db
      .insert(courseDiscounts)
      .values({ courseId: ctx.course.id, kind: v.value.kind, code: v.value.code, percent: v.value.percent, startsAt: v.value.startsAt, endsAt: v.value.endsAt, maxRedemptions: v.value.maxRedemptions, createdBy: req.user.id, createdByRole: ctx.isManager ? req.user.role : "CREATOR", reason: v.value.reason || null })
      .returning();
    console.info(`[promo] buat diskon ${row.id} course=${ctx.course.id} ${row.kind} ${row.percent}% oleh=${req.user.id}`);
    successResponse(res, row, "Diskon dibuat", 201);
  } catch (error: any) {
    if (error?.code === "23505" || error?.cause?.code === "23505") return errorResponse(res, "Kode tersebut sudah dipakai pada kursus ini.", 409);
    errorResponse(res, "Gagal membuat diskon", 500, error);
  }
};

/** Kode sekali pakai massal, masing-masing berbeda. Mengembalikan daftar kode (juga bisa dibaca lagi lewat listDiscounts). */
export const createBulkCodes = async (req: any, res: any) => {
  try {
    const ctx = await loadManageable(req, res);
    if (!ctx) return;
    const count = Number(req.body?.count);
    if (!Number.isInteger(count) || count < 1 || count > BULK_MAX) return errorResponse(res, `Jumlah kode 1 sampai ${BULK_MAX}.`, 400);
    const v = validateDiscountInput({ ...req.body, kind: "CODE", code: "PLACEHOLDER", maxRedemptions: 1 }, { now: new Date(), reasonRequired: ctx.isManager });
    if (!v.ok) return errorResponse(res, v.message, 400);
    const codes = new Set<string>();
    while (codes.size < count) codes.add(generateCode((m) => crypto.randomInt(m)));
    const batchId = crypto.randomUUID();
    await db.insert(courseDiscounts).values(
      [...codes].map((code) => ({ courseId: ctx.course.id, kind: "CODE", code, percent: v.value.percent, startsAt: v.value.startsAt, endsAt: v.value.endsAt, maxRedemptions: 1, batchId, createdBy: req.user.id, createdByRole: ctx.isManager ? req.user.role : "CREATOR", reason: v.value.reason || null })),
    );
    console.info(`[promo] buat ${count} kode batch=${batchId} course=${ctx.course.id} ${v.value.percent}% oleh=${req.user.id}`);
    successResponse(res, { batchId, codes: [...codes] }, "Kode dibuat", 201);
  } catch (error: any) {
    if (error?.code === "23505" || error?.cause?.code === "23505") return errorResponse(res, "Terjadi bentrok kode. Ulangi pembuatan.", 409);
    errorResponse(res, "Gagal membuat kode", 500, error);
  }
};

export const cancelDiscount = async (req: any, res: any) => {
  try {
    const ctx = await loadManageable(req, res);
    if (!ctx) return;
    if (!isUuid(req.params.did)) return errorResponse(res, "Diskon tidak ditemukan", 404);
    const [d] = await db.select().from(courseDiscounts).where(and(eq(courseDiscounts.id, req.params.did), eq(courseDiscounts.courseId, ctx.course.id))).limit(1);
    if (!d) return errorResponse(res, "Diskon tidak ditemukan", 404);
    if (!ctx.isManager && d.createdByRole !== "CREATOR") return errorResponse(res, "Promo koperasi hanya dapat dibatalkan oleh Admin atau Direktur.", 403);
    if (d.cancelledAt) return errorResponse(res, "Diskon sudah dibatalkan.", 409);
    await db.update(courseDiscounts).set({ cancelledAt: new Date(), cancelledBy: req.user.id }).where(eq(courseDiscounts.id, d.id));
    console.info(`[promo] batal diskon ${d.id} course=${ctx.course.id} oleh=${req.user.id}`);
    successResponse(res, null, "Diskon dibatalkan");
  } catch (error) {
    errorResponse(res, "Gagal membatalkan diskon", 500, error);
  }
};

/** Cek kode promo untuk tampilan harga. Pesan galat seragam agar kode tidak bisa ditebak. Pendaftaran tetap memeriksa ulang. */
export const validatePromo = async (req: any, res: any) => {
  try {
    if (!isUuid(req.params.id)) return errorResponse(res, PROMO_INVALID_MESSAGE, 400);
    const code = normalizeCode(req.body?.code);
    const [course] = await db.select().from(courses).where(eq(courses.id, req.params.id)).limit(1);
    if (!course || course.status !== "PUBLISHED" || !code) return errorResponse(res, PROMO_INVALID_MESSAGE, 400);
    const now = new Date();
    const [d] = await db.select().from(courseDiscounts).where(and(eq(courseDiscounts.courseId, course.id), eq(courseDiscounts.code, code))).limit(1);
    const [used] = d ? await db.select({ id: discountRedemptions.id }).from(discountRedemptions).where(and(eq(discountRedemptions.discountId, d.id), eq(discountRedemptions.userId, req.user.id))).limit(1) : [];
    if (!d || used || !isDiscountActive(d, now)) return errorResponse(res, PROMO_INVALID_MESSAGE, 400);
    const autos = await db.select().from(courseDiscounts).where(and(eq(courseDiscounts.courseId, course.id), eq(courseDiscounts.kind, "AUTO"), sql`${courseDiscounts.code} is null`));
    const q = quotePrice(course.price, bestAutoDiscount(autos, now), d);
    successResponse(res, { basePrice: q.basePrice, percent: q.percent, finalPrice: q.finalPrice, endsAt: d.endsAt }, "Kode promo berlaku");
  } catch (error) {
    errorResponse(res, "Gagal memeriksa kode promo", 500, error);
  }
};

