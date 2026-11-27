import { count, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { nodeBonusLedger, nodeBonusWithdrawals, users } from "../schema/schema";
import { errorResponse, successResponse } from "../utils/response";

const decisionSchema = z.discriminatedUnion("decision", [
  z.object({ decision: z.literal("APPROVE"), reference: z.string().trim().min(3).max(100), note: z.string().trim().max(500).optional() }),
  z.object({ decision: z.literal("REJECT"), note: z.string().trim().min(5).max(500) }),
]);
const statuses = new Set(["REQUESTED", "APPROVED", "REJECTED", "ALL"]);

export const listNodeWithdrawals = async (req: any, res: any) => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : "REQUESTED";
    if (!statuses.has(status)) return errorResponse(res, "Status tidak valid", 400);
    const page = Math.max(1, Number.parseInt(String(req.query.page ?? "1"), 10) || 1);
    const where = status === "ALL" ? undefined : eq(nodeBonusWithdrawals.status, status);
    const [total] = await db.select({ n: count() }).from(nodeBonusWithdrawals).where(where);
    const items = await db.select({ id: nodeBonusWithdrawals.id, userId: nodeBonusWithdrawals.userId, userName: users.name, userEmail: users.email, amount: nodeBonusWithdrawals.requestedAmount, status: nodeBonusWithdrawals.status, requestNote: nodeBonusWithdrawals.requestNote, bankName: nodeBonusWithdrawals.bankName, accountNumber: nodeBonusWithdrawals.accountNumber, holderName: nodeBonusWithdrawals.holderName, decisionNote: nodeBonusWithdrawals.decisionNote, transferReference: nodeBonusWithdrawals.transferReference, createdAt: nodeBonusWithdrawals.createdAt, decidedAt: nodeBonusWithdrawals.decidedAt })
      .from(nodeBonusWithdrawals).innerJoin(users, eq(nodeBonusWithdrawals.userId, users.id)).where(where).orderBy(desc(nodeBonusWithdrawals.createdAt)).limit(20).offset((page - 1) * 20);
    successResponse(res, { items, total: Number(total?.n ?? 0), page, pageSize: 20 }, "Antrean pencairan bonus node");
  } catch (error) { errorResponse(res, "Gagal memuat antrean pencairan bonus", 500, error); }
};

export const decideNodeWithdrawal = async (req: any, res: any) => {
  try {
    if (!z.string().uuid().safeParse(req.params.id).success) return errorResponse(res, "Permintaan tidak ditemukan", 404);
    const parsed = decisionSchema.safeParse(req.body);
    if (!parsed.success) return errorResponse(res, "Data keputusan belum lengkap.", 400);
    const outcome = await db.transaction(async (tx) => {
      const [request] = await tx.select().from(nodeBonusWithdrawals).where(eq(nodeBonusWithdrawals.id, req.params.id)).for("update");
      if (!request) return { code: 404 as const, message: "Permintaan tidak ditemukan" };
      if (request.status !== "REQUESTED") return { code: 409 as const, message: "Permintaan ini sudah diproses." };
      if (request.userId === req.user.id) return { code: 403 as const, message: "Admin tidak dapat menyetujui pencairan miliknya sendiri." };
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${request.userId}))`);
      const now = new Date();
      if (parsed.data.decision === "REJECT") {
        await tx.update(nodeBonusWithdrawals).set({ status: "REJECTED", decisionNote: parsed.data.note, decidedBy: req.user.id, decidedAt: now }).where(eq(nodeBonusWithdrawals.id, request.id));
        return { code: 200 as const, message: "Permintaan pencairan ditolak; saldo bonus tidak berkurang." };
      }
      const [balanceRow] = await tx.select({ amount: sql<number>`coalesce(sum(case when ${nodeBonusLedger.direction} = 'CREDIT' then ${nodeBonusLedger.amount} else -${nodeBonusLedger.amount} end), 0)::bigint` }).from(nodeBonusLedger).where(eq(nodeBonusLedger.userId, request.userId));
      if (Number(balanceRow?.amount ?? 0) < request.requestedAmount) return { code: 409 as const, message: "Saldo bonus tidak lagi mencukupi untuk persetujuan ini." };
      await tx.insert(nodeBonusLedger).values({ userId: request.userId, ruleVersionId: (await tx.select({ id: nodeBonusLedger.ruleVersionId }).from(nodeBonusLedger).where(eq(nodeBonusLedger.userId, request.userId)).limit(1))[0]?.id, kind: "WITHDRAWAL", direction: "DEBIT", amount: request.requestedAmount, points: 0, sourceType: "WITHDRAWAL", sourceId: request.id, idempotencyKey: `NODE-WITHDRAWAL:${request.id}`, note: `Pencairan bonus disetujui: ${parsed.data.reference}` });
      await tx.update(nodeBonusWithdrawals).set({ status: "APPROVED", transferReference: parsed.data.reference, decisionNote: parsed.data.note || null, decidedBy: req.user.id, decidedAt: now }).where(eq(nodeBonusWithdrawals.id, request.id));
      return { code: 200 as const, message: "Pencairan disetujui; saldo bonus anggota telah dikurangi." };
    });
    if (outcome.code !== 200) return errorResponse(res, outcome.message, outcome.code);
    successResponse(res, null, outcome.message);
  } catch (error) { errorResponse(res, "Gagal memproses pencairan bonus", 500, error); }
};
