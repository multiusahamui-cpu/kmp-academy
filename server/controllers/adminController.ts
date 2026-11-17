
import { successResponse, errorResponse } from "../utils/response";
import { db } from "../db";
import { roleApplications, users } from "../schema/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { issueCard, notifyUser } from "../lib/cards";
import { cardPrefixFor } from "@shared/card";

// --- DASHBOARD ---
export const getDashboardStats = async (req: any, res: any) => {
  successResponse(res, { revenue: 1000000, users: 100 }, "Admin Stats");
};

// --- USER MANAGEMENT ---
export const getAllUsers = async (req: any, res: any) => {
  successResponse(res, [], "All Users");
};

export const updateUserRole = async (req: any, res: any) => {
  successResponse(res, null, "User role updated");
};

export const deleteUser = async (req: any, res: any) => {
  try {
    const { id: _id } = req.params;
    // TODO: Soft delete
    successResponse(res, null, "User deleted");
  } catch (error) {
    errorResponse(res, "Delete failed", 500, error);
  }
};

// --- APPROVALS ---
export const getApprovals = async (req: any, res: any) => {
  try {
    const { type } = req.params; // courses, proposals, roles
    successResponse(res, [], `List of pending ${type}`);
  } catch (error) {
    errorResponse(res, "Fetch failed", 500, error);
  }
};

export const processApproval = async (req: any, res: any) => {
  try {
    const { type, id: _id } = req.params;
    const { action } = req.body; // APPROVE or REJECT
    successResponse(res, null, `${type} ${action}ed`);
  } catch (error) {
    errorResponse(res, "Process failed", 500, error);
  }
};

// --- HELPDESK ---
export const getTickets = async (req: any, res: any) => {
  successResponse(res, [], "Support Tickets");
};

export const replyTicket = async (req: any, res: any) => {
  successResponse(res, null, "Reply sent");
};

export const closeTicket = async (req: any, res: any) => {
  successResponse(res, null, "Ticket closed");
};

// --- SYSTEM ---
export const getCronLogs = async (req: any, res: any) => {
  successResponse(res, [], "Cron Logs");
};

export const triggerCron = async (req: any, res: any) => {
  const { jobId } = req.params;
  successResponse(res, null, `Cron ${jobId} triggered`);
};

// --- FINANCE ---
export const getSettlements = async (req: any, res: any) => {
  successResponse(res, [], "Settlements list");
};

export const processSettlement = async (req: any, res: any) => {
  successResponse(res, null, "Settlement processed");
};

// --- DIRECTOR SPECIFIC (Re-exported here or separate) ---
export const getStrategicReport = async (req: any, res: any) => {
  successResponse(res, { period: "Oct 2023", growth: "15%" }, "Strategic Report");
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
    })
    .from(roleApplications)
    .innerJoin(users, eq(roleApplications.userId, users.id))
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
        await notifyUser(tx, app.userId, "Pengajuan ditolak", note ? `Pengajuan Anda ditolak. Catatan: ${note}` : "Pengajuan Anda ditolak.");
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
        `Anda diangkat sebagai ${role === "MENTOR" ? "Mentor" : "Creator"}.` + (card ? ` Nomor kartu Anda ${card.cardNumber}.` : ""));
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
      if (c) await notifyUser(tx, id, "Kartu Anda terbit", `Nomor kartu Anda ${c.cardNumber}.`);
      return c;
    });
    if (!card) return errorResponse(res, "Kartu sudah terbit untuk role ini", 409);
    successResponse(res, { cardNumber: card.cardNumber }, "Kartu diterbitkan", 201);
  } catch (error) {
    errorResponse(res, "Gagal menerbitkan kartu", 500, error);
  }
};
