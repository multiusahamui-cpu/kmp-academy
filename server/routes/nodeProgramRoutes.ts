import { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import { createNodeTopup, getMyNodeSummary, getMyBonusWallet, listMyNodeTopups, previewNodeTopup, claimBonusToWallet } from "../controllers/nodeProgramController";

const router = Router();
router.use(authenticateToken);
router.get("/me", getMyNodeSummary);
router.get("/topups", listMyNodeTopups);
router.post("/topups/preview", previewNodeTopup);
router.post("/topups", createNodeTopup);
router.get("/withdrawals", getMyBonusWallet);
router.post("/withdrawals", claimBonusToWallet);

export default router;
