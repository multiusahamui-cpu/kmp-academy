import api from './api';

export type ModuleKind = 'VIDEO' | 'PDF' | 'TEXT';
export type CourseState = 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED' | string;

export interface ModuleDto {
  id: string;
  position: number;
  title: string;
  description: string | null;
  type: ModuleKind;
  isFreePreview: boolean;
  hasContent: boolean;
}

export interface CourseDetail {
  id: string;
  title: string;
  description: string | null;
  price: number;
  type: string;
  status: CourseState;
  thumbnail: string | null;
  categoryIds: string[] | null;
  sessions: number | null;
  instructorName: string | null;
  reviewNote?: string | null;
  licenseAcceptedAt: string | null;
  pricing: { basePrice: number; discountPercent: number; discountEndsAt: string | null; finalPrice: number };
  exam: { enabled: boolean; passingGrade: number; durationMinutes: number; questionCount: number };
  modules: ModuleDto[];
}

export interface CreatorCourse {
  id: string;
  title: string;
  status: CourseState;
  price: number;
  thumbnail: string | null;
  studentsEnrolled: number;
  moduleCount: number;
  questionCount: number;
  reviewNote?: string | null;
}

export interface CategoryDto { id: string; name: string; slug: string; description: string | null; count: number; totalCourses: number }

export interface ExamQuestionDto { id: string; position: number; question: string; options: string[]; correctIndex: number }
export interface ExamDto { enabled: boolean; passingGrade: number; durationMinutes: number; minQuestions: number; questions: ExamQuestionDto[] }

export interface DiscountDto {
  id: string;
  kind: 'AUTO' | 'CODE';
  code: string | null;
  percent: number;
  startsAt: string;
  endsAt: string;
  maxRedemptions: number | null;
  redemptionCount: number;
  createdByRole: string;
  reason: string | null;
  cancelledAt: string | null;
  active: boolean;
  manageable: boolean;
}

export interface CourseInputDto { title: string; description: string; price: number; type: string; categoryIds: string[] }

export const courseAuthoringApi = {
  categories: () => api.get('/courses/categories'),
  createCategory: (data: { name: string; slug: string; description: string | null }) => api.post('/courses/categories', data),
  updateCategory: (id: string, data: { name: string; slug: string; description: string | null }) => api.put(`/courses/categories/${id}`, data),
  deleteCategory: (id: string) => api.delete(`/courses/categories/${id}`),
  mine: () => api.get('/courses/creator/dashboard'),
  detail: (id: string) => api.get(`/courses/${id}`),
  create: (data: CourseInputDto) => api.post('/courses', data),
  update: (id: string, data: CourseInputDto) => api.put(`/courses/${id}`, data),
  uploadThumbnail: (id: string, file: File) => {
    const form = new FormData();
    form.append('thumbnail', file);
    return api.post(`/courses/${id}/thumbnail`, form);
  },
  addModule: (id: string, data: { title: string; description: string; type: ModuleKind; textContent?: string; isFreePreview: boolean }) => api.post(`/courses/${id}/modules`, data),
  updateModule: (id: string, mid: string, data: { title: string; description: string; textContent?: string; isFreePreview: boolean }) => api.put(`/courses/${id}/modules/${mid}`, data),
  deleteModule: (id: string, mid: string) => api.delete(`/courses/${id}/modules/${mid}`),
  reorderModules: (id: string, ids: string[]) => api.put(`/courses/${id}/modules/reorder`, { ids }),
  moduleContent: (id: string, mid: string) => api.get(`/courses/${id}/modules/${mid}/content`),
  getExam: (id: string) => api.get(`/courses/${id}/exam`),
  saveExam: (id: string, data: { enabled: boolean; passingGrade: number; durationMinutes: number }) => api.put(`/courses/${id}/exam`, data),
  addQuestion: (id: string, data: { question: string; options: string[]; correctIndex: number }) => api.post(`/courses/${id}/exam/questions`, data),
  updateQuestion: (id: string, qid: string, data: { question: string; options: string[]; correctIndex: number }) => api.put(`/courses/${id}/exam/questions/${qid}`, data),
  deleteQuestion: (id: string, qid: string) => api.delete(`/courses/${id}/exam/questions/${qid}`),
  publish: (id: string, acceptLicense: boolean) => api.post(`/courses/${id}/publish`, { acceptLicense }),
  listDiscounts: (id: string) => api.get(`/courses/${id}/discounts`),
  createDiscount: (id: string, data: Record<string, unknown>) => api.post(`/courses/${id}/discounts`, data),
  createBulkCodes: (id: string, data: Record<string, unknown>) => api.post(`/courses/${id}/discounts/bulk`, data),
  cancelDiscount: (id: string, did: string) => api.post(`/courses/${id}/discounts/${did}/cancel`),
};

export const courseReviewApi = {
  list: (status = 'PENDING_REVIEW') => api.get('/courses/reviews', { params: { status } }),
  decide: (id: string, decision: 'APPROVE' | 'REJECT', note: string) => api.post(`/courses/reviews/${id}/decision`, { decision, note }),
};

const MIME_BY_EXT: Record<string, string> = { mp4: 'video/mp4', webm: 'video/webm', pdf: 'application/pdf', ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' };
const guessMime = (file: File): string => file.type || MIME_BY_EXT[file.name.split('.').pop()?.toLowerCase() ?? ''] || '';

const putWithProgress = (url: string, file: File, headers: Record<string, string>, onProgress: (pct: number) => void): Promise<void> =>
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Unggahan ditolak penyimpanan (${xhr.status}).`)));
    xhr.onerror = () => reject(new Error('Unggahan gagal. Periksa koneksi atau pengaturan CORS bucket.'));
    xhr.send(file);
  });

/** Unggah berkas modul: langsung ke R2 (tautan bertanda tangan) atau lewat server (driver local), lalu verifikasi di server. */
export const uploadModuleFile = async (courseId: string, moduleId: string, file: File, onProgress: (pct: number) => void): Promise<void> => {
  const mime = guessMime(file);
  const init = await api.post(`/courses/${courseId}/modules/${moduleId}/upload-init`, { mime, size: file.size });
  const d = init.data.data as { mode: 'direct' | 'server'; url: string; headers?: Record<string, string>; key: string };
  if (d.mode === 'direct') {
    await putWithProgress(d.url, file, d.headers ?? { 'Content-Type': mime }, onProgress);
    await api.post(`/courses/${courseId}/modules/${moduleId}/upload-complete`, { key: d.key });
    return;
  }
  const form = new FormData();
  form.append('file', file);
  await api.post(d.url.replace(/^\/api/, ''), form, { onUploadProgress: (e) => { if (e.total) onProgress(Math.round((e.loaded / e.total) * 100)); } });
};
