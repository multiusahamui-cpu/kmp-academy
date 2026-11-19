import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { courses, mentorClasses, users, workshopProposals } from "../schema/schema";
import { successResponse, errorResponse } from "../utils/response";
import { notifyUser } from "../lib/cards";
import { getConfigInt } from "../lib/system-config";
import { requireAcceptance } from "./legalController";
import { newUniqueCode } from "./mentorController";
import { slugify } from "@shared/course";
import crypto from "node:crypto";
import { splitWorkshopRevenue, validateDecisionNote, validateProposal } from "@shared/workshop";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: unknown): v is string => typeof v === "string" && UUID_RE.test(v);
const isUniqueViolation = (e: any): boolean => e?.code === "23505" || e?.cause?.code === "23505";
const num = (v: unknown): number => (v == null ? 0 : Number(v));
const rowsOf = <T>(r: any): T[] => (Array.isArray(r) ? r : r?.rows ?? []);

// --- Mentor ---

/** Kursus mandiri terbit milik Creator lain yang boleh dijadikan dasar workshop. */
export const eligibleCourses = async (req: any, res: any) => {
  try {
    const rows = await db.select({ id: courses.id, title: courses.title, price: courses.price, owner: courses.instructorName })
      .from(courses).where(and(eq(courses.status, "PUBLISHED"), eq(courses.type, "MANDIRI"), sql`${courses.instructorId} is not null and ${courses.instructorId} <> ${req.user.id}`))
      .orderBy(courses.title);
    successResponse(res, rows, "Kursus sumber");
  } catch (error) {
    errorResponse(res, "Gagal memuat kursus", 500, error);
  }
};

export const myProposals = async (req: any, res: any) => {
  try {
    const rows = await db.select({
      id: workshopProposals.id, title: workshopProposals.title, price: workshopProposals.price, status: workshopProposals.status,
      decisionNote: workshopProposals.decisionNote, createdAt: workshopProposals.createdAt, decidedAt: workshopProposals.decidedAt,
      classId: workshopProposals.classId, source: courses.title,
    }).from(workshopProposals).innerJoin(courses, eq(courses.id, workshopProposals.sourceCourseId))
      .where(eq(workshopProposals.mentorId, req.user.id)).orderBy(desc(workshopProposals.createdAt));
    successResponse(res, rows, "Proposal saya");
  } catch (error) {
    errorResponse(res, "Gagal memuat proposal", 500, error);
  }
};

export const createProposal = async (req: any, res: any) => {
  try {
    if (!(await requireAcceptance(req, res, "MENTOR_AGREEMENT"))) return;
    const v = validateProposal(req.body);
    if (!v.ok) return errorResponse(res, v.message, 400);
    if (!isUuid(v.value.sourceCourseId)) return errorResponse(res, "Kursus sumber tidak ditemukan.", 404);
    const [src] = await db.select().from(courses).where(eq(courses.id, v.value.sourceCourseId)).limit(1);
    if (!src || src.status !== "PUBLISHED" || src.type !== "MANDIRI" || !src.instructorId) return errorResponse(res, "Kursus sumber tidak ditemukan.", 404);
    if (src.instructorId === req.user.id) return errorResponse(res, "Anda tidak dapat mengajukan workshop dari kursus milik sendiri.", 400);
    try {
      const [p] = await db.insert(workshopProposals).values({ sourceCourseId: src.id, mentorId: req.user.id, title: v.value.title, description: v.value.description || null, price: v.value.price }).returning({ id: workshopProposals.id });
      successResponse(res, p, "Proposal diajukan", 201);
    } catch (e) {
      if (isUniqueViolation(e)) return errorResponse(res, "Masih ada proposal yang menunggu untuk kursus ini.", 409);
      throw e;
    }
  } catch (error) {
    errorResponse(res, "Gagal mengajukan proposal", 500, error);
  }
};

export const withdrawProposal = async (req: any, res: any) => {
  try {
    if (!isUuid(req.params.id)) return errorResponse(res, "Proposal tidak ditemukan", 404);
    const r = await db.update(workshopProposals).set({ status: "WITHDRAWN", decidedAt: new Date() })
      .where(and(eq(workshopProposals.id, req.params.id), eq(workshopProposals.mentorId, req.user.id), eq(workshopProposals.status, "PENDING"))).returning({ id: workshopProposals.id });
    if (r.length === 0) return errorResponse(res, "Proposal tidak ditemukan atau sudah diputuskan.", 404);
    successResponse(res, null, "Proposal ditarik");
  } catch (error) {
    errorResponse(res, "Gagal menarik proposal", 500, error);
  }
};

/** Pendapatan Mentor dari workshop (bagian dibekukan per pendaftaran). */
export const mentorEarnings = async (req: any, res: any) => {
  try {
    const uid = req.user.id;
    const monthStart = sql`(date_trunc('month', now() at time zone 'Asia/Jakarta') at time zone 'Asia/Jakarta')`;
    const [s] = rowsOf<any>(await db.execute(sql`select
      count(*)::int as participants,
      coalesce(sum(e.mentor_share), 0)::bigint as total,
      coalesce(sum(e.mentor_share) filter (where (e.enrolled_at at time zone 'UTC') >= ${monthStart}), 0)::bigint as month
      from academy.enrollments e where e.mentor_id = ${uid}`));
    successResponse(res, {
      participants: num(s?.participants), earningsTotal: num(s?.total), earningsThisMonth: num(s?.month),
      mentorPercent: splitWorkshopRevenue(100, await getConfigInt("workshop_owner_percent"), await getConfigInt("workshop_mentor_percent")).mentorPercent,
    }, "Pendapatan workshop");
  } catch (error) {
    errorResponse(res, "Gagal memuat pendapatan", 500, error);
  }
};

// --- Admin ---

export const listProposals = async (req: any, res: any) => {
  try {
    const status = typeof req.query?.status === "string" ? req.query.status : "";
    const rows = await db.select({
      id: workshopProposals.id, title: workshopProposals.title, description: workshopProposals.description, price: workshopProposals.price, status: workshopProposals.status,
      decisionNote: workshopProposals.decisionNote, createdAt: workshopProposals.createdAt, decidedAt: workshopProposals.decidedAt,
      source: courses.title, sourcePrice: courses.price, owner: courses.instructorName, mentor: users.name,
    }).from(workshopProposals).innerJoin(courses, eq(courses.id, workshopProposals.sourceCourseId)).innerJoin(users, eq(users.id, workshopProposals.mentorId))
      .where(["PENDING", "APPROVED", "REJECTED", "WITHDRAWN"].includes(status) ? eq(workshopProposals.status, status) : undefined)
      .orderBy(desc(workshopProposals.createdAt)).limit(200);
    const w = splitWorkshopRevenue(100, await getConfigInt("workshop_owner_percent"), await getConfigInt("workshop_mentor_percent"));
    successResponse(res, { rows, split: { owner: w.ownerPercent, mentor: w.mentorPercent, platform: w.platformPercent } }, "Proposal workshop");
  } catch (error) {
    errorResponse(res, "Gagal memuat proposal", 500, error);
  }
};

/** Setuju: membuat kursus WORKSHOP (pemilik = Creator kursus sumber) dan kelas Mentor yang terhubung. */
export const approveProposal = async (req: any, res: any) => {
  try {
    if (!isUuid(req.params.id)) return errorResponse(res, "Proposal tidak ditemukan", 404);
    const note = validateDecisionNote(req.body, false);
    if (!note.ok) return errorResponse(res, note.message, 400);
    let code: string | null = null;
    for (let i = 0; i < 3 && !code; i += 1) {
      const joinCode = await newUniqueCode();
      try {
        const out = await db.transaction(async (tx) => {
          const [p] = await tx.select().from(workshopProposals).where(eq(workshopProposals.id, req.params.id)).for("update");
          if (!p) return { code: 404 as const, message: "Proposal tidak ditemukan" };
          if (p.status !== "PENDING") return { code: 409 as const, message: "Proposal sudah diputuskan." };
          const [src] = await tx.select().from(courses).where(eq(courses.id, p.sourceCourseId)).limit(1);
          if (!src || src.status !== "PUBLISHED" || !src.instructorId) return { code: 409 as const, message: "Kursus sumber tidak lagi terbit." };
          const [course] = await tx.insert(courses).values({
            title: p.title, slug: `${slugify(p.title)}-${crypto.randomBytes(3).toString("hex")}`, description: p.description ?? src.description,
            instructorId: src.instructorId, instructorName: src.instructorName, price: p.price, type: "WORKSHOP", status: "PUBLISHED",
            thumbnail: src.thumbnail, categoryIds: src.categoryIds, examEnabled: false, contentSourceId: src.id,
          }).returning({ id: courses.id });
          const [cls] = await tx.insert(mentorClasses).values({ mentorId: p.mentorId, name: p.title, description: p.description, joinCode, courseId: course.id }).returning({ id: mentorClasses.id });
          await tx.update(workshopProposals).set({ status: "APPROVED", decidedBy: req.user.id, decidedAt: new Date(), decisionNote: note.value || null, workshopCourseId: course.id, classId: cls.id }).where(eq(workshopProposals.id, p.id));
          await notifyUser(tx, p.mentorId, "Proposal workshop disetujui", `Workshop "${p.title}" disetujui dan sudah tayang di etalase. Atur jadwal sesi di menu Kelas.`, "BELAJAR");
          await notifyUser(tx, src.instructorId, "Materi Anda dipakai untuk workshop", `Kursus "${src.title}" dijadikan dasar workshop "${p.title}". Bagian Anda mengikuti ketentuan bagi hasil workshop.`, "BELAJAR");
          return { code: 200 as const, message: "Proposal disetujui" };
        });
        if (out.code !== 200) return errorResponse(res, out.message, out.code);
        code = joinCode;
      } catch (e) { if (!isUniqueViolation(e)) throw e; }
    }
    if (!code) return errorResponse(res, "Gagal menyetujui proposal. Coba lagi.", 409);
    console.info(`[workshop] disetujui ${req.params.id} oleh=${req.user.id}`);
    successResponse(res, null, "Proposal disetujui");
  } catch (error) {
    errorResponse(res, "Gagal menyetujui proposal", 500, error);
  }
};

export const rejectProposal = async (req: any, res: any) => {
  try {
    if (!isUuid(req.params.id)) return errorResponse(res, "Proposal tidak ditemukan", 404);
    const note = validateDecisionNote(req.body, true);
    if (!note.ok) return errorResponse(res, note.message, 400);
    const out = await db.transaction(async (tx) => {
      const [p] = await tx.select().from(workshopProposals).where(eq(workshopProposals.id, req.params.id)).for("update");
      if (!p) return { code: 404 as const, message: "Proposal tidak ditemukan" };
      if (p.status !== "PENDING") return { code: 409 as const, message: "Proposal sudah diputuskan." };
      await tx.update(workshopProposals).set({ status: "REJECTED", decidedBy: req.user.id, decidedAt: new Date(), decisionNote: note.value }).where(eq(workshopProposals.id, p.id));
      await notifyUser(tx, p.mentorId, "Proposal workshop ditolak", `Proposal "${p.title}" ditolak. Alasan: ${note.value}`, "BELAJAR");
      return { code: 200 as const, message: "Proposal ditolak" };
    });
    if (out.code !== 200) return errorResponse(res, out.message, out.code);
    successResponse(res, null, out.message);
  } catch (error) {
    errorResponse(res, "Gagal menolak proposal", 500, error);
  }
};
