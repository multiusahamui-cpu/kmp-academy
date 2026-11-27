// Aturan kursus, modul, dan ujian. Dipakai server (penegakan) dan klien (pesan di formulir).

export const COURSE_TYPES = ["MANDIRI", "WORKSHOP", "CERTIFICATION"] as const;
export const MODULE_TYPES = ["VIDEO", "PDF", "TEXT"] as const;
export type ModuleType = (typeof MODULE_TYPES)[number];

export const TITLE_MIN = 5;
export const TITLE_MAX = 150;
export const DESC_MIN = 30;
export const DESC_MAX = 5000;
export const PRICE_MAX = 100_000_000;
export const MAX_CATEGORIES = 3;
export const MODULE_TITLE_MIN = 3;
export const MODULE_TITLE_MAX = 150;
export const MODULE_DESC_MAX = 1000;
export const MODULE_TEXT_MAX = 20000;
export const QUESTION_MAX = 500;
export const OPTION_MAX = 200;
export const EXAM_MIN_QUESTIONS = 3; // syarat ajukan terbit bila ujian diaktifkan
export const LICENSE_VERSION = "v1";
export const VIDEO_MAX_BYTES = 500 * 1024 * 1024;
export const PDF_MAX_BYTES = 50 * 1024 * 1024;

type Result<T> = { ok: true; value: T } | { ok: false; message: string };
const fail = (message: string): { ok: false; message: string } => ({ ok: false, message });

/** Kursus hanya bisa diubah Creator saat masih draf atau ditolak. */
export const isEditableStatus = (status: string): boolean => status === "DRAFT" || status === "REJECTED";

export const slugify = (title: string): string =>
  title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "kursus";

export interface CourseInput {
  title: string;
  description: string;
  price: number;
  type: (typeof COURSE_TYPES)[number];
  categoryIds: string[];
}

export const validateCourseInput = (raw: Record<string, unknown>): Result<CourseInput> => {
  const title = typeof raw.title === "string" ? raw.title.trim().replace(/\s+/g, " ") : "";
  if (title.length < TITLE_MIN) return fail(`Judul minimal ${TITLE_MIN} karakter.`);
  if (title.length > TITLE_MAX) return fail(`Judul maksimal ${TITLE_MAX} karakter.`);
  const description = typeof raw.description === "string" ? raw.description.trim() : "";
  if (description.length < DESC_MIN) return fail(`Deskripsi minimal ${DESC_MIN} karakter.`);
  if (description.length > DESC_MAX) return fail(`Deskripsi maksimal ${DESC_MAX} karakter.`);
  const price = typeof raw.price === "number" ? raw.price : Number(raw.price ?? 0);
  if (!Number.isInteger(price) || price < 0 || price > PRICE_MAX) return fail("Harga harus bilangan bulat rupiah 0 atau lebih.");
  const type = raw.type;
  if (typeof type !== "string" || !(COURSE_TYPES as readonly string[]).includes(type)) return fail("Tipe kursus tidak valid.");
  const cats = raw.categoryIds ?? [];
  if (!Array.isArray(cats) || cats.some((c) => typeof c !== "string")) return fail("Kategori tidak valid.");
  const categoryIds = [...new Set(cats as string[])];
  if (categoryIds.length > MAX_CATEGORIES) return fail(`Pilih maksimal ${MAX_CATEGORIES} kategori.`);
  return { ok: true, value: { title, description, price, type: type as CourseInput["type"], categoryIds } };
};

export interface ModuleInput {
  title: string;
  description: string;
  type: ModuleType;
  textContent: string | null;
  isFreePreview: boolean;
}

export const validateModuleInput = (raw: Record<string, unknown>): Result<ModuleInput> => {
  const title = typeof raw.title === "string" ? raw.title.trim().replace(/\s+/g, " ") : "";
  if (title.length < MODULE_TITLE_MIN) return fail(`Judul modul minimal ${MODULE_TITLE_MIN} karakter.`);
  if (title.length > MODULE_TITLE_MAX) return fail(`Judul modul maksimal ${MODULE_TITLE_MAX} karakter.`);
  const description = typeof raw.description === "string" ? raw.description.trim() : "";
  if (description.length > MODULE_DESC_MAX) return fail(`Deskripsi modul maksimal ${MODULE_DESC_MAX} karakter.`);
  const type = raw.type;
  if (typeof type !== "string" || !(MODULE_TYPES as readonly string[]).includes(type)) return fail("Jenis modul tidak valid.");
  let textContent: string | null = null;
  if (type === "TEXT") {
    textContent = typeof raw.textContent === "string" ? raw.textContent.trim() : "";
    if (textContent.length < 1) return fail("Isi modul teks wajib diisi.");
    if (textContent.length > MODULE_TEXT_MAX) return fail(`Isi modul teks maksimal ${MODULE_TEXT_MAX} karakter.`);
  }
  return { ok: true, value: { title, description, type: type as ModuleType, textContent, isFreePreview: raw.isFreePreview === true } };
};

export interface ExamSettings {
  enabled: boolean;
  passingGrade: number;
  durationMinutes: number;
}

export const validateExamSettings = (raw: Record<string, unknown>): Result<ExamSettings> => {
  const passingGrade = Number(raw.passingGrade);
  if (!Number.isInteger(passingGrade) || passingGrade < 1 || passingGrade > 100) return fail("Nilai lulus harus 1-100.");
  const durationMinutes = Number(raw.durationMinutes);
  if (!Number.isInteger(durationMinutes) || durationMinutes < 5 || durationMinutes > 240) return fail("Durasi ujian harus 5-240 menit.");
  return { ok: true, value: { enabled: raw.enabled === true, passingGrade, durationMinutes } };
};

export interface QuestionInput {
  question: string;
  options: string[];
  correctIndex: number;
}

export const validateQuestionInput = (raw: Record<string, unknown>): Result<QuestionInput> => {
  const question = typeof raw.question === "string" ? raw.question.trim() : "";
  if (question.length < 5) return fail("Pertanyaan minimal 5 karakter.");
  if (question.length > QUESTION_MAX) return fail(`Pertanyaan maksimal ${QUESTION_MAX} karakter.`);
  const opts = raw.options;
  if (!Array.isArray(opts) || opts.length !== 4 || opts.some((o) => typeof o !== "string")) return fail("Harus ada tepat 4 pilihan jawaban.");
  const options = (opts as string[]).map((o) => o.trim());
  if (options.some((o) => o.length === 0)) return fail("Semua pilihan jawaban wajib diisi.");
  if (options.some((o) => o.length > OPTION_MAX)) return fail(`Pilihan jawaban maksimal ${OPTION_MAX} karakter.`);
  if (new Set(options.map((o) => o.toLowerCase())).size !== 4) return fail("Pilihan jawaban tidak boleh ada yang sama.");
  const correctIndex = Number(raw.correctIndex);
  if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 3) return fail("Jawaban benar tidak valid.");
  return { ok: true, value: { question, options, correctIndex } };
};

export interface ReadinessInput {
  title: string;
  description: string;
  modules: { type: string; hasContent: boolean }[];
  examEnabled: boolean;
  questionCount: number;
  licenseAccepted: boolean;
}

/** Daftar masalah yang menghalangi pengajuan terbit; kosong = siap. */
export const courseReadinessProblems = (c: ReadinessInput): string[] => {
  const problems: string[] = [];
  if (c.title.trim().length < TITLE_MIN) problems.push("Judul kursus belum valid.");
  if (c.description.trim().length < DESC_MIN) problems.push("Deskripsi kursus belum memenuhi syarat.");
  if (c.modules.length === 0) problems.push("Tambahkan minimal satu modul.");
  const empty = c.modules.filter((m) => !m.hasContent).length;
  if (empty > 0) problems.push(`${empty} modul belum memiliki isi (unggah berkas atau isi teks).`);
  if (c.examEnabled && c.questionCount < EXAM_MIN_QUESTIONS) problems.push(`Ujian aktif membutuhkan minimal ${EXAM_MIN_QUESTIONS} soal.`);
  if (!c.licenseAccepted) problems.push("Setujui perjanjian lisensi konten.");
  return problems;
};

export interface ContentRule {
  mimes: string[];
  maxBytes: number;
}
export const contentRule = (type: ModuleType): ContentRule | null => {
  if (type === "VIDEO") return { mimes: ["video/mp4", "video/webm"], maxBytes: VIDEO_MAX_BYTES };
  if (type === "PDF") return { mimes: ["application/pdf"], maxBytes: PDF_MAX_BYTES };
  return null; // TEXT tidak punya berkas
};

// PPT/PPTX diterima pada modul PDF lalu dikonversi ke PDF di server (LibreOffice).
export const PPT_MIMES = [
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];
export const PPT_MAX_BYTES = PDF_MAX_BYTES;
export const isPptMime = (mime: string): boolean => PPT_MIMES.includes(mime);
export const isPptName = (name: string): boolean => /\.(ppt|pptx)$/i.test(name);

export type DetectedContent = { ext: "mp4" | "webm" | "pdf"; mime: string };

/** Mengenali berkas materi dari beberapa byte pertama (bukan dari nama atau Content-Type kiriman klien). */
export const detectContentType = (head: Uint8Array): DetectedContent | null => {
  const ascii = (from: number, text: string): boolean =>
    head.length >= from + text.length && [...text].every((ch, i) => head[from + i] === ch.charCodeAt(0));
  if (ascii(0, "%PDF-")) return { ext: "pdf", mime: "application/pdf" };
  if (head.length >= 4 && head[0] === 0x1a && head[1] === 0x45 && head[2] === 0xdf && head[3] === 0xa3) return { ext: "webm", mime: "video/webm" };
  if (ascii(4, "ftyp")) return { ext: "mp4", mime: "video/mp4" };
  return null;
};

/** Jenis hasil deteksi harus cocok dengan jenis modul. */
export const contentMatchesModule = (type: ModuleType, detected: DetectedContent | null): boolean =>
  detected !== null && ((type === "VIDEO" && (detected.ext === "mp4" || detected.ext === "webm")) || (type === "PDF" && detected.ext === "pdf"));
