import api from './api';
import type { ApplyRole } from '@shared/roleApplication';

export interface MyApplication { requestedRole: ApplyRole; status: 'PENDING' | 'APPROVED' | 'REJECTED'; decisionNote: string | null; createdAt: string; decidedAt: string | null }

export const roleApplicationsApi = {
  mine: async () => (await api.get('/role-applications/mine')).data.data as { last: MyApplication | null; kycOk: boolean },
  apply: async (b: { requestedRole: ApplyRole; profile: string; experience: string }) => { await api.post('/role-applications', b); },
};
