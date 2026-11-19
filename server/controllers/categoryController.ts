import { asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { categories } from "../schema/schema";
import { successResponse, errorResponse } from "../utils/response";
import { validateCategoryInput } from "@shared/categories";

const isUuid = (v: unknown): v is string => z.string().uuid().safeParse(v).success;
const UNIQUE_VIOLATION = "23505";
const isUniqueViolation = (e: any): boolean => e?.code === UNIQUE_VIOLATION || e?.cause?.code === UNIQUE_VIOLATION;

// Jumlah kursus dihitung langsung dari tabel kursus (kolom `count` lama tidak lagi dipakai).
// Kolom dikualifikasi penuh: tanpa itu, `id` di dalam subquery terbaca sebagai c.id (milik kursus).
const CATEGORY_ID = sql.raw('"academy"."categories"."id"');
const countPublished = sql<number>`(select count(*)::int from academy.courses c where c.status = 'PUBLISHED' and c.category_ids @> jsonb_build_array(${CATEGORY_ID}::text))`;
const countAll = sql<number>`(select count(*)::int from academy.courses c where c.category_ids @> jsonb_build_array(${CATEGORY_ID}::text))`;

/** Publik: daftar kategori beserta jumlah kursus terbit. `totalCourses` (semua status) untuk halaman admin. */
export const getCategoriesList = async (_req: any, res: any) => {
  try {
    const rows = await db
      .select({ id: categories.id, name: categories.name, slug: categories.slug, description: categories.description, count: countPublished, totalCourses: countAll })
      .from(categories)
      .orderBy(asc(categories.name));
    successResponse(res, rows, "List of categories");
  } catch (error) {
    errorResponse(res, "Failed to fetch categories", 500, error);
  }
};

export const createCategory = async (req: any, res: any) => {
  try {
    const v = validateCategoryInput(req.body);
    if (!v.ok) return errorResponse(res, v.message, 400);
    const [row] = await db.insert(categories).values(v.value).returning();
    successResponse(res, { ...row, count: 0, totalCourses: 0 }, "Kategori ditambahkan", 201);
  } catch (error) {
    if (isUniqueViolation(error)) return errorResponse(res, "Slug sudah dipakai kategori lain.", 409);
    errorResponse(res, "Gagal menambah kategori", 500, error);
  }
};

export const updateCategory = async (req: any, res: any) => {
  try {
    if (!isUuid(req.params.id)) return errorResponse(res, "ID kategori tidak valid", 400);
    const v = validateCategoryInput(req.body);
    if (!v.ok) return errorResponse(res, v.message, 400);
    const [row] = await db.update(categories).set(v.value).where(eq(categories.id, req.params.id)).returning();
    if (!row) return errorResponse(res, "Kategori tidak ditemukan", 404);
    successResponse(res, row, "Kategori diperbarui");
  } catch (error) {
    if (isUniqueViolation(error)) return errorResponse(res, "Slug sudah dipakai kategori lain.", 409);
    errorResponse(res, "Gagal memperbarui kategori", 500, error);
  }
};

export const deleteCategory = async (req: any, res: any) => {
  try {
    if (!isUuid(req.params.id)) return errorResponse(res, "ID kategori tidak valid", 400);
    const [row] = await db.select({ id: categories.id, used: countAll }).from(categories).where(eq(categories.id, req.params.id)).limit(1);
    if (!row) return errorResponse(res, "Kategori tidak ditemukan", 404);
    if (Number(row.used) > 0) return errorResponse(res, `Kategori masih dipakai ${row.used} kursus. Lepas dari kursus tersebut lebih dulu.`, 409);
    await db.delete(categories).where(eq(categories.id, req.params.id));
    successResponse(res, null, "Kategori dihapus");
  } catch (error) {
    errorResponse(res, "Gagal menghapus kategori", 500, error);
  }
};
