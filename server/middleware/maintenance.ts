import { errorResponse } from "../utils/response";
import { checkSession } from "../lib/session-user";
import { getConfigBool, getConfigValue } from "../lib/system-config";

// Tetap bisa diakses selama maintenance: health check (dipakai skrip deploy),
// konfigurasi publik (agar browser tahu sedang maintenance), dan login
// (login non-Superadmin ditolak di authController).
const ALWAYS_ALLOWED = new Set(["/health", "/config/public", "/auth/login", "/auth/logout"]);

async function isSuperadminRequest(req: any): Promise<boolean> {
  const result = await checkSession(req);
  return result.ok && result.user.role === "SUPERADMIN";
}

/** Saat mode maintenance aktif, hanya Superadmin yang boleh memakai API. */
export const maintenanceGuard = async (req: any, res: any, next: any) => {
  try {
    if (ALWAYS_ALLOWED.has(req.path)) return next();
    if (!(await getConfigBool("maintenance_mode"))) return next();
    if (await isSuperadminRequest(req)) return next();
    return errorResponse(res, await getConfigValue("maintenance_message"), 503);
  } catch (error) {
    next(error);
  }
};
