// Siklus hidup order pembayaran. Semua perubahan status melewati sini agar idempoten dan reservasi diskon tidak bocor.
import { and, asc, eq, lt, sql } from "drizzle-orm";
import { db } from "../db";
import { paymentOrders, transactions, users } from "../schema/schema";
import { notifyUser } from "./cards";
import { fulfillCourse, releaseReservation } from "./enrollment";
import { bridge } from "./digitalcoop-bridge";
import { midtrans, midtransConfigured } from "./midtrans";
import { CONFIRMING_GIVE_UP_MINUTES, isOpenStatus, mapMidtransStatus, parseGrossAmount } from "@shared/payment";

export type OrderRow = typeof paymentOrders.$inferSelect;
type Tx = any;

export const lockOrder = async (tx: Tx, id: string): Promise<OrderRow | null> => {
  const [o] = await tx.select().from(paymentOrders).where(eq(paymentOrders.id, id)).for("update").limit(1);
  return o ?? null;
};

const methodLabel = (m: string): string => (m === "VA" ? "Virtual Account" : m === "MANUAL" ? "transfer manual" : "dompet digitalcoop.id");

/** Menandai order lunas dan memenuhi isinya (enrollment atau saldo dompet). Idempoten: order yang sudah final dilewati. */
export const markPaid = async (tx: Tx, order: OrderRow, extra: Partial<typeof paymentOrders.$inferInsert> = {}): Promise<{ done: boolean; cardNumber: string | null }> => {
  if (!isOpenStatus(order.status)) return { done: false, cardNumber: null };
  const now = new Date();
  let enrollmentId: string | null = null;
  let cardNumber: string | null = null;

  if (order.kind === "COURSE" && order.courseId) {
    const [u] = await tx.select({ role: users.role }).from(users).where(eq(users.id, order.userId)).limit(1);
    const f = await fulfillCourse(tx, {
      userId: order.userId, role: u?.role ?? "STUDENT", courseId: order.courseId, basePrice: order.basePrice ?? order.amount,
      discountPercent: order.discountPercent ?? 0, discountId: order.discountId, amountPaid: order.amount,
    });
    if (f) {
      enrollmentId = f.enrollmentId;
      cardNumber = f.cardNumber;
      await notifyUser(tx, order.userId, "Pembayaran diterima", `Pembayaran Rp ${order.amount.toLocaleString("id-ID")} lewat ${methodLabel(order.method)} diterima. Kursus sudah terbuka.`, "PEMBAYARAN");
    } else {
      // Sudah terdaftar lewat jalur lain: dana dikembalikan ke dompet Academy, tidak hilang.
      await creditWallet(tx, order.userId, order.amount, "Pengembalian pembayaran: sudah terdaftar di kursus ini", order.id);
      await notifyUser(tx, order.userId, "Pembayaran dikembalikan ke dompet", `Anda sudah terdaftar di kursus ini. Rp ${order.amount.toLocaleString("id-ID")} dikreditkan ke dompet Academy.`, "PEMBAYARAN");
    }
  } else {
    await creditWallet(tx, order.userId, order.amount, `Top Up Saldo via ${methodLabel(order.method)}`, order.id, order.method);
    await notifyUser(tx, order.userId, "Top-up berhasil", `Saldo dompet Academy bertambah Rp ${order.amount.toLocaleString("id-ID")}.`, "PEMBAYARAN");
  }

  await tx.update(paymentOrders).set({ ...extra, status: "PAID", paidAt: now, enrollmentId, updatedAt: now }).where(eq(paymentOrders.id, order.id));
  return { done: true, cardNumber };
};

const creditWallet = async (tx: Tx, userId: string, amount: number, description: string, orderId: string, method?: string) => {
  await tx.update(users).set({ walletBalance: sql`${users.walletBalance} + ${amount}` }).where(eq(users.id, userId));
  await tx.insert(transactions).values({ userId, amount, type: "CREDIT", status: "SUCCESS", description, paymentMethod: method ?? null, referenceId: orderId });
};

/** Menutup order tanpa pembayaran (kedaluwarsa/batal/ditolak) dan mengembalikan reservasi diskon. */
export const closeOrder = async (tx: Tx, order: OrderRow, status: "EXPIRED" | "CANCELLED" | "REJECTED", extra: Partial<typeof paymentOrders.$inferInsert> = {}): Promise<boolean> => {
  if (!isOpenStatus(order.status)) return false;
  if (order.kind === "COURSE") await releaseReservation(tx, order.discountId, order.userId);
  await tx.update(paymentOrders).set({ ...extra, status, updatedAt: new Date() }).where(eq(paymentOrders.id, order.id));
  return true;
};

/** Order PENDING yang lewat batas waktu ditutup. Dipanggil saat order dibaca dan oleh job berkala. */
export const expireStaleOrders = async (userId?: string): Promise<number> => {
  const now = new Date();
  return db.transaction(async (tx) => {
    const where = userId
      ? and(eq(paymentOrders.status, "PENDING"), lt(paymentOrders.expiresAt, now), eq(paymentOrders.userId, userId))
      : and(eq(paymentOrders.status, "PENDING"), lt(paymentOrders.expiresAt, now));
    const stale = await tx.select().from(paymentOrders).where(where).for("update", { skipLocked: true }).limit(200);
    let n = 0;
    for (const o of stale) if (await closeOrder(tx, o, "EXPIRED")) n += 1;
    return n;
  });
};

export type GatewayApply = "UNKNOWN" | "AMOUNT_MISMATCH" | "PAID" | "CLOSED" | "PENDING" | "IGNORED";

/** Menerapkan status resmi Midtrans ke order. Dipakai webhook dan rekonsiliasi; aman dipanggil berulang. */
export const applyGatewayStatus = async (orderId: string, st: Record<string, unknown>): Promise<GatewayApply> => {
  return db.transaction(async (tx) => {
    const order = await lockOrder(tx, orderId);
    if (!order || order.method !== "VA") return "UNKNOWN";
    if (!isOpenStatus(order.status)) return "IGNORED";
    const gross = parseGrossAmount(st.gross_amount);
    if (gross === null || gross !== order.amount) {
      console.error(`[bayar] jumlah tidak cocok order=${order.id} tagihan=${order.amount} gateway=${String(st.gross_amount)}`);
      return "AMOUNT_MISMATCH";
    }
    const outcome = mapMidtransStatus(st.transaction_status, st.fraud_status);
    const gatewayStatus = String(st.transaction_status ?? "").slice(0, 30);
    if (outcome === "PAID") {
      await markPaid(tx, order, { gatewayStatus });
      return "PAID";
    }
    if (outcome === "FAILED") {
      await closeOrder(tx, order, gatewayStatus === "expire" ? "EXPIRED" : "CANCELLED", { gatewayStatus });
      return "CLOSED";
    }
    await tx.update(paymentOrders).set({ gatewayStatus, updatedAt: new Date() }).where(eq(paymentOrders.id, order.id));
    return "PENDING";
  });
};

/** Cadangan bila webhook terlewat: tanyakan status order VA yang masih PENDING ke Midtrans. */
export const reconcileVaOrders = async (): Promise<number> => {
  if (!midtransConfigured()) return 0;
  const rows = await db.select({ id: paymentOrders.id }).from(paymentOrders)
    .where(and(eq(paymentOrders.method, "VA"), eq(paymentOrders.status, "PENDING"))).orderBy(asc(paymentOrders.createdAt)).limit(50);
  let n = 0;
  for (const r of rows) {
    try {
      const st = await midtrans.status(r.id);
      if ((await applyGatewayStatus(r.id, st)) === "PAID") n += 1;
    } catch (err: any) {
      if (err?.status !== 404) console.error(`[bayar] rekonsiliasi VA gagal order=${r.id}: ${err?.message}`);
    }
  }
  return n;
};

/** Debit dompet digitalcoop.id yang jawabannya tak pasti: tanyakan statusnya. Berhasil -> PAID; tanpa jejak terlalu lama -> batal. */
export const reconcileConfirming = async (): Promise<number> => {
  const rows = await db.select().from(paymentOrders).where(and(eq(paymentOrders.method, "DC_WALLET"), eq(paymentOrders.status, "CONFIRMING"))).limit(50);
  let n = 0;
  for (const o of rows) {
    try {
      const s = await bridge.statusDebit(o.id);
      if (s.status === "SUCCESS") {
        await db.transaction(async (tx) => {
          const locked = await lockOrder(tx, o.id);
          if (locked) await markPaid(tx, locked, { debitTxId: s.txId ? String(s.txId).slice(0, 100) : null });
        });
        n += 1;
      } else if (Date.now() - o.updatedAt.getTime() > CONFIRMING_GIVE_UP_MINUTES * 60_000) {
        await db.transaction(async (tx) => {
          const locked = await lockOrder(tx, o.id);
          if (locked) {
            await closeOrder(tx, locked, "CANCELLED", { decisionNote: "Debit dompet digitalcoop.id tidak ditemukan." });
            await notifyUser(tx, locked.userId, "Pembayaran dibatalkan", "Pembayaran dari dompet digitalcoop.id tidak terkonfirmasi dan saldo Anda tidak dipotong. Silakan ulangi.", "PEMBAYARAN");
          }
        });
      }
    } catch (err: any) {
      console.error(`[bayar] rekonsiliasi debit gagal order=${o.id}: ${err?.message}`);
    }
  }
  return n;
};

let timer: NodeJS.Timeout | null = null;
let tick = 0;
/** Job berkala tiap 60 detik: kedaluwarsa, debit tak pasti; tiap 5 menit juga VA. Satu proses saja (pm2 fork). */
export const startOrderJobs = (): void => {
  if (timer) return;
  timer = setInterval(async () => {
    tick += 1;
    try {
      await expireStaleOrders();
      await reconcileConfirming();
      if (tick % 5 === 0) await reconcileVaOrders();
    } catch (err: any) {
      console.error(`[bayar] job gagal: ${err?.message}`);
    }
  }, 60_000);
  timer.unref();
};
