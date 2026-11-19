// Sanksi mitra (akun PARTNER_B2B) oleh Direktur. Murni (tanpa database), dipakai server dan klien.

export const SANCTION_KINDS = [
  { id: "WARNING", label: "Peringatan", description: "Dicatat dan diberitahukan ke mitra. Tidak membatasi akun." },
  { id: "SUSPEND", label: "Pembekuan akun", description: "Akun mitra dibekukan dan tidak bisa masuk sampai sanksi dicabut." },
] as const;
export type SanctionKind = (typeof SANCTION_KINDS)[number]["id"];

export const REASON_MIN = 10;
export const REASON_MAX = 1000;

export type Result<T> = { ok: true; value: T } | { ok: false; message: string };

export const validateSanction = (input: unknown): Result<{ kind: SanctionKind; reason: string }> => {
  const o = (input ?? {}) as Record<string, unknown>;
  const kind = SANCTION_KINDS.find((k) => k.id === o.kind)?.id;
  const reason = typeof o.reason === "string" ? o.reason.trim() : "";
  if (!kind) return { ok: false, message: "Jenis sanksi tidak valid." };
  if (reason.length < REASON_MIN || reason.length > REASON_MAX) return { ok: false, message: `Alasan ${REASON_MIN}-${REASON_MAX} karakter.` };
  return { ok: true, value: { kind, reason } };
};

export const validateLiftNote = (input: unknown): Result<string> => {
  const note = typeof (input as Record<string, unknown> | null)?.note === "string" ? ((input as Record<string, string>).note).trim() : "";
  if (note.length < REASON_MIN || note.length > REASON_MAX) return { ok: false, message: `Catatan pencabutan ${REASON_MIN}-${REASON_MAX} karakter.` };
  return { ok: true, value: note };
};

/** Akun kembali aktif hanya bila sedang dibekukan dan tidak ada pembekuan lain yang masih berlaku. */
export const shouldReactivate = (userStatus: string, otherActiveSuspensions: number): boolean => userStatus === "SUSPENDED" && otherActiveSuspensions === 0;
