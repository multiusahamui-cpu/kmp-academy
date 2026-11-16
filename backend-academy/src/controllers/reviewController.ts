
import { Request, Response } from "express";
import { successResponse, errorResponse } from "../utils/response";
import { db } from "../db";
import { reviews, users, courses, enrollments } from "../schema/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export const getCourseReviews = async (req: any, res: any) => {
  try {
    const { courseId } = req.params;
    
    // Join Review dengan User untuk dapat nama & avatar
    const result = await db.select({
        id: reviews.id,
        rating: reviews.rating,
        comment: reviews.comment,
        createdAt: reviews.createdAt,
        reply: reviews.reply,
        user: {
            id: users.id,
            name: users.name,
            avatar: users.avatar
        }
    })
    .from(reviews)
    .innerJoin(users, eq(reviews.userId, users.id))
    .where(eq(reviews.courseId, courseId))
    .orderBy(desc(reviews.createdAt));

    successResponse(res, result, "List of reviews");
  } catch (error) {
    errorResponse(res, "Failed to fetch reviews", 500, error);
  }
};

export const createReview = async (req: any, res: any) => {
  try {
    const { courseId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user.id;

    // 1. Check if user is enrolled (Wajib enroll sebelum review)
    // Untuk demo development, kita bisa bypass ini jika perlu, tapi best practice harus check.
    const isEnrolled = await db.select().from(enrollments)
        .where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId)))
        .limit(1);

    if (isEnrolled.length === 0) {
        return errorResponse(res, "You must be enrolled to review this course.", 403);
    }

    // 2. Check if already reviewed
    const existing = await db.select().from(reviews)
        .where(and(eq(reviews.userId, userId), eq(reviews.courseId, courseId)))
        .limit(1);

    if (existing.length > 0) {
        return errorResponse(res, "You have already reviewed this course.", 400);
    }

    // 3. Insert Review
    await db.insert(reviews).values({
        courseId,
        userId,
        rating: Number(rating),
        comment
    });

    // 4. Recalculate Course Average Rating (Important!)
    const stats = await db.select({
        count: sql<number>`cast(count(${reviews.id}) as int)`,
        avg: sql<number>`avg(${reviews.rating})`
    })
    .from(reviews)
    .where(eq(reviews.courseId, courseId));

    if (stats.length > 0) {
        const newRating = Number(stats[0].avg); // e.g. 4.5
        const newCount = stats[0].count;
        
        await db.update(courses)
            .set({ rating: Math.round(newRating), totalReviews: newCount }) // Simpan sebagai integer 0-5 atau ubah schema ke float jika perlu presisi
            .where(eq(courses.id, courseId));
    }

    successResponse(res, null, "Review submitted successfully", 201);
  } catch (error) {
    errorResponse(res, "Failed to submit review", 500, error);
  }
};

export const updateReview = async (req: any, res: any) => {
  try {
    const { reviewId } = req.params;
    const { rating, comment } = req.body;
    
    // Ensure ownership
    await db.update(reviews)
        .set({ rating, comment, updatedAt: new Date() })
        .where(and(eq(reviews.id, reviewId), eq(reviews.userId, req.user.id)));

    successResponse(res, null, "Review updated");
  } catch (error) {
    errorResponse(res, "Failed to update review", 500, error);
  }
};

export const deleteReview = async (req: any, res: any) => {
  try {
    const { reviewId } = req.params;
    await db.delete(reviews)
        .where(and(eq(reviews.id, reviewId), eq(reviews.userId, req.user.id)));
        
    successResponse(res, null, "Review deleted");
  } catch (error) {
    errorResponse(res, "Failed to delete review", 500, error);
  }
};

export const replyReview = async (req: any, res: any) => {
  try {
    const { reviewId } = req.params;
    const { reply } = req.body;
    
    // Note: Middleware `requireRole` already ensures the user is Mentor/Creator/Admin
    await db.update(reviews)
        .set({ reply })
        .where(eq(reviews.id, reviewId));

    successResponse(res, null, "Reply posted");
  } catch (error) {
    errorResponse(res, "Failed to reply", 500, error);
  }
};

export const reportReview = async (req: any, res: any) => {
  try {
    const { reviewId } = req.params;
    const { reason } = req.body;
    // Mock moderation logic
    successResponse(res, null, "Review reported to admin");
  } catch (error) {
    errorResponse(res, "Failed to report", 500, error);
  }
};
