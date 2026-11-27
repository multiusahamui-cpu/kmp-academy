import { Router } from "express";
import { authenticateToken, requireRole } from "../middleware/auth";
import { listSystemConfig, updateSystemConfig, getSystemConfigHistory } from "../controllers/systemConfigController";
import * as appointments from "../controllers/appointmentController";
import * as nodeRule from "../controllers/nodeRuleController";

const router = Router();

router.use(authenticateToken);
router.use(requireRole(["SUPERADMIN"])); // Strictly Superadmin

// Konfigurasi Sistem
router.get("/config", listSystemConfig);
router.get("/config/history", getSystemConfigHistory);
router.put("/config/:key", updateSystemConfig);

// Aturan Program Node (harga node, persen bonus) — hanya Superadmin
router.get("/node-rules", nodeRule.listNodeRules);
router.post("/node-rules", nodeRule.createNodeRule);
router.post("/node-rules/:id/activate", nodeRule.activateNodeRule);

// Pengangkatan Direktur / Admin Sistem
router.get("/staff", appointments.listStaff);
router.get("/appointments", appointments.listAppointments);
router.post("/appointments", appointments.appoint);
router.post("/staff/:id/dismiss", appointments.dismiss);

export default router;
