
import { Router } from "express";
import * as user from "../controllers/userController";
import * as learning from "../controllers/learningController";
import * as notif from "../controllers/notificationController";
import { authenticateToken } from "../middleware/auth";

const router = Router();

router.use(authenticateToken);

// Catalog & Learning
router.get("/enrolled", user.getMyCourses);
router.post("/enroll/:courseId", user.enrollCourse);
router.get("/learning/:courseId", learning.getLearning);
router.post("/learning/:courseId/modules/:moduleId/complete", learning.completeModule);

// Wishlist (New)
router.get("/wishlist", user.getMyWishlist);
router.post("/wishlist/:courseId", user.toggleWishlist);

// Exams
router.post("/exams/:courseId/start", learning.startExam);
router.post("/exams/:courseId/submit", learning.submitExam);

// Wallet
router.get("/wallet", user.getWallet);
router.post("/wallet/topup", user.topUpWallet);
router.post("/wallet/withdraw", user.withdrawWallet);
router.post("/wallet/bank-account", user.addBankAccount);

// Notifikasi
router.get("/notifications", user.getNotifications);
router.get("/notifications/unread-count", notif.getUnreadCount);
router.post("/notifications/read-all", notif.markAllNotificationsRead);
router.post("/notifications/:id/read", notif.markNotificationRead);
router.get("/notification-settings", notif.getNotificationSettings);
router.put("/notification-settings", notif.updateNotificationSettings);

// Certificate
router.get("/certificates", learning.listMyCertificates);

export default router;
