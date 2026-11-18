import * as dotenv from "dotenv";

dotenv.config({ quiet: true });

// Nilai bawaan/contoh yang tidak boleh dipakai sebagai secret.
const WEAK_SECRETS = new Set(["default_secret", "secret", "changeme", "session_secret", "your_session_secret"]);

/**
 * Membaca SESSION_SECRET dari environment. Tidak ada nilai cadangan: bila kosong
 * atau lemah, server menolak start — cookie sesi yang ditandatangani dengan secret
 * bawaan bisa dipalsukan siapa pun.
 */
export function readSessionSecret(env: NodeJS.ProcessEnv = process.env): string {
  const value = (env.SESSION_SECRET ?? "").trim();
  if (!value) {
    throw new Error("SESSION_SECRET wajib diisi di .env (tidak ada nilai cadangan).");
  }
  if (WEAK_SECRETS.has(value.toLowerCase())) {
    throw new Error("SESSION_SECRET masih memakai nilai contoh. Ganti dengan nilai acak baru.");
  }
  if (env.NODE_ENV === "production" && value.length < 32) {
    throw new Error("SESSION_SECRET produksi minimal 32 karakter.");
  }
  return value;
}
