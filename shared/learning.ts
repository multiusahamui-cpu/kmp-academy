// Logika murni ruang belajar, ujian, dan sertifikat. Dipakai server dan dites tanpa database.
import { generateCode } from "./pricing";

export const EXAM_MAX_ATTEMPTS = 3;
/** Toleransi keterlambatan kirim jawaban (jaringan lambat); lewat dari ini ujian dianggap kedaluwarsa. */
export const EXAM_GRACE_SECONDS = 30;

export type CertificateKind = "EXAM" | "COMPLETION" | "PARTICIPATION";

/** Persen selesai. 100 hanya bila semua modul selesai; sebelumnya paling tinggi 99 dan paling rendah 1 bila ada yang selesai. */
export const progressPercent = (done: number, total: number): number => {
  if (total <= 0 || done <= 0) return 0;
  if (done >= total) return 100;
  return Math.min(99, Math.max(1, Math.round((done / total) * 100)));
};

/**
 * Jenis sertifikat yang berlaku untuk sebuah kursus.
 * CERTIFICATION: sertifikat keikutsertaan saat semua modul selesai (ujian profesi dilakukan lembaga lain).
 * Selain itu: bila ada ujian, terbit saat lulus (EXAM); bila tidak, terbit saat semua modul selesai (COMPLETION).
 */
export const certificateKindFor = (courseType: string, examEnabled: boolean): CertificateKind => {
  if (courseType === "CERTIFICATION") return "PARTICIPATION";
  return examEnabled ? "EXAM" : "COMPLETION";
};

export interface EligibilityInput {
  courseType: string;
  examEnabled: boolean;
  progress: number;
  attemptsUsed: number;
  hasOpenAttempt: boolean;
  passed: boolean;
  questionCount: number;
  minQuestions: number;
}

export const examEligibility = (i: EligibilityInput): { eligible: boolean; reason: string | null } => {
  if (i.courseType === "CERTIFICATION" || !i.examEnabled) return { eligible: false, reason: "Kursus ini tidak memiliki ujian." };
  if (i.passed) return { eligible: false, reason: "Anda sudah lulus ujian kursus ini." };
  if (i.hasOpenAttempt) return { eligible: true, reason: null };
  if (i.progress < 100) return { eligible: false, reason: "Selesaikan semua modul terlebih dahulu." };
  if (i.attemptsUsed >= EXAM_MAX_ATTEMPTS) return { eligible: false, reason: "Kesempatan ujian sudah habis." };
  if (i.questionCount < i.minQuestions) return { eligible: false, reason: "Ujian belum siap. Hubungi pengajar kursus." };
  return { eligible: true, reason: null };
};

export const examDeadline = (startedAt: Date, minutes: number): Date => new Date(startedAt.getTime() + minutes * 60_000);

/** Jawaban diterima sampai batas waktu ditambah toleransi. */
export const withinSubmitWindow = (now: Date, deadline: Date): boolean => now.getTime() <= deadline.getTime() + EXAM_GRACE_SECONDS * 1000;

/** Acak urutan dengan Fisher-Yates; `rand(n)` mengembalikan bilangan bulat 0..n-1 (crypto.randomInt di server). */
export const shuffle = <T>(items: readonly T[], rand: (max: number) => number): T[] => {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = rand(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/** Jawaban harus array sepanjang jumlah soal berisi bilangan bulat -1 (kosong) sampai 3. Selain itu null. */
export const validateAnswers = (answers: unknown, total: number): number[] | null => {
  if (!Array.isArray(answers) || answers.length !== total) return null;
  for (const a of answers) if (!Number.isInteger(a) || a < -1 || a > 3) return null;
  return answers as number[];
};

/** Menilai jawaban terhadap urutan soal. Skor 100 hanya bila semua benar; pembulatan tidak boleh "menggenapkan" ke 100. */
export const gradeExam = (order: readonly string[], key: Readonly<Record<string, number>>, answers: readonly number[]): { correct: number; total: number; score: number } => {
  const total = order.length;
  let correct = 0;
  order.forEach((id, i) => { if (answers[i] === key[id]) correct += 1; });
  if (total === 0) return { correct: 0, total: 0, score: 0 };
  const score = correct === total ? 100 : Math.min(99, Math.round((correct / total) * 100));
  return { correct, total, score };
};

export const isPassing = (score: number, passingGrade: number): boolean => score >= passingGrade;

const SERIAL_RE = /^KMPA-\d{4}-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/;
export const newCertificateSerial = (year: number, rand: (max: number) => number): string => `KMPA-${year}-${generateCode(rand, 8)}`;
export const normalizeSerial = (raw: string): string => raw.trim().toUpperCase();
export const isValidSerial = (raw: string): boolean => SERIAL_RE.test(raw);
