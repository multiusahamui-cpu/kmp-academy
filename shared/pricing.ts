// Logika harga dan promo kursus. Murni (tanpa DB) agar bisa diuji; server selalu menghitung ulang saat mendaftar.

export const DISCOUNT_KINDS = ["AUTO", "CODE"] as const;
export type DiscountKind = (typeof DISCOUNT_KINDS)[number];

export const CODE_MIN = 4;
export const CODE_MAX = 20;
export const BULK_MAX = 200;
export const DISCOUNT_MAX_DAYS = 366;
export const REASON_MIN = 5;
export const REASON_MAX = 300;
// Tanpa huruf/angka yang mudah tertukar (0/O, 1/I/L).
export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export interface DiscountLike {
  id: string;
  kind: string;
  percent: number;
  startsAt: Date;
  endsAt: Date;
  maxRedemptions: number | null;
  redemptionCount: number;
  cancelledAt: Date | null;
}

type Result<T> = { ok: true; value: T } | { ok: false; message: string };
const fail = (message: string): { ok: false; message: string } => ({ ok: false, message });

export const normalizeCode = (raw: unknown): string => (typeof raw === "string" ? raw.trim().toUpperCase() : "");
export const isValidCodeFormat = (code: string): boolean =>
  code.length >= CODE_MIN && code.length <= CODE_MAX && /^[A-Z0-9][A-Z0-9_-]*$/.test(code);

/** Diskon berlaku bila belum dibatalkan, dalam periode, dan kuota belum habis. */
export const isDiscountActive = (d: DiscountLike, now: Date): boolean =>
  d.cancelledAt === null &&
  d.startsAt.getTime() <= now.getTime() &&
  now.getTime() < d.endsAt.getTime() &&
  (d.maxRedemptions === null || d.redemptionCount < d.maxRedemptions);

/** Harga akhir (rupiah bulat). Pembulatan ke bawah pada potongan, jadi tidak pernah merugikan koperasi karena pecahan. */
export const applyPercent = (base: number, percent: number): number => {
  if (!Number.isInteger(base) || base < 0) throw new Error("harga dasar tidak valid");
  if (!Number.isInteger(percent) || percent < 0 || percent > 100) throw new Error("persen tidak valid");
  return base - Math.floor((base * percent) / 100);
};

/** Diskon otomatis terbaik yang sedang berlaku (persen terbesar; bila sama, yang berakhir lebih cepat). Tidak ditumpuk. */
export const bestAutoDiscount = <T extends DiscountLike>(list: T[], now: Date): T | null => {
  const active = list.filter((d) => d.kind === "AUTO" && isDiscountActive(d, now));
  active.sort((a, b) => b.percent - a.percent || a.endsAt.getTime() - b.endsAt.getTime());
  return active[0] ?? null;
};

export interface PriceQuote {
  basePrice: number;
  percent: number;
  finalPrice: number;
  discountId: string | null;
  viaCode: boolean;
}

/** Pilih yang memberi harga terendah antara diskon otomatis dan kode (bila ada). Seri dimenangkan diskon otomatis. */
export const quotePrice = (basePrice: number, auto: DiscountLike | null, code: DiscountLike | null): PriceQuote => {
  const pick = code && (!auto || code.percent > auto.percent) ? code : auto;
  const percent = pick?.percent ?? 0;
  return { basePrice, percent, finalPrice: applyPercent(basePrice, percent), discountId: pick?.id ?? null, viaCode: !!pick && pick === code };
};

export interface DiscountInput {
  kind: DiscountKind;
  percent: number;
  startsAt: Date;
  endsAt: Date;
  code: string | null;
  maxRedemptions: number | null;
  reason: string;
}

export interface DiscountOptions {
  now: Date;
  /** Admin/Direktur wajib beri alasan; Creator boleh kosong. */
  reasonRequired: boolean;
}

export const validateDiscountInput = (raw: Record<string, unknown>, opts: DiscountOptions): Result<DiscountInput> => {
  const kind = raw.kind;
  if (typeof kind !== "string" || !(DISCOUNT_KINDS as readonly string[]).includes(kind)) return fail("Jenis diskon tidak valid.");
  const percent = Number(raw.percent);
  if (!Number.isInteger(percent) || percent < 1 || percent > 100) return fail("Persen diskon harus bilangan bulat 1 sampai 100.");
  const startsAt = new Date(String(raw.startsAt ?? ""));
  const endsAt = new Date(String(raw.endsAt ?? ""));
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) return fail("Tanggal mulai dan berakhir wajib diisi.");
  if (endsAt.getTime() <= startsAt.getTime()) return fail("Tanggal berakhir harus setelah tanggal mulai.");
  if (endsAt.getTime() <= opts.now.getTime()) return fail("Tanggal berakhir sudah lewat.");
  if (endsAt.getTime() - startsAt.getTime() > DISCOUNT_MAX_DAYS * 86_400_000) return fail(`Durasi diskon maksimal ${DISCOUNT_MAX_DAYS} hari.`);

  let code: string | null = null;
  if (kind === "CODE") {
    code = normalizeCode(raw.code);
    if (!isValidCodeFormat(code)) return fail(`Kode ${CODE_MIN}-${CODE_MAX} karakter: huruf besar, angka, "-" atau "_".`);
  }
  let maxRedemptions: number | null = null;
  if (raw.maxRedemptions !== undefined && raw.maxRedemptions !== null && raw.maxRedemptions !== "") {
    maxRedemptions = Number(raw.maxRedemptions);
    if (!Number.isInteger(maxRedemptions) || maxRedemptions < 1 || maxRedemptions > 1_000_000) return fail("Kuota pemakaian harus bilangan bulat positif.");
  }
  const reason = typeof raw.reason === "string" ? raw.reason.trim() : "";
  if (opts.reasonRequired && reason.length < REASON_MIN) return fail(`Alasan wajib diisi, minimal ${REASON_MIN} karakter.`);
  if (reason.length > REASON_MAX) return fail(`Alasan maksimal ${REASON_MAX} karakter.`);
  return { ok: true, value: { kind: kind as DiscountKind, percent, startsAt, endsAt, code, maxRedemptions, reason } };
};

/** Kode acak untuk pembuatan massal. `rand` disuntikkan (crypto.randomInt di server). */
export const generateCode = (rand: (max: number) => number, length = 10): string => {
  let out = "";
  for (let i = 0; i < length; i += 1) out += CODE_ALPHABET[rand(CODE_ALPHABET.length)];
  return out;
};
