import { db } from "../db";
import { systemConfig } from "../schema/schema";
import {
  CONFIG_DEFINITIONS,
  buildPublicConfig,
  getConfigDefinition,
  resolveConfigValue,
  type PublicConfig,
} from "@shared/system-config";

// Nilai konfigurasi dibaca di hampir setiap request (maintenance guard), jadi
// di-cache di memori. Perubahan lewat menu Superadmin langsung membuang cache;
// TTL hanya jaring pengaman bila nilai diubah langsung di database.
const CACHE_TTL_MS = 30_000;

let cache: Map<string, string> | null = null;
let cacheLoadedAt = 0;

async function loadStoredValues(): Promise<Map<string, string>> {
  const now = Date.now();
  if (cache && now - cacheLoadedAt < CACHE_TTL_MS) return cache;
  try {
    const rows = await db.select({ key: systemConfig.key, value: systemConfig.value }).from(systemConfig);
    cache = new Map(rows.map((r) => [r.key, r.value]));
    cacheLoadedAt = now;
  } catch (error) {
    // Database bermasalah / tabel belum dimigrasi: pakai nilai terakhir yang diketahui,
    // atau nilai bawaan. Aplikasi tidak boleh mati hanya karena konfigurasi tak terbaca.
    console.error("[system-config] gagal membaca konfigurasi, memakai nilai bawaan:", (error as Error).message);
    cache = cache ?? new Map();
    cacheLoadedAt = now;
  }
  return cache;
}

export function invalidateConfigCache(): void {
  cache = null;
  cacheLoadedAt = 0;
}

/** Nilai efektif sebuah parameter (tersimpan bila valid, selain itu bawaan). */
export async function getConfigValue(key: string): Promise<string> {
  const def = getConfigDefinition(key);
  if (!def) throw new Error(`Parameter konfigurasi tidak dikenal: ${key}`);
  const stored = await loadStoredValues();
  return resolveConfigValue(def, stored.get(key));
}

export async function getConfigBool(key: string): Promise<boolean> {
  return (await getConfigValue(key)) === "on";
}

export async function getConfigInt(key: string): Promise<number> {
  return Number(await getConfigValue(key));
}

export async function getPublicConfig(): Promise<PublicConfig> {
  const stored = await loadStoredValues();
  return buildPublicConfig((key) => {
    const def = getConfigDefinition(key);
    // Hanya parameter bertanda isPublic yang boleh keluar tanpa login.
    if (!def || !def.isPublic) return "";
    return resolveConfigValue(def, stored.get(key));
  });
}

export async function getAllEffectiveValues(): Promise<Map<string, string>> {
  const stored = await loadStoredValues();
  return new Map(CONFIG_DEFINITIONS.map((def) => [def.key, resolveConfigValue(def, stored.get(def.key))]));
}
