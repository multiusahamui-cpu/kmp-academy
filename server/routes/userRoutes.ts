
import { Router } from "express";
import * as user from "../controllers/userController";
import { authenticateToken } from "../middleware/auth";

const router = Router();

router.use(authenticateToken);

// Catalog & Learning
router.get("/enrolled", user.getMyCourses);
router.post("/enroll/:courseId", user.enrollCourse);
router.get("/courses/:id/content", user.getCourseContent);
router.post("/learning/:courseId/progress", user.updateProgress);

// Wishlist (New)
router.get("/wishlist", user.getMyWishlist);
router.post("/wishlist/:courseId", user.toggleWishlist);

// Exams
router.post("/exams/:courseId/start", user.startExam);
router.post("/exams/:courseId/submit", user.submitExam);

// Wallet
router.get("/wallet", user.getWallet);
router.post("/wallet/topup", user.topUpWallet);
router.post("/wallet/withdraw", user.withdrawWallet);
router.post("/wallet/bank-account", user.addBankAccount);

// Notifikasi
router.get("/notifications", user.getNotifications);
router.post("/notifications/:id/read", user.markNotificationRead);

// Certificate
router.get("/certificates", user.getCertificates);
router.get("/certificates/:id/download", user.downloadCertificate);

export default router;
