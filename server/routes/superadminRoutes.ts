
import { Router } from "express";
import { getServerHealthFull, toggleMaintenance, assignRole, updatePolicy } from "../controllers/superadminController";
import { authenticateToken, requireRole } from "../middleware/auth";
import { listSystemConfig, updateSystemConfig, getSystemConfigHistory } from "../controllers/systemConfigController";

const router = Router();

router.use(authenticateToken);
router.use(requireRole(["SUPERADMIN"])); // Strictly Superadmin

router.get("/health", getServerHealthFull);
router.post("/maintenance", toggleMaintenance);
router.put("/roles/assign", assignRole);
router.put("/policy", updatePolicy);

// Konfigurasi Sistem
router.get("/config", listSystemConfig);
router.get("/config/history", getSystemConfigHistory);
router.put("/config/:key", updateSystemConfig);

export default router;
