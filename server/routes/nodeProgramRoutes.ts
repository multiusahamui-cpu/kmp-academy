import { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import { createNodeTopupSimulation, getMyNodeSummary, getMyNodeWithdrawals, listMyNodeTopups, previewNodeTopup, requestNodeWithdrawal } from "../controllers/nodeProgramController";

const router = Router();
router.use(authenticateToken);
router.get("/me", getMyNodeSummary);
router.get("/topups", listMyNodeTopups);
router.post("/topups/preview", previewNodeTopup);
router.post("/topups", createNodeTopupSimulation);
router.get("/withdrawals", getMyNodeWithdrawals);
router.post("/withdrawals", requestNodeWithdrawal);

export default router;
