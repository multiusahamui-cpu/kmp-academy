import { and, desc, eq, isNull, lte, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { nodeAccounts, nodeBonusLedger, nodeDailySummaries, nodeLots, nodeRuleVersions, nodeTopupOrders, transactions, users } from "../schema/schema";
import { successResponse, errorResponse } from "../utils/response";
import { dailyPairingCapacity, nodeTier, topupQuote } from "@shared/node-program";
import { bridge, BridgeError } from "../lib/digitalcoop-bridge";

const quoteSchema = z.object({ nodeCount: z.number().int().min(1).max(100_000) });
const buySchema = z.object({ nodeCount: z.number().int().min(1).max(100_000), pin: z.string().min(4).max(12) });
// Status bridge yang pasti gagal (uang tidak terpotong): tolak order. Selain ini: tak pasti, biarkan CONFIRMING.
const DEFINITE_FAIL = new Set([400, 401, 403, 404, 409, 423, 503]);
const claimSchema = z.object({ amount: z.number().int().positive().max(2_000_000_000) });

const ledgerBalance = async (tx: any, userId: string): Promise<number> => {
  const [row] = await tx.select({ amount: sql<number>`coalesce(sum(case when ${nodeBonusLedger.direction} = 'CREDIT' then ${nodeBonusLedger.amount} else -${nodeBonusLedger.amount} end), 0)::bigint` })
    .from(nodeBonusLedger).where(eq(nodeBonusLedger.userId, userId));
  return Number(row?.amount ?? 0);
};

const currentRule = async () => {
  const now = new Date();
  const [active] = await db.select().from(nodeRuleVersions)
    .where(and(eq(nodeRuleVersions.status, "ACTIVE"), or(isNull(nodeRuleVersions.effectiveFrom), lte(nodeRuleVersions.effectiveFrom, now))))
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
    const [u] = await db.select({ walletBalance: users.walletBalance, digitalcoopUserId: users.digitalcoopUserId }).from(users).where(eq(users.id, userId)).limit(1);
    let ssBalance = Number(u?.walletBalance ?? 0);
    let pinSet = true;
    if (u?.digitalcoopUserId) {
      try { const sal = await bridge.saldo(u.digitalcoopUserId); ssBalance = Number(sal.saldo ?? 0); pinSet = Boolean(sal.pinSet); }
      catch { /* bridge tak terjangkau: pakai saldo lokal sebagai perkiraan */ }
    }
    const history = await db.select().from(nodeDailySummaries).where(eq(nodeDailySummaries.userId, userId))
      .orderBy(desc(nodeDailySummaries.businessDate)).limit(31);
    const { rule, active } = await currentRule();
    const multiplier = rule?.dailyPointMultiplier ?? 16;
    const [account] = await db.select({ referralCode: nodeAccounts.referralCode, sponsorUserId: nodeAccounts.sponsorUserId, status: nodeAccounts.status }).from(nodeAccounts).where(eq(nodeAccounts.userId, userId)).limit(1);
    successResponse(res, {
      programStatus: active ? "ACTIVE" : "DRAFT",
      walletBalance: ssBalance,
      pinSet,
      isMember: Boolean(u?.digitalcoopUserId),
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

export const previewNodeTopup = async (req: any, res: any) => {
  try {
    const parsed = quoteSchema.safeParse(req.body);
    if (!parsed.success) return errorResponse(res, "Jumlah node harus 1 sampai 100.000.", 400);
    const { rule, active } = await currentRule();
    if (!rule) return errorResponse(res, "Aturan Program Node belum tersedia.", 503);
    successResponse(res, { ...topupQuote(parsed.data.nodeCount, rule.nodePrice), ruleVersion: rule.version, programStatus: active ? "ACTIVE" : "DRAFT" }, "Perhitungan top up node");
  } catch (error) {
    errorResponse(res, "Gagal menghitung top up node", 500, error);
  }
};

/** Beli node dibayar dari dompet Simpanan Sukarela digitalcoop.id (bridge). Node aktif saat pembayaran sukses. */
export const createNodeTopup = async (req: any, res: any) => {
  try {
    const parsed = buySchema.safeParse(req.body);
    if (!parsed.success) return errorResponse(res, "Jumlah node (1-100.000) dan PIN transaksi wajib diisi.", 400);
    const { rule, active } = await currentRule();
    if (!rule || !active) return errorResponse(res, "Program Node belum aktif. Hubungi admin.", 503);
    const quote = topupQuote(parsed.data.nodeCount, rule.nodePrice);

    const [u] = await db.select({ dcId: users.digitalcoopUserId, name: users.name }).from(users).where(eq(users.id, req.user.id)).limit(1);
    if (!u?.dcId) return errorResponse(res, "Pembelian node memakai dompet Simpanan Sukarela digitalcoop.id. Fitur ini untuk anggota tertaut (SSO).", 400);

    // Order sebagai jangkar idempotensi; id-nya dipakai sebagai idempotencyKey bridge.
    const [order] = await db.insert(nodeTopupOrders).values({
      userId: req.user.id, ruleVersionId: rule.id, nodeCount: quote.nodeCount, nodePrice: quote.nodePrice,
      amount: quote.total, status: "CONFIRMING",
    }).returning({ id: nodeTopupOrders.id });

    try {
      const r = await bridge.debit({
        digitalcoopUserId: u.dcId, amount: quote.total, pin: parsed.data.pin,
        idempotencyKey: order.id, description: `Beli ${quote.nodeCount} node KMP-ADNG Academy`,
      });
      const now = new Date();
      await db.transaction(async (tx) => {
        await tx.update(nodeTopupOrders).set({ status: "SETTLED", paymentReference: String(r.txId ?? "").slice(0, 100) || "DOMPET", paidAt: now, settledAt: now }).where(eq(nodeTopupOrders.id, order.id));
        await tx.insert(nodeLots).values({
          userId: req.user.id, topupOrderId: order.id, ruleVersionId: rule.id,
          issuedNodes: quote.nodeCount, activeNodes: quote.nodeCount, status: "ACTIVE", activatedAt: now,
        });
        await tx.update(nodeAccounts).set({ status: "ACTIVE" }).where(eq(nodeAccounts.userId, req.user.id));
        await tx.insert(transactions).values({
          userId: req.user.id, amount: quote.total, type: "DEBIT", status: "SUCCESS",
          description: `Beli ${quote.nodeCount} Node`, referenceId: order.id, paymentMethod: "DC_WALLET",
        });
      });
      return successResponse(res, { nodes: quote.nodeCount, amount: quote.total }, `${quote.nodeCount} node aktif. Dompet Simpanan Sukarela dipotong Rp ${quote.total.toLocaleString("id-ID")}.`, 201);
    } catch (err: any) {
      if (err instanceof BridgeError && DEFINITE_FAIL.has(err.status)) {
        await db.update(nodeTopupOrders).set({ status: "REJECTED", decisionNote: err.message.slice(0, 200) }).where(eq(nodeTopupOrders.id, order.id));
        return errorResponse(res, err.message, err.status === 423 ? 423 : err.status === 409 ? 400 : err.status);
      }
      // Tak pasti: order tetap CONFIRMING; rekonsiliasi lewat status debit menyusul.
      console.error(`[node-topup] debit tak pasti order=${order.id}: ${err?.message}`);
      return res.status(202).json({ success: true, message: "Pembayaran sedang dikonfirmasi. Status node diperbarui otomatis bila berhasil." });
    }
  } catch (error) {
    errorResponse(res, "Gagal membeli node", 500, error);
  }
};

/** Saldo bonus node dan riwayat pencairannya ke dompet. */
export const getMyBonusWallet = async (req: any, res: any) => {
  try {
    const userId = req.user.id as string;
    const [balance, claims, u] = await Promise.all([
      ledgerBalance(db, userId),
      db.select({ id: nodeBonusLedger.id, amount: nodeBonusLedger.amount, note: nodeBonusLedger.note, createdAt: nodeBonusLedger.createdAt })
        .from(nodeBonusLedger).where(and(eq(nodeBonusLedger.userId, userId), eq(nodeBonusLedger.direction, "DEBIT"))).orderBy(desc(nodeBonusLedger.createdAt)).limit(20),
      db.select({ walletBalance: users.walletBalance }).from(users).where(eq(users.id, userId)).limit(1),
    ]);
    successResponse(res, { balance, walletBalance: Number(u[0]?.walletBalance ?? 0), items: claims }, "Saldo bonus node");
  } catch (error) {
    errorResponse(res, "Gagal memuat bonus", 500, error);
  }
};

/** Cairkan bonus node ke dompet Academy: debit ledger bonus, kredit walletBalance. Penarikan ke bank lewat menu Dompet. */
export const claimBonusToWallet = async (req: any, res: any) => {
  try {
    const parsed = claimSchema.safeParse(req.body);
    if (!parsed.success) return errorResponse(res, "Nominal pencairan harus angka positif.", 400);
    const { rule } = await currentRule();
    const result = await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${req.user.id}))`);
      const balance = await ledgerBalance(tx, req.user.id);
      if (parsed.data.amount > balance) return { ok: false as const, balance, norule: false };
      const rvId = rule?.id ?? (await tx.select({ id: nodeBonusLedger.ruleVersionId }).from(nodeBonusLedger).where(eq(nodeBonusLedger.userId, req.user.id)).limit(1))[0]?.id;
      if (!rvId) return { ok: false as const, balance, norule: true };
      await tx.insert(nodeBonusLedger).values({
        userId: req.user.id, ruleVersionId: rvId, kind: "WITHDRAWAL", direction: "DEBIT",
        amount: parsed.data.amount, points: 0, sourceType: "WALLET_CLAIM",
        idempotencyKey: `NODE-CLAIM:${req.user.id}:${Date.now()}`, note: "Pencairan bonus ke dompet Academy",
      });
      await tx.update(users).set({ walletBalance: sql`${users.walletBalance} + ${parsed.data.amount}` }).where(eq(users.id, req.user.id));
      await tx.insert(transactions).values({
        userId: req.user.id, amount: parsed.data.amount, type: "CREDIT", status: "SUCCESS",
        description: "Pencairan Bonus Node ke Dompet", paymentMethod: "NODE_BONUS",
      });
      return { ok: true as const, balance, norule: false };
    });
    if (!result.ok) {
      if (result.norule) return errorResponse(res, "Belum ada aturan node aktif.", 400);
      return errorResponse(res, `Saldo bonus tersedia hanya Rp ${new Intl.NumberFormat("id-ID").format(result.balance)}.`, 400);
    }
    successResponse(res, null, "Bonus dicairkan ke dompet Academy. Tarik ke bank lewat menu Dompet.", 201);
  } catch (error) {
    errorResponse(res, "Gagal mencairkan bonus", 500, error);
  }
};
