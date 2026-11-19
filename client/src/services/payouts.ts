import api from './api';
import type { BatchStatus, PayeeStatus } from '@shared/payout';

export interface CourseShareRow { id: string; title: string; type: string; owner: string | null; mentors: string | null; sales: number; gross: number; ownerShare: number; mentorShare: number; platformShare: number }
export interface ShareTotals { sales: number; gross: number; ownerShare: number; mentorShare: number; platformShare: number }
export interface BatchRow { id: string; cutoffAt: string; period: string; status: BatchStatus; postedAt: string; approvedAt: string | null; completedAt: string | null; voidNote: string | null; salesCount: number; grossTotal: number; ownerTotal: number; mentorTotal: number; platformTotal: number }
export interface Bank { bankName: string; account: string; holderName: string }
export interface PayeeRow { id: string; userName: string; ownerAmount: number; mentorAmount: number; amount: number; status: PayeeStatus; transferRef: string | null; note: string | null; paidAt: string | null; bank: Bank | null; hasProof: boolean; proofEmailedAt: string | null }
export interface PayoutOverview { nextCutoffAt: string; accrual: { courses: CourseShareRow[]; totals: ShareTotals }; batches: BatchRow[] }
export interface PayoutDetail { batch: BatchRow; courses: CourseShareRow[]; payees: PayeeRow[] }
export interface MyPayouts {
  nextCutoffAt: string;
  accrued: { owner: number; mentor: number; total: number };
  bank: Bank | null;
  history: { batchId: string; period: string; batchStatus: BatchStatus; amount: number; ownerAmount: number; mentorAmount: number; status: PayeeStatus; transferRef: string | null; paidAt: string | null; hasProof: boolean }[];
}
export interface ArchivedPayment { id: string; batchId: string; period: string; userName: string; amount: number; transferRef: string | null; paidAt: string | null; bank: Bank | null; proofEmailedAt: string | null; hasProof: boolean }
export interface PayoutArchive { batches: BatchRow[]; payments: ArchivedPayment[] }
export interface StatementRow { title: string; type: string; sales: number; gross: number; ownerShare: number; mentorShare: number }

async function saveBlob(url: string, name: string) {
  const res = await api.get(url, { responseType: 'blob' });
  const href = URL.createObjectURL(res.data as Blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}

export const payoutsApi = {
  overview: async () => (await api.get('/admin/payouts')).data.data as PayoutOverview,
  detail: async (id: string) => (await api.get(`/admin/payouts/${id}`)).data.data as PayoutDetail,
  postNow: async () => { await api.post('/admin/payouts/post'); },
  approve: async (id: string) => { await api.post(`/admin/payouts/${id}/approve`); },
  voidBatch: async (id: string, note: string) => { await api.post(`/admin/payouts/${id}/void`, { note }); },
  pay: async (payeeId: string, transferRef: string, note: string, proof: File) => {
    const f = new FormData();
    f.append('transferRef', transferRef);
    f.append('note', note);
    f.append('proof', proof);
    return (await api.post(`/admin/payouts/payees/${payeeId}/pay`, f)).data.data as { emailed: boolean };
  },
  archive: async () => (await api.get('/admin/payouts/archive')).data.data as PayoutArchive,
  resend: async (payeeId: string) => { await api.post(`/admin/payouts/payees/${payeeId}/resend`); },
  adminProof: (payeeId: string) => saveBlob(`/admin/payouts/payees/${payeeId}/proof`, `bukti-bayar-${payeeId.slice(0, 8)}`),
  myProof: (batchId: string) => saveBlob(`/payouts/mine/${batchId}/proof`, `bukti-bayar-${batchId.slice(0, 8)}`),
  downloadTransactions: async (id: string, name: string) => {
    const res = await api.get(`/admin/payouts/${id}/transactions.csv`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `uang-masuk-per-judul-${name}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
  mine: async () => (await api.get('/payouts/mine')).data.data as MyPayouts,
  statement: async (batchId: string) => (await api.get(`/payouts/mine/${batchId}`)).data.data as StatementRow[],
  saveBank: async (b: { bankName: string; accountNumber: string; holderName: string }) => { await api.post('/payouts/bank-account', b); },
};
