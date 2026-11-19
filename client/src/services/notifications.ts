import api from './api';
import type { NotificationCategory } from '@shared/notifications';

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  category: NotificationCategory;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationSettingsDto {
  mutedCategories: NotificationCategory[];
  notifyEmail: boolean;
  /** false bila SMTP server belum dikonfigurasi, jadi email belum bisa dikirim. */
  emailAvailable: boolean;
}

export const notificationsApi = {
  list: async (): Promise<NotificationItem[]> => (await api.get('/users/notifications')).data.data as NotificationItem[],
  unreadCount: async (): Promise<number> => Number((await api.get('/users/notifications/unread-count')).data.data?.count ?? 0),
  markRead: (id: string) => api.post(`/users/notifications/${id}/read`),
  markAllRead: () => api.post('/users/notifications/read-all'),
  getSettings: async (): Promise<NotificationSettingsDto> => (await api.get('/users/notification-settings')).data.data as NotificationSettingsDto,
  saveSettings: async (s: { mutedCategories: NotificationCategory[]; notifyEmail: boolean }): Promise<NotificationSettingsDto> =>
    (await api.put('/users/notification-settings', s)).data.data as NotificationSettingsDto,
};
