
import { Router } from "express";
import { getSystemHealth } from "../controllers/healthController";
import authRoutes from "./authRoutes";
import courseRoutes from "./courseRoutes";
import userRoutes from "./userRoutes";
import mentorRoutes from "./mentorRoutes";
import adminRoutes from "./adminRoutes";
import helpdeskRoutes from "./helpdeskRoutes";
import classRoutes from "./classRoutes";
import legalRoutes from "./legalRoutes";
import payoutRoutes from "./payoutRoutes";
import reviewRoutes from "./reviewRoutes";
import superadminRoutes from "./superadminRoutes";
import paymentRoutes from "./paymentRoutes";
import { midtransNotify } from "../controllers/paymentController";
import { verifyCertificate } from "../controllers/learningController";
import { verifyLimiter } from "../lib/security";
import { getPublicSystemConfig } from "../controllers/systemConfigController";
import { maintenanceGuard } from "../middleware/maintenance";

const router = Router();

// Public Health Check
router.get("/health", getSystemHealth);

// Konfigurasi publik (nama situs, pengumuman, status maintenance, dll.)
router.get("/config/public", getPublicSystemConfig);

// Notifikasi Midtrans: tanpa login dan tetap jalan saat maintenance (diverifikasi lewat tanda tangan)
router.post("/payments/midtrans/notify", midtransNotify);

// Mode maintenance: menutup semua rute di bawah ini untuk selain Superadmin
router.use(maintenanceGuard);

// Publik: pemeriksaan keaslian sertifikat dari nomornya.
router.get("/certificates/verify/:serial", verifyLimiter, verifyCertificate);

// Module Routes
router.use("/auth", authRoutes);
router.use("/courses", courseRoutes); // Includes Categories & Content
router.use("/payments", paymentRoutes); // Order pembayaran: VA, transfer manual, dompet digitalcoop.id
router.use("/users", userRoutes); // Includes Learning, Wallet, Certs
router.use("/mentor", mentorRoutes); // Kelas, sesi, dan penilaian Mentor
router.use("/payouts", payoutRoutes); // Bagi hasil: sisi Creator/Mentor
router.use("/legal", legalRoutes); // Dokumen hukum dan persetujuan
router.use("/classes", classRoutes); // Sisi siswa: gabung dan kelas yang diikuti
router.use("/helpdesk", helpdeskRoutes); // Tiket bantuan
router.use("/admin", adminRoutes); // Includes Finance, Helpdesk, Approvals
router.use("/", reviewRoutes); // Root level for clean /courses/:id/reviews path
router.use("/superadmin", superadminRoutes); // Restricted IT Ops

export default router;
