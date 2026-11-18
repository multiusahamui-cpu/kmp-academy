// Aturan penghapusan (penutupan) akun individual dan penyelesaian saldo. Dipakai server dan klien.

export const DELETION_ROLES = ["STUDENT", "MENTOR", "CREATOR"] as const; // yang boleh mengajukan
export const DECIDER_ROLES = ["ADMIN_SYSTEM", "DIRECTOR"] as const; // menyetujui/menolak, melihat arsip
export const SETTLER_ROLES = ["ADMIN_SYSTEM"] as const; // menandai saldo selesai (transfer)

export type DeletionStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
export const DELETION_STATUS_LABEL: Record<DeletionStatus, string> = {
  PENDING: "Menunggu",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
  CANCELLED: "Dibatalkan",
};

export const TEXT_MIN = 10;
export const TEXT_MAX = 500;
export const PROOF_MAX_BYTES = 5 * 1024 * 1024; // 5 MB

type Result<T> = { ok: true; value: T } | { ok: false; message: string };

/** Alasan pengajuan atau catatan keputusan: 10-500 karakter. */
export const validateText = (raw: unknown, label: string): Result<string> => {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (value.length < TEXT_MIN) return { ok: false, message: `${label} wajib diisi, minimal ${TEXT_MIN} karakter.` };
  if (value.length > TEXT_MAX) return { ok: false, message: `${label} maksimal ${TEXT_MAX} karakter.` };
  return { ok: true, value };
};

/** Akun hanya boleh ditutup setelah seluruh saldo nol. */
export const checkCanApprove = (balance: number): { ok: true } | { ok: false; message: string } =>
  balance === 0
    ? { ok: true }
    : { ok: false, message: "Saldo dompet belum nol. Selesaikan saldo (transfer atau penarikan) sebelum menyetujui." };

export interface SettlementInput {
  amount: unknown;
  balance: number;
  transferDate: unknown;
  bankRef: unknown;
}

const isRealDate = (s: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};

/** Penyelesaian saldo selalu penuh: nominal harus sama persis dengan saldo saat ini. */
export const validateSettlement = (
  input: SettlementInput,
  now: Date = new Date(),
): Result<{ amount: number; transferDate: string; bankRef: string }> => {
  if (!Number.isInteger(input.balance) || input.balance <= 0) {
    return { ok: false, message: "Tidak ada saldo yang perlu diselesaikan." };
  }
  const amount = typeof input.amount === "number" ? input.amount : Number(input.amount);
  if (!Number.isInteger(amount) || amount !== input.balance) {
    return { ok: false, message: "Nominal harus sama dengan saldo saat ini (penyelesaian penuh)." };
  }
  const transferDate = typeof input.transferDate === "string" ? input.transferDate.trim() : "";
  if (!isRealDate(transferDate)) return { ok: false, message: "Tanggal transfer tidak valid (format YYYY-MM-DD)." };
  const limit = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10); // toleransi zona waktu
  if (transferDate > limit) return { ok: false, message: "Tanggal transfer tidak boleh di masa depan." };
  const bankRef = typeof input.bankRef === "string" ? input.bankRef.trim() : "";
  if (bankRef.length < 3 || bankRef.length > 100) return { ok: false, message: "Referensi transfer wajib diisi (3-100 karakter)." };
  return { ok: true, value: { amount, transferDate, bankRef } };
};

export type ProofType = { ext: "jpg" | "png" | "webp" | "pdf"; mime: string };

/** Mengenali bukti transfer (JPG/PNG/WebP/PDF) dari isi berkas, bukan dari nama atau Content-Type kiriman. */
export const detectProofType = (buf: Uint8Array): ProofType | null => {
  const ascii = (from: number, text: string): boolean =>
    buf.length >= from + text.length && [...text].every((ch, i) => buf[from + i] === ch.charCodeAt(0));
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: "jpg", mime: "image/jpeg" };
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (buf.length >= 8 && png.every((b, i) => buf[i] === b)) return { ext: "png", mime: "image/png" };
  if (buf.length >= 12 && ascii(0, "RIFF") && ascii(8, "WEBP")) return { ext: "webp", mime: "image/webp" };
  if (ascii(0, "%PDF-")) return { ext: "pdf", mime: "application/pdf" };
  return null;
};
