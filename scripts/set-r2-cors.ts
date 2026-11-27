/**
 * Terapkan aturan CORS ke bucket R2 Academy (public + private).
 * Wajib agar unggah materi langsung dari browser (PUT presigned) tidak diblok CORS.
 * Idempoten — aman dijalankan berulang. Jalankan: pnpm r2:cors
 *
 * Origin yang diizinkan: R2_CORS_ORIGINS (pisah koma) bila di-set,
 * selain itu default ke academy.digitalcoop.id + localhost dev.
 */
import "dotenv/config";
import { S3Client, PutBucketCorsCommand, GetBucketCorsCommand } from "@aws-sdk/client-s3";

const accountId = (process.env.R2_ACCOUNT_ID ?? "").trim();
const accessKeyId = (process.env.R2_ACCESS_KEY_ID ?? "").trim();
const secretAccessKey = (process.env.R2_SECRET_ACCESS_KEY ?? "").trim();
const buckets = [process.env.R2_BUCKET_PRIVATE, process.env.R2_BUCKET_PUBLIC].map((b) => (b ?? "").trim()).filter(Boolean);

const origins = (process.env.R2_CORS_ORIGINS ?? "https://academy.digitalcoop.id,http://localhost:5173,http://localhost:3000")
  .split(",").map((s) => s.trim()).filter(Boolean);

const run = async () => {
  if (!accountId || !accessKeyId || !secretAccessKey || buckets.length === 0) {
    console.error("R2 belum lengkap di .env (butuh R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_PRIVATE/PUBLIC).");
    process.exit(1);
  }
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  const rule = { AllowedOrigins: origins, AllowedMethods: ["GET", "PUT", "HEAD"], AllowedHeaders: ["*"], ExposeHeaders: ["ETag"], MaxAgeSeconds: 3600 };
  for (const Bucket of buckets) {
    await client.send(new PutBucketCorsCommand({ Bucket, CORSConfiguration: { CORSRules: [rule] } }));
    const g = await client.send(new GetBucketCorsCommand({ Bucket }));
    console.log(`OK ${Bucket} -> methods ${g.CORSRules?.[0]?.AllowedMethods?.join(",")} | origins ${g.CORSRules?.[0]?.AllowedOrigins?.join(", ")}`);
  }
  console.log("Selesai. CORS R2 terpasang.");
};

run().catch((e) => { console.error("Gagal set CORS:", e instanceof Error ? e.message : e); process.exit(1); });
