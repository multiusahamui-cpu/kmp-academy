
import axios from 'axios';
import { WishlistItem } from '../types';

interface ApiWishlistItem {
  course: { id: string; title: string; price: number; thumbnail?: string | null };
  addedAt: string;
}

// Base URL pointing to your Node.js Express Backend
const API_URL = (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  // Content-Type sengaja tidak dipasang di sini: axios memilih application/json untuk objek biasa, dan multipart (dengan boundary)
  // untuk FormData. Header JSON bawaan membuat FormData diserialisasi jadi JSON sehingga berkas unggahan tidak pernah terkirim.
  // Sesi memakai cookie httpOnly (disimpan di Redis); tidak ada token di JavaScript/localStorage.
  withCredentials: true,
});

// --- RESPONSE INTERCEPTOR ---
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      // originalRequest._retry = true;
      // window.location.href = '/'; 
      console.warn("Session expired or invalid token");
    }
    return Promise.reject(error);
  }
);

// --- API SERVICES ---

export const authApi = {
  login: (credentials: { identifier: string; password: string }) => api.post('/auth/login', credentials),
  register: (data: { name: string; email: string; password: string; phone?: string }) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get('/auth/me'),
  updateProfile: (data: { name?: string; bio?: string; phone?: string }) => api.put('/auth/profile', data),
  uploadAvatar: (file: File) => {
    const form = new FormData();
    form.append('avatar', file);
    return api.post('/auth/profile/avatar', form);
  },
  deleteAvatar: () => api.delete('/auth/profile/avatar'),
  getDeletion: () => api.get('/auth/account-deletion'),
  requestDeletion: (data: { reason: string; password: string }) => api.post('/auth/account-deletion', data),
  cancelDeletion: () => api.delete('/auth/account-deletion'),
  requestEmailChange: (data: { newEmail: string; password: string }) => api.post('/auth/email/request', data),
  confirmEmailChange: (data: { code: string }) => api.post('/auth/email/confirm', data),
  changePassword: (data: { currentPassword: string; newPassword: string; confirmPassword: string }) => api.put('/auth/password', data),
};

export const configApi = {
  // Publik (tanpa login)
  getPublic: () => api.get('/config/public'),
  // Khusus Superadmin
  list: () => api.get('/superadmin/config'),
  update: (key: string, value: string) => api.put(`/superadmin/config/${encodeURIComponent(key)}`, { value }),
  history: () => api.get('/superadmin/config/history'),
};

export const courseApi = {
  getAll: () => api.get('/courses'),
  getById: (id: string) => api.get(`/courses/${id}`),
};

export const userApi = {
  // Wishlist - Real DB Connection
  getWishlist: async (): Promise<WishlistItem[]> => {
    const res = await api.get('/users/wishlist');
    // Map backend response format to frontend WishlistItem
    return res.data.data.map((item: ApiWishlistItem) => ({
        courseId: item.course.id,
        title: item.course.title,
        price: item.course.price,
        thumbnail: item.course.thumbnail || 'https://via.placeholder.com/150',
        addedAt: new Date(item.addedAt).toLocaleDateString('id-ID')
    }));
  },
  toggleWishlist: (courseId: string) => api.post(`/users/wishlist/${courseId}`),
  
  // Cart/Enrollment
  enroll: (courseId: string, body?: { promoCode?: string; expectedPrice?: number }) => api.post(`/users/enroll/${courseId}`, body ?? {}),
  getMyCourses: () => api.get('/users/enrolled'),

  // Wallet Features (New)
  getWallet: () => api.get('/users/wallet'),
  withdrawWallet: (data: { amount: number, bankId: string }) => api.post('/users/wallet/withdraw', data),
  getNotifications: () => api.get('/users/notifications'),
  markNotificationRead: (id: string) => api.post(`/users/notifications/${id}/read`),
  addBankAccount: (data: { bankName: string, accountNumber: string, holderName: string }) => api.post('/users/wallet/bank-account', data),
};

export const adminApi = {
  // Daftar tunggu calon mentor/creator (Admin/Superadmin)
  listApplications: (status = 'PENDING') => api.get('/admin/applications', { params: { status } }),
  decideApplication: (id: string, action: 'APPROVE' | 'REJECT', note?: string) =>
    api.post(`/admin/applications/${id}/decision`, { action, note }),
  listUsers: (tab: string, q = '', page = 1) => api.get('/admin/users', { params: { tab, q, page } }),
  issueCard: (userId: string) => api.post(`/admin/users/${userId}/card`),
  // Penghapusan akun individual (Admin/Direktur)
  listDeletions: (status = 'PENDING') => api.get('/admin/account-deletions', { params: { status } }),
  decideDeletion: (id: string, decision: 'APPROVE' | 'REJECT', note: string) =>
    api.post(`/admin/account-deletions/${id}/decision`, { decision, note }),
  settleDeletion: (id: string, form: FormData) => api.post(`/admin/account-deletions/${id}/settlement`, form),
  proofUrl: (settlementId: string) => `${API_URL}/admin/settlements/${settlementId}/proof`,
  listArchived: (q = '', page = 1) => api.get('/admin/archived-accounts', { params: { q, page } }),
};

export const reviewApi = {
  getByCourse: (courseId: string) => api.get(`/courses/${courseId}/reviews`),
  create: (courseId: string, data: { rating: number, comment: string }) => api.post(`/courses/${courseId}/reviews`, data),
};

export default api;
