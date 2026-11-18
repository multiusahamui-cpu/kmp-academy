// Midtrans Core API (Virtual Account bank transfer). Tanpa SDK: fetch + Basic auth.
//   MIDTRANS_SERVER_KEY      kunci server (hanya di .env)
//   MIDTRANS_IS_PRODUCTION   "true" untuk produksi; selain itu sandbox
import crypto from "node:crypto";
import { VA_BANKS, type VaBank } from "@shared/payment";

export class MidtransError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "MidtransError";
  }
}

export const midtransConfigured = (env: NodeJS.ProcessEnv = process.env): boolean => Boolean(env.MIDTRANS_SERVER_KEY && env.MIDTRANS_SERVER_KEY.length >= 10);
const baseUrl = (env: NodeJS.ProcessEnv): string => (env.MIDTRANS_IS_PRODUCTION === "true" ? "https://api.midtrans.com" : "https://api.sandbox.midtrans.com");

type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body?: string; signal?: AbortSignal }) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

/** Tanda tangan notifikasi: SHA512(order_id + status_code + gross_amount + serverKey). Dibandingkan waktu-konstan. */
export const verifyNotificationSignature = (body: Record<string, unknown>, serverKey: string): boolean => {
  const { order_id, status_code, gross_amount, signature_key } = body;
  if (![order_id, status_code, gross_amount, signature_key].every((v) => typeof v === "string" && v.length > 0)) return false;
  const expected = crypto.createHash("sha512").update(`${order_id}${status_code}${gross_amount}${serverKey}`).digest("hex");
  const given = String(signature_key);
  return given.length === expected.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
};

/** expiry_time Midtrans memakai WIB tanpa zona. */
export const parseExpiry = (raw: unknown, fallback: Date): Date => {
  if (typeof raw !== "string" || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(raw)) return fallback;
  const d = new Date(`${raw.replace(" ", "T")}+07:00`);
  return Number.isNaN(d.getTime()) ? fallback : d;
};

export interface VaCharge { bank: VaBank; vaNumber: string; expiresAt: Date; transactionStatus: string }

export const createMidtrans = (env: NodeJS.ProcessEnv = process.env, fetchImpl: FetchLike = fetch as unknown as FetchLike) => {
  const call = async <T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> => {
    if (!midtransConfigured(env)) throw new MidtransError(503, "Pembayaran Virtual Account belum dikonfigurasi.");
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    try {
      const res = await fetchImpl(`${baseUrl(env)}${path}`, {
        method,
        headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Basic ${Buffer.from(`${env.MIDTRANS_SERVER_KEY}:`).toString("base64")}` },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: ctrl.signal,
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      // Midtrans menjawab HTTP 200 dengan status_code di badan; 404 transaksi tidak ada juga lewat badan.
      const code = Number(data.status_code ?? res.status);
      if (!res.ok || code >= 400) throw new MidtransError(code === 404 ? 404 : 502, String(data.status_message ?? "Gagal menghubungi Midtrans."));
      return data as T;
    } catch (err) {
      if (err instanceof MidtransError) throw err;
      throw new MidtransError(502, "Midtrans tidak dapat dihubungi. Coba lagi sebentar.");
    } finally {
      clearTimeout(timer);
    }
  };

  return {
    /** Membuat VA untuk order. order_id Midtrans = id order Academy. */
    createVa: async (orderId: string, amount: number, bank: VaBank, now: Date, expiryHours: number, customerName: string): Promise<VaCharge> => {
      if (!(VA_BANKS as readonly string[]).includes(bank)) throw new MidtransError(400, "Bank tidak didukung.");
      const base: Record<string, unknown> = {
        transaction_details: { order_id: orderId, gross_amount: amount },
        customer_details: { first_name: customerName.slice(0, 50) },
        custom_expiry: { order_time: formatOrderTime(now), expiry_duration: expiryHours, unit: "hour" },
      };
      const body = bank === "permata" ? { payment_type: "permata", ...base } : { payment_type: "bank_transfer", bank_transfer: { bank }, ...base };
      const r = await call<Record<string, unknown>>("POST", "/v2/charge", body);
      const va = bank === "permata" ? String(r.permata_va_number ?? "") : String((r.va_numbers as { va_number?: string }[] | undefined)?.[0]?.va_number ?? "");
      if (!va) throw new MidtransError(502, "Midtrans tidak mengembalikan nomor VA.");
      return { bank, vaNumber: va, expiresAt: parseExpiry(r.expiry_time, new Date(now.getTime() + expiryHours * 3_600_000)), transactionStatus: String(r.transaction_status ?? "pending") };
    },
    /** Status resmi dari Midtrans; dipakai untuk memastikan isi notifikasi, bukan memercayai badan notifikasi. */
    status: (orderId: string) => call<Record<string, unknown>>("GET", `/v2/${encodeURIComponent(orderId)}/status`),
    cancel: (orderId: string) => call<Record<string, unknown>>("POST", `/v2/${encodeURIComponent(orderId)}/cancel`),
  };
};

/** Format "YYYY-MM-DD HH:mm:ss +0700" untuk custom_expiry.order_time. */
export const formatOrderTime = (d: Date): string => {
  const w = new Date(d.getTime() + 7 * 3_600_000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${w.getUTCFullYear()}-${p(w.getUTCMonth() + 1)}-${p(w.getUTCDate())} ${p(w.getUTCHours())}:${p(w.getUTCMinutes())}:${p(w.getUTCSeconds())} +0700`;
};

export const midtrans = createMidtrans();
