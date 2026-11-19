// Dokumen hukum (Syarat, Privasi, Perjanjian Mentor/Creator). Murni (tanpa database), dipakai server dan klien.

export const LEGAL_KINDS = [
  { id: "TERMS", label: "Syarat & Ketentuan", audience: "Semua pengguna" },
  { id: "PRIVACY", label: "Kebijakan Privasi", audience: "Semua pengguna" },
  { id: "MENTOR_AGREEMENT", label: "Perjanjian Mentor", audience: "Mentor" },
  { id: "CREATOR_AGREEMENT", label: "Perjanjian Creator / Pemilik Materi", audience: "Creator" },
] as const;
export type LegalKind = (typeof LEGAL_KINDS)[number]["id"];

export const isLegalKind = (v: unknown): v is LegalKind => LEGAL_KINDS.some((k) => k.id === v);
export const legalLabel = (k: string): string => LEGAL_KINDS.find((x) => x.id === k)?.label ?? k;

/** Dokumen yang wajib disetujui sebuah peran (selain Syarat dan Privasi untuk semua). */
export const requiredKindsForRole = (role: string): LegalKind[] => {
  const kinds: LegalKind[] = ["TERMS", "PRIVACY"];
  if (role === "MENTOR") kinds.push("MENTOR_AGREEMENT");
  if (role === "CREATOR") kinds.push("CREATOR_AGREEMENT");
  return kinds;
};

export const TITLE_MAX = 150;
export const BODY_MIN = 100;
export const BODY_MAX = 60_000;

export type Result<T> = { ok: true; value: T } | { ok: false; message: string };

export const validateLegalInput = (input: unknown): Result<{ title: string; body: string }> => {
  const o = (input ?? {}) as Record<string, unknown>;
  const title = typeof o.title === "string" ? o.title.trim() : "";
  const body = typeof o.body === "string" ? o.body.replace(/\r\n/g, "\n").trim() : "";
  if (title.length < 3 || title.length > TITLE_MAX) return { ok: false, message: `Judul 3-${TITLE_MAX} karakter.` };
  if (body.length < BODY_MIN || body.length > BODY_MAX) return { ok: false, message: `Isi dokumen ${BODY_MIN}-${BODY_MAX} karakter.` };
  return { ok: true, value: { title, body } };
};

export interface LegalVersionRef { kind: string; version: number; status: string }

/** Versi berlaku sebuah jenis = versi terbit dengan nomor tertinggi. */
export const currentVersion = <T extends LegalVersionRef>(docs: readonly T[], kind: string): T | null => {
  let best: T | null = null;
  for (const d of docs) if (d.kind === kind && d.status === "PUBLISHED" && (!best || d.version > best.version)) best = d;
  return best;
};
