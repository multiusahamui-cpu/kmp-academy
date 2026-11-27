import api from "./api";

export interface NodeSummary {
  programStatus: "DRAFT" | "ACTIVE";
  simulationMode: boolean;
  activeNodes: number;
  tier: "NONE" | "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
  capacityPoints: number;
  bonusBalance: number;
  rule: null | { version: number; nodePrice: number; pairingPercent: number; dailyPointMultiplier: number };
  today: NodeDailySummary | null;
  history: NodeDailySummary[];
  referral: null | { code: string; hasSponsor: boolean; status: string };
}

export interface NodeTopupOrder {
  id: string;
  nodeCount: number;
  nodePrice: number;
  amount: number;
  status: string;
  paymentReference: string | null;
  decisionNote: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface NodeBonusWithdrawal {
  id: string;
  requestedAmount: number;
  status: string;
  requestNote: string | null;
  decisionNote: string | null;
  transferReference: string | null;
  createdAt: string;
  decidedAt: string | null;
}

export interface NodeDailySummary {
  id: string;
  businessDate: string;
  activeNodes: number;
  capacityPoints: number;
  availablePoints: number;
  paidPoints: number;
  expiredPoints: number;
  sponsorBonus: number;
  levelBonus: number;
  pairingBonus: number;
  totalBonus: number;
  status: string;
}

export const nodeProgramApi = {
  me: () => api.get("/node-program/me"),
  listTopups: () => api.get("/node-program/topups"),
  previewTopup: (nodeCount: number) => api.post("/node-program/topups/preview", { nodeCount }),
  createTopup: (nodeCount: number) => api.post("/node-program/topups", { nodeCount }),
  myWithdrawals: () => api.get("/node-program/withdrawals"),
  requestWithdrawal: (amount: number, bankAccountId: string, note?: string) => api.post("/node-program/withdrawals", { amount, bankAccountId, note }),
  adminListTopups: (status = "VERIFYING", page = 1) => api.get("/admin/node-topups", { params: { status, page } }),
  adminDecideTopup: (id: string, data: { decision: "APPROVE"; reference: string; note?: string } | { decision: "REJECT"; note: string }) =>
    api.post(`/admin/node-topups/${id}/decision`, data),
  adminListWithdrawals: (status = "REQUESTED", page = 1) => api.get("/admin/node-withdrawals", { params: { status, page } }),
  adminDecideWithdrawal: (id: string, data: { decision: "APPROVE"; reference: string; note?: string } | { decision: "REJECT"; note: string }) =>
    api.post(`/admin/node-withdrawals/${id}/decision`, data),
};
