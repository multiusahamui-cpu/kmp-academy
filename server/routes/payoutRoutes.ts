import { Router } from "express";
import { authenticateToken, requireRole } from "../middleware/auth";
import * as payout from "../controllers/payoutController";

// Sisi penerima bagi hasil (Creator dan Mentor). Sisi Admin/Direktur ada di /admin/payouts.
const router = Router();
router.use(authenticateToken);
router.use(requireRole(["CREATOR", "MENTOR"]));

router.get("/mine", payout.mine);
router.get("/mine/:batchId", payout.myStatement);
router.get("/mine/:batchId/proof", payout.myProof);
router.post("/bank-account", payout.saveBankAccount);

export default router;
