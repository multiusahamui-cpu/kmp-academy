
import { JOBS, findJob, getJobState, listRuns, runJob } from "../lib/job-runner";
import { successResponse, errorResponse } from "../utils/response";
import { db } from "../db";
import { kycRecords, roleApplications, users } from "../schema/schema";
import { and, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { z } from "zod";
import { issueCard, notifyUser } from "../lib/cards";
import { cardPrefixFor } from "@shared/card";

// --- DASHBOARD ---
// --- USER MANAGEMENT ---
const USERS_PAGE_SIZE = 15;
const TAB_ROLES: Record<string, string[]> = {
  INTERNAL: ["SUPERADMIN", "ADMIN_SYSTEM", "DIRECTOR"],
  MENTOR: ["MENTOR"],
  CREATOR: ["CREATOR"],
  STUDENT: ["STUDENT"],
};

/** Daftar pengguna asli dari database, per kelompok role, 15 per halaman. Password tidak pernah dikirim. */
export const getAllUsers = async (req: any, res: any) => {
  try {
    const tab = typeof req.query.tab === "string" ? req.query.tab : "STUDENT";
    const roles = TAB_ROLES[tab];
    if (!roles) return errorResponse(res, "Kelompok tidak valid", 400);
    const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 100) : "";
    const page = Math.max(1, Math.floor(Number(req.query.page)) || 1);

    const like = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
    const roleFilter = inArray(users.role, roles as any);
    const where = q
      ? and(roleFilter, or(ilike(users.name, like), ilike(users.email, like), ilike(users.phone, like), ilike(users.cardNumber, like)))
      : roleFilter;

    const [total] = await db.select({ n: count() }).from(users).where(where);
    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        role: users.role,
        status: users.status,
        avatar: users.avatar,
        cardNumber: users.cardNumber,
        linked: sql<boolean>`${users.digitalcoopUserId} is not null`,
        joinedAt: users.createdAt,
        enrolledCount: sql<number>`(select count(*)::int from academy.enrollments e where e.user_id = academy.users.id)`,
      })
      .from(users)
      .where(where)
      .orderBy(desc(users.createdAt))
      .limit(USERS_PAGE_SIZE)
      .offset((page - 1) * USERS_PAGE_SIZE);

    successResponse(res, { total: Number(total?.n ?? 0), page, size: USERS_PAGE_SIZE, items: rows }, "Daftar pengguna");
  } catch (error) {
    errorResponse(res, "Gagal memuat daftar pengguna", 500, error);
  }
};

// --- DAFTAR TUNGGU CALON MENTOR / CREATOR & PENERBITAN KARTU ---
// Daftar tunggu diisi dari digitalcoop.id; Admin/Superadmin memutuskan di sini.
export const listRoleApplications = async (req: any, res: any) => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : "PENDING";
    if (!["PENDING", "APPROVED", "REJECTED"].includes(status)) return errorResponse(res, "Status tidak valid", 400);
    const rows = await db.select({
        id: roleApplications.id,
        userId: roleApplications.userId,
        name: users.name,
        email: users.email,
        requestedRole: roleApplications.requestedRole,
        profile: roleApplications.profile,
        experience: roleApplications.experience,
        status: roleApplications.status,
        createdAt: roleApplications.createdAt,
        decidedAt: roleApplications.decidedAt,
        decisionNote: roleApplications.decisionNote,
        kycStatus: kycRecords.status,
        dcKycStatus: users.kycStatus,
    })
    .from(roleApplications)
    .innerJoin(users, eq(roleApplications.userId, users.id))
    .leftJoin(kycRecords, eq(kycRecords.userId, users.id))
    .where(eq(roleApplications.status, status as "PENDING" | "APPROVED" | "REJECTED"))
    .orderBy(desc(roleApplications.createdAt));
    successResponse(res, rows, "Daftar tunggu");
  } catch (error) {
    errorResponse(res, "Gagal memuat daftar tunggu", 500, error);
  }
};

const decisionSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  note: z.string().trim().max(500).optional(),
});

export const decideRoleApplication = async (req: any, res: any) => {
  try {
    const parsed = decisionSchema.safeParse(req.body);
    if (!parsed.success) return errorResponse(res, "Aksi tidak valid", 400);
    const { action, note } = parsed.data;
    const { id } = req.params;
    const actor = await db.query.users.findFirst({ where: (u, { eq }) => eq(u.id, req.user.id) });
    if (!actor) return errorResponse(res, "Tidak berwenang", 403);

    const outcome = await db.transaction(async (tx) => {
      const [app] = await tx.select().from(roleApplications).where(eq(roleApplications.id, id)).for("update");
      if (!app) return { error: "Pengajuan tidak ditemukan", status: 404 } as const;
      if (app.status !== "PENDING") return { error: "Pengajuan sudah diputuskan", status: 409 } as const;

      const now = new Date();
      if (action === "REJECT") {
        await tx.update(roleApplications)
          .set({ status: "REJECTED", decidedBy: actor.id, decidedAt: now, decisionNote: note ?? null })
          .where(eq(roleApplications.id, id));
        await notifyUser(tx, app.userId, "Pengajuan ditolak", note ? `Pengajuan Anda ditolak. Catatan: ${note}` : "Pengajuan Anda ditolak.", "AKUN");
        return { cardNumber: null } as const;
      }

      const role = app.requestedRole === "MENTOR" ? "MENTOR" : "CREATOR";
      await tx.update(users).set({ role, updatedAt: now }).where(eq(users.id, app.userId));
      await tx.update(roleApplications)
        .set({ status: "APPROVED", decidedBy: actor.id, decidedAt: now, decisionNote: note ?? null })
        .where(eq(roleApplications.id, id));
      // Bulan pada nomor kartu = bulan pengangkatan (saat disetujui).
      const card = await issueCard(tx, app.userId, { id: actor.id, name: actor.name }, now);
      await notifyUser(tx, app.userId, "Pengajuan disetujui",
        `Anda diangkat sebagai ${role === "MENTOR" ? "Mentor" : "Creator"}.` + (card ? ` Nomor kartu Anda ${card.cardNumber}.` : ""), "AKUN");
      return { cardNumber: card?.cardNumber ?? null } as const;
    });

    if ("error" in outcome) return errorResponse(res, outcome.error, outcome.status);
    successResponse(res, outcome, action === "APPROVE" ? "Pengajuan disetujui" : "Pengajuan ditolak");
  } catch (error) {
    errorResponse(res, "Gagal memproses pengajuan", 500, error);
  }
};

// Penerbitan kartu manual (Direktur, Admin, Superadmin, dan pejabat lain non-student) lewat klik Admin/Superadmin.
export const issueUserCard = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const actor = await db.query.users.findFirst({ where: (u, { eq }) => eq(u.id, req.user.id) });
    if (!actor) return errorResponse(res, "Tidak berwenang", 403);
    const target = await db.query.users.findFirst({ where: (u, { eq }) => eq(u.id, id) });
    if (!target) return errorResponse(res, "Pengguna tidak ditemukan", 404);
    if (target.role === "STUDENT") return errorResponse(res, "Kartu student terbit otomatis saat kursus pertama.", 400);
    if (!cardPrefixFor(target.role)) return errorResponse(res, "Role ini tidak memiliki kartu.", 400);

    const card = await db.transaction(async (tx) => {
      const c = await issueCard(tx, id, { id: actor.id, name: actor.name });
      if (c) await notifyUser(tx, id, "Kartu Anda terbit", `Nomor kartu Anda ${c.cardNumber}.`, "AKUN");
      return c;
    });
    if (!card) return errorResponse(res, "Kartu sudah terbit untuk role ini", 409);
    successResponse(res, { cardNumber: card.cardNumber }, "Kartu diterbitkan", 201);
  } catch (error) {
    errorResponse(res, "Gagal menerbitkan kartu", 500, error);
  }
};

// --- JOB BERKALA ---
export const listJobs = async (_req: any, res: any) => {
  try {
    const rows = await Promise.all(JOBS.map(async (j) => {
      const st = getJobState(j.id)!;
      const [last] = await listRuns(j.id, 1);
      return { id: j.id, label: j.label, description: j.description, everyMinutes: j.everyMinutes, running: st.running, lastTickAt: st.lastRunAt, lastTickStatus: st.lastStatus, lastError: st.lastError, lastRecordedRun: last ?? null };
    }));
    successResponse(res, rows, "Daftar job");
  } catch (error) {
    errorResponse(res, "Gagal memuat job", 500, error);
  }
};

export const listJobRuns = async (req: any, res: any) => {
  try {
    if (!findJob(String(req.params.jobId))) return errorResponse(res, "Job tidak ditemukan", 404);
    successResponse(res, await listRuns(req.params.jobId, 50), "Riwayat job");
  } catch (error) {
    errorResponse(res, "Gagal memuat riwayat", 500, error);
  }
};

export const runJobNow = async (req: any, res: any) => {
  try {
    const job = findJob(String(req.params.jobId));
    if (!job) return errorResponse(res, "Job tidak ditemukan", 404);
    const outcome = await runJob(job, "MANUAL", req.user.id);
    if (outcome === "BUSY") return errorResponse(res, "Job sedang berjalan.", 409);
    const st = getJobState(job.id)!;
    successResponse(res, { status: st.lastStatus, affected: st.lastAffected, error: st.lastError }, "Job dijalankan");
  } catch (error) {
    errorResponse(res, "Gagal menjalankan job", 500, error);
  }
};
