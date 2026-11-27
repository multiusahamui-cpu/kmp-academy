import { count, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { nodeAccounts, nodeLots, nodeTopupOrders, users } from "../schema/schema";
import { errorResponse, successResponse } from "../utils/response";

const decisionSchema = z.discriminatedUnion("decision", [
  z.object({ decision: z.literal("APPROVE"), reference: z.string().trim().min(3).max(100), note: z.string().trim().max(500).optional() }),
  z.object({ decision: z.literal("REJECT"), note: z.string().trim().min(5).max(500) }),
]);
const validStatus = new Set(["VERIFYING", "SETTLED", "REJECTED", "ALL"]);

export const listNodeTopups = async (req: any, res: any) => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : "VERIFYING";
    if (!validStatus.has(status)) return errorResponse(res, "Status tidak valid", 400);
    const page = Math.max(1, Number.parseInt(String(req.query.page ?? "1"), 10) || 1);
    const where = status === "ALL" ? undefined : eq(nodeTopupOrders.status, status);
    const [total] = await db.select({ n: count() }).from(nodeTopupOrders).where(where);
    const items = await db.select({
      id: nodeTopupOrders.id,
      userId: nodeTopupOrders.userId,
      userName: users.name,
      userEmail: users.email,
      nodeCount: nodeTopupOrders.nodeCount,
      nodePrice: nodeTopupOrders.nodePrice,
      amount: nodeTopupOrders.amount,
      status: nodeTopupOrders.status,
      paymentReference: nodeTopupOrders.paymentReference,
      decisionNote: nodeTopupOrders.decisionNote,
      decidedAt: nodeTopupOrders.decidedAt,
      createdAt: nodeTopupOrders.createdAt,
    }).from(nodeTopupOrders).innerJoin(users, eq(nodeTopupOrders.userId, users.id))
      .where(where).orderBy(desc(nodeTopupOrders.createdAt)).limit(20).offset((page - 1) * 20);
    successResponse(res, { items, total: Number(total?.n ?? 0), page, pageSize: 20 }, "Antrean top up node");
  } catch (error) {
    errorResponse(res, "Gagal memuat antrean top up node", 500, error);
  }
};

export const decideNodeTopup = async (req: any, res: any) => {
  try {
    if (!z.string().uuid().safeParse(req.params.id).success) return errorResponse(res, "Pesanan tidak ditemukan", 404);
    const parsed = decisionSchema.safeParse(req.body);
    if (!parsed.success) return errorResponse(res, "Data keputusan belum lengkap.", 400);
    const outcome = await db.transaction(async (tx) => {
      const [order] = await tx.select().from(nodeTopupOrders).where(eq(nodeTopupOrders.id, req.params.id)).for("update");
      if (!order) return { code: 404 as const, message: "Pesanan tidak ditemukan" };
      if (order.status !== "VERIFYING") return { code: 409 as const, message: "Pesanan ini sudah diproses atau tidak menunggu verifikasi." };
      if (order.userId === req.user.id) return { code: 403 as const, message: "Admin tidak dapat menyetujui pesanan miliknya sendiri." };
      const now = new Date();
      if (parsed.data.decision === "REJECT") {
        await tx.update(nodeTopupOrders).set({ status: "REJECTED", decisionNote: parsed.data.note, decidedBy: req.user.id, decidedAt: now }).where(eq(nodeTopupOrders.id, order.id));
        return { code: 200 as const, message: "Pesanan top up node ditolak." };
      }
      await tx.update(nodeTopupOrders).set({
        status: "SETTLED", paymentReference: parsed.data.reference, decisionNote: parsed.data.note || null,
        decidedBy: req.user.id, decidedAt: now, paidAt: now, settledAt: now,
      }).where(eq(nodeTopupOrders.id, order.id));
      await tx.insert(nodeLots).values({
        userId: order.userId, topupOrderId: order.id, ruleVersionId: order.ruleVersionId,
        issuedNodes: order.nodeCount, activeNodes: order.nodeCount, status: "ACTIVE", activatedAt: now,
      });
      await tx.update(nodeAccounts).set({ status: "ACTIVE" }).where(eq(nodeAccounts.userId, order.userId));
      return { code: 200 as const, message: `${order.nodeCount} node berhasil diaktifkan.` };
    });
    if (outcome.code !== 200) return errorResponse(res, outcome.message, outcome.code);
    console.info(`[node-topup] order=${req.params.id} diproses oleh=${req.user.id}`);
    successResponse(res, null, outcome.message);
  } catch (error) {
    errorResponse(res, "Gagal memproses top up node", 500, error);
  }
};
