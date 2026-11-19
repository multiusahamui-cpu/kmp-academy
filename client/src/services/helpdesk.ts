import api from './api';
export { TICKET_CATEGORIES } from '@shared/helpdesk';
export type { TicketCategory, TicketStatus } from '@shared/helpdesk';
import type { TicketCategory, TicketStatus } from '@shared/helpdesk';

export interface TicketRow {
  id: string; subject: string; category: TicketCategory; status: TicketStatus; createdAt: string; updatedAt: string;
  userName?: string; userEmail?: string;
}
export interface TicketMessage { id: string; body: string; isStaff: boolean; createdAt: string; author: string }
export interface TicketDetail { ticket: TicketRow; messages: TicketMessage[] }

export const helpdeskApi = {
  create: async (body: { subject: string; category: TicketCategory; body: string }) => (await api.post('/helpdesk', body)).data.data as { id: string },
  mine: async () => (await api.get('/helpdesk/mine')).data.data as TicketRow[],
  queue: async (status: string, page: number) =>
    (await api.get('/helpdesk', { params: { status, page } })).data.data as { rows: TicketRow[]; hasMore: boolean; page: number },
  get: async (id: string) => (await api.get(`/helpdesk/${id}`)).data.data as TicketDetail,
  reply: async (id: string, body: string) => { await api.post(`/helpdesk/${id}/messages`, { body }); },
  close: async (id: string) => { await api.put(`/helpdesk/${id}/close`); },
};

export const STATUS_LABEL: Record<TicketStatus, string> = { OPEN: 'Menunggu balasan staf', ANSWERED: 'Sudah dibalas', CLOSED: 'Ditutup' };
