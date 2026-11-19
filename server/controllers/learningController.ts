// Ruang belajar: progres modul, ujian (dinilai di server), dan sertifikat.
// Aturan inti ada di shared/learning.ts (dites tanpa database).
import { randomInt } from "node:crypto";
import { and, asc, desc, eq, inArray, lt, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { ensureCertificatePdf } from "../lib/certificate-service";
import { certificates, courseExamQuestions, courseModules, courses, enrollments, examAttempts, moduleProgress, users } from "../schema/schema";
import { notifyUser } from "../lib/cards";
import { successResponse, errorResponse } from "../utils/response";
import { EXAM_MIN_QUESTIONS } from "@shared/course";
import {
  EXAM_GRACE_SECONDS, EXAM_MAX_ATTEMPTS, certificateKindFor, examDeadline, examEligibility, gradeExam, isPassing, isValidSerial,
  newCertificateSerial, normalizeSerial, progressPercent, shuffle, validateAnswers, withinSubmitWindow, type CertificateKind,
} from "@shared/learning";

type Tx = any;
type CourseRow = typeof courses.$inferSelect;

const isUuid = (v: unknown): v is string => z.string().uuid().safeParse(v).success;

/** Kursus yang menyimpan modulnya: kursus WORKSHOP membaca materi dari kursus sumbernya. */
const contentCourseId = (course: { id: string; contentSourceId: string | null }): string => course.contentSourceId ?? course.id;

/** Jumlah modul selesai milik peserta dan total modul pada materi sebuah kursus (dihitung per modul, bukan per kursus pendaftaran). */
const moduleCounts = async (tx: Tx, userId: string, contentId: string): Promise<{ done: number; total: number }> => {
  const [[d], [t]] = await Promise.all([
    tx.select({ n: sql<number>`count(*)::int` }).from(moduleProgress).innerJoin(courseModules, eq(courseModules.id, moduleProgress.moduleId))
      .where(and(eq(moduleProgress.userId, userId), eq(courseModules.courseId, contentId))),
    tx.select({ n: sql<number>`count(*)::int` }).from(courseModules).where(eq(courseModules.courseId, contentId)),
  ]);
  return { done: d?.n ?? 0, total: t?.n ?? 0 };
};
const NOT_ENROLLED = "Kursus tidak ditemukan atau Anda belum terdaftar.";

const loadCourseAndEnrollment = async (tx: Tx, userId: string, courseId: string, lock = false) => {
  if (!isUuid(courseId)) return null;
  const q = tx.select().from(enrollments).where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId))).limit(1);
  const [enrollment] = await (lock ? q.for("update") : q);
  if (!enrollment) return null;
  const [course] = await tx.select().from(courses).where(eq(courses.id, courseId)).limit(1);
  return course ? { enrollment, course: course as CourseRow } : null;
};

/** Menutup percobaan ujian yang melewati batas waktu (plus toleransi) sebagai gagal; tetap dihitung sebagai satu kesempatan. */
const expireStaleAttempts = async (tx: Tx, userId: string, courseId: string, now = new Date()) => {
  await tx.update(examAttempts)
    .set({ status: "EXPIRED", score: 0, correctCount: 0, passed: false, submittedAt: now })
    .where(and(eq(examAttempts.userId, userId), eq(examAttempts.courseId, courseId), eq(examAttempts.status, "IN_PROGRESS"), lt(examAttempts.deadlineAt, new Date(now.getTime() - EXAM_GRACE_SECONDS * 1000))));
};

/** Menerbitkan sertifikat sekali per (akun, kursus). Aman dipanggil berulang dan bersamaan. */
const issueCertificate = async (tx: Tx, course: CourseRow, userId: string, kind: CertificateKind, attemptId: string | null, grade: number | null) => {
  const find = async () => (await tx.select({ id: certificates.id, serial: certificates.serial }).from(certificates).where(and(eq(certificates.userId, userId), eq(certificates.courseId, course.id))).limit(1))[0] as { id: string; serial: string } | undefined;
  const existing = await find();
  if (existing) return { ...existing, created: false };
  const [user] = await tx.select({ name: users.name }).from(users).where(eq(users.id, userId)).limit(1);
  for (let i = 0; i < 5; i += 1) {
    const serial = newCertificateSerial(new Date().getFullYear(), randomInt);
    const inserted = await tx.insert(certificates).values({
      serial, userId, courseId: course.id, kind, attemptId, grade,
      studentName: user?.name ?? "Peserta", courseTitle: course.title, courseType: course.type, instructorName: course.instructorName ?? "KMP - ADNG Academy",
    }).onConflictDoNothing().returning({ id: certificates.id, serial: certificates.serial });
    if (inserted.length > 0) {
      await notifyUser(tx, userId, "Sertifikat terbit", `Selamat! Sertifikat kursus "${course.title}" telah terbit dengan nomor ${serial}. Lihat di Pengaturan Profil > Sertifikat.`, "BELAJAR");
      return { ...inserted[0], created: true };
    }
    const again = await find(); // bentrok akun-kursus (balapan) atau nomor kembar
    if (again) return { ...again, created: false };
  }
  throw new Error("SERIAL_COLLISION");
};

// ---------------------------------------------------------------------------
// Ruang belajar
// ---------------------------------------------------------------------------

export const getLearning = async (req: any, res: any) => {
  try {
    const userId = req.user.id as string;
    const ctx = await loadCourseAndEnrollment(db, userId, req.params.courseId);
    if (!ctx) return errorResponse(res, NOT_ENROLLED, 404);
    const { course } = ctx;

    await expireStaleAttempts(db, userId, course.id);
    await db.update(enrollments).set({ lastAccessedAt: new Date() }).where(eq(enrollments.id, ctx.enrollment.id));

    const [modules, done, attempts, qCount, cert] = await Promise.all([
      db.select({ id: courseModules.id, position: courseModules.position, title: courseModules.title, description: courseModules.description, type: courseModules.type, isFreePreview: courseModules.isFreePreview })
        .from(courseModules).where(eq(courseModules.courseId, contentCourseId(course))).orderBy(asc(courseModules.position)),
      db.select({ moduleId: moduleProgress.moduleId }).from(moduleProgress).innerJoin(courseModules, eq(courseModules.id, moduleProgress.moduleId))
        .where(and(eq(moduleProgress.userId, userId), eq(courseModules.courseId, contentCourseId(course)))),
      db.select({ id: examAttempts.id, status: examAttempts.status, score: examAttempts.score, passed: examAttempts.passed }).from(examAttempts).where(and(eq(examAttempts.userId, userId), eq(examAttempts.courseId, course.id))),
      db.select({ n: sql<number>`count(*)::int` }).from(courseExamQuestions).where(eq(courseExamQuestions.courseId, course.id)),
      db.select({ id: certificates.id, serial: certificates.serial }).from(certificates).where(and(eq(certificates.userId, userId), eq(certificates.courseId, course.id))).limit(1),
    ]);

    const doneSet = new Set(done.map((d) => d.moduleId));
    const completedModules = modules.filter((m) => doneSet.has(m.id)).length;
    const progress = progressPercent(completedModules, modules.length);
    const finished = attempts.filter((a) => a.status !== "IN_PROGRESS");
    const hasOpen = attempts.some((a) => a.status === "IN_PROGRESS");
    const passed = attempts.some((a) => a.passed === true);
    const scores = finished.map((a) => a.score ?? 0);
    const elig = examEligibility({
      courseType: course.type, examEnabled: course.examEnabled, progress, attemptsUsed: finished.length, hasOpenAttempt: hasOpen,
      passed, questionCount: qCount[0]?.n ?? 0, minQuestions: EXAM_MIN_QUESTIONS,
    });

    successResponse(res, {
      course: { id: course.id, title: course.title, description: course.description, instructorName: course.instructorName, type: course.type, thumbnail: course.thumbnail },
      modules: modules.map((m) => ({ ...m, isCompleted: doneSet.has(m.id) })),
      progress, completedModules, totalModules: modules.length,
      exam: {
        enabled: course.examEnabled && course.type !== "CERTIFICATION",
        passingGrade: course.examPassingGrade, durationMinutes: course.examDurationMinutes, questionCount: qCount[0]?.n ?? 0,
        maxAttempts: EXAM_MAX_ATTEMPTS, attemptsUsed: finished.length + (hasOpen ? 1 : 0), hasOpenAttempt: hasOpen,
        passed, bestScore: scores.length ? Math.max(...scores) : null, eligible: elig.eligible, reason: elig.reason,
      },
      certificate: cert[0] ?? null,
    }, "Ruang belajar");
  } catch (error) {
    errorResponse(res, "Gagal memuat ruang belajar", 500, error);
  }
};

export const completeModule = async (req: any, res: any) => {
  try {
    const userId = req.user.id as string;
    const { moduleId } = req.params;
    if (!isUuid(moduleId)) return errorResponse(res, "Modul tidak ditemukan", 404);

    const result = await db.transaction(async (tx) => {
      const ctx = await loadCourseAndEnrollment(tx, userId, req.params.courseId, true); // kunci baris pendaftaran: penyelesaian serentak berurutan
      if (!ctx) return { notFound: NOT_ENROLLED } as const;
      const { course, enrollment } = ctx;
      const [mod] = await tx.select({ id: courseModules.id }).from(courseModules).where(and(eq(courseModules.id, moduleId), eq(courseModules.courseId, contentCourseId(course)))).limit(1);
      if (!mod) return { notFound: "Modul tidak ditemukan" } as const;

      await tx.insert(moduleProgress).values({ userId, courseId: course.id, moduleId }).onConflictDoNothing();
      const { done, total } = await moduleCounts(tx, userId, contentCourseId(course));
      const progress = progressPercent(done, total);
      const now = new Date();
      await tx.update(enrollments).set({ progress, lastAccessedAt: now, completedAt: progress === 100 ? (enrollment.completedAt ?? now) : enrollment.completedAt }).where(eq(enrollments.id, enrollment.id));

      let certificate: { id: string; serial: string; created: boolean } | null = null;
      if (progress === 100) {
        const kind = certificateKindFor(course.type, course.examEnabled);
        if (kind !== "EXAM") certificate = await issueCertificate(tx, course, userId, kind, null, null);
      }
      return { progress, completedModules: done, totalModules: total, certificate } as const;
    });

    if ("notFound" in result) return errorResponse(res, result.notFound, 404);
    if (result.certificate?.created) void ensureCertificatePdf(result.certificate.id); // PDF dibuat di latar belakang setelah transaksi selesai
    successResponse(res, result, "Modul ditandai selesai");
  } catch (error) {
    errorResponse(res, "Gagal menyimpan progres", 500, error);
  }
};

// ---------------------------------------------------------------------------
// Ujian
// ---------------------------------------------------------------------------

const examPayload = async (tx: Tx, attempt: typeof examAttempts.$inferSelect, course: CourseRow) => {
  const rows = await tx.select({ id: courseExamQuestions.id, question: courseExamQuestions.question, options: courseExamQuestions.options })
    .from(courseExamQuestions).where(inArray(courseExamQuestions.id, attempt.questionOrder));
  const byId = new Map<string, { id: string; question: string; options: string[] }>(rows.map((r: { id: string; question: string; options: string[] }) => [r.id, r]));
  return {
    attemptId: attempt.id, startedAt: attempt.startedAt, deadlineAt: attempt.deadlineAt, serverNow: new Date(),
    durationMinutes: course.examDurationMinutes, passingGrade: attempt.passingGrade,
    questions: attempt.questionOrder.map((id) => byId.get(id)).filter(Boolean),
  };
};

export const startExam = async (req: any, res: any) => {
  try {
    const userId = req.user.id as string;
    const result = await db.transaction(async (tx) => {
      const ctx = await loadCourseAndEnrollment(tx, userId, req.params.courseId, true);
      if (!ctx) return { status: 404, message: NOT_ENROLLED } as const;
      const { course } = ctx;

      await expireStaleAttempts(tx, userId, course.id);
      const [attempts, { done, total }, [{ n }]] = await Promise.all([
        tx.select().from(examAttempts).where(and(eq(examAttempts.userId, userId), eq(examAttempts.courseId, course.id))).orderBy(desc(examAttempts.startedAt)),
        moduleCounts(tx, userId, contentCourseId(course)),
        tx.select({ n: sql<number>`count(*)::int` }).from(courseExamQuestions).where(eq(courseExamQuestions.courseId, course.id)),
      ]);
      const open = (attempts as (typeof examAttempts.$inferSelect)[]).find((a) => a.status === "IN_PROGRESS");
      const elig = examEligibility({
        courseType: course.type, examEnabled: course.examEnabled, progress: progressPercent(done, total),
        attemptsUsed: (attempts as (typeof examAttempts.$inferSelect)[]).filter((a) => a.status !== "IN_PROGRESS").length, hasOpenAttempt: !!open,
        passed: (attempts as (typeof examAttempts.$inferSelect)[]).some((a) => a.passed === true), questionCount: n, minQuestions: EXAM_MIN_QUESTIONS,
      });
      if (!elig.eligible) return { status: 400, message: elig.reason ?? "Ujian tidak tersedia." } as const;
      if (open) return { payload: await examPayload(tx, open, course) } as const;

      const ids: { id: string }[] = await tx.select({ id: courseExamQuestions.id }).from(courseExamQuestions).where(eq(courseExamQuestions.courseId, course.id));
      const now = new Date();
      const order = shuffle(ids.map((q) => q.id), randomInt);
      const [attempt] = await tx.insert(examAttempts).values({
        userId, courseId: course.id, questionOrder: order, totalQuestions: order.length, passingGrade: course.examPassingGrade,
        startedAt: now, deadlineAt: examDeadline(now, course.examDurationMinutes),
      }).returning();
      return { payload: await examPayload(tx, attempt, course) } as const;
    });

    if ("status" in result) return errorResponse(res, result.message, result.status);
    successResponse(res, result.payload, "Ujian dimulai");
  } catch (error) {
    errorResponse(res, "Gagal memulai ujian", 500, error);
  }
};

export const submitExam = async (req: any, res: any) => {
  try {
    const userId = req.user.id as string;
    const attemptId = req.body?.attemptId;
    if (!isUuid(attemptId)) return errorResponse(res, "Percobaan ujian tidak valid.", 400);

    const result = await db.transaction(async (tx) => {
      const ctx = await loadCourseAndEnrollment(tx, userId, req.params.courseId, true);
      if (!ctx) return { status: 404, message: NOT_ENROLLED } as const;
      const { course } = ctx;
      const [attempt] = await tx.select().from(examAttempts).where(and(eq(examAttempts.id, attemptId), eq(examAttempts.userId, userId), eq(examAttempts.courseId, course.id))).for("update").limit(1);
      if (!attempt) return { status: 404, message: "Percobaan ujian tidak ditemukan." } as const;
      if (attempt.status !== "IN_PROGRESS") return { status: 409, message: "Ujian ini sudah dikirim atau berakhir." } as const;

      const now = new Date();
      if (!withinSubmitWindow(now, attempt.deadlineAt)) {
        await tx.update(examAttempts).set({ status: "EXPIRED", score: 0, correctCount: 0, passed: false, submittedAt: now }).where(eq(examAttempts.id, attempt.id));
        return { status: 409, message: "Waktu ujian sudah habis. Jawaban tidak dapat diterima dan percobaan ini dihitung." } as const;
      }
      const answers = validateAnswers(req.body?.answers, attempt.totalQuestions);
      if (!answers) return { status: 400, message: "Format jawaban tidak valid." } as const;

      const keyRows: { id: string; correctIndex: number }[] = await tx.select({ id: courseExamQuestions.id, correctIndex: courseExamQuestions.correctIndex }).from(courseExamQuestions).where(inArray(courseExamQuestions.id, attempt.questionOrder));
      const grade = gradeExam(attempt.questionOrder, Object.fromEntries(keyRows.map((k) => [k.id, k.correctIndex])), answers);
      const passed = isPassing(grade.score, attempt.passingGrade);
      await tx.update(examAttempts).set({ status: "SUBMITTED", answers, correctCount: grade.correct, score: grade.score, passed, submittedAt: now }).where(eq(examAttempts.id, attempt.id));

      const certificate = passed ? await issueCertificate(tx, course, userId, "EXAM", attempt.id, grade.score) : null;
      const [{ used }] = await tx.select({ used: sql<number>`count(*)::int` }).from(examAttempts).where(and(eq(examAttempts.userId, userId), eq(examAttempts.courseId, course.id), sql`${examAttempts.status} <> 'IN_PROGRESS'`));
      return {
        data: {
          score: grade.score, correct: grade.correct, total: grade.total, passed, passingGrade: attempt.passingGrade,
          attemptsLeft: passed ? 0 : Math.max(0, EXAM_MAX_ATTEMPTS - used), certificate: certificate ? { id: certificate.id, serial: certificate.serial } : null,
        },
      } as const;
    });

    if ("status" in result) return errorResponse(res, result.message, result.status);
    if (result.data.certificate) void ensureCertificatePdf(result.data.certificate.id);
    successResponse(res, result.data, result.data.passed ? "Selamat, Anda lulus." : "Ujian selesai.");
  } catch (error) {
    errorResponse(res, "Gagal mengirim jawaban", 500, error);
  }
};

// ---------------------------------------------------------------------------
// Sertifikat
// ---------------------------------------------------------------------------

export const listMyCertificates = async (req: any, res: any) => {
  try {
    const rows = await db.select().from(certificates).where(eq(certificates.userId, req.user.id)).orderBy(desc(certificates.issuedAt));
    // Sertifikat lama atau yang gagal dibuat PDF-nya dilengkapi saat dibuka (paling banyak 5 per permintaan).
    for (const c of rows.filter((r) => !r.pdfUrl).slice(0, 5)) c.pdfUrl = await ensureCertificatePdf(c.id);
    successResponse(res, rows.map((c) => ({
      pdfUrl: c.pdfUrl, id: c.id, serial: c.serial, courseId: c.courseId, courseTitle: c.courseTitle, courseType: c.courseType, studentName: c.studentName,
      instructorName: c.instructorName, grade: c.grade, kind: c.kind, issuedAt: c.issuedAt,
    })), "Sertifikat saya");
  } catch (error) {
    errorResponse(res, "Gagal memuat sertifikat", 500, error);
  }
};

/** Publik: memeriksa keaslian sertifikat dari nomornya. Hanya data yang tertera pada sertifikat. */
export const verifyCertificate = async (req: any, res: any) => {
  try {
    const serial = normalizeSerial(String(req.params.serial ?? ""));
    if (!isValidSerial(serial)) return errorResponse(res, "Nomor sertifikat tidak ditemukan.", 404);
    const [c] = await db.select().from(certificates).where(eq(certificates.serial, serial)).limit(1);
    if (!c) return errorResponse(res, "Nomor sertifikat tidak ditemukan.", 404);
    successResponse(res, { valid: true, serial: c.serial, studentName: c.studentName, courseTitle: c.courseTitle, courseType: c.courseType, kind: c.kind, grade: c.grade, issuedAt: c.issuedAt }, "Sertifikat valid");
  } catch (error) {
    errorResponse(res, "Gagal memeriksa sertifikat", 500, error);
  }
};
