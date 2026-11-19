// Pencairan bagi hasil bulanan. Murni (tanpa database), dipakai server dan klien.
//
// Aturan: posting setiap tanggal 25 (WIB). Batas posting = awal tanggal 25 pukul 00:00 WIB; hanya pendaftaran berbayar
// yang terjadi SEBELUM batas itu yang ikut. Transaksi mulai tanggal 25 menjadi saldo baru untuk periode berikutnya.

export const POSTING_DAY = 25;
const WIB_MS = 7 * 3600_000;

export const BATCH_STATUSES = ["POSTED", "APPROVED", "COMPLETED", "VOID"] as const;
export type BatchStatus = (typeof BATCH_STATUSES)[number];
export const BATCH_LABEL: Record<BatchStatus, string> = {
  POSTED: "Menunggu persetujuan Direktur", APPROVED: "Disetujui, menunggu transfer", COMPLETED: "Selesai ditransfer", VOID: "Dibatalkan",
};
export type PayeeStatus = "PENDING" | "PAID";

const wib = (d: Date) => {
  const w = new Date(d.getTime() + WIB_MS);
  return { y: w.getUTCFullYear(), m: w.getUTCMonth(), day: w.getUTCDate() };
};
const cutoffOf = (y: number, m: number): Date => new Date(Date.UTC(y, m, POSTING_DAY) - WIB_MS); // Date.UTC merapikan bulan di luar 0-11

/** Hari ini (WIB) adalah hari posting? */
export const isPostingDay = (now: Date): boolean => wib(now).day === POSTING_DAY;

/** Batas posting terbaru yang sudah lewat atau sama dengan `now`. */
export const payoutCutoffAt = (now: Date): Date => {
  const { y, m, day } = wib(now);
  return cutoffOf(y, day >= POSTING_DAY ? m : m - 1);
};

/** Batas posting sebelum `cutoff`. */
export const previousCutoff = (cutoff: Date): Date => {
  const { y, m } = wib(cutoff);
  return cutoffOf(y, m - 1);
};

/** Batas posting berikutnya setelah `now`. */
export const nextCutoffAt = (now: Date): Date => {
  const { y, m } = wib(payoutCutoffAt(now));
  return cutoffOf(y, m + 1);
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const dayLabel = (d: Date): string => {
  const { y, m, day } = wib(d);
  return `${day} ${MONTHS[m]} ${y}`;
};

/** Contoh: batas 25 Nov -> "25 Okt 2026 - 24 Nov 2026". Tanpa periode sebelumnya: "Sejak awal - 24 Nov 2026". */
export const periodLabel = (cutoff: Date, hasPrevious: boolean): string => {
  const last = new Date(cutoff.getTime() - 86_400_000);
  return `${hasPrevious ? dayLabel(previousCutoff(cutoff)) : "Sejak awal"} - ${dayLabel(last)}`;
};

export const NOTE_MIN = 10;
export const NOTE_MAX = 500;
export const REF_MIN = 3;
export const REF_MAX = 100;

export type Result<T> = { ok: true; value: T } | { ok: false; message: string };

export const validateVoidNote = (input: unknown): Result<string> => {
  const raw = (input as { note?: unknown } | null | undefined)?.note;
  const note = typeof raw === "string" ? raw.trim() : "";
  if (note.length < NOTE_MIN || note.length > NOTE_MAX) return { ok: false, message: `Alasan pembatalan ${NOTE_MIN}-${NOTE_MAX} karakter.` };
  return { ok: true, value: note };
};

export const validateTransfer = (input: unknown): Result<{ transferRef: string; note: string }> => {
  const o = (input ?? {}) as Record<string, unknown>;
  const transferRef = typeof o.transferRef === "string" ? o.transferRef.trim() : "";
  const note = typeof o.note === "string" ? o.note.trim() : "";
  if (transferRef.length < REF_MIN || transferRef.length > REF_MAX) return { ok: false, message: `Nomor referensi transfer ${REF_MIN}-${REF_MAX} karakter.` };
  if (note.length > NOTE_MAX) return { ok: false, message: `Catatan maksimal ${NOTE_MAX} karakter.` };
  return { ok: true, value: { transferRef, note } };
};

export const validateBankAccount = (input: unknown): Result<{ bankName: string; accountNumber: string; holderName: string }> => {
  const o = (input ?? {}) as Record<string, unknown>;
  const bankName = typeof o.bankName === "string" ? o.bankName.trim() : "";
  const holderName = typeof o.holderName === "string" ? o.holderName.trim() : "";
  const accountNumber = typeof o.accountNumber === "string" ? o.accountNumber.replace(/[\s-]/g, "") : "";
  if (bankName.length < 2 || bankName.length > 50) return { ok: false, message: "Nama bank 2-50 karakter." };
  if (holderName.length < 3 || holderName.length > 100) return { ok: false, message: "Nama pemilik rekening 3-100 karakter." };
  if (!/^\d{6,25}$/.test(accountNumber)) return { ok: false, message: "Nomor rekening hanya angka, 6-25 digit." };
  return { ok: true, value: { bankName, accountNumber, holderName } };
};

/** Menyamarkan nomor rekening untuk tampilan: hanya 4 digit terakhir. */
export const maskAccount = (n: string): string => (n.length <= 4 ? n : `${"*".repeat(n.length - 4)}${n.slice(-4)}`);
