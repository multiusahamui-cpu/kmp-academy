import api from './api';
import type { ProposalStatus } from '@shared/workshop';

export interface EligibleCourse { id: string; title: string; price: number; owner: string | null }
export interface MyProposal { id: string; title: string; price: number; status: ProposalStatus; decisionNote: string | null; createdAt: string; decidedAt: string | null; classId: string | null; source: string }
export interface AdminProposal extends Omit<MyProposal, 'classId'> { description: string | null; sourcePrice: number; owner: string | null; mentor: string }
export interface WorkshopEarnings { participants: number; earningsTotal: number; earningsThisMonth: number; mentorPercent: number }

export const workshopsApi = {
  eligible: async () => (await api.get('/mentor/workshops/eligible')).data.data as EligibleCourse[],
  mine: async () => (await api.get('/mentor/workshops')).data.data as MyProposal[],
  earnings: async () => (await api.get('/mentor/earnings')).data.data as WorkshopEarnings,
  propose: async (b: { sourceCourseId: string; title: string; description: string; price: number }) => (await api.post('/mentor/workshops', b)).data.data as { id: string },
  withdraw: async (id: string) => { await api.post(`/mentor/workshops/${id}/withdraw`); },
  list: async (status: string) => (await api.get('/admin/workshop-proposals', { params: status ? { status } : {} })).data.data as { rows: AdminProposal[]; split: { owner: number; mentor: number; platform: number } },
  approve: async (id: string) => { await api.post(`/admin/workshop-proposals/${id}/approve`, {}); },
  reject: async (id: string, note: string) => { await api.post(`/admin/workshop-proposals/${id}/reject`, { note }); },
};
