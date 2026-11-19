import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { passwordResetRequests, users } from "../schema/schema";
import { successResponse, errorResponse } from "../utils/response";
import { isSmtpConfigured, sendMail } from "../lib/mailer";
import { notifyUser } from "../lib/cards";
import { getConfigInt } from "../lib/system-config";
import { readSessionSecret } from "../lib/session-secret";
import { OTP_MAX_ATTEMPTS, OTP_RESEND_MS, OTP_TTL_MS, generateOtp, hashOtp, otpMatches, otpState } from "../lib/otp";

const emailField = z.string().trim().toLowerCase().email("Format email tidak valid").max(255);
const forgotSchema = z.object({ email: emailField });
const resetSchema = z.object({
  email: emailField,
  code: z.string().trim().regex(/^\d{6}$/, "Kode terdiri dari 6 digit"),
  newPassword: z.string().min(1, "Password baru wajib diisi").max(200),
  confirmPassword: z.string().max(200),
});

const GENERIC_SENT = "Jika email terdaftar, kode 6 digit telah dikirim. Berlaku 10 menit.";
const BAD_CODE = "Kode salah atau kedaluwarsa. Minta kode baru.";

// Kode terikat ke user, email, dan tujuan "reset" agar tidak bisa dipakai di alur lain.
const bind = (email: string): string => `reset|${email}`;

/** Langkah 1: email terdaftar -> kode dikirim. Jawaban selalu sama agar email terdaftar tidak bisa ditebak. */
export const forgotPassword = async (req: any, res: any) => {
  try {
    const parsed = forgotSchema.safeParse(req.body);
    if (!parsed.success) return errorResponse(res, parsed.error.issues[0]?.message || "Data tidak valid", 400);
    if (!isSmtpConfigured()) return errorResponse(res, "Pengiriman email belum diaktifkan. Hubungi admin.", 503);
    const { email } = parsed.data;

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user || user.status !== "ACTIVE") return successResponse(res, { ttlMinutes: OTP_TTL_MS / 60000 }, GENERIC_SENT);

    const [pending] = await db.select().from(passwordResetRequests).where(eq(passwordResetRequests.userId, user.id)).limit(1);
    if (pending && Date.now() - pending.createdAt.getTime() < OTP_RESEND_MS) {
      return successResponse(res, { ttlMinutes: OTP_TTL_MS / 60000 }, GENERIC_SENT);
    }

    const code = generateOtp();
    const row = {
      userId: user.id,
      codeHash: hashOtp(user.id, bind(email), code, readSessionSecret()),
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
      attempts: 0,
      createdAt: new Date(),
    };
    await db.insert(passwordResetRequests).values(row).onConflictDoUpdate({ target: passwordResetRequests.userId, set: row });

    try {
      await sendMail({
        to: email,
        subject: "Kode setel ulang password KMP-ADNG Academy",
        text:
          `Kode setel ulang password Anda: ${code}\n\n` +
          `Kode berlaku ${OTP_TTL_MS / 60000} menit. Jangan berikan kode ini kepada siapa pun, termasuk yang mengaku petugas Academy.\n` +
          `Jika Anda tidak merasa memintanya, abaikan email ini; password Anda tidak berubah.`,
      });
    } catch (error) {
      await db.delete(passwordResetRequests).where(eq(passwordResetRequests.userId, user.id));
      console.error("[email] gagal mengirim OTP lupa password", (error as Error)?.message);
    }
    successResponse(res, { ttlMinutes: OTP_TTL_MS / 60000 }, GENERIC_SENT);
  } catch (error) {
    errorResponse(res, "Gagal memproses permintaan", 500, error);
  }
};

/** Langkah 2: email + kode + password baru -> password diganti, semua sesi lama dicabut. */
export const resetPassword = async (req: any, res: any) => {
  try {
    const parsed = resetSchema.safeParse(req.body);
    if (!parsed.success) return errorResponse(res, parsed.error.issues[0]?.message || "Data tidak valid", 400);
    const { email, code, newPassword, confirmPassword } = parsed.data;
    if (newPassword !== confirmPassword) return errorResponse(res, "Konfirmasi password tidak sama", 400);
    const minLength = await getConfigInt("password_min_length");
    if (newPassword.length < minLength) return errorResponse(res, `Password baru minimal ${minLength} karakter`, 400);

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user || user.status !== "ACTIVE") return errorResponse(res, BAD_CODE, 400);
    const [pending] = await db.select().from(passwordResetRequests).where(eq(passwordResetRequests.userId, user.id)).limit(1);
    if (!pending) return errorResponse(res, BAD_CODE, 400);

    if (otpState(pending, new Date()) !== "ok") {
      await db.delete(passwordResetRequests).where(eq(passwordResetRequests.userId, user.id));
      return errorResponse(res, BAD_CODE, 400);
    }
    if (!otpMatches(pending.codeHash, user.id, bind(email), code, readSessionSecret())) {
      const attempts = pending.attempts + 1;
      if (attempts >= OTP_MAX_ATTEMPTS) await db.delete(passwordResetRequests).where(eq(passwordResetRequests.userId, user.id));
      else await db.update(passwordResetRequests).set({ attempts }).where(eq(passwordResetRequests.userId, user.id));
      return errorResponse(res, BAD_CODE, 400);
    }

    const now = new Date();
    const hash = await bcrypt.hash(newPassword, 10);
    await db.transaction(async (tx) => {
      // passwordChangedAt membuat semua sesi yang dibuat sebelumnya tidak sah.
      await tx.update(users).set({ password: hash, passwordChangedAt: now, updatedAt: now }).where(eq(users.id, user.id));
      await tx.delete(passwordResetRequests).where(eq(passwordResetRequests.userId, user.id));
      await notifyUser(tx, user.id, "Password diganti", "Password akun Academy Anda diganti lewat lupa password. Jika bukan Anda, segera hubungi admin.", "AKUN");
    });
    console.info(`[auth] password direset userId=${user.id}`);

    sendMail({
      to: email,
      subject: "Password KMP-ADNG Academy diganti",
      text: "Password akun Academy Anda baru saja diganti lewat fitur lupa password. Jika bukan Anda, segera hubungi admin.",
    }).catch((e) => console.error("[email] gagal mengirim pemberitahuan reset", (e as Error)?.message));

    successResponse(res, null, "Password berhasil diganti. Silakan masuk.");
  } catch (error) {
    errorResponse(res, "Gagal mengganti password", 500, error);
  }
};
