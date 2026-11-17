// Aturan kartu identitas Academy (sumber tunggal untuk server dan klien).
// Format nomor: PREFIX.YY.MM.NNNNNN (YY/MM = tahun/bulan terbit, NNNNNN = member_sequence).

export type CardRole = "SUPERADMIN" | "ADMIN_SYSTEM" | "DIRECTOR" | "CREATOR" | "MENTOR" | "STUDENT" | "PARTNER_B2B";

export const CARD_PREFIX: Partial<Record<CardRole, "A" | "C" | "M" | "S">> = {
  SUPERADMIN: "A",
  ADMIN_SYSTEM: "A",
  DIRECTOR: "A",
  CREATOR: "C",
  MENTOR: "M",
  STUDENT: "S",
};

/** Awalan kartu untuk sebuah role; null bila role tidak berhak kartu. */
export const cardPrefixFor = (role: string): "A" | "C" | "M" | "S" | null =>
  CARD_PREFIX[role as CardRole] ?? null;

/** Zona waktu penentu bulan/tahun pada nomor kartu: WIB (UTC+7). */
const toWib = (date: Date): Date => new Date(date.getTime() + 7 * 60 * 60 * 1000);

const yymm = (date: Date): { yy: string; mm: string } => {
  const d = toWib(date);
  return {
    yy: String(d.getUTCFullYear() % 100).padStart(2, "0"),
    mm: String(d.getUTCMonth() + 1).padStart(2, "0"),
  };
};

export const formatCardNumber = (prefix: string, issuedAt: Date, sequence: number): string => {
  const { yy, mm } = yymm(issuedAt);
  return `${prefix}.${yy}.${mm}.${String(sequence).padStart(6, "0")}`;
};

/** Nomor bayangan untuk calon student: nomor urut diganti tanda bintang. */
export const shadowCardNumber = (prefix: string, now: Date): string => {
  const { yy, mm } = yymm(now);
  return `${prefix}.${yy}.${mm}.******`;
};

export const CARD_PENDING_TOOLTIP =
  "Kartu Anda belum tersedia. Kartu terbit setelah Anda mengikuti kursus pertama.";
