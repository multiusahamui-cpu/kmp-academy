import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../schema/schema";

export interface AuthUser {
  id: string;
  role: string;
  email: string | null;
}

export type SessionCheck =
  | { ok: true; user: AuthUser }
  | { ok: false; status: 401 | 403; message: string };

interface SessionLike {
  userId?: string;
  loginAt?: number;
}

interface DbUserLike {
  id: string;
  role: string;
  email: string | null;
  status: string;
  passwordChangedAt: Date | null;
}

/** Aturan keabsahan sesi (murni, mudah diuji). Role selalu dari database, bukan dari sesi. */
export const evaluateSession = (sess: SessionLike | undefined, user: DbUserLike | undefined): SessionCheck => {
  if (!sess?.userId) return { ok: false, status: 401, message: "Silakan login." };
  if (!user) return { ok: false, status: 401, message: "Sesi tidak valid. Silakan login ulang." };
  if (user.status !== "ACTIVE") return { ok: false, status: 403, message: "Akun dibekukan atau diblokir. Hubungi Admin." };
  if (user.passwordChangedAt && (sess.loginAt ?? 0) < user.passwordChangedAt.getTime()) {
    return { ok: false, status: 401, message: "Password telah diganti. Silakan login ulang." };
  }
  return { ok: true, user: { id: user.id, role: user.role, email: user.email } };
};

export const checkSession = async (req: any): Promise<SessionCheck> => {
  const userId: string | undefined = req.session?.userId;
  if (!userId) return evaluateSession(undefined, undefined);
  const [row] = await db
    .select({ id: users.id, role: users.role, email: users.email, status: users.status, passwordChangedAt: users.passwordChangedAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return evaluateSession(req.session, row);
};
