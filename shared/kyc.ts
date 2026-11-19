// Verifikasi identitas (KYC) Academy. Foto KTP dan selfie disimpan di R2 PRIVAT; NIK dienkripsi di database.
export const KYC_STATUSES = ["PENDING", "VERIFIED", "REJECTED"] as const;
export type KycStatus = (typeof KYC_STATUSES)[number];
export const KYC_LABEL: Record<KycStatus | "NONE", string> = {
  NONE: "Belum diverifikasi",
  PENDING: "Menunggu tinjauan Admin",
  VERIFIED: "Terverifikasi",
  REJECTED: "Ditolak",
};
export type KycSource = "MANUAL" | "DIGITALCOOP";
export const KYC_IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp"] as const;

export const NIK_RE = /^\d{16}$/;
export const normalizeNik = (v: unknown): string => String(v ?? "").replace(/[\s.-]/g, "");
export const maskNik = (nik: string): string => (nik.length === 16 ? `${nik.slice(0, 4)}********${nik.slice(-4)}` : "****");

export const validateKycInput = (b: { nik?: unknown; fullName?: unknown }): { ok: true; value: { nik: string; fullName: string } } | { ok: false; message: string } => {
  const nik = normalizeNik(b.nik);
  if (!NIK_RE.test(nik)) return { ok: false, message: "NIK harus 16 digit angka." };
  const fullName = String(b.fullName ?? "").trim().replace(/\s+/g, " ");
  if (fullName.length < 3 || fullName.length > 150) return { ok: false, message: "Nama sesuai KTP wajib diisi (3-150 karakter)." };
  return { ok: true, value: { nik, fullName } };
};

export const validateRejectNote = (v: unknown): { ok: true; value: string } | { ok: false; message: string } => {
  const note = String(v ?? "").trim();
  return note.length >= 10 && note.length <= 500 ? { ok: true, value: note } : { ok: false, message: "Alasan penolakan 10-500 karakter agar pengguna tahu apa yang harus diperbaiki." };
};

/** Status KYC digitalcoop.id yang dianggap lulus ("completed" di sana). */
export const isDigitalcoopKycComplete = (s: string | null | undefined): boolean => (s ?? "").toLowerCase() === "completed";
