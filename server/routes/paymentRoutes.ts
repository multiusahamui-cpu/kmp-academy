import { Router } from "express";
import * as pay from "../controllers/paymentController";
import { authenticateToken } from "../middleware/auth";
import { payLimiter, uploadLimiter } from "../lib/security";

// Pembayaran peserta. Notifikasi Midtrans ada di routes/index.ts (tanpa login, di luar mode maintenance).
const router = Router();
router.use(authenticateToken);

router.get("/methods", pay.getMethods);
router.get("/dc-wallet", payLimiter, pay.getDcWallet);
router.post("/orders", payLimiter, pay.createOrder);
router.get("/orders", pay.listMyOrders);
router.get("/orders/:id", pay.getMyOrder);
router.post("/orders/:id/cancel", pay.cancelMyOrder);
router.post("/orders/:id/proof", uploadLimiter, pay.orderProofMiddleware, pay.uploadOrderProof);

export default router;
