import { requireAcceptance } from "./legalController";
import crypto from "node:crypto";
import multer from "multer";
import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { categories, courseExamQuestions, courseModules, courses, enrollments, mentorClasses, users } from "../schema/schema";
import { successResponse, errorResponse } from "../utils/response";
import { notifyUser } from "../lib/cards";
import { checkSession } from "../lib/session-user";
import { getConfigInt } from "../lib/system-config";
import { autoDiscountMap } from "./pricingController";
import { courseIdRef } from "../lib/sql-refs";
import { newThumbnailKey, removeOldPublicFile } from "../lib/avatar";
import { deletePrivate, inspectPrivate, privateAccess, privateUploadTarget, putPrivate, putPublic } from "../lib/storage";
import { applyPercent } from "@shared/pricing";
import { AVATAR_MAX_BYTES, detectImageType } from "@shared/profile";
import {
  EXAM_MIN_QUESTIONS,
  LICENSE_VERSION,
  ModuleType,
  contentMatchesModule,
  contentRule,
  courseReadinessProblems,
  detectContentType,
  isPptMime,
  isPptName,
  PPT_MAX_BYTES,
  isEditableStatus,
  slugify,
  validateCourseInput,
  validateExamSettings,
  validateModuleInput,
  validateQuestionInput,
} from "@shared/course";
import { convertToPdf } from "../lib/office-convert";

const isUuid = (v: unknown): v is string => z.string().uuid().safeParse(v).success;
const REVIEW_ROLES = ["ADMIN_SYSTEM", "DIRECTOR", "SUPERADMIN"];

type CourseRow = typeof courses.$inferSelect;

/** Kursus milik Creator yang sedang login, dan masih boleh diubah (draf/ditolak) bila `needEditable`. */
const loadOwned = async (req: any, res: any, needEditable: boolean): Promise<CourseRow | null> => {
  if (!isUuid(req.params.id)) {
    errorResponse(res, "Kursus tidak ditemukan", 404);
    return null;
  }
  const [course] = await db.select().from(courses).where(eq(courses.id, req.params.id)).limit(1);
  if (!course || course.instructorId !== req.user.id) {
    errorResponse(res, "Kursus tidak ditemukan", 404);
    return null;
  }
  if (needEditable && !isEditableStatus(course.status)) {
    errorResponse(res, "Kursus yang sedang direview atau sudah terbit tidak dapat diubah.", 409);
    return null;
  }
  return course;
};

const loadModule = async (courseId: string, moduleId: unknown) => {
  if (!isUuid(moduleId)) return null;
  const [m] = await db.select().from(courseModules).where(and(eq(courseModules.id, moduleId), eq(courseModules.courseId, courseId))).limit(1);
  return m ?? null;
};

const validCategories = async (ids: string[]): Promise<boolean> => {
  if (ids.length === 0) return true;
  if (!ids.every(isUuid)) return false;
  const rows = await db.select({ id: categories.id }).from(categories).where(inArray(categories.id, ids));
  return rows.length === ids.length;
};

const syncSessions = async (courseId: string, tx: any = db) => {
  await tx
    .update(courses)
    .set({ sessions: sql`(select count(*)::int from academy.course_modules m where m.course_id = ${courseId})`, updatedAt: new Date() })
    .where(eq(courses.id, courseId));
};

// ---------------------------------------------------------------------------
// Kursus
// ---------------------------------------------------------------------------

export const getCreatorCourses = async (req: any, res: any) => {
  try {
    const rows = await db
      .select({
        course: courses,
        studentsEnrolled: sql<number>`(select count(*)::int from academy.enrollments e where e.course_id = ${courseIdRef})`,
        moduleCount: sql<number>`(select count(*)::int from academy.course_modules m where m.course_id = ${courseIdRef})`,
        questionCount: sql<number>`(select count(*)::int from academy.course_exam_questions q where q.course_id = ${courseIdRef})`,
      })
      .from(courses)
      .where(eq(courses.instructorId, req.user.id))
      .orderBy(desc(courses.createdAt));
    successResponse(res, rows.map((r) => ({ ...r.course, studentsEnrolled: r.studentsEnrolled, moduleCount: r.moduleCount, questionCount: r.questionCount })), "Creator Courses");
  } catch (error) {
    errorResponse(res, "Failed to fetch courses", 500, error);
  }
};

export const createCourse = async (req: any, res: any) => {
  try {
    const v = validateCourseInput(req.body ?? {});
    if (!v.ok) return errorResponse(res, v.message, 400);
    if (!(await validCategories(v.value.categoryIds))) return errorResponse(res, "Kategori tidak ditemukan.", 400);
    const [creator] = await db.select({ name: users.name }).from(users).where(eq(users.id, req.user.id)).limit(1);
    const slug = `${slugify(v.value.title)}-${crypto.randomBytes(3).toString("hex")}`;
    const [row] = await db
      .insert(courses)
      .values({ ...v.value, slug, instructorId: req.user.id, instructorName: creator?.name ?? null, status: "DRAFT" })
      .returning();
    successResponse(res, row, "Kursus draf dibuat", 201);
  } catch (error) {
    errorResponse(res, "Gagal membuat kursus", 500, error);
  }
};

export const updateCourse = async (req: any, res: any) => {
  try {
    const course = await loadOwned(req, res, true);
    if (!course) return;
    const v = validateCourseInput(req.body ?? {});
    if (!v.ok) return errorResponse(res, v.message, 400);
    if (!(await validCategories(v.value.categoryIds))) return errorResponse(res, "Kategori tidak ditemukan.", 400);
    const [row] = await db.update(courses).set({ ...v.value, updatedAt: new Date() }).where(eq(courses.id, course.id)).returning();
    successResponse(res, row, "Kursus diperbarui");
  } catch (error) {
    errorResponse(res, "Gagal memperbarui kursus", 500, error);
  }
};

const imageUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: AVATAR_MAX_BYTES, files: 1 } });
export const thumbnailUploadMiddleware = (req: any, res: any, next: any) => {
  imageUpload.single("thumbnail")(req, res, (err: any) => {
    if (!err) return next();
    if (err.code === "LIMIT_FILE_SIZE") return errorResponse(res, "Ukuran thumbnail maksimal 2 MB.", 400);
    return errorResponse(res, "Berkas thumbnail tidak dapat diproses.", 400);
  });
};

export const uploadThumbnail = async (req: any, res: any) => {
  try {
    const course = await loadOwned(req, res, true);
    if (!course) return;
    const file = req.file as { buffer: Buffer } | undefined;
    if (!file || file.buffer.length === 0) return errorResponse(res, "Pilih berkas thumbnail terlebih dahulu.", 400);
    const type = detectImageType(file.buffer);
    if (!type) return errorResponse(res, "Format thumbnail harus JPG, PNG, atau WebP.", 400);
    const url = await putPublic(newThumbnailKey(course.id, type.ext), file.buffer, type.mime);
    await db.update(courses).set({ thumbnail: url, updatedAt: new Date() }).where(eq(courses.id, course.id));
    await removeOldPublicFile("thumbnails", course.id, course.thumbnail);
    successResponse(res, { thumbnail: url }, "Thumbnail diperbarui");
  } catch (error) {
    errorResponse(res, "Gagal menyimpan thumbnail", 500, error);
  }
};

/** Detail kursus: publik hanya bila terbit; pemilik dan admin review boleh melihat semua status. Tanpa kunci berkas dan kunci jawaban. */
export const getCourseDetails = async (req: any, res: any) => {
  try {
    if (!isUuid(req.params.id)) return errorResponse(res, "Kursus tidak ditemukan", 404);
    const [course] = await db.select().from(courses).where(eq(courses.id, req.params.id)).limit(1);
    if (!course) return errorResponse(res, "Kursus tidak ditemukan", 404);

    const session = await checkSession(req);
    const viewer = session.ok ? session.user : null;
    const isOwner = !!viewer && viewer.id === course.instructorId;
    const isReviewer = !!viewer && REVIEW_ROLES.includes(viewer.role);
    if (course.status !== "PUBLISHED" && !isOwner && !isReviewer) return errorResponse(res, "Kursus tidak ditemukan", 404);

    const mods = await db.select().from(courseModules).where(eq(courseModules.courseId, course.contentSourceId ?? course.id)).orderBy(asc(courseModules.position));
    const [q] = await db.select({ n: count() }).from(courseExamQuestions).where(eq(courseExamQuestions.courseId, course.id));
    const [enr] = await db.select({ n: count() }).from(enrollments).where(eq(enrollments.courseId, course.id));
    let enrolled = false;
    if (viewer) {
      const [mine] = await db.select({ id: enrollments.id }).from(enrollments).where(and(eq(enrollments.courseId, course.id), eq(enrollments.userId, viewer.id))).limit(1);
      enrolled = !!mine;
    }

    const { reviewedBy: _rb, reviewNote, ...pub } = course;
    const auto = (await autoDiscountMap([course.id])).get(course.id);
    successResponse(
      res,
      {
        ...pub,
        pricing: { basePrice: course.price, discountPercent: auto?.percent ?? 0, discountEndsAt: auto?.endsAt ?? null, finalPrice: applyPercent(course.price, auto?.percent ?? 0) },
        ...(isOwner || isReviewer ? { reviewNote } : {}),
        studentsEnrolled: Number(enr?.n ?? 0),
        enrolled,
        exam: { enabled: course.examEnabled, passingGrade: course.examPassingGrade, durationMinutes: course.examDurationMinutes, questionCount: Number(q?.n ?? 0) },
        modules: mods.map((m) => ({
          id: m.id,
          position: m.position,
          title: m.title,
          description: m.description,
          type: m.type,
          isFreePreview: m.isFreePreview,
          hasContent: m.type === "TEXT" ? !!m.textContent : !!m.contentKey,
        })),
      },
      "Course details",
    );
  } catch (error) {
    errorResponse(res, "Failed to fetch course details", 500, error);
  }
};

// ---------------------------------------------------------------------------
// Modul
// ---------------------------------------------------------------------------

export const addModule = async (req: any, res: any) => {
  try {
    const course = await loadOwned(req, res, true);
    if (!course) return;
    const v = validateModuleInput(req.body ?? {});
    if (!v.ok) return errorResponse(res, v.message, 400);
    const row = await db.transaction(async (tx) => {
      const [mx] = await tx.select({ m: sql<number>`coalesce(max(${courseModules.position}), 0)` }).from(courseModules).where(eq(courseModules.courseId, course.id));
      const [m] = await tx
        .insert(courseModules)
        .values({ courseId: course.id, position: Number(mx?.m ?? 0) + 1, title: v.value.title, description: v.value.description || null, type: v.value.type, textContent: v.value.textContent, isFreePreview: v.value.isFreePreview })
        .returning();
      await syncSessions(course.id, tx);
      return m;
    });
    successResponse(res, row, "Modul ditambahkan", 201);
  } catch (error) {
    errorResponse(res, "Gagal menambah modul", 500, error);
  }
};

export const updateModule = async (req: any, res: any) => {
  try {
    const course = await loadOwned(req, res, true);
    if (!course) return;
    const mod = await loadModule(course.id, req.params.mid);
    if (!mod) return errorResponse(res, "Modul tidak ditemukan", 404);
    const v = validateModuleInput({ ...req.body, type: mod.type }); // jenis modul tidak bisa diubah; buat modul baru
    if (!v.ok) return errorResponse(res, v.message, 400);
    const [row] = await db
      .update(courseModules)
      .set({ title: v.value.title, description: v.value.description || null, textContent: mod.type === "TEXT" ? v.value.textContent : null, isFreePreview: v.value.isFreePreview, updatedAt: new Date() })
      .where(eq(courseModules.id, mod.id))
      .returning();
    successResponse(res, row, "Modul diperbarui");
  } catch (error) {
    errorResponse(res, "Gagal memperbarui modul", 500, error);
  }
};

export const deleteModule = async (req: any, res: any) => {
  try {
    const course = await loadOwned(req, res, true);
    if (!course) return;
    const mod = await loadModule(course.id, req.params.mid);
    if (!mod) return errorResponse(res, "Modul tidak ditemukan", 404);
    await db.transaction(async (tx) => {
      await tx.delete(courseModules).where(eq(courseModules.id, mod.id));
      await tx.update(courseModules).set({ position: sql`${courseModules.position} - 1` }).where(and(eq(courseModules.courseId, course.id), sql`${courseModules.position} > ${mod.position}`));
      await syncSessions(course.id, tx);
    });
    if (mod.contentKey) await deletePrivate(mod.contentKey);
    successResponse(res, null, "Modul dihapus");
  } catch (error) {
    errorResponse(res, "Gagal menghapus modul", 500, error);
  }
};

export const reorderModules = async (req: any, res: any) => {
  try {
    const course = await loadOwned(req, res, true);
    if (!course) return;
    const ids: unknown = req.body?.ids;
    if (!Array.isArray(ids) || !ids.every(isUuid)) return errorResponse(res, "Urutan tidak valid.", 400);
    await db.transaction(async (tx) => {
      const current = await tx.select({ id: courseModules.id }).from(courseModules).where(eq(courseModules.courseId, course.id)).for("update");
      const a = new Set(current.map((c) => c.id));
      if (ids.length !== a.size || new Set(ids).size !== ids.length || !ids.every((i) => a.has(i))) throw new Error("URUTAN_TIDAK_SAMA");
      for (let i = 0; i < ids.length; i += 1) {
        await tx.update(courseModules).set({ position: i + 1 }).where(eq(courseModules.id, ids[i]));
      }
    });
    successResponse(res, null, "Urutan modul disimpan");
  } catch (error: any) {
    if (error?.message === "URUTAN_TIDAK_SAMA") return errorResponse(res, "Daftar modul tidak sama dengan yang tersimpan. Muat ulang halaman.", 409);
    errorResponse(res, "Gagal menyimpan urutan", 500, error);
  }
};

// --- Unggah berkas modul (video/PDF) ke bucket private ---

const KEY_RE = (courseId: string, moduleId: string) => new RegExp(`^courses/${courseId}/${moduleId}-[0-9a-f]{16}\\.(mp4|webm|pdf)$`);
const extOfMime = (mime: string): string => (mime === "video/mp4" ? "mp4" : mime === "video/webm" ? "webm" : "pdf");

const maxBytesFor = async (type: ModuleType, direct: boolean): Promise<number> => {
  const rule = contentRule(type);
  if (!rule) return 0;
  // Lewat server dibatasi nginx (max_upload_mb); langsung ke R2 mengikuti batas jenis berkas.
  return direct ? rule.maxBytes : Math.min(rule.maxBytes, (await getConfigInt("max_upload_mb")) * 1024 * 1024);
};

const initSchema = z.object({ mime: z.string().max(100), size: z.number().int().positive() });

export const uploadInit = async (req: any, res: any) => {
  try {
    const course = await loadOwned(req, res, true);
    if (!course) return;
    const mod = await loadModule(course.id, req.params.mid);
    if (!mod) return errorResponse(res, "Modul tidak ditemukan", 404);
    const rule = contentRule(mod.type as ModuleType);
    if (!rule) return errorResponse(res, "Modul teks tidak memiliki berkas.", 400);
    const p = initSchema.safeParse(req.body);
    if (!p.success) return errorResponse(res, "Data berkas tidak valid.", 400);
    // PPT/PPTX pada modul PDF: unggah lewat server (mode server) agar dapat dikonversi ke PDF.
    if (mod.type === "PDF" && isPptMime(p.data.mime)) {
      if (p.data.size > PPT_MAX_BYTES) return errorResponse(res, `Ukuran PPT maksimal ${Math.round(PPT_MAX_BYTES / 1024 / 1024)} MB.`, 400);
      return successResponse(res, { mode: "server", key: "", maxBytes: PPT_MAX_BYTES, url: `/api/courses/${course.id}/modules/${mod.id}/upload` }, "Siap diunggah — PPT akan dikonversi ke PDF.");
    }
    if (!rule.mimes.includes(p.data.mime)) return errorResponse(res, `Format harus ${rule.mimes.map(extOfMime).join(" atau ").toUpperCase()}.`, 400);

    const key = `courses/${course.id}/${mod.id}-${crypto.randomBytes(8).toString("hex")}.${extOfMime(p.data.mime)}`;
    const target = await privateUploadTarget(key, p.data.mime);
    const max = await maxBytesFor(mod.type as ModuleType, target.mode === "direct");
    if (p.data.size > max) return errorResponse(res, `Ukuran berkas maksimal ${Math.round(max / 1024 / 1024)} MB.`, 400);
    successResponse(res, { ...target, key, maxBytes: max, ...(target.mode === "server" ? { url: `/api/courses/${course.id}/modules/${mod.id}/upload` } : {}) }, "Siap diunggah");
  } catch (error) {
    errorResponse(res, "Gagal menyiapkan unggahan", 500, error);
  }
};

/** Menyimpan berkas yang sudah ada di bucket sebagai isi modul, setelah jenis dan ukurannya diperiksa. */
const attachContent = async (mod: typeof courseModules.$inferSelect, key: string, res: any): Promise<boolean> => {
  const info = await inspectPrivate(key);
  if (!info) {
    errorResponse(res, "Berkas belum ditemukan di penyimpanan. Ulangi unggahan.", 400);
    return false;
  }
  const detected = detectContentType(info.head);
  const direct = true;
  const max = await maxBytesFor(mod.type as ModuleType, direct);
  if (!contentMatchesModule(mod.type as ModuleType, detected) || !detected || info.size > max || info.size === 0) {
    await deletePrivate(key);
    errorResponse(res, "Isi berkas tidak sesuai jenis modul atau melebihi batas ukuran.", 400);
    return false;
  }
  await db.update(courseModules).set({ contentKey: key, contentMime: detected.mime, contentSize: info.size, updatedAt: new Date() }).where(eq(courseModules.id, mod.id));
  if (mod.contentKey && mod.contentKey !== key) await deletePrivate(mod.contentKey);
  return true;
};

export const uploadComplete = async (req: any, res: any) => {
  try {
    const course = await loadOwned(req, res, true);
    if (!course) return;
    const mod = await loadModule(course.id, req.params.mid);
    if (!mod) return errorResponse(res, "Modul tidak ditemukan", 404);
    const key = typeof req.body?.key === "string" ? req.body.key : "";
    if (!KEY_RE(course.id, mod.id).test(key)) return errorResponse(res, "Kunci berkas tidak valid.", 400);
    if (await attachContent(mod, key, res)) successResponse(res, null, "Berkas modul tersimpan");
  } catch (error) {
    errorResponse(res, "Gagal menyimpan berkas modul", 500, error);
  }
};

/** Mode server (driver local): batas ukuran mengikuti Konfigurasi Sistem, dibaca per unggahan. */
export const moduleFileMiddleware = async (req: any, res: any, next: any) => {
  try {
    const maxMb = await getConfigInt("max_upload_mb");
    multer({ storage: multer.memoryStorage(), limits: { fileSize: maxMb * 1024 * 1024, files: 1 } }).single("file")(req, res, (err: any) => {
      if (!err) return next();
      if (err.code === "LIMIT_FILE_SIZE") return errorResponse(res, `Ukuran berkas melebihi batas ${maxMb} MB`, 413);
      return errorResponse(res, "Berkas tidak dapat diproses.", 400);
    });
  } catch (error) {
    next(error);
  }
};

export const uploadModuleFile = async (req: any, res: any) => {
  try {
    const course = await loadOwned(req, res, true);
    if (!course) return;
    const mod = await loadModule(course.id, req.params.mid);
    if (!mod) return errorResponse(res, "Modul tidak ditemukan", 404);
    const rule = contentRule(mod.type as ModuleType);
    if (!rule) return errorResponse(res, "Modul teks tidak memiliki berkas.", 400);
    const file = req.file as { buffer: Buffer; originalname?: string; mimetype?: string } | undefined;
    if (!file || file.buffer.length === 0) return errorResponse(res, "Pilih berkas terlebih dahulu.", 400);
    let buffer = file.buffer;
    // Modul PDF menerima PPT/PPTX: konversi ke PDF di server sebelum disimpan.
    if (mod.type === "PDF" && (isPptMime(file.mimetype ?? "") || isPptName(file.originalname ?? ""))) {
      try {
        buffer = await convertToPdf(file.buffer, file.originalname ?? "slide.pptx");
      } catch (e) {
        return errorResponse(res, "Gagal mengonversi PPT ke PDF. Pastikan LibreOffice terpasang di server.", 400, e);
      }
    }
    const detected = detectContentType(buffer);
    if (!detected || !contentMatchesModule(mod.type as ModuleType, detected)) return errorResponse(res, "Isi berkas tidak sesuai jenis modul.", 400);
    const key = `courses/${course.id}/${mod.id}-${crypto.randomBytes(8).toString("hex")}.${detected.ext}`;
    await putPrivate(key, buffer, detected.mime);
    if (await attachContent(mod, key, res)) successResponse(res, null, "Berkas modul tersimpan");
  } catch (error) {
    errorResponse(res, "Gagal menyimpan berkas modul", 500, error);
  }
};

/** Boleh membuka isi modul: pemilik, admin review, peserta terdaftar, atau modul pratinjau gratis pada kursus terbit. */
const canOpenModule = async (viewer: { id: string; role: string }, course: CourseRow, mod: typeof courseModules.$inferSelect): Promise<boolean> => {
  if (viewer.id === course.instructorId || REVIEW_ROLES.includes(viewer.role)) return true;
  if (course.status === "PUBLISHED" && mod.isFreePreview) return true;
  const [e] = await db.select({ id: enrollments.id }).from(enrollments).where(and(eq(enrollments.courseId, course.id), eq(enrollments.userId, viewer.id))).limit(1);
  if (e) return true;
  // Mentor pengampu workshop boleh membuka materinya.
  if (course.type === "WORKSHOP") {
    const [m] = await db.select({ id: mentorClasses.id }).from(mentorClasses).where(and(eq(mentorClasses.courseId, course.id), eq(mentorClasses.mentorId, viewer.id))).limit(1);
    return !!m;
  }
  return false;
};

const loadModuleForViewer = async (req: any, res: any) => {
  if (!isUuid(req.params.id)) { errorResponse(res, "Modul tidak ditemukan", 404); return null; }
  const [course] = await db.select().from(courses).where(eq(courses.id, req.params.id)).limit(1);
  // Kursus WORKSHOP: modul berasal dari kursus sumber, hak akses tetap dinilai pada kursus yang diminta.
  const mod = course ? await loadModule(course.contentSourceId ?? course.id, req.params.mid) : null;
  if (!course || !mod || !(await canOpenModule(req.user, course, mod))) { errorResponse(res, "Modul tidak ditemukan", 404); return null; }
  return { course, mod };
};

/** Mengembalikan cara membuka isi modul. Video/PDF: URL (bertanda tangan bila R2); teks: isinya. */
export const getModuleContent = async (req: any, res: any) => {
  try {
    const ctx = await loadModuleForViewer(req, res);
    if (!ctx) return;
    const { course, mod } = ctx;
    if (mod.type === "TEXT") return successResponse(res, { type: "TEXT", text: mod.textContent ?? "" }, "Isi modul");
    if (!mod.contentKey || !mod.contentMime) return errorResponse(res, "Modul ini belum memiliki berkas.", 404);
    const access = await privateAccess(mod.contentKey, mod.contentMime, 3600);
    const url = access.type === "redirect" ? access.url : `/api/courses/${course.id}/modules/${mod.id}/file`;
    res.setHeader("Cache-Control", "private, no-store");
    successResponse(res, { type: mod.type, mime: mod.contentMime, url }, "Isi modul");
  } catch (error) {
    errorResponse(res, "Gagal membuka modul", 500, error);
  }
};

/** Streaming berkas untuk driver local (mendukung Range untuk video). */
export const streamModuleFile = async (req: any, res: any) => {
  try {
    const ctx = await loadModuleForViewer(req, res);
    if (!ctx) return;
    const { mod } = ctx;
    if (!mod.contentKey || !mod.contentMime) return errorResponse(res, "Modul ini belum memiliki berkas.", 404);
    const access = await privateAccess(mod.contentKey, mod.contentMime);
    if (access.type === "redirect") return res.redirect(302, access.url);
    res.setHeader("Content-Type", mod.contentMime);
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Content-Disposition", "inline");
    res.sendFile(access.path, (err: any) => {
      if (err && !res.headersSent) errorResponse(res, "Berkas tidak tersedia", 404);
    });
  } catch (error) {
    errorResponse(res, "Gagal membuka berkas", 500, error);
  }
};

// ---------------------------------------------------------------------------
// Ujian
// ---------------------------------------------------------------------------

/** Pengaturan dan soal lengkap (dengan kunci jawaban) hanya untuk pemilik. */
export const getExam = async (req: any, res: any) => {
  try {
    const course = await loadOwned(req, res, false);
    if (!course) return;
    const questions = await db.select().from(courseExamQuestions).where(eq(courseExamQuestions.courseId, course.id)).orderBy(asc(courseExamQuestions.position));
    successResponse(res, { enabled: course.examEnabled, passingGrade: course.examPassingGrade, durationMinutes: course.examDurationMinutes, minQuestions: EXAM_MIN_QUESTIONS, questions }, "Ujian kursus");
  } catch (error) {
    errorResponse(res, "Gagal memuat ujian", 500, error);
  }
};

export const updateExam = async (req: any, res: any) => {
  try {
    const course = await loadOwned(req, res, true);
    if (!course) return;
    const v = validateExamSettings(req.body ?? {});
    if (!v.ok) return errorResponse(res, v.message, 400);
    await db.update(courses).set({ examEnabled: v.value.enabled, examPassingGrade: v.value.passingGrade, examDurationMinutes: v.value.durationMinutes, updatedAt: new Date() }).where(eq(courses.id, course.id));
    successResponse(res, null, "Pengaturan ujian disimpan");
  } catch (error) {
    errorResponse(res, "Gagal menyimpan pengaturan ujian", 500, error);
  }
};

export const addQuestion = async (req: any, res: any) => {
  try {
    const course = await loadOwned(req, res, true);
    if (!course) return;
    const v = validateQuestionInput(req.body ?? {});
    if (!v.ok) return errorResponse(res, v.message, 400);
    const row = await db.transaction(async (tx) => {
      const [mx] = await tx.select({ m: sql<number>`coalesce(max(${courseExamQuestions.position}), 0)` }).from(courseExamQuestions).where(eq(courseExamQuestions.courseId, course.id));
      const [q] = await tx.insert(courseExamQuestions).values({ courseId: course.id, position: Number(mx?.m ?? 0) + 1, ...v.value }).returning();
      return q;
    });
    successResponse(res, row, "Soal ditambahkan", 201);
  } catch (error) {
    errorResponse(res, "Gagal menambah soal", 500, error);
  }
};

const loadQuestion = async (courseId: string, qid: unknown) => {
  if (!isUuid(qid)) return null;
  const [q] = await db.select().from(courseExamQuestions).where(and(eq(courseExamQuestions.id, qid), eq(courseExamQuestions.courseId, courseId))).limit(1);
  return q ?? null;
};

export const updateQuestion = async (req: any, res: any) => {
  try {
    const course = await loadOwned(req, res, true);
    if (!course) return;
    const q = await loadQuestion(course.id, req.params.qid);
    if (!q) return errorResponse(res, "Soal tidak ditemukan", 404);
    const v = validateQuestionInput(req.body ?? {});
    if (!v.ok) return errorResponse(res, v.message, 400);
    const [row] = await db.update(courseExamQuestions).set(v.value).where(eq(courseExamQuestions.id, q.id)).returning();
    successResponse(res, row, "Soal diperbarui");
  } catch (error) {
    errorResponse(res, "Gagal memperbarui soal", 500, error);
  }
};

export const deleteQuestion = async (req: any, res: any) => {
  try {
    const course = await loadOwned(req, res, true);
    if (!course) return;
    const q = await loadQuestion(course.id, req.params.qid);
    if (!q) return errorResponse(res, "Soal tidak ditemukan", 404);
    await db.transaction(async (tx) => {
      await tx.delete(courseExamQuestions).where(eq(courseExamQuestions.id, q.id));
      await tx.update(courseExamQuestions).set({ position: sql`${courseExamQuestions.position} - 1` }).where(and(eq(courseExamQuestions.courseId, course.id), sql`${courseExamQuestions.position} > ${q.position}`));
    });
    successResponse(res, null, "Soal dihapus");
  } catch (error) {
    errorResponse(res, "Gagal menghapus soal", 500, error);
  }
};

// ---------------------------------------------------------------------------
// Ajukan terbit dan review Admin
// ---------------------------------------------------------------------------

export const requestPublish = async (req: any, res: any) => {
  try {
    const course = await loadOwned(req, res, true);
    if (!course) return;
    if (!(await requireAcceptance(req, res, "CREATOR_AGREEMENT"))) return;
    const accept = req.body?.acceptLicense === true;

    const result = await db.transaction(async (tx) => {
      const [c] = await tx.select().from(courses).where(eq(courses.id, course.id)).for("update").limit(1);
      if (!c || !isEditableStatus(c.status)) return { code: 409 as const, message: "Kursus sedang direview atau sudah terbit." };
      const mods = await tx.select().from(courseModules).where(eq(courseModules.courseId, c.id));
      const [q] = await tx.select({ n: count() }).from(courseExamQuestions).where(eq(courseExamQuestions.courseId, c.id));
      const problems = courseReadinessProblems({
        title: c.title,
        description: c.description ?? "",
        modules: mods.map((m) => ({ type: m.type, hasContent: m.type === "TEXT" ? !!m.textContent : !!m.contentKey })),
        examEnabled: c.examEnabled,
        questionCount: Number(q?.n ?? 0),
        licenseAccepted: accept || !!c.licenseAcceptedAt,
      });
      if (problems.length > 0) return { code: 400 as const, message: "Kursus belum siap diajukan.", problems };
      const now = new Date();
      await tx.update(courses).set({ status: "PENDING_REVIEW", submittedAt: now, reviewNote: null, licenseAcceptedAt: c.licenseAcceptedAt ?? now, licenseVersion: c.licenseVersion ?? LICENSE_VERSION, sessions: mods.length, updatedAt: now }).where(eq(courses.id, c.id));
      const admins = await tx.select({ id: users.id }).from(users).where(eq(users.role, "ADMIN_SYSTEM"));
      for (const a of admins) await notifyUser(tx, a.id, "Kursus menunggu review", `"${c.title}" diajukan untuk terbit. Tinjau di menu Review Kursus.`, "ADMIN");
      return { code: 200 as const, message: "Kursus diajukan. Admin akan meninjau sebelum terbit." };
    });

    if (result.code === 400) return res.status(400).json({ success: false, message: result.message, problems: result.problems });
    if (result.code !== 200) return errorResponse(res, result.message, result.code);
    successResponse(res, null, result.message);
  } catch (error) {
    errorResponse(res, "Gagal mengajukan kursus", 500, error);
  }
};

export const listCourseReviews = async (req: any, res: any) => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : "PENDING_REVIEW";
    if (!["PENDING_REVIEW", "PUBLISHED", "REJECTED", "ALL"].includes(status)) return errorResponse(res, "Status tidak valid", 400);
    const rows = await db
      .select({
        id: courses.id, title: courses.title, status: courses.status, price: courses.price, type: courses.type, submittedAt: courses.submittedAt,
        reviewedAt: courses.reviewedAt, reviewNote: courses.reviewNote, instructorName: courses.instructorName, thumbnail: courses.thumbnail,
        description: courses.description, examEnabled: courses.examEnabled,
        moduleCount: sql<number>`(select count(*)::int from academy.course_modules m where m.course_id = ${courseIdRef})`,
        questionCount: sql<number>`(select count(*)::int from academy.course_exam_questions q where q.course_id = ${courseIdRef})`,
      })
      .from(courses)
      .where(status === "ALL" ? sql`${courses.status} <> 'DRAFT'` : eq(courses.status, status as any))
      .orderBy(desc(courses.submittedAt))
      .limit(200);
    successResponse(res, rows, "Daftar review kursus");
  } catch (error) {
    errorResponse(res, "Gagal memuat review kursus", 500, error);
  }
};

const decisionSchema = z.object({ decision: z.enum(["APPROVE", "REJECT"]), note: z.string().max(500).optional() });

export const decideCourseReview = async (req: any, res: any) => {
  try {
    if (!isUuid(req.params.id)) return errorResponse(res, "Kursus tidak ditemukan", 404);
    const p = decisionSchema.safeParse(req.body);
    if (!p.success) return errorResponse(res, "Keputusan tidak valid", 400);
    const note = (p.data.note ?? "").trim();
    if (p.data.decision === "REJECT" && note.length < 10) return errorResponse(res, "Catatan penolakan wajib diisi, minimal 10 karakter.", 400);

    const result = await db.transaction(async (tx) => {
      const [c] = await tx.select().from(courses).where(eq(courses.id, req.params.id)).for("update").limit(1);
      if (!c) return { code: 404 as const, message: "Kursus tidak ditemukan" };
      if (c.status !== "PENDING_REVIEW") return { code: 409 as const, message: "Kursus ini tidak sedang menunggu review." };
      const now = new Date();
      const approve = p.data.decision === "APPROVE";
      await tx.update(courses).set({ status: approve ? "PUBLISHED" : "REJECTED", reviewedBy: req.user.id, reviewedAt: now, reviewNote: note || null, updatedAt: now }).where(eq(courses.id, c.id));
      if (c.instructorId) {
        await notifyUser(tx, c.instructorId, approve ? "Kursus Anda terbit" : "Kursus Anda ditolak", approve ? `"${c.title}" kini tampil di katalog.${note ? ` Catatan: ${note}` : ""}` : `"${c.title}" ditolak. Catatan: ${note}`, "BELAJAR");
      }
      return { code: 200 as const, message: approve ? "Kursus diterbitkan" : "Kursus ditolak" };
    });
    if (result.code !== 200) return errorResponse(res, result.message, result.code);
    console.info(`[kursus] review ${p.data.decision} courseId=${req.params.id} oleh=${req.user.id}`);
    successResponse(res, null, result.message);
  } catch (error) {
    errorResponse(res, "Gagal memproses review", 500, error);
  }
};
