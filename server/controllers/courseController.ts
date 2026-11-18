import { successResponse, errorResponse } from "../utils/response";
import { db } from "../db";
import { courses } from "../schema/schema";
import { eq, desc, sql } from "drizzle-orm";
import { applyPercent } from "@shared/pricing";
import { autoDiscountMap } from "./pricingController";

// Katalog publik. Pembuatan dan review kursus ada di courseAuthoringController.

export const getCourses = async (_req: any, res: any) => {
  try {
    const rows = await db.select({
        course: courses,
        studentsEnrolled: sql<number>`(SELECT count(*)::int FROM academy.enrollments e WHERE e.course_id = ${courses.id})`,
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
