/**
 * Seed idempoten: memastikan ada satu aturan Program Node berstatus ACTIVE.
 * Aman dijalankan berulang — tidak menyentuh data lain (users/courses).
 * Jalankan: pnpm db:seed-node
 */
import { sql } from "drizzle-orm";
import { db } from "../server/db";
import { nodeRuleVersions } from "../server/schema/schema";
import { NODE_RULE_DEFAULTS } from "../shared/node-program";

const run = async () => {
  try {
    const existing = await db.select({ id: nodeRuleVersions.id }).from(nodeRuleVersions).limit(1);
    if (existing.length > 0) {
      console.log("ℹ️  Aturan Program Node sudah ada — tidak membuat ulang.");
      process.exit(0);
    }
    await db.insert(nodeRuleVersions).values({
      version: 1,
      status: "ACTIVE",
      nodePrice: NODE_RULE_DEFAULTS.nodePrice,
      sponsorPercent: NODE_RULE_DEFAULTS.sponsorPercent,
      levelPercent: NODE_RULE_DEFAULTS.levelPercent,
      maxLevels: NODE_RULE_DEFAULTS.maxLevels,
      pairingPercent: NODE_RULE_DEFAULTS.pairingPercent,
      dailyPointMultiplier: NODE_RULE_DEFAULTS.dailyPointMultiplier,
      effectiveFrom: sql`now()`,
    });
    console.log("✅ Aturan Program Node v1 (ACTIVE) dibuat dari NODE_RULE_DEFAULTS.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Gagal seed aturan Program Node:", error);
    process.exit(1);
  }
};

run();
