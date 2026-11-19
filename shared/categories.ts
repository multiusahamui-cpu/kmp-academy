// Aturan kategori kursus. Murni (tanpa database), dipakai server dan klien.

export interface CategoryInput {
  name: string;
  slug: string;
  description: string | null;
}

export type CategoryValidation = { ok: true; value: CategoryInput } | { ok: false; message: string };

export const CATEGORY_NAME_MAX = 100;
export const CATEGORY_DESCRIPTION_MAX = 300;
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** "Teknologi & Coding" -> "teknologi-coding" */
export const slugify = (text: string): string =>
  text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, CATEGORY_NAME_MAX);

export const validateCategoryInput = (input: unknown): CategoryValidation => {
  const o = (input ?? {}) as { name?: unknown; slug?: unknown; description?: unknown };
  if (typeof o.name !== "string") return { ok: false, message: "Nama kategori wajib diisi." };
  const name = o.name.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > CATEGORY_NAME_MAX) return { ok: false, message: `Nama kategori 2-${CATEGORY_NAME_MAX} karakter.` };

  const slug = typeof o.slug === "string" && o.slug.trim() ? o.slug.trim().toLowerCase() : slugify(name);
  if (!slug || slug.length > CATEGORY_NAME_MAX || !SLUG_RE.test(slug)) return { ok: false, message: "Slug hanya huruf kecil, angka, dan tanda hubung (-)." };

  let description: string | null = null;
  if (o.description !== undefined && o.description !== null) {
    if (typeof o.description !== "string") return { ok: false, message: "Deskripsi tidak valid." };
    const d = o.description.trim();
    if (d.length > CATEGORY_DESCRIPTION_MAX) return { ok: false, message: `Deskripsi maksimal ${CATEGORY_DESCRIPTION_MAX} karakter.` };
    description = d || null;
  }
  return { ok: true, value: { name, slug, description } };
};
