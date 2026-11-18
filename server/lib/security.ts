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
