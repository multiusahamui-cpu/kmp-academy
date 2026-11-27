import { desc, eq, sql, ne, and } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { nodeRuleVersions } from "../schema/schema";
import { successResponse, errorResponse } from "../utils/response";

// Validasi mengikuti check constraint tabel academy_node.rule_versions.
const ruleSchema = z.object({
  nodePrice: z.number().int().positive().max(1_000_000_000),
  sponsorPercent: z.number().int().min(0).max(100),
  levelPercent: z.number().int().min(0).max(100),
  maxLevels: z.number().int().min(0).max(100),
  pairingPercent: z.number().int().min(0).max(100),
  dailyPointMultiplier: z.number().int().positive().max(1000),
});

export const listNodeRules = async (_req: any, res: any) => {
  try {
    const rows = await db.select().from(nodeRuleVersions).orderBy(desc(nodeRuleVersions.version)).limit(50);
    successResponse(res, rows, "Daftar versi aturan Program Node");
  } catch (error) {
    errorResponse(res, "Gagal memuat aturan Program Node", 500, error);
  }
};

export const createNodeRule = async (req: any, res: any) => {
  try {
    const parsed = ruleSchema.safeParse(req.body);
    if (!parsed.success) return errorResponse(res, "Nilai aturan belum valid (harga/persen/level).", 400);
    const [{ maxVersion }] = await db.select({ maxVersion: sql<number>`coalesce(max(${nodeRuleVersions.version}), 0)::int` }).from(nodeRuleVersions);
    const nextVersion = Number(maxVersion ?? 0) + 1;
    const [row] = await db.insert(nodeRuleVersions).values({
      version: nextVersion,
      status: "DRAFT",
      nodePrice: parsed.data.nodePrice,
      sponsorPercent: parsed.data.sponsorPercent,
      levelPercent: parsed.data.levelPercent,
      maxLevels: parsed.data.maxLevels,
      pairingPercent: parsed.data.pairingPercent,
      dailyPointMultiplier: parsed.data.dailyPointMultiplier,
      createdBy: req.user.id,
    }).returning();
    successResponse(res, row, `Versi aturan #${nextVersion} dibuat sebagai DRAFT.`, 201);
  } catch (error) {
    errorResponse(res, "Gagal membuat versi aturan", 500, error);
  }
};

export const activateNodeRule = async (req: any, res: any) => {
  try {
    if (!z.string().uuid().safeParse(req.params.id).success) return errorResponse(res, "Aturan tidak ditemukan", 404);
    const outcome = await db.transaction(async (tx) => {
      const [rule] = await tx.select().from(nodeRuleVersions).where(eq(nodeRuleVersions.id, req.params.id)).for("update");
      if (!rule) return { code: 404 as const, message: "Aturan tidak ditemukan" };
      if (rule.status === "ACTIVE") return { code: 409 as const, message: "Versi aturan ini sudah aktif." };
      // Hanya satu aturan ACTIVE pada satu waktu: arsipkan aktif sebelumnya.
      await tx.update(nodeRuleVersions).set({ status: "ARCHIVED" }).where(and(eq(nodeRuleVersions.status, "ACTIVE"), ne(nodeRuleVersions.id, rule.id)));
      await tx.update(nodeRuleVersions).set({ status: "ACTIVE", effectiveFrom: new Date() }).where(eq(nodeRuleVersions.id, rule.id));
      return { code: 200 as const, message: `Versi aturan #${rule.version} diaktifkan.` };
    });
    if (outcome.code !== 200) return errorResponse(res, outcome.message, outcome.code);
    successResponse(res, null, outcome.message);
  } catch (error) {
    errorResponse(res, "Gagal mengaktifkan aturan", 500, error);
  }
};
