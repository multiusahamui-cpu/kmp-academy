import { errorResponse } from "../utils/response";
import { parseAllowedOrigins } from "../lib/security";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Perlindungan CSRF untuk sesi berbasis cookie: permintaan yang mengubah data dan membawa header Origin
 * harus berasal dari origin yang sama (Host) atau dari ALLOWED_ORIGINS. Selain cookie sameSite=lax.
 */
export const isOriginAllowed = (origin: string, host: string | undefined, env: NodeJS.ProcessEnv = process.env): boolean => {
  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    return false;
  }
  if (host && parsed.host === host) return true;
  if (parseAllowedOrigins(env.ALLOWED_ORIGINS).includes(parsed.origin)) return true;
  if (env.NODE_ENV !== "production" && /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(parsed.host)) return true;
  return false;
};

export const originGuard = (req: any, res: any, next: any) => {
  if (SAFE_METHODS.has(req.method)) return next();
  const origin = req.headers.origin;
  if (typeof origin === "string" && !isOriginAllowed(origin, req.headers.host)) {
    return errorResponse(res, "Origin tidak diizinkan.", 403);
  }
  next();
};
