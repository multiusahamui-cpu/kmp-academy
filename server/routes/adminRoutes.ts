
import { Router } from "express";
import * as admin from "../controllers/adminController";
import { authenticateToken, requireRole } from "../middleware/auth";
import * as deletion from "../controllers/accountDeletionController";
import { uploadLimiter } from "../lib/security";

const router = Router();

router.use(authenticateToken);

// Stats
router.get("/stats", requireRole(["ADMIN_SYSTEM", "SUPERADMIN", "DIRECTOR"]), admin.getDashboardStats);

// Users
router.get("/users", requireRole(["ADMIN_SYSTEM", "SUPERADMIN"]), admin.getAllUsers);
router.put("/users/:id/role", requireRole(["ADMIN_SYSTEM", "SUPERADMIN"]), admin.updateUserRole);
router.delete("/users/:id", requireRole(["ADMIN_SYSTEM", "SUPERADMIN"]), admin.deleteUser);

// Daftar tunggu calon mentor/creator & kartu
router.get("/applications", requireRole(["ADMIN_SYSTEM", "SUPERADMIN"]), admin.listRoleApplications);
router.post("/applications/:id/decision", requireRole(["ADMIN_SYSTEM", "SUPERADMIN"]), admin.decideRoleApplication);
router.post("/users/:id/card", requireRole(["ADMIN_SYSTEM", "SUPERADMIN"]), admin.issueUserCard);

// Penghapusan akun individual: diputuskan Admin atau Direktur; saldo diselesaikan Admin; arsip hanya baca
router.get("/account-deletions", requireRole(["ADMIN_SYSTEM", "DIRECTOR"]), deletion.listDeletions);
router.post("/account-deletions/:id/decision", requireRole(["ADMIN_SYSTEM", "DIRECTOR"]), deletion.decideDeletion);
router.post("/account-deletions/:id/settlement", requireRole(["ADMIN_SYSTEM"]), uploadLimiter, deletion.proofUploadMiddleware, deletion.settleBalance);
router.get("/settlements/:id/proof", requireRole(["ADMIN_SYSTEM", "DIRECTOR"]), deletion.getSettlementProof);
router.get("/archived-accounts", requireRole(["ADMIN_SYSTEM", "DIRECTOR"]), deletion.listArchived);

// Approvals
router.get("/approvals/:type", requireRole(["ADMIN_SYSTEM", "SUPERADMIN"]), admin.getApprovals);
router.post("/approvals/:type/:id", requireRole(["ADMIN_SYSTEM", "SUPERADMIN"]), admin.processApproval);

// Helpdesk
router.get("/tickets", requireRole(["ADMIN_SYSTEM", "SUPERADMIN"]), admin.getTickets);
router.post("/tickets/:id/reply", requireRole(["ADMIN_SYSTEM", "SUPERADMIN"]), admin.replyTicket);
router.put("/tickets/:id/close", requireRole(["ADMIN_SYSTEM", "SUPERADMIN"]), admin.closeTicket);

// System
router.get("/cron-logs", requireRole(["ADMIN_SYSTEM", "SUPERADMIN"]), admin.getCronLogs);
router.post("/cron/trigger/:jobId", requireRole(["ADMIN_SYSTEM", "SUPERADMIN"]), admin.triggerCron);

// Finance
router.get("/finance/settlements", requireRole(["ADMIN_SYSTEM", "SUPERADMIN"]), admin.getSettlements);
router.post("/finance/settlements/:id/process", requireRole(["ADMIN_SYSTEM", "SUPERADMIN"]), admin.processSettlement);

// Director specific
router.get("/reports/strategic", requireRole(["DIRECTOR", "SUPERADMIN"]), admin.getStrategicReport);

export default router;
