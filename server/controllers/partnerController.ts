import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "../db";
import { partnerSanctions, users } from "../schema/schema";
import { successResponse, errorResponse } from "../utils/response";
import { notifyUser } from "../lib/cards";
import { shouldReactivate, validateLiftNote, validateSanction } from "@shared/sanctions";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const listPartners = async (_req: any, res: any) => {
  try {
    const rows = await db.select({
      id: users.id, name: users.name, email: users.email, status: users.status,
      warnings: sql<number>`(select count(*)::int from academy.partner_sanctions s where s.user_id = ${sql.raw('"academy"."users"."id"')} and s.kind = 'WARNING')`,
      activeSuspensions: sql<number>`(select count(*)::int from academy.partner_sanctions s where s.user_id = ${sql.raw('"academy"."users"."id"')} and s.kind = 'SUSPEND' and s.lifted_at is null)`,
    }).from(users).where(eq(users.role, "PARTNER_B2B")).orderBy(users.name);
    successResponse(res, rows, "Daftar mitra");
  } catch (error) {
    errorResponse(res, "Gagal memuat mitra", 500, error);
  }
};

export const listSanctions = async (req: any, res: any) => {
  try {
    if (!UUID_RE.test(String(req.params.id ?? ""))) return errorResponse(res, "Mitra tidak ditemukan", 404);
    const [p] = await db.select({ id: users.id }).from(users).where(and(eq(users.id, req.params.id), eq(users.role, "PARTNER_B2B"))).limit(1);
    if (!p) return errorResponse(res, "Mitra tidak ditemukan", 404);
    const rows = await db.select().from(partnerSanctions).where(eq(partnerSanctions.userId, p.id)).orderBy(desc(partnerSanctions.createdAt));
    successResponse(res, rows, "Riwayat sanksi");
  } catch (error) {
    errorResponse(res, "Gagal memuat sanksi", 500, error);
  }
};

export const createSanction = async (req: any, res: any) => {
  try {
    if (!UUID_RE.test(String(req.params.id ?? ""))) return errorResponse(res, "Mitra tidak ditemukan", 404);
    const v = validateSanction(req.body);
    if (!v.ok) return errorResponse(res, v.message, 400);
    const result = await db.transaction(async (tx) => {
      const [p] = await tx.select().from(users).where(and(eq(users.id, req.params.id), eq(users.role, "PARTNER_B2B"))).for("update");
      if (!p) return "NOT_FOUND" as const;
      if (v.value.kind === "SUSPEND" && p.status === "ARCHIVED") return "ARCHIVED" as const;
      await tx.insert(partnerSanctions).values({ userId: p.id, kind: v.value.kind, reason: v.value.reason, createdBy: req.user.id });
      if (v.value.kind === "SUSPEND" && p.status === "ACTIVE") await tx.update(users).set({ status: "SUSPENDED" }).where(eq(users.id, p.id));
      await notifyUser(tx, p.id, v.value.kind === "SUSPEND" ? "Akun Anda dibekukan" : "Peringatan dari Direktur", `${v.value.reason}`, "AKUN");
      return "OK" as const;
    });
    if (result === "NOT_FOUND") return errorResponse(res, "Mitra tidak ditemukan", 404);
    if (result === "ARCHIVED") return errorResponse(res, "Akun mitra sudah ditutup.", 409);
    console.info(`[sanksi] ${v.value.kind} mitra=${req.params.id} oleh=${req.user.id}`);
    successResponse(res, null, "Sanksi dicatat", 201);
  } catch (error) {
    errorResponse(res, "Gagal mencatat sanksi", 500, error);
  }
};

/** Mencabut pembekuan. Peringatan tidak dapat dicabut (hanya catatan). Akun aktif kembali bila tidak ada pembekuan lain. */
export const liftSanction = async (req: any, res: any) => {
  try {
    if (!UUID_RE.test(String(req.params.sid ?? ""))) return errorResponse(res, "Sanksi tidak ditemukan", 404);
    const v = validateLiftNote(req.body);
    if (!v.ok) return errorResponse(res, v.message, 400);
    const result = await db.transaction(async (tx) => {
      const [s0] = await tx.select().from(partnerSanctions).where(eq(partnerSanctions.id, req.params.sid)).limit(1);
      if (!s0) return "NOT_FOUND" as const;
      const [p] = await tx.select().from(users).where(eq(users.id, s0.userId)).for("update");
      const [s] = await tx.select().from(partnerSanctions).where(eq(partnerSanctions.id, s0.id)).for("update");
      if (s.kind !== "SUSPEND") return "NOT_LIFTABLE" as const;
      if (s.liftedAt) return "ALREADY" as const;
      await tx.update(partnerSanctions).set({ liftedAt: new Date(), liftedBy: req.user.id, liftNote: v.value }).where(eq(partnerSanctions.id, s.id));
      const [others] = await tx.select({ n: sql<number>`count(*)::int` }).from(partnerSanctions)
        .where(and(eq(partnerSanctions.userId, s.userId), eq(partnerSanctions.kind, "SUSPEND"), isNull(partnerSanctions.liftedAt)));
      const reactivated = shouldReactivate(p.status, Number(others?.n ?? 0));
      if (reactivated) await tx.update(users).set({ status: "ACTIVE" }).where(eq(users.id, p.id));
      await notifyUser(tx, p.id, reactivated ? "Akun Anda diaktifkan kembali" : "Sanksi dicabut", v.value, "AKUN");
      return "OK" as const;
    });
    if (result === "NOT_FOUND") return errorResponse(res, "Sanksi tidak ditemukan", 404);
    if (result === "NOT_LIFTABLE") return errorResponse(res, "Peringatan tidak dapat dicabut.", 409);
    if (result === "ALREADY") return errorResponse(res, "Sanksi sudah dicabut.", 409);
    console.info(`[sanksi] cabut ${req.params.sid} oleh=${req.user.id}`);
    successResponse(res, null, "Sanksi dicabut");
  } catch (error) {
    errorResponse(res, "Gagal mencabut sanksi", 500, error);
  }
};
