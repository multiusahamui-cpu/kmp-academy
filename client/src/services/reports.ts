import api from './api';

export interface AdminStats {
  users: { total: number; newThisMonth: number; byRole: Record<string, number> };
  courses: { published: number; pendingReview: number; draft: number; rejected: number };
  sales: { revenueTotal: number; revenueThisMonth: number; enrollmentsThisMonth: number };
  queue: { pendingPayments: number; openDeletions: number; pendingApplications: number; pendingReviews: number };
  uptimeSeconds: number;
}

export interface FinanceSummary {
  revenueTotal: number; revenueThisMonth: number; discountTotal: number; freeEnrollments: number; salesCount: number;
  creatorShareTotal: number; mentorShareTotal: number; platformShareTotal: number; platformShareThisMonth: number; creatorSharePercent: number;
  topupTotal: number; verifyingAmount: number; verifyingCount: number;
}
export interface SaleRow { id: string; at: string | null; buyer: string; course: string; base_price: number | null; discount_percent: number | null; amount_paid: number | null; channel: string }
export interface SettlementRow { id: string; amount: number; transfer_date: string; bank_ref: string; note: string | null; settled_by_name: string | null; created_at: string; recipient: string }
export interface VoucherBatchRow {
  id: string; course_id: string; course_title: string; total_codes: number; used_codes: number; percent: number;
  starts_at: string; ends_at: string; created_at: string; created_by: string; reason: string | null; cancelled: boolean;
}

export interface StrategicReport {
  monthly: { month: string; label: string; revenue: number; enrollments: number; newUsers: number }[];
  totals: { users: number; revenue: number; enrollments: number };
  revenueByType: { type: string; revenue: number; enrollments: number }[];
  topCourses: { id: string; title: string; instructor: string | null; students: number; revenue: number; rating: number; totalReviews: number }[];
  topCreators: { id: string; name: string; courses: number; students: number; revenue: number }[];
}

export interface QualityReport {
  threshold: number; minReviews: number; averageRating: number; totalReviews: number;
  lowRatedCourses: { id: string; title: string; instructor: string | null; rating: number; totalReviews: number; students: number }[];
  lowReviews: { id: string; rating: number; comment: string; createdAt: string; course: string; author: string }[];
}

export interface CreatorSummary {
  salesTotal: number; salesThisMonth: number; students: number; earningsTotal: number; earningsThisMonth: number; sharePercent: number; averageRating: number; totalReviews: number;
  content: { id: string; title: string; status: string; updatedAt: string | null }[];
  last7Days: { date: string; revenue: number }[];
}

export const reportsApi = {
  stats: async () => (await api.get('/admin/stats')).data.data as AdminStats,
  financeSummary: async () => (await api.get('/admin/finance/summary')).data.data as FinanceSummary,
  sales: async (q: string, page: number) =>
    (await api.get('/admin/finance/sales', { params: { q, page } })).data.data as { rows: SaleRow[]; hasMore: boolean; page: number },
  settlements: async () => (await api.get('/admin/finance/settlements')).data.data as SettlementRow[],
  voucherBatches: async () => (await api.get('/admin/finance/voucher-batches')).data.data as VoucherBatchRow[],
  createVoucherBatch: async (courseId: string, body: { count: number; percent: number; startsAt: string; endsAt: string; reason: string }) =>
    (await api.post(`/courses/${courseId}/discounts/bulk`, body)).data.data as { batchId: string; codes: string[] },
  strategic: async () => (await api.get('/admin/reports/strategic')).data.data as StrategicReport,
  quality: async () => (await api.get('/admin/quality')).data.data as QualityReport,
  creatorSummary: async () => (await api.get('/courses/creator/summary')).data.data as CreatorSummary,
  downloadSalesCsv: async () => {
    const res = await api.get('/admin/finance/sales.csv', { responseType: 'blob' });
    const url = URL.createObjectURL(res.data as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'penjualan-kursus.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};

export interface JobRow {
  id: string; label: string; description: string; everyMinutes: number; running: boolean;
  lastTickAt: string | null; lastTickStatus: 'OK' | 'ERROR' | null; lastError: string | null;
  lastRecordedRun: { startedAt: string; status: string; affected: number } | null;
}
export interface JobRun { id: string; trigger: 'SCHEDULE' | 'MANUAL'; status: 'OK' | 'ERROR'; affected: number; error: string | null; startedAt: string; finishedAt: string }

export const jobsApi = {
  list: async () => (await api.get('/admin/jobs')).data.data as JobRow[],
  runs: async (id: string) => (await api.get(`/admin/jobs/${id}/runs`)).data.data as JobRun[],
  run: async (id: string) => (await api.post(`/admin/jobs/${id}/run`)).data.data as { status: 'OK' | 'ERROR'; affected: number; error: string | null },
};
