import crypto from "node:crypto";

// NIK dienkripsi AES-256-GCM sebelum masuk database. Kunci: KYC_ENCRYPTION_KEY (64 karakter hex = 32 byte), hanya di .env server.
// Kunci hilang = NIK tidak terbaca lagi: simpan di tempat terpisah dari backup database.
const keyOf = (env: NodeJS.ProcessEnv = process.env): Buffer | null => {
  const hex = (env.KYC_ENCRYPTION_KEY ?? "").trim();
  return /^[0-9a-fA-F]{64}$/.test(hex) ? Buffer.from(hex, "hex") : null;
};

export const kycCryptoConfigured = (env: NodeJS.ProcessEnv = process.env): boolean => keyOf(env) !== null;

export const encryptNik = (plain: string, env: NodeJS.ProcessEnv = process.env): string => {
  const key = keyOf(env);
  if (!key) throw new Error("KYC_ENCRYPTION_KEY belum dikonfigurasi");
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv.toString("base64"), c.getAuthTag().toString("base64"), ct.toString("base64")].join(":");
};

export const decryptNik = (blob: string, env: NodeJS.ProcessEnv = process.env): string => {
  const key = keyOf(env);
  if (!key) throw new Error("KYC_ENCRYPTION_KEY belum dikonfigurasi");
  const [v, iv, tag, ct] = blob.split(":");
  if (v !== "v1" || !iv || !tag || !ct) throw new Error("Format NIK terenkripsi tidak dikenal");
  const d = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64"));
  d.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([d.update(Buffer.from(ct, "base64")), d.final()]).toString("utf8");
};

/** Hash NIK untuk mencegah satu KTP dipakai banyak akun (tanpa membuka NIK). HMAC memakai kunci yang sama. */
export const nikFingerprint = (nik: string, env: NodeJS.ProcessEnv = process.env): string => {
  const key = keyOf(env);
  if (!key) throw new Error("KYC_ENCRYPTION_KEY belum dikonfigurasi");
  return crypto.createHmac("sha256", key).update(nik).digest("hex");
};
