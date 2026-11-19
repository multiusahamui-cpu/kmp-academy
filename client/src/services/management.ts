import api from './api';
export { BROADCAST_AUDIENCES } from '@shared/management';
import type { BroadcastAudience, ReportKind } from '@shared/management';

export interface ReportRow { id: string; kind: ReportKind; periodStart: string; periodEnd: string; createdAt: string; readAt: string | null; author: string | null }
export interface ReportDetail extends ReportRow { snapshot: Record<string, number>; note: string | null }
export interface BroadcastRow { id: string; title: string; audience: BroadcastAudience; recipients: number; createdAt: string; author: string | null }

export const managementApi = {
  reports: async () => (await api.get('/admin/management-reports')).data.data as ReportRow[],
  report: async (id: string) => (await api.get(`/admin/management-reports/${id}`)).data.data as ReportDetail,
  createReport: async (kind: ReportKind, note: string) => (await api.post('/admin/management-reports', { kind, note })).data.data as { id: string },
  markRead: async (id: string) => { await api.put(`/admin/management-reports/${id}/read`); },
  broadcasts: async () => (await api.get('/admin/broadcasts')).data.data as BroadcastRow[],
  sendBroadcast: async (body: { title: string; body: string; audience: BroadcastAudience }) => (await api.post('/admin/broadcasts', body)).data.data as { recipients: number },
};
