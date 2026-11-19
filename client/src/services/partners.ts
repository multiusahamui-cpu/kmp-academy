import api from './api';
export { SANCTION_KINDS } from '@shared/sanctions';
import type { SanctionKind } from '@shared/sanctions';

export interface PartnerRow { id: string; name: string; email: string; status: string; warnings: number; activeSuspensions: number }
export interface SanctionRow { id: string; kind: SanctionKind; reason: string; createdAt: string; liftedAt: string | null; liftNote: string | null }

export const partnersApi = {
  list: async () => (await api.get('/admin/partners')).data.data as PartnerRow[],
  sanctions: async (id: string) => (await api.get(`/admin/partners/${id}/sanctions`)).data.data as SanctionRow[],
  sanction: async (id: string, body: { kind: SanctionKind; reason: string }) => { await api.post(`/admin/partners/${id}/sanctions`, body); },
  lift: async (sanctionId: string, note: string) => { await api.put(`/admin/sanctions/${sanctionId}/lift`, { note }); },
};
