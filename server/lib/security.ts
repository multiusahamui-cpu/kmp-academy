import type { CorsOptions } from "cors";
import rateLimit from "express-rate-limit";
import { errorResponse } from "../utils/response";

/** Daftar origin lintas-situs yang diizinkan dari ALLOWED_ORIGINS (pisahkan dengan koma). */
export const parseAllowedOrigins = (raw: string | undefined): string[] =>
  (raw ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => {
      try {
        return new URL(value).origin;
      } catch {
        return null;
      }
    })
    .filter((value): value is string => Boolean(value));

/**
 * CORS ketat. Permintaan tanpa header Origin (same-origin lewat nginx, curl, server-ke-server) selalu lolos;
 * permintaan lintas-situs hanya dari ALLOWED_ORIGINS. Saat pengembangan, localhost juga diizinkan.
 */
export const buildCorsOptions = (env: NodeJS.ProcessEnv = process.env): CorsOptions => {
  const allowed = new Set(parseAllowedOrigins(env.ALLOWED_ORIGINS));
  const isDev = env.NODE_ENV !== "production";
  return {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowed.has(origin)) return callback(null, true);
      if (isDev && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return callback(null, true);
      return callback(null, false);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 600,
  };
};

const limiter = (windowMinutes: number, max: number, message: string, skipSuccessful = false) =>
  rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit: max,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skipSuccessfulRequests: skipSuccessful,
    handler: (_req: any, res: any) => errorResponse(res, message, 429),
  });

// Percobaan login gagal dibatasi per IP; login yang berhasil tidak dihitung.
export const loginLimiter = limiter(15, 10, "Terlalu banyak percobaan login. Coba lagi dalam 15 menit.", true);
// Pendaftaran akun baru dibatasi per IP.
export const registerLimiter = limiter(60, 10, "Terlalu banyak pendaftaran dari alamat ini. Coba lagi nanti.");
// Ganti password dibatasi agar tidak dipakai menebak password lama dengan token curian.
export const passwordLimiter = limiter(15, 5, "Terlalu banyak percobaan ganti password. Coba lagi dalam 15 menit.");
// Unggah/hapus foto profil dibatasi per IP.
export const payLimiter = limiter(15, 20, "Terlalu banyak permintaan pembayaran. Coba lagi dalam beberapa menit.");

export const promoLimiter = limiter(15, 30, "Terlalu banyak percobaan kode promo. Coba lagi nanti.");
export const verifyLimiter = limiter(15, 60, "Terlalu banyak pemeriksaan sertifikat. Coba lagi nanti.");

export const uploadLimiter = limiter(60, 20, "Terlalu banyak unggahan foto. Coba lagi nanti.");
// Permintaan/konfirmasi kode ganti email dibatasi per IP.
export const talentBrowseLimiter = limiter(15, 120, "Terlalu banyak permintaan. Coba lagi nanti.");
export const talentInquiryLimiter = limiter(60, 5, "Terlalu banyak pesan dari alamat ini. Coba lagi dalam satu jam.");
export const emailChangeLimiter = limiter(15, 10, "Terlalu banyak percobaan ganti email. Coba lagi dalam 15 menit.");
// Lupa password: minta kode (anti banjir email) dan setel ulang (anti tebak kode), per IP.
export const forgotLimiter = limiter(15, 5, "Terlalu banyak permintaan kode. Coba lagi dalam 15 menit.");
export const resetLimiter = limiter(15, 10, "Terlalu banyak percobaan. Coba lagi dalam 15 menit.");
