import { and, desc, eq, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { bankAccounts, nodeAccounts, nodeBonusLedger, nodeBonusWithdrawals, nodeDailySummaries, nodeLots, nodeRuleVersions, nodeTopupOrders } from "../schema/schema";
import { successResponse, errorResponse } from "../utils/response";
import { dailyPairingCapacity, nodeTier, topupQuote } from "@shared/node-program";

const quoteSchema = z.object({ nodeCount: z.number().int().min(1).max(100_000) });
const withdrawalSchema = z.object({ amount: z.number().int().positive().max(2_000_000_000), bankAccountId: z.string().uuid(), note: z.string().trim().max(500).optional() });
const simulationMode = () => process.env.NODE_SIMULATION_MODE === "true";

const ledgerBalance = async (tx: any, userId: string): Promise<number> => {
  const [row] = await tx.select({ amount: sql<number>`coalesce(sum(case when ${nodeBonusLedger.direction} = 'CREDIT' then ${nodeBonusLedger.amount} else -${nodeBonusLedger.amount} end), 0)::bigint` })
    .from(nodeBonusLedger).where(eq(nodeBonusLedger.userId, userId));
  return Number(row?.amount ?? 0);
};

const pendingWithdrawalAmount = async (tx: any, userId: string): Promise<number> => {
  const [row] = await tx.select({ amount: sql<number>`coalesce(sum(${nodeBonusWithdrawals.requestedAmount}), 0)::bigint` })
    .from(nodeBonusWithdrawals).where(and(eq(nodeBonusWithdrawals.userId, userId), eq(nodeBonusWithdrawals.status, "REQUESTED")));
  return Number(row?.amount ?? 0);
};

const currentRule = async () => {
  const now = new Date();
  const [active] = await db.select().from(nodeRuleVersions)
    .where(and(eq(nodeRuleVersions.status, "ACTIVE"), lte(nodeRuleVersions.effectiveFrom, now)))
    .orderBy(desc(nodeRuleVersions.version)).limit(1);
  if (active) return { rule: active, active: true };
  const [draft] = await db.select().from(nodeRuleVersions).orderBy(desc(nodeRuleVersions.version)).limit(1);
  return { rule: draft ?? null, active: false };
};

export const getMyNodeSummary = async (req: any, res: any) => {
  try {
    const userId: string = req.user.id;
    const [{ nodes }] = await db.select({ nodes: sql<number>`coalesce(sum(${nodeLots.activeNodes}), 0)::int` })
      .from(nodeLots).where(and(eq(nodeLots.userId, userId), eq(nodeLots.status, "ACTIVE")));
    const activeNodes = Number(nodes ?? 0);
    const bonusBalance = await ledgerBalance(db, userId);
    const history = await db.select().from(nodeDailySummaries).where(eq(nodeDailySummaries.userId, userId))
      .orderBy(desc(nodeDailySummaries.businessDate)).limit(31);
    const { rule, active } = await currentRule();
    const multiplier = rule?.dailyPointMultiplier ?? 16;
    const [account] = await db.select({ referralCode: nodeAccounts.referralCode, sponsorUserId: nodeAccounts.sponsorUserId, status: nodeAccounts.status }).from(nodeAccounts).where(eq(nodeAccounts.userId, userId)).limit(1);
    successResponse(res, {
      programStatus: active ? "ACTIVE" : "DRAFT",
      simulationMode: simulationMode(),
      activeNodes,
      tier: nodeTier(activeNodes),
      capacityPoints: dailyPairingCapacity(activeNodes, multiplier),
      bonusBalance,
      rule: rule ? { version: rule.version, nodePrice: rule.nodePrice, pairingPercent: rule.pairingPercent, dailyPointMultiplier: rule.dailyPointMultiplier } : null,
      today: history[0] ?? null,
      history,
      referral: account ? { code: account.referralCode, hasSponsor: Boolean(account.sponsorUserId), status: account.status } : null,
    }, "Ringkasan Program Node");
  } catch (error) {
    errorResponse(res, "Gagal memuat Program Node", 500, error);
  }
};

export const getMyNodeWithdrawals = async (req: any, res: any) => {
  try {
    const userId = req.user.id as string;
    const [balance, pending, items, banks] = await Promise.all([
      ledgerBalance(db, userId), pendingWithdrawalAmount(db, userId),
      db.select().from(nodeBonusWithdrawals).where(eq(nodeBonusWithdrawals.userId, userId)).orderBy(desc(nodeBonusWithdrawals.createdAt)).limit(30),
      db.select({ id: bankAccounts.id, bankName: bankAccounts.bankName, accountNumber: bankAccounts.accountNumber, holderName: bankAccounts.holderName }).from(bankAccounts).where(eq(bankAccounts.userId, userId)).orderBy(desc(bankAccounts.createdAt)),
    ]);
    successResponse(res, { balance, pendingAmount: pending, availableAmount: Math.max(0, balance - pending), items, banks, simulationMode: simulationMode() }, "Pencairan bonus saya");
  } catch (error) { errorResponse(res, "Gagal memuat pencairan bonus", 500, error); }
};

export const requestNodeWithdrawal = async (req: any, res: any) => {
  try {
    if (!simulationMode()) return errorResponse(res, "Pencairan bonus hanya aktif pada mode simulasi staging.", 403);
    const parsed = withdrawalSchema.safeParse(req.body);
    if (!parsed.success) return errorResponse(res, "Jumlah pencairan harus berupa angka positif.", 400);
    const result = await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${req.user.id}))`);
      const [bank] = await tx.select().from(bankAccounts).where(and(eq(bankAccounts.id, parsed.data.bankAccountId), eq(bankAccounts.userId, req.user.id))).limit(1);
      if (!bank) return { ok: false as const, available: -1, invalidBank: true };
      const balance = await ledgerBalance(tx, req.user.id);
      const pending = await pendingWithdrawalAmount(tx, req.user.id);
      const available = Math.max(0, balance - pending);
      if (parsed.data.amount > available) return { ok: false as const, available };
      const [row] = await tx.insert(nodeBonusWithdrawals).values({ userId: req.user.id, requestedAmount: parsed.data.amount, requestNote: parsed.data.note || null, bankAccountId: bank.id, bankName: bank.bankName, accountNumber: bank.accountNumber, holderName: bank.holderName }).returning({ id: nodeBonusWithdrawals.id });
      return { ok: true as const, id: row.id };
    });
    if (!result.ok) return errorResponse(res, result.invalidBank ? "Pilih rekening bank milik Anda terlebih dahulu." : `Saldo bonus tersedia hanya Rp${new Intl.NumberFormat("id-ID").format(result.available)}.`, 400);
    successResponse(res, { id: result.id }, "Permintaan pencairan bonus dikirim dan menunggu persetujuan admin.", 201);
  } catch (error) { errorResponse(res, "Gagal mengajukan pencairan bonus", 500, error); }
};

export const listMyNodeTopups = async (req: any, res: any) => {
  try {
    const rows = await db.select({
      id: nodeTopupOrders.id,
      nodeCount: nodeTopupOrders.nodeCount,
      nodePrice: nodeTopupOrders.nodePrice,
      amount: nodeTopupOrders.amount,
      status: nodeTopupOrders.status,
      paymentReference: nodeTopupOrders.paymentReference,
      decisionNote: nodeTopupOrders.decisionNote,
      paidAt: nodeTopupOrders.paidAt,
      createdAt: nodeTopupOrders.createdAt,
    }).from(nodeTopupOrders).where(eq(nodeTopupOrders.userId, req.user.id))
      .orderBy(desc(nodeTopupOrders.createdAt)).limit(25);
    successResponse(res, rows, "Riwayat top up node");
  } catch (error) {
    errorResponse(res, "Gagal memuat riwayat top up node", 500, error);
  }
};

/** Hanya untuk staging: membuat pesanan transfer manual tiruan tanpa uang sungguhan. */
export const createNodeTopupSimulation = async (req: any, res: any) => {
  try {
    if (!simulationMode()) return errorResponse(res, "Pembuatan pesanan uji tidak aktif.", 403);
    const parsed = quoteSchema.safeParse(req.body);
    if (!parsed.success) return errorResponse(res, "Jumlah node harus 1 sampai 100.000.", 400);
    const { rule } = await currentRule();
    if (!rule) return errorResponse(res, "Aturan Program Node belum tersedia.", 503);
    const quote = topupQuote(parsed.data.nodeCount, rule.nodePrice);
    const [order] = await db.insert(nodeTopupOrders).values({
      userId: req.user.id,
      ruleVersionId: rule.id,
      nodeCount: quote.nodeCount,
      nodePrice: quote.nodePrice,
      amount: quote.total,
      status: "VERIFYING",
    }).returning({ id: nodeTopupOrders.id, status: nodeTopupOrders.status, amount: nodeTopupOrders.amount });
    successResponse(res, order, "Pesanan uji dibuat dan menunggu persetujuan admin", 201);
  } catch (error) {
    errorResponse(res, "Gagal membuat pesanan uji", 500, error);
  }
};

export const previewNodeTopup = async (req: any, res: any) => {
  try {
    const parsed = quoteSchema.safeParse(req.body);
    if (!parsed.success) return errorResponse(res, "Jumlah node harus 1 sampai 100.000.", 400);
    const { rule, active } = await currentRule();
    if (!rule) return errorResponse(res, "Aturan Program Node belum tersedia.", 503);
    successResponse(res, { ...topupQuote(parsed.data.nodeCount, rule.nodePrice), ruleVersion: rule.version, programStatus: active ? "ACTIVE" : "DRAFT" }, "Simulasi top up node");
  } catch (error) {
    errorResponse(res, "Gagal menghitung top up node", 500, error);
  }
};
