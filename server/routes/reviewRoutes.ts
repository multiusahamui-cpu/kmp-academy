
import { Router } from "express";
import { getCourseReviews, createReview, updateReview, deleteReview, replyReview, reportReview } from "../controllers/reviewController";
import { authenticateToken, requireRole } from "../middleware/auth";

const router = Router();

// Public/Student
router.get("/courses/:courseId/reviews", getCourseReviews);
router.post("/courses/:courseId/reviews", authenticateToken, createReview);

// Edit/Delete Own Review
router.put("/reviews/:reviewId", authenticateToken, updateReview);
router.delete("/reviews/:reviewId", authenticateToken, deleteReview);

// Instructor Reply
router.post("/reviews/:reviewId/reply", authenticateToken, requireRole(["MENTOR", "CREATOR", "ADMIN_SYSTEM"]), replyReview);

// Moderation
router.post("/reviews/:reviewId/report", authenticateToken, reportReview);

export default router;
