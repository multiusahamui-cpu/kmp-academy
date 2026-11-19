import { and, count, eq, isNull } from "drizzle-orm";
import { db } from "../db";
import { notifications, userPreferences } from "../schema/schema";
import { successResponse, errorResponse } from "../utils/response";
import { isSmtpConfigured } from "../lib/mailer";
import { DEFAULT_NOTIFICATION_SETTINGS, validateNotificationSettings } from "@shared/notifications";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const getUnreadCount = async (req: any, res: any) => {
  try {
    const [row] = await db.select({ n: count() }).from(notifications)
      .where(and(eq(notifications.userId, req.user.id), isNull(notifications.readAt)));
    successResponse(res, { count: Number(row?.n ?? 0) }, "Jumlah belum dibaca");
  } catch (error) {
    errorResponse(res, "Gagal memuat jumlah notifikasi", 500, error);
  }
};

export const markNotificationRead = async (req: any, res: any) => {
  try {
    if (!UUID_RE.test(String(req.params.id ?? ""))) return errorResponse(res, "ID notifikasi tidak valid", 400);
    await db.update(notifications).set({ readAt: new Date() })
      .where(and(eq(notifications.id, req.params.id), eq(notifications.userId, req.user.id), isNull(notifications.readAt)));
    successResponse(res, null, "Ditandai dibaca");
  } catch (error) {
    errorResponse(res, "Gagal memperbarui notifikasi", 500, error);
  }
};

export const markAllNotificationsRead = async (req: any, res: any) => {
  try {
    await db.update(notifications).set({ readAt: new Date() })
      .where(and(eq(notifications.userId, req.user.id), isNull(notifications.readAt)));
    successResponse(res, null, "Semua ditandai dibaca");
  } catch (error) {
    errorResponse(res, "Gagal memperbarui notifikasi", 500, error);
  }
};

export const getNotificationSettings = async (req: any, res: any) => {
  try {
    const [pref] = await db.select({ muted: userPreferences.mutedCategories, notifyEmail: userPreferences.notifyEmail })
      .from(userPreferences).where(eq(userPreferences.userId, req.user.id)).limit(1);
    const settings = pref
      ? { mutedCategories: pref.muted, notifyEmail: pref.notifyEmail }
      : DEFAULT_NOTIFICATION_SETTINGS;
    successResponse(res, { ...settings, emailAvailable: isSmtpConfigured() }, "Pengaturan notifikasi");
  } catch (error) {
    errorResponse(res, "Gagal memuat pengaturan notifikasi", 500, error);
  }
};

export const updateNotificationSettings = async (req: any, res: any) => {
  try {
    const v = validateNotificationSettings(req.body);
    if (!v.ok) return errorResponse(res, v.message, 400);
    const now = new Date();
    await db.insert(userPreferences)
      .values({ userId: req.user.id, mutedCategories: v.value.mutedCategories, notifyEmail: v.value.notifyEmail, updatedAt: now })
      .onConflictDoUpdate({
        target: userPreferences.userId,
        set: { mutedCategories: v.value.mutedCategories, notifyEmail: v.value.notifyEmail, updatedAt: now },
      });
    successResponse(res, { ...v.value, emailAvailable: isSmtpConfigured() }, "Pengaturan notifikasi disimpan");
  } catch (error) {
    errorResponse(res, "Gagal menyimpan pengaturan notifikasi", 500, error);
  }
};
