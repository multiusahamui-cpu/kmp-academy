import { successResponse, errorResponse } from "../utils/response";
import { db } from "../db";
import { categories, courses } from "../schema/schema";
import { eq, desc, inArray, sql } from "drizzle-orm";
import { applyPercent } from "@shared/pricing";
import { autoDiscountMap } from "./pricingController";
import { courseIdRef } from "../lib/sql-refs";

// Katalog publik. Pembuatan dan review kursus ada di courseAuthoringController.

export const getCourses = async (_req: any, res: any) => {
  try {
    const rows = await db.select({
        course: courses,
        studentsEnrolled: sql<number>`(SELECT count(*)::int FROM academy.enrollments e WHERE e.course_id = ${courseIdRef})`,
    })
    .from(courses)
    .where(eq(courses.status, "PUBLISHED"))
    .orderBy(desc(courses.createdAt));
    const autos = await autoDiscountMap(rows.map((r) => r.course.id));
    successResponse(
      res,
      rows.map(({ course, studentsEnrolled }) => {
        const { reviewedBy: _rb, reviewNote: _rn, ...pub } = course;
        const a = autos.get(course.id);
        return { ...pub, studentsEnrolled, discountPercent: a?.percent ?? 0, discountEndsAt: a?.endsAt ?? null, finalPrice: applyPercent(course.price, a?.percent ?? 0) };
      }),
      "List of courses",
    );
  } catch (error) {
    errorResponse(res, "Failed to fetch courses", 500, error);
  }
};

// --- Ringkasan untuk landing page (publik, tanpa login) ---
const LANDING_TTL_MS = 60_000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
let landingCache: { at: number; data: unknown } | null = null;
/** Untuk pengujian. */
export const clearLandingCache = (): void => { landingCache = null; };

const enrolledCount = sql<number>`(select count(*)::int from academy.enrollments e where e.course_id = ${courseIdRef})`;

/** Top 10 kursus terbit (peminat terbanyak) dan angka ringkas platform. Hanya agregat, tanpa data pribadi. Di-cache 60 detik. */
export const getLandingSummary = async (_req: any, res: any) => {
  try {
    if (landingCache && Date.now() - landingCache.at < LANDING_TTL_MS) return successResponse(res, landingCache.data, "Ringkasan landing");

    const top = await db
      .select({
        id: courses.id, title: courses.title, thumbnail: courses.thumbnail, type: courses.type, price: courses.price,
        categoryIds: courses.categoryIds, studentsEnrolled: enrolledCount,
      })
      .from(courses)
      .where(eq(courses.status, "PUBLISHED"))
      .orderBy(desc(enrolledCount), desc(courses.createdAt))
      .limit(10);

    const autos = await autoDiscountMap(top.map((c) => c.id));
    // Hanya UUID sah (data kotor tidak boleh menjatuhkan halaman publik).
    const wanted = [...new Set(top.flatMap((c) => c.categoryIds ?? []))].filter((id) => UUID_RE.test(id));
    const catRows = wanted.length ? await db.select({ id: categories.id, name: categories.name }).from(categories).where(inArray(categories.id, wanted)) : [];
    const catName = new Map(catRows.map((c) => [c.id, c.name]));

    const stats = await db.execute(sql`
      select
        (select count(distinct c.instructor_id)::int from academy.courses c where c.status = 'PUBLISHED') as instructors,
        (select count(*)::int from academy.courses c where c.status = 'PUBLISHED') as courses,
        (select count(distinct e.user_id)::int from academy.enrollments e join academy.courses c on c.id = e.course_id where c.status = 'PUBLISHED') as students,
        (select count(*)::int from academy.certificates) as certificates,
        (select sum(c.rating * c.total_reviews)::float / nullif(sum(c.total_reviews), 0) from academy.courses c where c.status = 'PUBLISHED' and c.total_reviews > 0) as rating_x10
    `);
    const row = ((stats as any).rows ?? stats)[0] ?? {};
    const ratingX10 = row.rating_x10 == null ? null : Number(row.rating_x10);

    const data = {
      courses: top.map((c) => {
        const a = autos.get(c.id);
        return {
          id: c.id, title: c.title, thumbnail: c.thumbnail, type: c.type, price: c.price,
          finalPrice: applyPercent(c.price, a?.percent ?? 0), discountPercent: a?.percent ?? 0,
          studentsEnrolled: c.studentsEnrolled,
          categories: (c.categoryIds ?? []).map((id) => catName.get(id)).filter((n): n is string => Boolean(n)).slice(0, 2),
        };
      }),
      stats: {
        instructors: Number(row.instructors ?? 0),
        courses: Number(row.courses ?? 0),
        students: Number(row.students ?? 0),
        certificates: Number(row.certificates ?? 0),
        // Persen kepuasan = rata-rata rating tertimbang jumlah ulasan / 5; null bila belum ada ulasan.
        satisfactionPercent: ratingX10 == null ? null : Math.round(((ratingX10 / 10) / 5) * 100),
      },
    };
    landingCache = { at: Date.now(), data };
    successResponse(res, data, "Ringkasan landing");
  } catch (error) {
    errorResponse(res, "Failed to fetch landing summary", 500, error);
  }
};
