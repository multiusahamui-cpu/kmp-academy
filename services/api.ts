
import axios from 'axios';
import { Course, Review, WishlistItem } from '../types';

// Base URL pointing to your Node.js Express Backend
const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // withCredentials: true, // Uncomment if using cookies
});

// --- REQUEST INTERCEPTOR ---
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('kodman_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// --- RESPONSE INTERCEPTOR ---
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      // originalRequest._retry = true;
      // localStorage.removeItem('kodman_token');
      // window.location.href = '/'; 
      console.warn("Session expired or invalid token");
    }
    return Promise.reject(error);
  }
);

// --- API SERVICES ---

export const authApi = {
  login: (credentials: any) => api.post('/auth/login', credentials),
  register: (data: any) => api.post('/auth/register', data),
  getProfile: () => api.get('/auth/me'),
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
    return res.data.data.map((item: any) => ({
        courseId: item.course.id,
        title: item.course.title,
        price: item.course.price,
        thumbnail: item.course.thumbnail || 'https://via.placeholder.com/150',
        addedAt: new Date(item.addedAt).toLocaleDateString('id-ID')
    }));
  },
  toggleWishlist: (courseId: string) => api.post(`/users/wishlist/${courseId}`),
  
  // Cart/Enrollment
  enroll: (courseId: string) => api.post(`/users/enroll/${courseId}`),
  getMyCourses: () => api.get('/users/enrolled'),

  // Wallet Features (New)
  getWallet: () => api.get('/users/wallet'),
  topUpWallet: (data: { amount: number, method: string }) => api.post('/users/wallet/topup', data),
  withdrawWallet: (data: { amount: number, bankId: string }) => api.post('/users/wallet/withdraw', data),
  addBankAccount: (data: { bankName: string, accountNumber: string, holderName: string }) => api.post('/users/wallet/bank-account', data),
};

export const reviewApi = {
  getByCourse: (courseId: string) => api.get(`/courses/${courseId}/reviews`),
  create: (courseId: string, data: { rating: number, comment: string }) => api.post(`/courses/${courseId}/reviews`, data),
};

export default api;
