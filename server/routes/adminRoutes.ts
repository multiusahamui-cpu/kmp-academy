
import * as workshop from "../controllers/workshopController";
import * as payout from "../controllers/payoutController";
import { Router } from "express";
import * as admin from "../controllers/adminController";
import { authenticateToken, requireRole } from "../middleware/auth";
import * as deletion from "../controllers/accountDeletionController";
import { uploadLimiter } from "../lib/security";
import * as payAdmin from "../controllers/adminPaymentController";
import * as report from "../controllers/reportController";
import * as mgmt from "../controllers/managementController";
import * as partner from "../controllers/partnerController";

const router = Router();

router.use(authenticateToken);

// Stats
router.get("/stats", requireRole(["ADMIN_SYSTEM", "SUPERADMIN", "DIRECTOR"]), report.getDashboardStats);

// Users
router.get("/users", requireRole(["ADMIN_SYSTEM", "SUPERADMIN", "DIRECTOR"]), admin.getAllUsers);

// Daftar tunggu calon mentor/creator & kartu
router.get("/applications", requireRole(["ADMIN_SYSTEM", "SUPERADMIN"]), admin.listRoleApplications);
router.post("/applications/:id/decision", requireRole(["ADMIN_SYSTEM", "SUPERADMIN"]), admin.decideRoleApplication);
router.post("/users/:id/card", requireRole(["ADMIN_SYSTEM", "SUPERADMIN"]), admin.issueUserCard);

// Verifikasi pembayaran transfer manual (Admin Sistem)
router.get("/payment-orders", requireRole(["ADMIN_SYSTEM"]), payAdmin.listPaymentOrders);
router.get("/payment-orders/:id/proof", requireRole(["ADMIN_SYSTEM"]), payAdmin.getPaymentProof);
router.post("/payment-orders/:id/decision", requireRole(["ADMIN_SYSTEM"]), payAdmin.decidePaymentOrder);

// Penghapusan akun individual: diputuskan Admin atau Direktur; saldo diselesaikan Admin; arsip hanya baca
router.get("/workshop-proposals", requireRole(["ADMIN_SYSTEM", "DIRECTOR"]), workshop.listProposals);
router.post("/workshop-proposals/:id/approve", requireRole(["ADMIN_SYSTEM", "DIRECTOR"]), workshop.approveProposal);
router.post("/workshop-proposals/:id/reject", requireRole(["ADMIN_SYSTEM", "DIRECTOR"]), workshop.rejectProposal);
// Pencairan bagi hasil bulanan: Admin memposting dan mencatat transfer, Direktur menyetujui.
router.get("/payouts", requireRole(["ADMIN_SYSTEM", "DIRECTOR"]), payout.overview);
router.post("/payouts/post", requireRole(["ADMIN_SYSTEM"]), payout.postNow);
router.get("/payouts/archive", requireRole(["ADMIN_SYSTEM", "DIRECTOR"]), payout.archive);
router.post("/payouts/payees/:pid/pay", requireRole(["ADMIN_SYSTEM"]), uploadLimiter, payout.payProofMiddleware, payout.pay);
router.get("/payouts/payees/:pid/proof", requireRole(["ADMIN_SYSTEM", "DIRECTOR"]), payout.adminProof);
router.post("/payouts/payees/:pid/resend", requireRole(["ADMIN_SYSTEM"]), payout.resendProof);
router.get("/payouts/:id", requireRole(["ADMIN_SYSTEM", "DIRECTOR"]), payout.getBatch);
router.get("/payouts/:id/transactions.csv", requireRole(["ADMIN_SYSTEM", "DIRECTOR"]), payout.exportTransactions);
router.post("/payouts/:id/approve", requireRole(["DIRECTOR"]), payout.approve);
router.post("/payouts/:id/void", requireRole(["DIRECTOR"]), payout.voidIt);
router.get("/account-deletions", requireRole(["ADMIN_SYSTEM", "DIRECTOR"]), deletion.listDeletions);
router.post("/account-deletions/:id/decision", requireRole(["ADMIN_SYSTEM", "DIRECTOR"]), deletion.decideDeletion);
router.post("/account-deletions/:id/settlement", requireRole(["ADMIN_SYSTEM"]), uploadLimiter, deletion.proofUploadMiddleware, deletion.settleBalance);
router.get("/settlements/:id/proof", requireRole(["ADMIN_SYSTEM", "DIRECTOR"]), deletion.getSettlementProof);
router.get("/archived-accounts", requireRole(["ADMIN_SYSTEM", "DIRECTOR"]), deletion.listArchived);

// Job berkala (riwayat, pemicu manual)
router.get("/jobs", requireRole(["ADMIN_SYSTEM", "SUPERADMIN"]), admin.listJobs);
router.get("/jobs/:jobId/runs", requireRole(["ADMIN_SYSTEM", "SUPERADMIN"]), admin.listJobRuns);
router.post("/jobs/:jobId/run", requireRole(["ADMIN_SYSTEM", "SUPERADMIN"]), admin.runJobNow);
// Laporan manajemen (dibuat Admin, dibaca Direktur) dan siaran Direktur
router.post("/management-reports", requireRole(["ADMIN_SYSTEM"]), mgmt.createReport);
router.get("/management-reports", requireRole(["ADMIN_SYSTEM", "DIRECTOR", "SUPERADMIN"]), mgmt.listReports);
router.get("/management-reports/:id", requireRole(["ADMIN_SYSTEM", "DIRECTOR", "SUPERADMIN"]), mgmt.getReport);
router.put("/management-reports/:id/read", requireRole(["DIRECTOR"]), mgmt.markReportRead);
router.post("/broadcasts", requireRole(["DIRECTOR"]), mgmt.createBroadcast);
router.get("/broadcasts", requireRole(["DIRECTOR", "SUPERADMIN"]), mgmt.listBroadcasts);

// Tata kelola mitra: hanya Direktur
router.get("/partners", requireRole(["DIRECTOR"]), partner.listPartners);
router.get("/partners/:id/sanctions", requireRole(["DIRECTOR"]), partner.listSanctions);
router.post("/partners/:id/sanctions", requireRole(["DIRECTOR"]), partner.createSanction);
router.put("/sanctions/:sid/lift", requireRole(["DIRECTOR"]), partner.liftSanction);

// Keuangan (data nyata; bagi hasil Creator belum ditetapkan sehingga belum ada pencairan royalti)
const finance = requireRole(["ADMIN_SYSTEM", "SUPERADMIN", "DIRECTOR"]);
router.get("/finance/summary", finance, report.getFinanceSummary);
router.get("/finance/sales", finance, report.getFinanceSales);
router.get("/finance/sales.csv", finance, report.exportFinanceSales);
router.get("/finance/settlements", finance, report.getSettlements);
router.get("/finance/voucher-batches", finance, report.getVoucherBatches);

// Director specific
router.get("/reports/strategic", requireRole(["DIRECTOR", "SUPERADMIN"]), report.getStrategicReport);
router.get("/quality", requireRole(["DIRECTOR", "SUPERADMIN", "ADMIN_SYSTEM"]), report.getQuality);

export default router;
