import { Router } from "express";
import multer from "multer";
import path from "path";
import * as course from "../controllers/courseController";
import { authenticateToken, requireRole } from "../middleware/auth";

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
const upload = multer({ storage });

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
router.post("/upload", authenticateToken, requireRole(["CREATOR", "MENTOR", "ADMIN_SYSTEM"]), upload.single("file") as any, course.uploadContent);

export default router;