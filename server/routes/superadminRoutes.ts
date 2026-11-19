import { Router } from "express";
import { authenticateToken, requireRole } from "../middleware/auth";
import { listSystemConfig, updateSystemConfig, getSystemConfigHistory } from "../controllers/systemConfigController";
import * as appointments from "../controllers/appointmentController";

const router = Router();

router.use(authenticateToken);
router.use(requireRole(["SUPERADMIN"])); // Strictly Superadmin

// Konfigurasi Sistem
router.get("/config", listSystemConfig);
router.get("/config/history", getSystemConfigHistory);
router.put("/config/:key", updateSystemConfig);

// Pengangkatan Direktur / Admin Sistem
router.get("/staff", appointments.listStaff);
router.get("/appointments", appointments.listAppointments);
router.post("/appointments", appointments.appoint);
router.post("/staff/:id/dismiss", appointments.dismiss);

export default router;
