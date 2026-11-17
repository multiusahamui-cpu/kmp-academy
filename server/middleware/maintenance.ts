import jwt from "jsonwebtoken";
import { errorResponse } from "../utils/response";
import { JWT_SECRET } from "../lib/jwt-secret";
import { getConfigBool, getConfigValue } from "../lib/system-config";

// Tetap bisa diakses selama maintenance: health check (dipakai skrip deploy),
// konfigurasi publik (agar browser tahu sedang maintenance), dan login
// (login non-Superadmin ditolak di authController).
const ALWAYS_ALLOWED = new Set(["/health", "/config/public", "/auth/login"]);

function isSuperadminRequest(req: any): boolean {
  const header = req.headers?.authorization;
  const token = typeof header === "string" ? header.split(" ")[1] : undefined;
  if (!token) return false;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { role?: string };
    return decoded.role === "SUPERADMIN";
  } catch {
    return false;
  }
}

/** Saat mode maintenance aktif, hanya Superadmin yang boleh memakai API. */
export const maintenanceGuard = async (req: any, res: any, next: any) => {
  try {
    if (ALWAYS_ALLOWED.has(req.path)) return next();
    if (!(await getConfigBool("maintenance_mode"))) return next();
    if (isSuperadminRequest(req)) return next();
    return errorResponse(res, await getConfigValue("maintenance_message"), 503);
  } catch (error) {
    next(error);
  }
};
