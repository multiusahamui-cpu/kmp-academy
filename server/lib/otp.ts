import crypto from "node:crypto";

export const OTP_TTL_MS = 10 * 60 * 1000; // kode berlaku 10 menit
export const OTP_MAX_ATTEMPTS = 5; // salah 5 kali: kode hangus
export const OTP_RESEND_MS = 60 * 1000; // jeda minta kode baru

/** Kode 6 digit dari generator acak kriptografis. */
export const generateOtp = (): string => String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");

/** Kode disimpan sebagai HMAC yang terikat ke user dan email tujuan, tidak pernah polos. */
export const hashOtp = (userId: string, newEmail: string, code: string, secret: string): string =>
  crypto.createHmac("sha256", secret).update(`${userId}|${newEmail}|${code}`).digest("hex");

export const otpMatches = (expectedHash: string, userId: string, newEmail: string, code: string, secret: string): boolean => {
  const a = Buffer.from(expectedHash, "hex");
  const b = Buffer.from(hashOtp(userId, newEmail, code, secret), "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

export type OtpState = "ok" | "expired" | "locked";

/** Status permintaan sebelum kode dicocokkan. */
export const otpState = (req: { expiresAt: Date; attempts: number }, now: Date): OtpState => {
  if (req.expiresAt.getTime() <= now.getTime()) return "expired";
  if (req.attempts >= OTP_MAX_ATTEMPTS) return "locked";
  return "ok";
};
