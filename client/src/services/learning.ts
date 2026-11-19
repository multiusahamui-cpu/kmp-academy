import api from './api';
import { Certificate, CourseType } from '../types';

export type ModuleType = 'VIDEO' | 'PDF' | 'TEXT';

export interface LearningModule {
  id: string;
  position: number;
  title: string;
  description: string | null;
  type: ModuleType;
  isFreePreview: boolean;
  isCompleted: boolean;
}

export interface ExamSummary {
  enabled: boolean;
  passingGrade: number;
  durationMinutes: number;
  questionCount: number;
  maxAttempts: number;
  attemptsUsed: number;
  hasOpenAttempt: boolean;
  passed: boolean;
  bestScore: number | null;
  eligible: boolean;
  reason: string | null;
}

export interface LearningDetail {
  course: { id: string; title: string; description: string | null; instructorName: string | null; type: string; thumbnail: string | null };
  modules: LearningModule[];
  progress: number;
  completedModules: number;
  totalModules: number;
  exam: ExamSummary;
  certificate: { id: string; serial: string } | null;
}

export interface CompleteResult {
  progress: number;
  completedModules: number;
  totalModules: number;
  certificate: { id: string; serial: string; created: boolean } | null;
}

export interface ExamQuestion { id: string; question: string; options: string[] }

export interface ExamSession {
  attemptId: string;
  startedAt: string;
  deadlineAt: string;
  serverNow: string;
  durationMinutes: number;
  passingGrade: number;
  questions: ExamQuestion[];
}

export interface ExamResult {
  score: number;
  correct: number;
  total: number;
  passed: boolean;
  passingGrade: number;
  attemptsLeft: number;
  certificate: { id: string; serial: string } | null;
}

export interface CertificateDto {
  id: string;
  serial: string;
  courseId: string;
  courseTitle: string;
  courseType: string;
  studentName: string;
  instructorName: string;
  grade: number | null;
  kind: 'EXAM' | 'COMPLETION' | 'PARTICIPATION';
  issuedAt: string;
  pdfUrl?: string | null;
  signerName?: string | null;
}

export interface VerifiedCertificate {
  valid: boolean;
  serial: string;
  studentName: string;
  courseTitle: string;
  courseType: string;
  kind: string;
  grade: number | null;
  issuedAt: string;
}

export const formatLongDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

export const mapCertificate = (c: CertificateDto): Certificate => ({
  id: c.id,
  serial: c.serial,
  kind: c.kind,
  courseId: c.courseId,
  courseTitle: c.courseTitle,
  courseType: c.courseType as CourseType,
  studentName: c.studentName,
  instructorName: c.instructorName,
  issueDate: formatLongDate(c.issuedAt),
  grade: c.grade ?? 0,
  pdfUrl: c.pdfUrl ?? null,
  signerName: c.signerName ?? null,
});

export const learningApi = {
  detail: (courseId: string) => api.get(`/users/learning/${courseId}`),
  completeModule: (courseId: string, moduleId: string) => api.post(`/users/learning/${courseId}/modules/${moduleId}/complete`),
  startExam: (courseId: string) => api.post(`/users/exams/${courseId}/start`),
  submitExam: (courseId: string, attemptId: string, answers: number[]) => api.post(`/users/exams/${courseId}/submit`, { attemptId, answers }),
  certificates: () => api.get('/users/certificates'),
  verify: (serial: string) => api.get(`/certificates/verify/${encodeURIComponent(serial)}`),
};

/** Sertifikat milik satu kursus (untuk dibuka di pratinjau/cetak). */
export const findCertificateForCourse = async (courseId: string): Promise<Certificate | null> => {
  const list = (await learningApi.certificates()).data.data as CertificateDto[];
  const hit = list.find((c) => c.courseId === courseId);
  return hit ? mapCertificate(hit) : null;
};
