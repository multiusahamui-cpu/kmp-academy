
import { Router } from "express";
import { getSystemHealth } from "../controllers/healthController";
import authRoutes from "./authRoutes";
import courseRoutes from "./courseRoutes";
import userRoutes from "./userRoutes";
import mentorRoutes from "./mentorRoutes";
import adminRoutes from "./adminRoutes";
import reviewRoutes from "./reviewRoutes";
import superadminRoutes from "./superadminRoutes";
import { getPublicSystemConfig } from "../controllers/systemConfigController";
import { maintenanceGuard } from "../middleware/maintenance";

const router = Router();

// Public Health Check
router.get("/health", getSystemHealth);

// Konfigurasi publik (nama situs, pengumuman, status maintenance, dll.)
router.get("/config/public", getPublicSystemConfig);

// Mode maintenance: menutup semua rute di bawah ini untuk selain Superadmin
router.use(maintenanceGuard);

// Module Routes
router.use("/auth", authRoutes);
router.use("/courses", courseRoutes); // Includes Categories & Content
router.use("/users", userRoutes); // Includes Learning, Wallet, Certs
router.use("/mentor", mentorRoutes); // Includes Classroom
router.use("/admin", adminRoutes); // Includes Finance, Helpdesk, Approvals
router.use("/", reviewRoutes); // Root level for clean /courses/:id/reviews path
router.use("/superadmin", superadminRoutes); // Restricted IT Ops

export default router;
