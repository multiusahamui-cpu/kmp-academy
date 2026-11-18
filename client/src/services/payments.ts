import api from './api';

export type OrderStatus = 'PENDING' | 'VERIFYING' | 'CONFIRMING' | 'PAID' | 'EXPIRED' | 'CANCELLED' | 'REJECTED';
export type OrderMethod = 'VA' | 'MANUAL' | 'DC_WALLET';

export interface PaymentOrder {
  id: string;
  kind: 'COURSE' | 'TOPUP';
  courseId: string | null;
  courseTitle: string | null;
  method: OrderMethod;
  status: OrderStatus;
  amount: number;
  basePrice: number | null;
  discountPercent: number | null;
  bank: string | null;
  vaNumber: string | null;
  expiresAt: string;
  hasProof: boolean;
  decisionNote: string | null;
  paidAt: string | null;
  createdAt: string;
  transferTo: { bankName: string; accountNumber: string; accountName: string } | null;
}

export interface PaymentMethods {
  wallet: boolean;
  va: { enabled: boolean; banks: string[] };
  manual: { enabled: boolean };
  dcWallet: { enabled: boolean };
}

export interface CreateOrderInput {
  kind: 'COURSE' | 'TOPUP';
  method: OrderMethod;
  courseId?: string;
  promoCode?: string;
  expectedPrice?: number;
  amount?: number;
  bank?: string;
  pin?: string;
}

export const paymentApi = {
  methods: () => api.get('/payments/methods'),
  dcWallet: () => api.get('/payments/dc-wallet'),
  createOrder: (data: CreateOrderInput) => api.post('/payments/orders', data),
  listOrders: () => api.get('/payments/orders'),
  getOrder: (id: string) => api.get(`/payments/orders/${id}`),
  cancelOrder: (id: string) => api.post(`/payments/orders/${id}/cancel`),
  uploadProof: (id: string, file: File) => {
    const form = new FormData();
    form.append('proof', file);
    return api.post(`/payments/orders/${id}/proof`, form);
  },
  validatePromo: (courseId: string, code: string) => api.post(`/courses/${courseId}/promo/validate`, { code }),
};

export const paymentAdminApi = {
  list: (status = 'VERIFYING', page = 1) => api.get('/admin/payment-orders', { params: { status, page } }),
  proofUrl: (id: string) => `${(import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_API_URL || '/api'}/admin/payment-orders/${id}/proof`,
  decide: (id: string, body: { decision: 'APPROVE' | 'REJECT'; paidAmount?: number; paidDate?: string; reference?: string; note?: string }) =>
    api.post(`/admin/payment-orders/${id}/decision`, body),
};

export const rupiah = (n: number): string =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

export const apiMessage = (err: unknown, fallback: string): string =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

export const OPEN_ORDER: OrderStatus[] = ['PENDING', 'VERIFYING', 'CONFIRMING'];
