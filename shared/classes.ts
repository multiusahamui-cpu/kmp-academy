// Aturan kelas Mentor (rombongan belajar). Murni (tanpa database), dipakai server dan klien.

export const CLASS_NAME_MIN = 3;
export const CLASS_NAME_MAX = 120;
export const DESC_MAX = 1000;
export const SESSION_TITLE_MAX = 150;
export const NOTE_MAX = 500;
export const JOIN_CODE_LENGTH = 8;
/** Tanpa karakter yang mudah tertukar (0/O, 1/I/L). */
export const JOIN_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export type Result<T> = { ok: true; value: T } | { ok: false; message: string };

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

export const generateJoinCode = (rand: (max: number) => number): string => {
  let out = "";
  for (let i = 0; i < JOIN_CODE_LENGTH; i += 1) out += JOIN_CODE_ALPHABET[rand(JOIN_CODE_ALPHABET.length)];
  return out;
};

/** Kode diketik orang: abaikan huruf kecil, spasi, dan tanda hubung. */
export const normalizeJoinCode = (v: unknown): string => str(v).toUpperCase().replace(/[\s-]/g, "");

export const validateClassInput = (input: unknown): Result<{ name: string; description: string | null }> => {
  const o = (input ?? {}) as Record<string, unknown>;
  const name = str(o.name);
  const description = str(o.description);
  if (name.length < CLASS_NAME_MIN || name.length > CLASS_NAME_MAX) return { ok: false, message: `Nama kelas ${CLASS_NAME_MIN}-${CLASS_NAME_MAX} karakter.` };
  if (o.description != null && typeof o.description !== "string") return { ok: false, message: "Deskripsi tidak valid." };
  if (description.length > DESC_MAX) return { ok: false, message: `Deskripsi maksimal ${DESC_MAX} karakter.` };
  return { ok: true, value: { name, description: description || null } };
};

export const validateSessionInput = (input: unknown): Result<{ title: string; startsAt: Date; meetingUrl: string | null }> => {
  const o = (input ?? {}) as Record<string, unknown>;
  const title = str(o.title);
  if (title.length < 3 || title.length > SESSION_TITLE_MAX) return { ok: false, message: `Judul sesi 3-${SESSION_TITLE_MAX} karakter.` };
  const startsAt = new Date(typeof o.startsAt === "string" ? o.startsAt : NaN);
  if (Number.isNaN(startsAt.getTime())) return { ok: false, message: "Waktu sesi tidak valid." };
  const url = str(o.meetingUrl);
  if (url) {
    let ok = false;
    try { ok = new URL(url).protocol === "https:"; } catch { ok = false; }
    if (!ok || url.length > 500) return { ok: false, message: "Tautan pertemuan harus berupa alamat https." };
  }
  return { ok: true, value: { title, startsAt, meetingUrl: url || null } };
};

export const validateGrade = (input: unknown): Result<{ grade: number; note: string | null }> => {
  const o = (input ?? {}) as Record<string, unknown>;
  const grade = o.grade;
  if (typeof grade !== "number" || !Number.isInteger(grade) || grade < 0 || grade > 100) return { ok: false, message: "Nilai harus bilangan bulat 0-100." };
  if (o.note != null && typeof o.note !== "string") return { ok: false, message: "Catatan tidak valid." };
  const note = str(o.note);
  if (note.length > NOTE_MAX) return { ok: false, message: `Catatan maksimal ${NOTE_MAX} karakter.` };
  return { ok: true, value: { grade, note: note || null } };
};
