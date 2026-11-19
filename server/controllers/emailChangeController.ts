import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { emailChangeRequests, users } from "../schema/schema";
import { successResponse, errorResponse } from "../utils/response";
import { isSmtpConfigured, sendMail } from "../lib/mailer";
import { notifyUser } from "../lib/cards";
import { readSessionSecret } from "../lib/session-secret";
import {
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_MS,
  OTP_TTL_MS,
  generateOtp,
  hashOtp,
  otpMatches,
  otpState,
} from "../lib/otp";

const requestSchema = z.object({
  newEmail: z.string().trim().toLowerCase().email("Format email tidak valid").max(255),
  password: z.string().min(1, "Password wajib diisi").max(200),
});
const confirmSchema = z.object({ code: z.string().trim().regex(/^\d{6}$/, "Kode terdiri dari 6 digit") });

const GENERIC_SENT = "Jika email dapat dipakai, kode verifikasi 6 digit telah dikirim. Berlaku 10 menit.";

/** Langkah 1: password saat ini + email baru -> kode dikirim ke email baru. */
export const requestEmailChange = async (req: any, res: any) => {
  try {
    const parsed = requestSchema.safeParse(req.body);
    if (!parsed.success) return errorResponse(res, parsed.error.issues[0]?.message || "Data tidak valid", 400);
    const { newEmail, password } = parsed.data;

    if (!isSmtpConfigured()) {
      return errorResponse(res, "Pengiriman email belum diaktifkan. Hubungi admin.", 503);
    }

    const [user] = await db.select().from(users).where(eq(users.id, req.user.id)).limit(1);
    if (!user) return errorResponse(res, "Pengguna tidak ditemukan", 404);
    if (user.digitalcoopUserId) {
      return errorResponse(res, "Email akun tertaut hanya dapat diubah di digitalcoop.id.", 400);
    }
    if (!(await bcrypt.compare(password, user.password))) {
      return errorResponse(res, "Password salah", 400);
    }
    if (user.email && user.email === newEmail) {
      return errorResponse(res, "Email baru sama dengan email saat ini.", 400);
    }

    const [pending] = await db.select().from(emailChangeRequests).where(eq(emailChangeRequests.userId, user.id)).limit(1);
    if (pending && Date.now() - pending.createdAt.getTime() < OTP_RESEND_MS) {
      return errorResponse(res, "Tunggu 1 menit sebelum meminta kode baru.", 429);
    }

    // Jawaban sama baik email bebas maupun sudah dipakai, agar endpoint ini tidak membocorkan email terdaftar.
    const [taken] = await db.select({ id: users.id }).from(users).where(eq(users.email, newEmail)).limit(1);
    if (taken) return successResponse(res, { ttlMinutes: OTP_TTL_MS / 60000 }, GENERIC_SENT);

    const code = generateOtp();
    const row = {
      userId: user.id,
      newEmail,
      codeHash: hashOtp(user.id, newEmail, code, readSessionSecret()),
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
      attempts: 0,
      createdAt: new Date(),
    };
    await db.insert(emailChangeRequests).values(row).onConflictDoUpdate({ target: emailChangeRequests.userId, set: row });

    try {
      await sendMail({
        to: newEmail,
        subject: "Kode verifikasi email KMP-ADNG Academy",
        text:
          `Kode verifikasi Anda: ${code}\n\n` +
          `Kode berlaku ${OTP_TTL_MS / 60000} menit. Masukkan kode ini di halaman Keamanan untuk mengganti email akun Academy Anda.\n` +
          `Jika Anda tidak merasa memintanya, abaikan email ini.`,
      });
    } catch (error) {
      await db.delete(emailChangeRequests).where(eq(emailChangeRequests.userId, user.id));
      console.error("[email] gagal mengirim OTP", (error as Error)?.message);
      return errorResponse(res, "Gagal mengirim email. Coba lagi nanti.", 502);
    }

    successResponse(res, { ttlMinutes: OTP_TTL_MS / 60000 }, GENERIC_SENT);
  } catch (error) {
    errorResponse(res, "Gagal memproses permintaan ganti email", 500, error);
  }
};

/** Langkah 2: kode 6 digit -> email diganti. */
export const confirmEmailChange = async (req: any, res: any) => {
  try {
    const parsed = confirmSchema.safeParse(req.body);
    if (!parsed.success) return errorResponse(res, parsed.error.issues[0]?.message || "Data tidak valid", 400);

    const [pending] = await db.select().from(emailChangeRequests).where(eq(emailChangeRequests.userId, req.user.id)).limit(1);
    if (!pending) return errorResponse(res, "Tidak ada permintaan ganti email. Minta kode baru.", 400);

    const state = otpState(pending, new Date());
    if (state !== "ok") {
      await db.delete(emailChangeRequests).where(eq(emailChangeRequests.userId, req.user.id));
      return errorResponse(
        res,
        state === "expired" ? "Kode sudah kedaluwarsa. Minta kode baru." : "Terlalu banyak salah. Minta kode baru.",
        400,
      );
    }

    if (!otpMatches(pending.codeHash, req.user.id, pending.newEmail, parsed.data.code, readSessionSecret())) {
      const attempts = pending.attempts + 1;
      await db.update(emailChangeRequests).set({ attempts }).where(eq(emailChangeRequests.userId, req.user.id));
      const left = OTP_MAX_ATTEMPTS - attempts;
      return errorResponse(res, left > 0 ? `Kode salah. Sisa percobaan ${left}.` : "Terlalu banyak salah. Minta kode baru.", 400);
    }

    const [before] = await db.select({ email: users.email }).from(users).where(eq(users.id, req.user.id)).limit(1);
    try {
      await db.transaction(async (tx) => {
        await tx.update(users).set({ email: pending.newEmail, updatedAt: new Date() }).where(eq(users.id, req.user.id));
        await tx.delete(emailChangeRequests).where(eq(emailChangeRequests.userId, req.user.id));
        await notifyUser(tx, req.user.id, "Email akun diganti", `Email akun Academy Anda kini ${pending.newEmail}.`, "AKUN");
      });
    } catch (error: any) {
      if (error?.code === "23505") {
        await db.delete(emailChangeRequests).where(eq(emailChangeRequests.userId, req.user.id));
        return errorResponse(res, "Email tidak dapat dipakai. Coba email lain.", 400);
      }
      throw error;
    }
    console.info(`[auth] email diganti userId=${req.user.id}`);

    // Peringatan ke email lama (upaya terbaik): bila bukan Anda yang mengganti, segera hubungi admin.
    if (before?.email) {
      sendMail({
        to: before.email,
        subject: "Email akun KMP-ADNG Academy diganti",
        text:
          `Email akun Academy Anda telah diganti menjadi ${pending.newEmail}.\n` +
          `Jika bukan Anda yang melakukannya, segera hubungi admin.`,
      }).catch((e) => console.error("[email] gagal mengirim peringatan email lama", (e as Error)?.message));
    }

    successResponse(res, { email: pending.newEmail }, "Email berhasil diganti");
  } catch (error) {
    errorResponse(res, "Gagal mengganti email", 500, error);
  }
};
