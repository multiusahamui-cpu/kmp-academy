import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { helpdeskMessages, helpdeskTickets, users } from "../schema/schema";
import { successResponse, errorResponse } from "../utils/response";
import { notifyUser } from "../lib/cards";
import { nextStatus, validateMessage, validateNewTicket, type TicketStatus } from "@shared/helpdesk";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STAFF = ["ADMIN_SYSTEM", "SUPERADMIN"];
const isStaff = (role: string): boolean => STAFF.includes(role);
const PAGE = 30;

/** Staf yang menerima kabar tiket baru: semua Admin Sistem aktif. */
const notifyStaff = async (tx: any, title: string, body: string): Promise<void> => {
  const admins = await tx.select({ id: users.id }).from(users).where(eq(users.role, "ADMIN_SYSTEM"));
  for (const a of admins) await notifyUser(tx, a.id, title, body, "ADMIN");
};

export const createTicket = async (req: any, res: any) => {
  try {
    const v = validateNewTicket(req.body);
    if (!v.ok) return errorResponse(res, v.message, 400);
    const id = await db.transaction(async (tx) => {
      const [t] = await tx.insert(helpdeskTickets).values({ userId: req.user.id, subject: v.value.subject, category: v.value.category }).returning({ id: helpdeskTickets.id });
      await tx.insert(helpdeskMessages).values({ ticketId: t.id, authorId: req.user.id, isStaff: false, body: v.value.body });
      await notifyStaff(tx, "Tiket bantuan baru", `${v.value.subject}`);
      return t.id;
    });
    successResponse(res, { id }, "Tiket dibuat", 201);
  } catch (error) {
    errorResponse(res, "Gagal membuat tiket", 500, error);
  }
};

export const listMine = async (req: any, res: any) => {
  try {
    const rows = await db.select().from(helpdeskTickets).where(eq(helpdeskTickets.userId, req.user.id)).orderBy(desc(helpdeskTickets.updatedAt)).limit(100);
    successResponse(res, rows, "Tiket saya");
  } catch (error) {
    errorResponse(res, "Gagal memuat tiket", 500, error);
  }
};

/** Antrean staf. status = OPEN | ANSWERED | CLOSED | ALL (default OPEN). */
export const listAll = async (req: any, res: any) => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : "OPEN";
    if (!["OPEN", "ANSWERED", "CLOSED", "ALL"].includes(status)) return errorResponse(res, "Status tidak valid", 400);
    const page = Math.max(1, Number.parseInt(String(req.query.page ?? "1"), 10) || 1);
    const rows = await db.select({
      id: helpdeskTickets.id, subject: helpdeskTickets.subject, category: helpdeskTickets.category, status: helpdeskTickets.status,
      createdAt: helpdeskTickets.createdAt, updatedAt: helpdeskTickets.updatedAt, userName: users.name, userEmail: users.email,
    }).from(helpdeskTickets).innerJoin(users, eq(users.id, helpdeskTickets.userId))
      .where(status === "ALL" ? sql`true` : eq(helpdeskTickets.status, status))
      .orderBy(desc(helpdeskTickets.updatedAt)).limit(PAGE + 1).offset((page - 1) * PAGE);
    successResponse(res, { rows: rows.slice(0, PAGE), hasMore: rows.length > PAGE, page }, "Antrean tiket");
  } catch (error) {
    errorResponse(res, "Gagal memuat tiket", 500, error);
  }
};

/** Tiket beserta pesannya. Hanya pemilik atau staf. */
export const getTicket = async (req: any, res: any) => {
  try {
    if (!UUID_RE.test(String(req.params.id ?? ""))) return errorResponse(res, "Tiket tidak ditemukan", 404);
    const [t] = await db.select().from(helpdeskTickets).where(eq(helpdeskTickets.id, req.params.id)).limit(1);
    if (!t || (t.userId !== req.user.id && !isStaff(req.user.role))) return errorResponse(res, "Tiket tidak ditemukan", 404);
    const messages = await db.select({ id: helpdeskMessages.id, body: helpdeskMessages.body, isStaff: helpdeskMessages.isStaff, createdAt: helpdeskMessages.createdAt, author: users.name })
      .from(helpdeskMessages).innerJoin(users, eq(users.id, helpdeskMessages.authorId))
      .where(eq(helpdeskMessages.ticketId, t.id)).orderBy(asc(helpdeskMessages.createdAt));
    successResponse(res, { ticket: t, messages }, "Detail tiket");
  } catch (error) {
    errorResponse(res, "Gagal memuat tiket", 500, error);
  }
};

export const addMessage = async (req: any, res: any) => {
  try {
    if (!UUID_RE.test(String(req.params.id ?? ""))) return errorResponse(res, "Tiket tidak ditemukan", 404);
    const v = validateMessage(req.body);
    if (!v.ok) return errorResponse(res, v.message, 400);
    const staff = isStaff(req.user.role);
    const result = await db.transaction(async (tx) => {
      const [t] = await tx.select().from(helpdeskTickets).where(eq(helpdeskTickets.id, req.params.id)).for("update");
      if (!t || (t.userId !== req.user.id && !staff)) return "NOT_FOUND" as const;
      const fromStaff = staff && t.userId !== req.user.id;
      const next = nextStatus(t.status as TicketStatus, fromStaff);
      if (!next) return "CLOSED" as const;
      await tx.insert(helpdeskMessages).values({ ticketId: t.id, authorId: req.user.id, isStaff: fromStaff, body: v.value });
      await tx.update(helpdeskTickets).set({ status: next, updatedAt: new Date() }).where(eq(helpdeskTickets.id, t.id));
      if (fromStaff) await notifyUser(tx, t.userId, "Tiket bantuan dibalas", `Balasan untuk: ${t.subject}`, "AKUN");
      else await notifyStaff(tx, "Balasan tiket bantuan", t.subject);
      return "OK" as const;
    });
    if (result === "NOT_FOUND") return errorResponse(res, "Tiket tidak ditemukan", 404);
    if (result === "CLOSED") return errorResponse(res, "Tiket sudah ditutup.", 409);
    successResponse(res, null, "Pesan terkirim", 201);
  } catch (error) {
    errorResponse(res, "Gagal mengirim pesan", 500, error);
  }
};

/** Pemilik atau staf dapat menutup tiket. Idempoten tidak: menutup ulang ditolak. */
export const closeTicket = async (req: any, res: any) => {
  try {
    if (!UUID_RE.test(String(req.params.id ?? ""))) return errorResponse(res, "Tiket tidak ditemukan", 404);
    const result = await db.transaction(async (tx) => {
      const [t] = await tx.select().from(helpdeskTickets).where(eq(helpdeskTickets.id, req.params.id)).for("update");
      if (!t || (t.userId !== req.user.id && !isStaff(req.user.role))) return "NOT_FOUND" as const;
      if (t.status === "CLOSED") return "CLOSED" as const;
      await tx.update(helpdeskTickets).set({ status: "CLOSED", closedAt: new Date(), closedBy: req.user.id, updatedAt: new Date() })
        .where(and(eq(helpdeskTickets.id, t.id), eq(helpdeskTickets.status, t.status)));
      if (t.userId !== req.user.id) await notifyUser(tx, t.userId, "Tiket bantuan ditutup", `Tiket ditutup: ${t.subject}`, "AKUN");
      return "OK" as const;
    });
    if (result === "NOT_FOUND") return errorResponse(res, "Tiket tidak ditemukan", 404);
    if (result === "CLOSED") return errorResponse(res, "Tiket sudah ditutup.", 409);
    successResponse(res, null, "Tiket ditutup");
  } catch (error) {
    errorResponse(res, "Gagal menutup tiket", 500, error);
  }
};
