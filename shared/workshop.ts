// Workshop (rombongan belajar berbayar) dari kursus mandiri: proposal Mentor dan pembagian hasil. Murni, tanpa database.

export const PROPOSAL_STATUSES = ["PENDING", "APPROVED", "REJECTED", "WITHDRAWN"] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];
export const PROPOSAL_LABEL: Record<ProposalStatus, string> = { PENDING: "Menunggu", APPROVED: "Disetujui", REJECTED: "Ditolak", WITHDRAWN: "Ditarik" };

export interface WorkshopSplit {
  ownerPercent: number;
  mentorPercent: number;
  platformPercent: number;
  owner: number;
  mentor: number;
  platform: number;
}

const clampPct = (n: number): number => (Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : 0);

/**
 * Bagi hasil workshop: pemilik materi dan Mentor dibulatkan ke bawah (rupiah utuh), sisanya untuk Lembaga,
 * sehingga owner + mentor + platform = jumlah dibayar. Bila persen pemilik + Mentor melebihi 100, bagian Mentor dipangkas.
 */
export const splitWorkshopRevenue = (amountPaid: number, ownerPercent: number, mentorPercent: number): WorkshopSplit => {
  const amount = Number.isFinite(amountPaid) && amountPaid > 0 ? Math.floor(amountPaid) : 0;
  const o = clampPct(ownerPercent);
  const m = Math.min(clampPct(mentorPercent), 100 - o);
  const owner = Math.floor((amount * o) / 100);
  const mentor = Math.floor((amount * m) / 100);
  return { ownerPercent: o, mentorPercent: m, platformPercent: 100 - o - m, owner, mentor, platform: amount - owner - mentor };
};

export const TITLE_MIN = 5;
export const TITLE_MAX = 200;
export const DESC_MAX = 2000;
export const PRICE_MAX = 100_000_000;

export type Result<T> = { ok: true; value: T } | { ok: false; message: string };

export interface ProposalInput { sourceCourseId: string; title: string; description: string; price: number }

export const validateProposal = (input: unknown): Result<ProposalInput> => {
  const o = (input ?? {}) as Record<string, unknown>;
  const title = typeof o.title === "string" ? o.title.trim() : "";
  const description = typeof o.description === "string" ? o.description.trim() : "";
  if (typeof o.sourceCourseId !== "string" || o.sourceCourseId === "") return { ok: false, message: "Pilih kursus sumber." };
  if (title.length < TITLE_MIN || title.length > TITLE_MAX) return { ok: false, message: `Judul workshop ${TITLE_MIN}-${TITLE_MAX} karakter.` };
  if (description.length > DESC_MAX) return { ok: false, message: `Deskripsi maksimal ${DESC_MAX} karakter.` };
  if (typeof o.price !== "number" || !Number.isInteger(o.price) || o.price < 1 || o.price > PRICE_MAX) return { ok: false, message: "Harga harus bilangan bulat rupiah lebih dari 0." };
  return { ok: true, value: { sourceCourseId: o.sourceCourseId, title, description, price: o.price } };
};

export const validateDecisionNote = (input: unknown, required: boolean): Result<string> => {
  const raw = (input as { note?: unknown } | null | undefined)?.note;
  const note = typeof raw === "string" ? raw.trim() : "";
  if (required && note.length < 10) return { ok: false, message: "Alasan penolakan minimal 10 karakter." };
  if (note.length > 1000) return { ok: false, message: "Catatan maksimal 1000 karakter." };
  return { ok: true, value: note };
};
