import fs from "node:fs/promises";
import path from "node:path";
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Penyimpanan berkas Academy. Dua tempat:
//  - PUBLIC : boleh dibuka siapa saja lewat CDN (foto profil, thumbnail kursus).
//  - PRIVATE: tidak pernah publik (bukti transfer, materi berbayar); dibuka lewat tautan bertanda tangan singkat.
// Driver dipilih lewat STORAGE_DRIVER: "r2" (Cloudflare R2) atau "local" (bawaan; folder static/ dan private-uploads/).

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketPublic: string;
  bucketPrivate: string;
  publicUrlBase: string; // tanpa garis miring di akhir
  prefix: string; // "" atau "abc/" (opsional, bila domain publik hanya memetakan sub-path)
}

export const readR2Config = (env: NodeJS.ProcessEnv = process.env): R2Config | null => {
  const accountId = (env.R2_ACCOUNT_ID ?? "").trim();
  const accessKeyId = (env.R2_ACCESS_KEY_ID ?? "").trim();
  const secretAccessKey = (env.R2_SECRET_ACCESS_KEY ?? "").trim();
  const bucketPublic = (env.R2_BUCKET_PUBLIC ?? "").trim();
  const bucketPrivate = (env.R2_BUCKET_PRIVATE ?? "").trim();
  const publicUrlBase = (env.R2_PUBLIC_URL_BASE ?? "").trim().replace(/\/+$/, "");
  if (!accountId || !accessKeyId || !secretAccessKey || !bucketPublic || !bucketPrivate || !publicUrlBase) return null;
  const rawPrefix = (env.R2_PREFIX_KEY ?? "").trim().replace(/^\/+|\/+$/g, "");
  return { accountId, accessKeyId, secretAccessKey, bucketPublic, bucketPrivate, publicUrlBase, prefix: rawPrefix ? `${rawPrefix}/` : "" };
};

export type DriverName = "local" | "r2";

/** "r2" hanya bila diminta DAN konfigurasinya lengkap; selain itu salah konfigurasi dilaporkan, bukan diam-diam jatuh ke local. */
export const resolveDriver = (env: NodeJS.ProcessEnv = process.env): DriverName => {
  const want = (env.STORAGE_DRIVER ?? "local").trim().toLowerCase();
  if (want !== "r2") return "local";
  if (!readR2Config(env)) {
    throw new Error("STORAGE_DRIVER=r2 tetapi variabel R2_* belum lengkap (lihat .env.example).");
  }
  return "r2";
};

// Kunci objek hanya huruf kecil/angka/-/_/. dan "/" sebagai pemisah folder; tanpa ".." atau awalan "/".
const SAFE_KEY = /^[a-z0-9][a-z0-9/_.-]*$/;
export const assertSafeKey = (key: string): string => {
  if (!SAFE_KEY.test(key) || key.includes("..") || key.includes("//") || key.endsWith("/")) {
    throw new Error("Kunci berkas tidak valid");
  }
  return key;
};

const LOCAL_PUBLIC_URL_PREFIX = "/cdn/";
const localPublicDir = (): string => path.resolve("static");
const localPrivateDir = (): string => path.resolve("private-uploads");

/** Mengembalikan kunci objek dari URL publik yang tersimpan di database; null bila bukan milik penyimpanan ini. */
export const publicKeyFromUrl = (url: string, driver: DriverName, cfg: R2Config | null): string | null => {
  if (driver === "r2" && cfg) {
    const base = `${cfg.publicUrlBase}/${cfg.prefix}`;
    return url.startsWith(base) ? url.slice(base.length) : null;
  }
  return url.startsWith(LOCAL_PUBLIC_URL_PREFIX) ? url.slice(LOCAL_PUBLIC_URL_PREFIX.length) : null;
};

let client: S3Client | null = null;
const r2Client = (cfg: R2Config): S3Client => {
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
    });
  }
  return client;
};

const ctx = () => {
  const driver = resolveDriver();
  return { driver, cfg: driver === "r2" ? readR2Config() : null };
};

/** Simpan berkas publik; mengembalikan URL yang disimpan di database. */
export const putPublic = async (key: string, data: Uint8Array, mime: string): Promise<string> => {
  assertSafeKey(key);
  const { driver, cfg } = ctx();
  if (driver === "r2" && cfg) {
    await r2Client(cfg).send(new PutObjectCommand({ Bucket: cfg.bucketPublic, Key: `${cfg.prefix}${key}`, Body: data, ContentType: mime, CacheControl: "public, max-age=31536000, immutable" }));
    return `${cfg.publicUrlBase}/${cfg.prefix}${key}`;
  }
  const file = path.join(localPublicDir(), key);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, data, { flag: "wx" });
  return `${LOCAL_PUBLIC_URL_PREFIX}${key}`;
};

export const deletePublic = async (key: string): Promise<void> => {
  assertSafeKey(key);
  const { driver, cfg } = ctx();
  try {
    if (driver === "r2" && cfg) await r2Client(cfg).send(new DeleteObjectCommand({ Bucket: cfg.bucketPublic, Key: `${cfg.prefix}${key}` }));
    else await fs.unlink(path.join(localPublicDir(), key));
  } catch {
    // sudah tidak ada
  }
};

export const putPrivate = async (key: string, data: Uint8Array, mime: string): Promise<void> => {
  assertSafeKey(key);
  const { driver, cfg } = ctx();
  if (driver === "r2" && cfg) {
    await r2Client(cfg).send(new PutObjectCommand({ Bucket: cfg.bucketPrivate, Key: key, Body: data, ContentType: mime }));
    return;
  }
  const file = path.join(localPrivateDir(), key);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, data, { flag: "wx" });
};

export const deletePrivate = async (key: string): Promise<void> => {
  assertSafeKey(key);
  const { driver, cfg } = ctx();
  try {
    if (driver === "r2" && cfg) await r2Client(cfg).send(new DeleteObjectCommand({ Bucket: cfg.bucketPrivate, Key: key }));
    else await fs.unlink(path.join(localPrivateDir(), key));
  } catch {
    // sudah tidak ada
  }
};

export type PrivateAccess = { type: "redirect"; url: string } | { type: "file"; path: string };

/** Cara membuka berkas privat: R2 = tautan bertanda tangan berumur pendek; local = path berkas untuk dikirim server. */
export const privateAccess = async (key: string, mime: string, ttlSeconds = 60): Promise<PrivateAccess> => {
  assertSafeKey(key);
  const { driver, cfg } = ctx();
  if (driver === "r2" && cfg) {
    const url = await getSignedUrl(
      r2Client(cfg),
      new GetObjectCommand({ Bucket: cfg.bucketPrivate, Key: key, ResponseContentType: mime, ResponseContentDisposition: "inline" }),
      { expiresIn: ttlSeconds },
    );
    return { type: "redirect", url };
  }
  return { type: "file", path: path.join(localPrivateDir(), key) };
};

export type PrivateUpload = { mode: "direct"; url: string; headers: Record<string, string> } | { mode: "server" };

/** Unggah langsung dari browser ke bucket private (R2); driver local mengunggah lewat server. */
export const privateUploadTarget = async (key: string, mime: string, ttlSeconds = 900): Promise<PrivateUpload> => {
  assertSafeKey(key);
  const { driver, cfg } = ctx();
  if (driver === "r2" && cfg) {
    const url = await getSignedUrl(r2Client(cfg), new PutObjectCommand({ Bucket: cfg.bucketPrivate, Key: key, ContentType: mime }), {
      expiresIn: ttlSeconds,
      signableHeaders: new Set(["content-type"]),
    });
    return { mode: "direct", url, headers: { "Content-Type": mime } };
  }
  return { mode: "server" };
};

export interface PrivateObjectInfo {
  size: number;
  head: Uint8Array; // beberapa byte pertama untuk pengenalan jenis berkas
}

/** Memeriksa objek privat yang sudah diunggah: ukuran dan 16 byte pertama. null bila tidak ada. */
export const inspectPrivate = async (key: string): Promise<PrivateObjectInfo | null> => {
  assertSafeKey(key);
  const { driver, cfg } = ctx();
  try {
    if (driver === "r2" && cfg) {
      const c = r2Client(cfg);
      const meta = await c.send(new HeadObjectCommand({ Bucket: cfg.bucketPrivate, Key: key }));
      const part = await c.send(new GetObjectCommand({ Bucket: cfg.bucketPrivate, Key: key, Range: "bytes=0-15" }));
      const bytes = part.Body ? await part.Body.transformToByteArray() : new Uint8Array();
      return { size: Number(meta.ContentLength ?? 0), head: bytes };
    }
    const file = path.join(localPrivateDir(), key);
    const stat = await fs.stat(file);
    const fh = await fs.open(file, "r");
    try {
      const buf = Buffer.alloc(16);
      const { bytesRead } = await fh.read(buf, 0, 16, 0);
      return { size: stat.size, head: buf.subarray(0, bytesRead) };
    } finally {
      await fh.close();
    }
  } catch {
    return null;
  }
};
