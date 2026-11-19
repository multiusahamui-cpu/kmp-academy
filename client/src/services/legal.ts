import api from './api';
import type { LegalKind } from '@shared/legal';

export interface PendingDoc { id: string; kind: LegalKind; version: number; title: string; body: string }
export interface LegalRow { id: string; kind: LegalKind; version: number; title: string; status: 'DRAFT' | 'PUBLISHED'; updatedAt: string; publishedAt: string | null; accepted: number }
export interface LegalDetail extends LegalRow { body: string }

export const legalApi = {
  pending: async () => (await api.get('/legal/pending')).data.data as PendingDoc[],
  accept: async (documentId: string) => { await api.post('/legal/accept', { documentId }); },
  list: async () => (await api.get('/legal/admin')).data.data as LegalRow[],
  get: async (id: string) => (await api.get(`/legal/admin/${id}`)).data.data as LegalDetail,
  createDraft: async (b: { kind: LegalKind; title: string; body: string }) => (await api.post('/legal/admin', b)).data.data as { id: string },
  save: async (id: string, b: { title: string; body: string }) => { await api.put(`/legal/admin/${id}`, b); },
  publish: async (id: string) => { await api.post(`/legal/admin/${id}/publish`); },
};
