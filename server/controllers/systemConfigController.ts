import { desc, eq } from "drizzle-orm";
import { successResponse, errorResponse } from "../utils/response";
import { db } from "../db";
import { systemConfig, systemConfigHistory, users } from "../schema/schema";
import { CONFIG_DEFINITIONS, CONFIG_GROUPS, getConfigDefinition, resolveConfigValue, validateConfigValue } from "@shared/system-config";
import { getPublicConfig, invalidateConfigCache } from "../lib/system-config";

// GET /api/config/public — tanpa login; hanya parameter bertanda isPublic.
export const getPublicSystemConfig = async (_req: any, res: any) => {
  try {
    successResponse(res, await getPublicConfig(), "Konfigurasi publik");
  } catch (error) {
    errorResponse(res, "Gagal memuat konfigurasi", 500, error);
  }
};

// GET /api/superadmin/config — daftar semua parameter + nilai efektif.
export const listSystemConfig = async (_req: any, res: any) => {
  try {
    const rows = await db
      .select({
        key: systemConfig.key,
        value: systemConfig.value,
        updatedAt: systemConfig.updatedAt,
        updatedByName: users.name,
      })
      .from(systemConfig)
      .leftJoin(users, eq(systemConfig.updatedBy, users.id));
    const stored = new Map(rows.map((r) => [r.key, r]));

    const items = CONFIG_DEFINITIONS.map((def) => {
      const row = stored.get(def.key);
      return {
        ...def,
        value: resolveConfigValue(def, row?.value),
        isDefault: !row,
        updatedAt: row?.updatedAt ?? null,
        updatedByName: row?.updatedByName ?? null,
      };
    });
    successResponse(res, { groups: CONFIG_GROUPS, items }, "Konfigurasi sistem");
  } catch (error) {
    errorResponse(res, "Gagal memuat konfigurasi sistem", 500, error);
  }
};

// PUT /api/superadmin/config/:key  { value }
export const updateSystemConfig = async (req: any, res: any) => {
  try {
    const def = getConfigDefinition(String(req.params.key));
    if (!def) return errorResponse(res, "Parameter konfigurasi tidak dikenal", 404);

    const checked = validateConfigValue(def, req.body?.value);
    if (!checked.ok) return errorResponse(res, checked.message, 400);
    const newValue = checked.value;

    const actorId: string = req.user.id;
    const result = await db.transaction(async (tx) => {
      const actor = await tx.select({ name: users.name }).from(users).where(eq(users.id, actorId)).limit(1);
      const existing = await tx.select({ value: systemConfig.value }).from(systemConfig).where(eq(systemConfig.key, def.key)).limit(1);
      const oldValue = existing[0]?.value ?? null;
      const effectiveOld = resolveConfigValue(def, existing[0]?.value);
      if (effectiveOld === newValue && existing.length > 0) return { changed: false };

      const now = new Date();
      await tx
        .insert(systemConfig)
        .values({ key: def.key, value: newValue, updatedBy: actorId, updatedAt: now })
        .onConflictDoUpdate({ target: systemConfig.key, set: { value: newValue, updatedBy: actorId, updatedAt: now } });
      await tx.insert(systemConfigHistory).values({
        key: def.key,
        oldValue: oldValue ?? def.defaultValue,
        newValue,
        changedBy: actorId,
        changedByName: actor[0]?.name ?? null,
        changedAt: now,
      });
      return { changed: true };
    });

    invalidateConfigCache();
    successResponse(res, { key: def.key, value: newValue, changed: result.changed }, result.changed ? `${def.label} disimpan` : "Tidak ada perubahan");
  } catch (error) {
    errorResponse(res, "Gagal menyimpan konfigurasi", 500, error);
  }
};

// GET /api/superadmin/config/history — 100 perubahan terakhir.
export const getSystemConfigHistory = async (_req: any, res: any) => {
  try {
    const rows = await db.select().from(systemConfigHistory).orderBy(desc(systemConfigHistory.changedAt)).limit(100);
    const items = rows.map((r) => ({
      id: r.id,
      key: r.key,
      label: getConfigDefinition(r.key)?.label ?? r.key,
      oldValue: r.oldValue,
      newValue: r.newValue,
      changedByName: r.changedByName,
      changedAt: r.changedAt,
    }));
    successResponse(res, items, "Riwayat perubahan konfigurasi");
  } catch (error) {
    errorResponse(res, "Gagal memuat riwayat konfigurasi", 500, error);
  }
};
