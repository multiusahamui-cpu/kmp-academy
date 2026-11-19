import { and, asc, eq, gte, inArray, isNotNull, isNull, lt, sql } from "drizzle-orm";
import { db } from "../db";
import { notifications, userPreferences, users } from "../schema/schema";
import { isSmtpConfigured, sendMail } from "./mailer";
import { EMAIL_MAX_AGE_HOURS, EMAIL_MAX_ATTEMPTS, buildNotificationEmail, emailCategoryIds } from "@shared/notifications";

const BATCH = 50;

/**
 * Mengirim email untuk notifikasi penting milik pengguna yang opt-in. Satu proses saja (pm2 fork).
 * Tiap notifikasi: dicoba paling banyak EMAIL_MAX_ATTEMPTS kali, hanya yang dibuat setelah opt-in,
 * dan tidak lebih tua dari EMAIL_MAX_AGE_HOURS jam. Mengembalikan jumlah email terkirim.
 */
export const sendPendingNotificationEmails = async (): Promise<number> => {
  if (!isSmtpConfigured()) return 0;
  const since = new Date(Date.now() - EMAIL_MAX_AGE_HOURS * 3600_000);
  const rows = await db
    .select({ id: notifications.id, title: notifications.title, body: notifications.body, email: users.email })
    .from(notifications)
    .innerJoin(users, eq(users.id, notifications.userId))
    .innerJoin(userPreferences, eq(userPreferences.userId, notifications.userId))
    .where(and(
      isNotNull(users.email),
      isNull(notifications.emailedAt),
      lt(notifications.emailAttempts, EMAIL_MAX_ATTEMPTS),
      gte(notifications.createdAt, since),
      eq(userPreferences.notifyEmail, true),
      inArray(notifications.category, emailCategoryIds()),
      sql`${notifications.createdAt} >= ${userPreferences.updatedAt}`,
    ))
    .orderBy(asc(notifications.createdAt))
    .limit(BATCH);

  let sent = 0;
  for (const r of rows) {
    if (!r.email) continue;
    // Klaim dulu (naikkan percobaan) agar gagal kirim tidak diulang tanpa batas.
    await db.update(notifications).set({ emailAttempts: sql`${notifications.emailAttempts} + 1` }).where(eq(notifications.id, r.id));
    try {
      await sendMail({ to: r.email, ...buildNotificationEmail(r.title, r.body) });
      await db.update(notifications).set({ emailedAt: new Date() }).where(eq(notifications.id, r.id));
      sent += 1;
    } catch (err: any) {
      console.error(`[notifikasi] email gagal (${r.id}): ${err?.message}`);
    }
  }
  return sent;
};
