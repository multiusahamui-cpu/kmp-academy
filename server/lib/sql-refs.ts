import { sql } from "drizzle-orm";

/**
 * Rujukan kolom berkualifikasi penuh untuk dipakai DI DALAM subquery mentah (sql`(select ... where x.course_id = ${...})`).
 *
 * Pada select satu-tabel, Drizzle menulis `${courses.id}` tanpa nama tabel (`"id"`). Di dalam subquery,
 * `id` itu terbaca sebagai kolom `id` milik tabel subquery sendiri (mis. enrollments.id), bukan milik kursus,
 * sehingga hasilnya diam-diam selalu 0. Pakai rujukan ini agar yang dimaksud pasti kolom tabel luar.
 */
export const courseIdRef = sql.raw('"academy"."courses"."id"');
export const categoryIdRef = sql.raw('"academy"."categories"."id"');
