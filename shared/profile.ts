// Aturan data profil umum: dipakai server (penegakan) dan klien (pesan di formulir).

export const NAME_MIN = 2;
export const NAME_MAX = 100;
export const BIO_MAX = 500;
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024; // 2 MB

export type FieldResult<T> = { ok: true; value: T } | { ok: false; message: string };

// Karakter kontrol (termasuk baris baru) tidak boleh ada di nama.
const hasControlChars = (s: string): boolean => {
  for (let i = 0; i < s.length; i += 1) {
    const c = s.charCodeAt(i);
    if (c < 32 || c === 127) return true;
  }
  return false;
};

export const validateName = (raw: unknown): FieldResult<string> => {
  if (typeof raw !== "string") return { ok: false, message: "Nama wajib diisi." };
  const value = raw.trim().replace(/\s+/g, " ");
  if (value.length < NAME_MIN) return { ok: false, message: `Nama minimal ${NAME_MIN} karakter.` };
  if (value.length > NAME_MAX) return { ok: false, message: `Nama maksimal ${NAME_MAX} karakter.` };
  if (hasControlChars(value)) return { ok: false, message: "Nama mengandung karakter yang tidak diizinkan." };
  return { ok: true, value };
};

/** Bio boleh kosong (menghapus bio). */
export const validateBio = (raw: unknown): FieldResult<string | null> => {
  if (raw === null || raw === undefined) return { ok: true, value: null };
  if (typeof raw !== "string") return { ok: false, message: "Bio tidak valid." };
  const value = raw.trim();
  if (value.length > BIO_MAX) return { ok: false, message: `Bio maksimal ${BIO_MAX} karakter.` };
  return { ok: true, value: value === "" ? null : value };
};

export type AvatarType = { ext: "jpg" | "png" | "webp"; mime: string };

/** Mengenali JPG/PNG/WebP dari isi berkas (bukan dari nama atau Content-Type kiriman klien). */
export const detectImageType = (buf: Uint8Array): AvatarType | null => {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { ext: "jpg", mime: "image/jpeg" };
  }
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (buf.length >= 8 && png.every((b, i) => buf[i] === b)) return { ext: "png", mime: "image/png" };
  const ascii = (from: number, text: string): boolean =>
    buf.length >= from + text.length && [...text].every((ch, i) => buf[from + i] === ch.charCodeAt(0));
  if (buf.length >= 12 && ascii(0, "RIFF") && ascii(8, "WEBP")) return { ext: "webp", mime: "image/webp" };
  return null;
};
