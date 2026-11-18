// Aturan order pembayaran Academy (murni, tanpa DB) agar bisa diuji. Server memakai ulang saat membuat dan memutuskan order.

export const ORDER_KINDS = ["COURSE", "TOPUP"] as const;
export type OrderKind = (typeof ORDER_KINDS)[number];
export const ORDER_METHODS = ["VA", "MANUAL", "DC_WALLET"] as const;
export type OrderMethod = (typeof ORDER_METHODS)[number];
export const ORDER_STATUSES = ["PENDING", "VERIFYING", "CONFIRMING", "PAID", "EXPIRED", "CANCELLED", "REJECTED"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
/** Order yang masih berjalan; hanya satu yang boleh terbuka per akun per kursus. */
export const OPEN_STATUSES: readonly OrderStatus[] = ["PENDING", "VERIFYING", "CONFIRMING"];

export const VA_BANKS = ["bca", "bni", "bri", "permata"] as const;
export type VaBank = (typeof VA_BANKS)[number];

export const TOPUP_MIN = 10_000;
export const TOPUP_MAX = 20_000_000;
export const MAX_OPEN_TOPUPS = 3;
export const MANUAL_EXPIRY_HOURS = 48;
export const VA_EXPIRY_HOURS = 24;
/** Debit dompet digitalcoop.id yang tak pasti baru dianggap gagal setelah selama ini tanpa jejak di digitalcoop.id. */
export const CONFIRMING_GIVE_UP_MINUTES = 30;
export const DECISION_NOTE_MIN = 10;
export const REFERENCE_MIN = 3;
export const REFERENCE_MAX = 100;

type Result<T> = { ok: true; value: T } | { ok: false; message: string };
const fail = (message: string): { ok: false; message: string } => ({ ok: false, message });

export const isOpenStatus = (s: string): boolean => (OPEN_STATUSES as readonly string[]).includes(s);

export const validateTopupAmount = (raw: unknown): Result<number> => {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isInteger(n)) return fail("Jumlah top-up harus bilangan bulat rupiah.");
  if (n < TOPUP_MIN) return fail(`Top-up minimal Rp ${TOPUP_MIN.toLocaleString("id-ID")}.`);
  if (n > TOPUP_MAX) return fail(`Top-up maksimal Rp ${TOPUP_MAX.toLocaleString("id-ID")}.`);
  return { ok: true, value: n };
};

export const validatePin = (raw: unknown): Result<string> =>
  typeof raw === "string" && /^\d{4,12}$/.test(raw) ? { ok: true, value: raw } : fail("PIN Transaksi wajib diisi (angka).");

export const expiryFor = (method: OrderMethod, now: Date): Date =>
  new Date(now.getTime() + (method === "MANUAL" ? MANUAL_EXPIRY_HOURS : VA_EXPIRY_HOURS) * 3_600_000);

export interface ManualDecisionInput {
  decision: "APPROVE" | "REJECT";
  paidAmount: number | null;
  paidDate: string | null;
  reference: string;
  note: string;
}

/** Keputusan Admin atas bukti transfer. Persetujuan: jumlah harus sama persis, tanggal tidak di masa depan, referensi wajib. */
export const validateManualDecision = (raw: Record<string, unknown>, orderAmount: number, today: string): Result<ManualDecisionInput> => {
  const decision = raw.decision;
  if (decision !== "APPROVE" && decision !== "REJECT") return fail("Keputusan tidak valid.");
  const note = typeof raw.note === "string" ? raw.note.trim() : "";
  if (note.length > 500) return fail("Catatan maksimal 500 karakter.");
  if (decision === "REJECT") {
    if (note.length < DECISION_NOTE_MIN) return fail(`Catatan penolakan wajib diisi, minimal ${DECISION_NOTE_MIN} karakter.`);
    return { ok: true, value: { decision, paidAmount: null, paidDate: null, reference: "", note } };
  }
  const paidAmount = Number(raw.paidAmount);
  if (!Number.isInteger(paidAmount) || paidAmount !== orderAmount) return fail("Jumlah yang diterima harus sama persis dengan tagihan.");
  const paidDate = typeof raw.paidDate === "string" ? raw.paidDate : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paidDate) || Number.isNaN(new Date(`${paidDate}T00:00:00Z`).getTime())) return fail("Tanggal bayar tidak valid (YYYY-MM-DD).");
  if (paidDate > today) return fail("Tanggal bayar tidak boleh di masa depan.");
  const reference = typeof raw.reference === "string" ? raw.reference.trim() : "";
  if (reference.length < REFERENCE_MIN || reference.length > REFERENCE_MAX) return fail(`Referensi transfer ${REFERENCE_MIN}-${REFERENCE_MAX} karakter.`);
  return { ok: true, value: { decision, paidAmount, paidDate, reference, note } };
};

/** Midtrans mengirim gross_amount sebagai teks "75000.00". Hanya jumlah rupiah bulat yang diterima. */
export const parseGrossAmount = (raw: unknown): number | null => {
  const s = typeof raw === "number" ? String(raw) : typeof raw === "string" ? raw.trim() : "";
  const m = /^(\d{1,12})(?:\.0{1,2})?$/.exec(s);
  return m ? Number(m[1]) : null;
};

export type GatewayOutcome = "PAID" | "PENDING" | "FAILED";
/** Status transaksi Midtrans -> hasil untuk order. "capture" hanya relevan untuk kartu; tidak dipakai di VA. */
export const mapMidtransStatus = (transactionStatus: unknown, fraudStatus?: unknown): GatewayOutcome => {
  const t = String(transactionStatus ?? "");
  if (t === "settlement") return "PAID";
  if (t === "capture") return fraudStatus === "accept" || fraudStatus === undefined ? "PAID" : "PENDING";
  if (t === "pending" || t === "authorize") return "PENDING";
  if (t === "deny" || t === "cancel" || t === "expire" || t === "failure") return "FAILED";
  return "PENDING";
};
