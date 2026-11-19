import crypto from "node:crypto";
import { and, asc, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import { classMembers, classSessions, mentorClasses, users } from "../schema/schema";
import { successResponse, errorResponse } from "../utils/response";
import { notifyUser } from "../lib/cards";
import { requireAcceptance } from "./legalController";
import { generateJoinCode, normalizeJoinCode, validateClassInput, validateGrade, validateSessionInput } from "@shared/classes";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: unknown): v is string => typeof v === "string" && UUID_RE.test(v);
const isUniqueViolation = (e: any): boolean => e?.code === "23505" || e?.cause?.code === "23505";

/** Kelas milik Mentor yang sedang login, atau null (respons galat sudah dikirim). */
const ownClass = async (req: any, res: any, idParam = "id") => {
  const id = req.params[idParam];
  if (!isUuid(id)) { errorResponse(res, "Kelas tidak ditemukan", 404); return null; }
  const [c] = await db.select().from(mentorClasses).where(and(eq(mentorClasses.id, id), eq(mentorClasses.mentorId, req.user.id))).limit(1);
  if (!c) { errorResponse(res, "Kelas tidak ditemukan", 404); return null; }
  return c;
};

export const newUniqueCode = async (): Promise<string> => {
  for (let i = 0; i < 5; i += 1) {
    const code = generateJoinCode((m) => crypto.randomInt(m));
    const [hit] = await db.select({ id: mentorClasses.id }).from(mentorClasses).where(eq(mentorClasses.joinCode, code)).limit(1);
    if (!hit) return code;
  }
  throw new Error("Gagal membuat kode gabung unik");
};

export const getClasses = async (req: any, res: any) => {
  try {
    const rows = await db.select({
      id: mentorClasses.id, name: mentorClasses.name, description: mentorClasses.description, joinCode: mentorClasses.joinCode, archived: mentorClasses.archived, createdAt: mentorClasses.createdAt, courseId: mentorClasses.courseId,
      members: sql<number>`(select count(*)::int from academy.class_members m where m.class_id = ${sql.raw('"academy"."mentor_classes"."id"')})`,
      nextSession: sql<string | null>`(select min(s.starts_at) from academy.class_sessions s where s.class_id = ${sql.raw('"academy"."mentor_classes"."id"')} and s.starts_at >= now())`,
    }).from(mentorClasses).where(eq(mentorClasses.mentorId, req.user.id)).orderBy(desc(mentorClasses.createdAt));
    successResponse(res, rows, "Kelas saya");
  } catch (error) {
    errorResponse(res, "Gagal memuat kelas", 500, error);
  }
};

export const createClass = async (req: any, res: any) => {
  try {
    if (!(await requireAcceptance(req, res, "MENTOR_AGREEMENT"))) return;
    const v = validateClassInput(req.body);
    if (!v.ok) return errorResponse(res, v.message, 400);
    let created: { id: string } | undefined;
    for (let i = 0; i < 3 && !created; i += 1) {
      try {
        const joinCode = await newUniqueCode();
        [created] = await db.insert(mentorClasses).values({ mentorId: req.user.id, name: v.value.name, description: v.value.description, joinCode }).returning({ id: mentorClasses.id });
      } catch (e) { if (!isUniqueViolation(e)) throw e; }
    }
    if (!created) return errorResponse(res, "Gagal membuat kelas. Coba lagi.", 409);
    successResponse(res, created, "Kelas dibuat", 201);
  } catch (error) {
    errorResponse(res, "Gagal membuat kelas", 500, error);
  }
};

export const getClass = async (req: any, res: any) => {
  try {
    const c = await ownClass(req, res);
    if (!c) return;
    const members = await db.select({ userId: classMembers.userId, name: users.name, email: users.email, joinedAt: classMembers.joinedAt, grade: classMembers.grade, gradeNote: classMembers.gradeNote, gradedAt: classMembers.gradedAt })
      .from(classMembers).innerJoin(users, eq(users.id, classMembers.userId)).where(eq(classMembers.classId, c.id)).orderBy(asc(users.name));
    const sessions = await db.select().from(classSessions).where(eq(classSessions.classId, c.id)).orderBy(asc(classSessions.startsAt));
    successResponse(res, { class: c, members, sessions }, "Detail kelas");
  } catch (error) {
    errorResponse(res, "Gagal memuat kelas", 500, error);
  }
};

export const updateClass = async (req: any, res: any) => {
  try {
    const c = await ownClass(req, res);
    if (!c) return;
    const v = validateClassInput(req.body);
    if (!v.ok) return errorResponse(res, v.message, 400);
    const archived = typeof req.body?.archived === "boolean" ? req.body.archived : c.archived;
    await db.update(mentorClasses).set({ name: v.value.name, description: v.value.description, archived }).where(eq(mentorClasses.id, c.id));
    successResponse(res, null, "Kelas diperbarui");
  } catch (error) {
    errorResponse(res, "Gagal memperbarui kelas", 500, error);
  }
};

/** Kode lama langsung tidak berlaku. Anggota yang sudah masuk tidak terpengaruh. */
export const regenerateCode = async (req: any, res: any) => {
  try {
    const c = await ownClass(req, res);
    if (!c) return;
    const joinCode = await newUniqueCode();
    await db.update(mentorClasses).set({ joinCode }).where(eq(mentorClasses.id, c.id));
    successResponse(res, { joinCode }, "Kode diganti");
  } catch (error) {
    errorResponse(res, "Gagal mengganti kode", 500, error);
  }
};

/** Menambah siswa terdaftar lewat email. Hanya peran STUDENT; akun lain ditolak dengan pesan seragam. */
export const addMember = async (req: any, res: any) => {
  try {
    const c = await ownClass(req, res);
    if (!c) return;
    if (c.archived) return errorResponse(res, "Kelas sudah diarsipkan.", 409);
    if (c.courseId) return errorResponse(res, "Peserta workshop berbayar masuk lewat pembelian kursus.", 409);
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    if (!email) return errorResponse(res, "Email wajib diisi.", 400);
    const [u] = await db.select({ id: users.id, role: users.role }).from(users).where(sql`lower(${users.email}) = ${email}`).limit(1);
    if (!u || u.role !== "STUDENT") return errorResponse(res, "Tidak ada siswa terdaftar dengan email itu.", 404);
    const added = await db.transaction(async (tx) => {
      const r = await tx.insert(classMembers).values({ classId: c.id, userId: u.id }).onConflictDoNothing().returning({ id: classMembers.id });
      if (r.length === 0) return false;
      await notifyUser(tx, u.id, "Anda ditambahkan ke kelas", `Anda ditambahkan ke kelas ${c.name}.`, "BELAJAR");
      return true;
    });
    if (!added) return errorResponse(res, "Siswa sudah ada di kelas ini.", 409);
    successResponse(res, null, "Siswa ditambahkan", 201);
  } catch (error) {
    errorResponse(res, "Gagal menambah siswa", 500, error);
  }
};

export const removeMember = async (req: any, res: any) => {
  try {
    const c = await ownClass(req, res);
    if (!c) return;
    if (!isUuid(req.params.userId)) return errorResponse(res, "Anggota tidak ditemukan", 404);
    const r = await db.delete(classMembers).where(and(eq(classMembers.classId, c.id), eq(classMembers.userId, req.params.userId))).returning({ id: classMembers.id });
    if (r.length === 0) return errorResponse(res, "Anggota tidak ditemukan", 404);
    successResponse(res, null, "Anggota dikeluarkan");
  } catch (error) {
    errorResponse(res, "Gagal mengeluarkan anggota", 500, error);
  }
};

export const setGrade = async (req: any, res: any) => {
  try {
    const c = await ownClass(req, res);
    if (!c) return;
    if (!isUuid(req.params.userId)) return errorResponse(res, "Anggota tidak ditemukan", 404);
    const v = validateGrade(req.body);
    if (!v.ok) return errorResponse(res, v.message, 400);
    const r = await db.transaction(async (tx) => {
      const upd = await tx.update(classMembers).set({ grade: v.value.grade, gradeNote: v.value.note, gradedAt: new Date() })
        .where(and(eq(classMembers.classId, c.id), eq(classMembers.userId, req.params.userId))).returning({ id: classMembers.id });
      if (upd.length === 0) return false;
      await notifyUser(tx, req.params.userId, "Nilai kelas diperbarui", `Nilai Anda di kelas ${c.name} telah diperbarui.`, "BELAJAR");
      return true;
    });
    if (!r) return errorResponse(res, "Anggota tidak ditemukan", 404);
    successResponse(res, null, "Nilai disimpan");
  } catch (error) {
    errorResponse(res, "Gagal menyimpan nilai", 500, error);
  }
};

export const addSession = async (req: any, res: any) => {
  try {
    const c = await ownClass(req, res);
    if (!c) return;
    if (c.archived) return errorResponse(res, "Kelas sudah diarsipkan.", 409);
    const v = validateSessionInput(req.body);
    if (!v.ok) return errorResponse(res, v.message, 400);
    const memberIds = await db.select({ id: classMembers.userId }).from(classMembers).where(eq(classMembers.classId, c.id));
    await db.transaction(async (tx) => {
      await tx.insert(classSessions).values({ classId: c.id, title: v.value.title, startsAt: v.value.startsAt, meetingUrl: v.value.meetingUrl });
      for (const m of memberIds) await notifyUser(tx, m.id, "Jadwal sesi baru", `${c.name}: ${v.value.title}`, "BELAJAR");
    });
    successResponse(res, null, "Sesi dijadwalkan", 201);
  } catch (error) {
    errorResponse(res, "Gagal menjadwalkan sesi", 500, error);
  }
};

export const deleteSession = async (req: any, res: any) => {
  try {
    const c = await ownClass(req, res);
    if (!c) return;
    if (!isUuid(req.params.sessionId)) return errorResponse(res, "Sesi tidak ditemukan", 404);
    const r = await db.delete(classSessions).where(and(eq(classSessions.id, req.params.sessionId), eq(classSessions.classId, c.id))).returning({ id: classSessions.id });
    if (r.length === 0) return errorResponse(res, "Sesi tidak ditemukan", 404);
    successResponse(res, null, "Sesi dihapus");
  } catch (error) {
    errorResponse(res, "Gagal menghapus sesi", 500, error);
  }
};

// --- Sisi siswa ---

/** Siswa memakai kode gabung. Pesan galat seragam agar kode tidak bisa ditebak. */
export const joinByCode = async (req: any, res: any) => {
  try {
    const code = normalizeJoinCode(req.body?.code);
    const [c] = code ? await db.select().from(mentorClasses).where(and(eq(mentorClasses.joinCode, code), eq(mentorClasses.archived, false))).limit(1) : [];
    if (!c) return errorResponse(res, "Kode kelas tidak valid.", 400);
    if (c.mentorId === req.user.id) return errorResponse(res, "Anda adalah Mentor kelas ini.", 400);
    if (c.courseId) return errorResponse(res, "Kode kelas tidak valid.", 400); // workshop berbayar: hanya lewat pembelian
    const r = await db.insert(classMembers).values({ classId: c.id, userId: req.user.id }).onConflictDoNothing().returning({ id: classMembers.id });
    if (r.length === 0) return errorResponse(res, "Anda sudah ada di kelas ini.", 409);
    successResponse(res, { id: c.id, name: c.name }, "Berhasil bergabung", 201);
  } catch (error) {
    errorResponse(res, "Gagal bergabung", 500, error);
  }
};

/** Kelas yang diikuti siswa, dengan sesi mendatang dan nilainya sendiri. */
export const myMemberships = async (req: any, res: any) => {
  try {
    const rows = await db.select({ id: mentorClasses.id, name: mentorClasses.name, description: mentorClasses.description, archived: mentorClasses.archived, mentor: users.name, grade: classMembers.grade, gradeNote: classMembers.gradeNote })
      .from(classMembers).innerJoin(mentorClasses, eq(mentorClasses.id, classMembers.classId)).innerJoin(users, eq(users.id, mentorClasses.mentorId))
      .where(eq(classMembers.userId, req.user.id)).orderBy(desc(classMembers.joinedAt));
    const ids = rows.map((r) => r.id);
    const sessions = ids.length === 0 ? [] : await db.select().from(classSessions).where(and(inArray(classSessions.classId, ids), gte(classSessions.startsAt, new Date()))).orderBy(asc(classSessions.startsAt));
    successResponse(res, rows.map((r) => ({ ...r, sessions: sessions.filter((s) => s.classId === r.id) })), "Kelas yang diikuti");
  } catch (error) {
    errorResponse(res, "Gagal memuat kelas", 500, error);
  }
};

