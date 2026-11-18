import { errorResponse } from "../utils/response";
import { checkSession } from "../lib/session-user";
import { endSession } from "../lib/session";

// Nama dipertahankan agar semua rute tetap sama; autentikasi kini memakai sesi (cookie + Redis).
// Role dan status akun dibaca dari database pada setiap permintaan.
export const authenticateToken = async (req: any, res: any, next: any) => {
  try {
    const result = await checkSession(req);
    if (!result.ok) {
      // Sesi yang tidak lagi sah dihapus dari Redis.
      if (req.session?.userId) await endSession(req, res);
      return errorResponse(res, result.message, result.status);
    }
    req.user = result.user;
    next();
  } catch (error) {
    next(error);
  }
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: any, res: any, next: any) => {
    if (!req.user) {
      return errorResponse(res, "Unauthorized.", 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return errorResponse(res, "Forbidden. You do not have permission.", 403);
    }

    next();
  };
};
