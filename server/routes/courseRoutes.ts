import { Router } from "express";
import * as course from "../controllers/courseController";
import * as authoring from "../controllers/courseAuthoringController";
import { authenticateToken, requireRole } from "../middleware/auth";
import * as pricing from "../controllers/pricingController";
import { promoLimiter, uploadLimiter } from "../lib/security";

const router = Router();

const creator = [authenticateToken, requireRole(["CREATOR"])];
const reviewer = [authenticateToken, requireRole(["ADMIN_SYSTEM", "DIRECTOR"])];
const discountManager = [authenticateToken, requireRole(["CREATOR", "ADMIN_SYSTEM", "DIRECTOR"])];

// Publik (detail memeriksa sesi sendiri: hanya kursus terbit untuk umum)
router.get("/", course.getCourses);
router.get("/categories", authoring.getCategoriesList);

// Admin: review kursus (sebelum "/:id" agar tidak tertangkap sebagai id)
router.get("/reviews", ...reviewer, authoring.listCourseReviews);
router.post("/reviews/:id/decision", ...reviewer, authoring.decideCourseReview);

// Creator
router.get("/creator/dashboard", ...creator, authoring.getCreatorCourses);
router.post("/", ...creator, authoring.createCourse);

router.get("/:id", authoring.getCourseDetails);
router.put("/:id", ...creator, authoring.updateCourse);
router.post("/:id/thumbnail", ...creator, uploadLimiter, authoring.thumbnailUploadMiddleware, authoring.uploadThumbnail);
router.post("/:id/publish", ...creator, authoring.requestPublish);

router.post("/:id/modules", ...creator, authoring.addModule);
router.put("/:id/modules/reorder", ...creator, authoring.reorderModules);
router.put("/:id/modules/:mid", ...creator, authoring.updateModule);
router.delete("/:id/modules/:mid", ...creator, authoring.deleteModule);
router.post("/:id/modules/:mid/upload-init", ...creator, uploadLimiter, authoring.uploadInit);
router.post("/:id/modules/:mid/upload-complete", ...creator, authoring.uploadComplete);
router.post("/:id/modules/:mid/upload", ...creator, uploadLimiter, authoring.moduleFileMiddleware, authoring.uploadModuleFile);

// Isi modul: pemilik, admin, peserta terdaftar, atau pratinjau gratis (diperiksa di controller)
router.get("/:id/modules/:mid/content", authenticateToken, authoring.getModuleContent);
router.get("/:id/modules/:mid/file", authenticateToken, authoring.streamModuleFile);

// Diskon dan kode promo: pemilik kursus, Admin, atau Direktur (dicek lagi di controller)
router.get("/:id/discounts", ...discountManager, pricing.listDiscounts);
router.post("/:id/discounts", ...discountManager, pricing.createDiscount);
router.post("/:id/discounts/bulk", ...discountManager, pricing.createBulkCodes);
router.post("/:id/discounts/:did/cancel", ...discountManager, pricing.cancelDiscount);
router.post("/:id/promo/validate", authenticateToken, promoLimiter, pricing.validatePromo);

// Ujian (pemilik)
router.get("/:id/exam", ...creator, authoring.getExam);
router.put("/:id/exam", ...creator, authoring.updateExam);
router.post("/:id/exam/questions", ...creator, authoring.addQuestion);
router.put("/:id/exam/questions/:qid", ...creator, authoring.updateQuestion);
router.delete("/:id/exam/questions/:qid", ...creator, authoring.deleteQuestion);

export default router;
