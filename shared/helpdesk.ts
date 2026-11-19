// Aturan tiket bantuan. Murni (tanpa database), dipakai server dan klien.

export const TICKET_CATEGORIES = [
  { id: "AKUN", label: "Akun & login" },
  { id: "PEMBAYARAN", label: "Pembayaran & dompet" },
  { id: "KURSUS", label: "Kursus & materi" },
  { id: "SERTIFIKAT", label: "Sertifikat" },
  { id: "LAINNYA", label: "Lainnya" },
] as const;

export type TicketCategory = (typeof TICKET_CATEGORIES)[number]["id"];
export type TicketStatus = "OPEN" | "ANSWERED" | "CLOSED";

export const SUBJECT_MIN = 5;
export const SUBJECT_MAX = 150;
export const BODY_MIN = 5;
export const BODY_MAX = 4000;

export const isTicketCategory = (v: unknown): v is TicketCategory => TICKET_CATEGORIES.some((c) => c.id === v);

export type Result<T> = { ok: true; value: T } | { ok: false; message: string };

export const validateNewTicket = (input: unknown): Result<{ subject: string; category: TicketCategory; body: string }> => {
  const o = (input ?? {}) as Record<string, unknown>;
  const subject = typeof o.subject === "string" ? o.subject.trim() : "";
  const body = typeof o.body === "string" ? o.body.trim() : "";
  if (subject.length < SUBJECT_MIN || subject.length > SUBJECT_MAX) return { ok: false, message: `Judul ${SUBJECT_MIN}-${SUBJECT_MAX} karakter.` };
  if (!isTicketCategory(o.category)) return { ok: false, message: "Kategori tidak valid." };
  if (body.length < BODY_MIN || body.length > BODY_MAX) return { ok: false, message: `Isi pesan ${BODY_MIN}-${BODY_MAX} karakter.` };
  return { ok: true, value: { subject, category: o.category, body } };
};

export const validateMessage = (input: unknown): Result<string> => {
  const raw = ((input ?? {}) as Record<string, unknown>).body;
  const body = typeof raw === "string" ? raw.trim() : "";
  if (body.length < BODY_MIN || body.length > BODY_MAX) return { ok: false, message: `Isi pesan ${BODY_MIN}-${BODY_MAX} karakter.` };
  return { ok: true, value: body };
};

/** Status setelah pesan baru: balasan staf -> ANSWERED, balasan pemilik -> OPEN. Tiket tertutup tidak menerima pesan. */
export const nextStatus = (current: TicketStatus, fromStaff: boolean): TicketStatus | null => {
  if (current === "CLOSED") return null;
  return fromStaff ? "ANSWERED" : "OPEN";
};
