import api from './api';
import type { StaffRole } from '@shared/appointments';

export interface StaffRow { id: string; name: string; email: string; role: StaffRole; status: string }
export interface AppointmentRow { id: string; userName: string; action: 'APPOINT' | 'DISMISS'; fromRole: string; toRole: string; note: string; actorName: string | null; createdAt: string }

export const appointmentsApi = {
  staff: async () => (await api.get('/superadmin/staff')).data.data as StaffRow[],
  history: async () => (await api.get('/superadmin/appointments')).data.data as AppointmentRow[],
  appoint: async (b: { email: string; role: StaffRole; note: string }) => { await api.post('/superadmin/appointments', b); },
  dismiss: async (id: string, note: string) => { await api.post(`/superadmin/staff/${id}/dismiss`, { note }); },
};
