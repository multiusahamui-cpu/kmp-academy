// Program Node berdiri sendiri dari dompet dan payout kursus Academy.
// Semua fungsi di berkas ini murni agar formula dapat diuji tanpa database.

export const NODE_RULE_DEFAULTS = {
  nodePrice: 50_000,
  sponsorPercent: 20,
  levelPercent: 1,
  maxLevels: 10,
  pairingPercent: 15,
  dailyPointMultiplier: 16,
} as const;

export type NodeTier = "NONE" | "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";

export const nodeTier = (activeNodes: number): NodeTier => {
  if (activeNodes >= 15) return "PLATINUM";
  if (activeNodes >= 7) return "GOLD";
  if (activeNodes >= 3) return "SILVER";
  if (activeNodes >= 1) return "BRONZE";
  return "NONE";
};

export const percentOf = (amount: number, percent: number): number =>
  Math.floor((amount * percent) / 100);

export const dailyPairingCapacity = (activeNodes: number, multiplier: number = NODE_RULE_DEFAULTS.dailyPointMultiplier): number =>
  Math.max(0, Math.floor(activeNodes)) * Math.max(0, Math.floor(multiplier));

export interface PairingResult {
  availablePoints: number;
  capacityPoints: number;
  paidPoints: number;
  expiredPoints: number;
  pointValue: number;
  amount: number;
}

export const calculatePairing = (input: {
  activeNodes: number;
  availablePoints: number;
  nodePrice: number;
  pairingPercent: number;
  dailyPointMultiplier: number;
}): PairingResult => {
  const availablePoints = Math.max(0, Math.floor(input.availablePoints));
  const capacityPoints = dailyPairingCapacity(input.activeNodes, input.dailyPointMultiplier);
  const paidPoints = Math.min(availablePoints, capacityPoints);
  const pointValue = percentOf(input.nodePrice, input.pairingPercent);
  return {
    availablePoints,
    capacityPoints,
    paidPoints,
    expiredPoints: Math.max(0, availablePoints - paidPoints),
    pointValue,
    amount: paidPoints * pointValue,
  };
};

export const topupQuote = (nodeCount: number, nodePrice: number = NODE_RULE_DEFAULTS.nodePrice) => {
  if (!Number.isInteger(nodeCount) || nodeCount < 1 || nodeCount > 100_000) throw new Error("Jumlah node harus 1 sampai 100.000.");
  if (!Number.isSafeInteger(nodePrice) || nodePrice < 1) throw new Error("Harga node tidak valid.");
  const total = nodeCount * nodePrice;
  if (!Number.isSafeInteger(total)) throw new Error("Nilai top up melebihi batas aman.");
  return { nodeCount, nodePrice, total };
};
