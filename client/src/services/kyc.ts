import api from './api';
import type { KycSource } from '@shared/kyc';

export type KycState = 'NONE' | 'PENDING' | 'VERIFIED' | 'REJECTED';
export interface MyKyc { status: KycState; source: KycSource | null; fullName: string | null; nikMasked: string | null; rejectNote: string | null; submittedAt: string | null; linked: boolean; exempt: boolean; ready: boolean }
export interface KycRow { id: string; status: KycState; source: KycSource; fullName: string; nikMasked: string; submittedAt: string; reviewedAt: string | null; rejectNote: string | null; userName: string; userEmail: string | null; userRole: string }

export const kycApi = {
  me: async () => (await api.get('/kyc/me')).data.data as MyKyc,
  submit: async (b: { nik: string; fullName: string; ktp: File; selfie: File }) => {
    const f = new FormData();
    f.append('nik', b.nik);
    f.append('fullName', b.fullName);
    f.append('ktp', b.ktp);
    f.append('selfie', b.selfie);
    await api.post('/kyc', f);
  },
  importDigitalcoop: async () => { await api.post('/kyc/import-digitalcoop'); },
  list: async (status: KycState) => (await api.get('/admin/kyc', { params: { status } })).data.data as KycRow[],
  nik: async (id: string) => (await api.get(`/admin/kyc/${id}/nik`)).data.data.nik as string,
  /** Foto dibuka sebagai blob (tautan R2 bertanda tangan singkat, tidak disimpan di halaman). */
  file: async (id: string, which: 'ktp' | 'selfie') => {
    const res = await api.get(`/admin/kyc/${id}/file/${which}`, { responseType: 'blob' });
    return URL.createObjectURL(res.data as Blob);
  },
  approve: async (id: string) => { await api.post(`/admin/kyc/${id}/approve`); },
  reject: async (id: string, note: string) => { await api.post(`/admin/kyc/${id}/reject`, { note }); },
};
