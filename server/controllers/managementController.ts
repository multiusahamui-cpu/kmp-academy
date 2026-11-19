import { desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import { broadcasts, managementReports, notifications, userPreferences, users } from "../schema/schema";
import { successResponse, errorResponse } from "../utils/response";
import { notifyUser } from "../lib/cards";
import { REPORT_NOTE_MAX, isReportKind, reportPeriod, validateBroadcast } from "@shared/management";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const rowsOf = <T>(r: any): T[] => (r?.rows ?? r) as T[];
const n = (v: unknown): number => (v == null ? 0 : Number(v));

/** Angka periode [start, end) dari tabel. Kolom timestamp disimpan UTC tanpa zona. */
export const buildSnapshot = async (start: Date, end: Date): Promise<Record<string, number>> => {
  const s = start.toISOString();
  const e = end.toISOString();
  const at = (col: string) => sql.raw(`(${col} at time zone 'UTC')`);
  const [r] = rowsOf<any>(await db.execute(sql`select
    (select count(*)::int from academy.users where status <> 'ARCHIVED' and ${at("created_at")} >= ${s}::timestamptz and ${at("created_at")} < ${e}::timestamptz) as new_users,
    (select count(*)::int from academy.users where status <> 'ARCHIVED') as total_users,
    (select count(*)::int from academy.enrollments where ${at("enrolled_at")} >= ${s}::timestamptz and ${at("enrolled_at")} < ${e}::timestamptz) as enrollments,
    (select coalesce(sum(amount_paid), 0)::bigint from academy.enrollments where ${at("enrolled_at")} >= ${s}::timestamptz and ${at("enrolled_at")} < ${e}::timestamptz) as revenue,
    (select count(*)::int from academy.courses where ${at("created_at")} >= ${s}::timestamptz and ${at("created_at")} < ${e}::timestamptz) as new_courses,
    (select count(*)::int from academy.courses where status = 'PUBLISHED') as published_courses,
    (select count(*)::int from academy.helpdesk_tickets where ${at("created_at")} >= ${s}::timestamptz and ${at("created_at")} < ${e}::timestamptz) as tickets_opened,
    (select count(*)::int from academy.helpdesk_tickets where closed_at is not null and ${at("closed_at")} >= ${s}::timestamptz and ${at("closed_at")} < ${e}::timestamptz) as tickets_closed,
    (select count(*)::int from academy.job_runs where status = 'ERROR' and ${at("started_at")} >= ${s}::timestamptz and ${at("started_at")} < ${e}::timestamptz) as job_errors,
    (select count(*)::int from academy.payment_orders where status = 'VERIFYING') as queue_payments,
    (select count(*)::int from academy.courses where status = 'PENDING_REVIEW') as queue_reviews`));
  return {
    newUsers: n(r.new_users), totalUsers: n(r.total_users), enrollments: n(r.enrollments), revenue: n(r.revenue),
    newCourses: n(r.new_courses), publishedCourses: n(r.published_courses), ticketsOpened: n(r.tickets_opened), ticketsClosed: n(r.tickets_closed),
    jobErrors: n(r.job_errors), queuePayments: n(r.queue_payments), queueReviews: n(r.queue_reviews),
  };
};

export const createReport = async (req: any, res: any) => {
  try {
    if (!isReportKind(req.body?.kind)) return errorResponse(res, "Jenis laporan tidak valid.", 400);
    const note = typeof req.body?.note === "string" ? req.body.note.trim() : "";
    if (note.length > REPORT_NOTE_MAX) return errorResponse(res, `Catatan maksimal ${REPORT_NOTE_MAX} karakter.`, 400);
    const { start, end } = reportPeriod(req.body.kind);
    const snapshot = await buildSnapshot(start, end);
    const id = await db.transaction(async (tx) => {
      const [r] = await tx.insert(managementReports).values({ kind: req.body.kind, periodStart: start, periodEnd: end, snapshot, note: note || null, createdBy: req.user.id }).returning({ id: managementReports.id });
      const directors = await tx.select({ id: users.id }).from(users).where(eq(users.role, "DIRECTOR"));
      for (const d of directors) await notifyUser(tx, d.id, "Laporan manajemen baru", req.body.kind === "WEEKLY" ? "Laporan mingguan siap dibaca." : "Laporan bulanan siap dibaca.", "ADMIN");
      return r.id;
    });
    successResponse(res, { id }, "Laporan dibuat", 201);
  } catch (error) {
    errorResponse(res, "Gagal membuat laporan", 500, error);
  }
};

export const listReports = async (_req: any, res: any) => {
  try {
    const rows = await db.select({
      id: managementReports.id, kind: managementReports.kind, periodStart: managementReports.periodStart, periodEnd: managementReports.periodEnd,
      createdAt: managementReports.createdAt, readAt: managementReports.readAt, author: users.name,
    }).from(managementReports).leftJoin(users, eq(users.id, managementReports.createdBy)).orderBy(desc(managementReports.createdAt)).limit(50);
    successResponse(res, rows, "Laporan manajemen");
  } catch (error) {
    errorResponse(res, "Gagal memuat laporan", 500, error);
  }
};

export const getReport = async (req: any, res: any) => {
  try {
    if (!UUID_RE.test(String(req.params.id ?? ""))) return errorResponse(res, "Laporan tidak ditemukan", 404);
    const [r] = await db.select().from(managementReports).where(eq(managementReports.id, req.params.id)).limit(1);
    if (!r) return errorResponse(res, "Laporan tidak ditemukan", 404);
    successResponse(res, r, "Detail laporan");
  } catch (error) {
    errorResponse(res, "Gagal memuat laporan", 500, error);
  }
};

export const markReportRead = async (req: any, res: any) => {
  try {
    if (!UUID_RE.test(String(req.params.id ?? ""))) return errorResponse(res, "Laporan tidak ditemukan", 404);
    const r = await db.update(managementReports).set({ readAt: new Date(), readBy: req.user.id })
      .where(sql`${managementReports.id} = ${req.params.id} and ${managementReports.readAt} is null`).returning({ id: managementReports.id });
    if (r.length === 0) {
      const [exists] = await db.select({ id: managementReports.id }).from(managementReports).where(eq(managementReports.id, req.params.id)).limit(1);
      if (!exists) return errorResponse(res, "Laporan tidak ditemukan", 404);
    }
    successResponse(res, null, "Ditandai dibaca");
  } catch (error) {
    errorResponse(res, "Gagal memperbarui laporan", 500, error);
  }
};

const CHUNK = 500;

/** Siaran: notifikasi INFO ke semua akun aktif pada sasaran, kecuali yang mematikan kategori INFO. Pengirim tidak ikut menerima. */
export const createBroadcast = async (req: any, res: any) => {
  try {
    const v = validateBroadcast(req.body);
    if (!v.ok) return errorResponse(res, v.message, 400);
    const roleFilter = v.value.audience === "ALL" ? inArray(users.role, ["STUDENT", "CREATOR", "MENTOR"]) : eq(users.role, v.value.audience);
    const recipients = await db.transaction(async (tx) => {
      const targets = await tx.select({ id: users.id, muted: userPreferences.mutedCategories }).from(users)
        .leftJoin(userPreferences, eq(userPreferences.userId, users.id))
        .where(sql`${roleFilter} and ${users.status} = 'ACTIVE' and ${users.id} <> ${req.user.id}`);
      const ids = targets.filter((t) => !(t.muted ?? []).includes("INFO")).map((t) => t.id);
      for (let i = 0; i < ids.length; i += CHUNK) {
        await tx.insert(notifications).values(ids.slice(i, i + CHUNK).map((userId) => ({ userId, title: v.value.title, body: v.value.body, category: "INFO" })));
      }
      await tx.insert(broadcasts).values({ authorId: req.user.id, title: v.value.title, body: v.value.body, audience: v.value.audience, recipients: ids.length });
      return ids.length;
    });
    successResponse(res, { recipients }, "Siaran terkirim", 201);
  } catch (error) {
    errorResponse(res, "Gagal mengirim siaran", 500, error);
  }
};

export const listBroadcasts = async (_req: any, res: any) => {
  try {
    const rows = await db.select({ id: broadcasts.id, title: broadcasts.title, audience: broadcasts.audience, recipients: broadcasts.recipients, createdAt: broadcasts.createdAt, author: users.name })
      .from(broadcasts).leftJoin(users, eq(users.id, broadcasts.authorId)).orderBy(desc(broadcasts.createdAt)).limit(50);
    successResponse(res, rows, "Riwayat siaran");
  } catch (error) {
    errorResponse(res, "Gagal memuat siaran", 500, error);
  }
};
