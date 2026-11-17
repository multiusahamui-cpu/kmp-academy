import { Router } from "express";
import multer from "multer";
import path from "path";
import * as course from "../controllers/courseController";
import { authenticateToken, requireRole } from "../middleware/auth";
import { errorResponse } from "../utils/response";
import { getConfigInt } from "../lib/system-config";

const router = Router();

// Multer Config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "static/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
// Batas ukuran mengikuti Konfigurasi Sistem (max_upload_mb), dibaca per unggahan.
const uploadSingleFile = async (req: any, res: any, next: any) => {
  try {
    const maxMb = await getConfigInt("max_upload_mb");
    const upload = multer({ storage, limits: { fileSize: maxMb * 1024 * 1024 } });
    upload.single("file")(req, res, (err: any) => {
      if (err?.code === "LIMIT_FILE_SIZE") {
        return errorResponse(res, `Ukuran berkas melebihi batas ${maxMb} MB`, 413);
      }
      if (err) return next(err);
      next();
    });
  } catch (error) {
    next(error);
  }
};

// Public
router.get("/", course.getCourses);
router.get("/categories", course.getCategories); // New
router.get("/:id", course.getCourseDetails);

// Creator Protected
router.get("/creator/dashboard", authenticateToken, requireRole(["CREATOR", "ADMIN_SYSTEM"]), course.getCreatorCourses); // New
router.post("/", authenticateToken, requireRole(["CREATOR", "ADMIN_SYSTEM"]), course.createCourse);
router.put("/:id", authenticateToken, requireRole(["CREATOR", "ADMIN_SYSTEM"]), course.updateCourse);
router.post("/:id/modules", authenticateToken, requireRole(["CREATOR", "ADMIN_SYSTEM"]), course.addModule);
router.post("/:id/publish", authenticateToken, requireRole(["CREATOR", "ADMIN_SYSTEM"]), course.requestPublish); // New

// Upload (General for Creators/Mentors)
router.post("/upload", authenticateToken, requireRole(["CREATOR", "MENTOR", "ADMIN_SYSTEM"]), uploadSingleFile, course.uploadContent);

export default router;