import { desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import { roleAppointments, users } from "../schema/schema";
import { successResponse, errorResponse } from "../utils/response";
import { notifyUser } from "../lib/cards";
import { STAFF_ROLES, isStaffRole, staffLabel, validateAppointment, validateDismissal } from "@shared/appointments";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const actorName = async (tx: any, id: string): Promise<string | null> => (await tx.select({ name: users.name }).from(users).where(eq(users.id, id)).limit(1))[0]?.name ?? null;

export const listStaff = async (_req: any, res: any) => {
  try {
    const rows = await db.select({ id: users.id, name: users.name, email: users.email, role: users.role, status: users.status })
      .from(users).where(inArray(users.role, STAFF_ROLES.map((r) => r.id))).orderBy(users.role, users.name);
    successResponse(res, rows, "Pejabat");
  } catch (error) {
    errorResponse(res, "Gagal memuat pejabat", 500, error);
  }
};

export const listAppointments = async (_req: any, res: any) => {
  try {
    const rows = await db.select().from(roleAppointments).orderBy(desc(roleAppointments.createdAt)).limit(200);
    successResponse(res, rows, "Riwayat jabatan");
  } catch (error) {
    errorResponse(res, "Gagal memuat riwayat", 500, error);
  }
};

/** Mengangkat pengguna biasa (STUDENT, aktif) menjadi Direktur / Admin Sistem. */
export const appoint = async (req: any, res: any) => {
  try {
    const v = validateAppointment(req.body);
    if (!v.ok) return errorResponse(res, v.message, 400);
    const out = await db.transaction(async (tx) => {
      const [u] = await tx.select().from(users).where(sql`lower(${users.email}) = ${v.value.email}`).for("update");
      if (!u) return { code: 404 as const, message: "Tidak ada pengguna dengan email itu." };
      if (u.status !== "ACTIVE") return { code: 409 as const, message: "Akun pengguna tidak aktif." };
      if (u.role !== "STUDENT") return { code: 409 as const, message: `Pengguna ini berperan ${u.role}. Hanya akun Siswa yang dapat diangkat, agar kursus atau kelas yang dimiliki tidak terputus.` };
      await tx.update(users).set({ role: v.value.role }).where(eq(users.id, u.id));
      await tx.insert(roleAppointments).values({ userId: u.id, userName: u.name, action: "APPOINT", fromRole: u.role, toRole: v.value.role, note: v.value.note, actorId: req.user.id, actorName: await actorName(tx, req.user.id) });
      await notifyUser(tx, u.id, "Anda diangkat", `Anda diangkat sebagai ${staffLabel(v.value.role)}. Masuk ulang untuk memakai menu jabatan Anda.`, "AKUN");
      return { code: 201 as const, message: "Pengangkatan dicatat" };
    });
    if (out.code !== 201) return errorResponse(res, out.message, out.code);
    console.info(`[jabatan] angkat ${v.value.email} -> ${v.value.role} oleh=${req.user.id}`);
    successResponse(res, null, out.message, 201);
  } catch (error) {
    errorResponse(res, "Gagal mengangkat", 500, error);
  }
};

/** Memberhentikan Direktur / Admin Sistem; akun kembali menjadi Siswa. */
export const dismiss = async (req: any, res: any) => {
  try {
    if (!UUID_RE.test(String(req.params.id))) return errorResponse(res, "Pejabat tidak ditemukan", 404);
    const v = validateDismissal(req.body);
    if (!v.ok) return errorResponse(res, v.message, 400);
    const out = await db.transaction(async (tx) => {
      const [u] = await tx.select().from(users).where(eq(users.id, req.params.id)).for("update");
      if (!u || !isStaffRole(u.role)) return { code: 404 as const, message: "Pejabat tidak ditemukan" };
      await tx.update(users).set({ role: "STUDENT" }).where(eq(users.id, u.id));
      await tx.insert(roleAppointments).values({ userId: u.id, userName: u.name, action: "DISMISS", fromRole: u.role, toRole: "STUDENT", note: v.value, actorId: req.user.id, actorName: await actorName(tx, req.user.id) });
      await notifyUser(tx, u.id, "Jabatan berakhir", `Jabatan Anda sebagai ${staffLabel(u.role)} telah berakhir. Alasan: ${v.value}`, "AKUN");
      return { code: 200 as const, message: "Pemberhentian dicatat" };
    });
    if (out.code !== 200) return errorResponse(res, out.message, out.code);
    console.info(`[jabatan] berhenti ${req.params.id} oleh=${req.user.id}`);
    successResponse(res, null, out.message);
  } catch (error) {
    errorResponse(res, "Gagal memberhentikan", 500, error);
  }
};
