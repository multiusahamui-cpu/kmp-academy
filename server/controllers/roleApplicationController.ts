import { and, desc, eq } from "drizzle-orm";
import { db } from "../db";
import { kycRecords, roleApplications, users } from "../schema/schema";
import { successResponse, errorResponse } from "../utils/response";
import { validateRoleApplication } from "@shared/roleApplication";
import { isDigitalcoopKycComplete } from "@shared/kyc";
import { notifyUser } from "../lib/cards";

/** KYC dianggap beres: terverifikasi di Academy, atau anggota digitalcoop.id dengan KYC lengkap di sana. */
export const kycSatisfied = async (userId: string): Promise<boolean> => {
  const [k] = await db.select({ s: kycRecords.status }).from(kycRecords).where(eq(kycRecords.userId, userId)).limit(1);
  if (k?.s === "VERIFIED") return true;
  const [u] = await db.select({ dc: users.digitalcoopUserId, kyc: users.kycStatus }).from(users).where(eq(users.id, userId)).limit(1);
  return !!u?.dc && isDigitalcoopKycComplete(u.kyc);
};

export const apply = async (req: any, res: any) => {
  try {
    const v = validateRoleApplication(req.body ?? {});
    if (!v.ok) return errorResponse(res, v.message, 400);
    const uid = req.user.id;
    const [me] = await db.select({ role: users.role, status: users.status, name: users.name }).from(users).where(eq(users.id, uid)).limit(1);
    if (!me || me.status !== "ACTIVE") return errorResponse(res, "Akun tidak aktif.", 403);
    if (me.role !== "STUDENT") return errorResponse(res, "Pengajuan hanya untuk akun Student.", 409);
    if (!(await kycSatisfied(uid))) return errorResponse(res, "Selesaikan verifikasi identitas (KYC) di Profil lebih dulu.", 403);
    const out = await db.transaction(async (tx) => {
      const pending = await tx.select({ id: roleApplications.id }).from(roleApplications).where(and(eq(roleApplications.userId, uid), eq(roleApplications.status, "PENDING"))).for("update").limit(1);
      if (pending.length > 0) return { dup: true } as const;
      await tx.insert(roleApplications).values({ userId: uid, ...v.value });
      const admins = await tx.select({ id: users.id }).from(users).where(and(eq(users.role, "DIRECTOR"), eq(users.status, "ACTIVE")));
      for (const a of admins) await notifyUser(tx, a.id, "Pengajuan role baru", `${me.name} mengajukan menjadi ${v.value.requestedRole === "MENTOR" ? "Mentor" : "Creator"}. Tinjau di Manajemen User > Daftar Tunggu.`, "ADMIN");
      return { dup: false } as const;
    });
    if (out.dup) return errorResponse(res, "Pengajuan Anda sebelumnya masih diproses.", 409);
    successResponse(res, null, "Pengajuan dikirim. Admin akan meninjau dan hasilnya masuk ke inbox Anda.");
  } catch (error) {
    errorResponse(res, "Gagal mengirim pengajuan", 500, error);
  }
};

export const mine = async (req: any, res: any) => {
  try {
    const [last] = await db.select({ requestedRole: roleApplications.requestedRole, status: roleApplications.status, decisionNote: roleApplications.decisionNote, createdAt: roleApplications.createdAt, decidedAt: roleApplications.decidedAt })
      .from(roleApplications).where(eq(roleApplications.userId, req.user.id)).orderBy(desc(roleApplications.createdAt)).limit(1);
    successResponse(res, { last: last ?? null, kycOk: await kycSatisfied(req.user.id) }, "Status pengajuan");
  } catch (error) {
    errorResponse(res, "Gagal memuat status", 500, error);
  }
};
