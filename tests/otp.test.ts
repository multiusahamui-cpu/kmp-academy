import { describe, expect, it } from "vitest";
import { OTP_MAX_ATTEMPTS, generateOtp, hashOtp, otpMatches, otpState } from "../server/lib/otp";
import { readSmtpConfig } from "../server/lib/mailer";

const SECRET = "x".repeat(40);

describe("otp", () => {
  it("menghasilkan 6 digit", () => {
    for (let i = 0; i < 200; i += 1) expect(generateOtp()).toMatch(/^\d{6}$/);
  });

  it("hanya cocok untuk user, email, dan kode yang sama", () => {
    const h = hashOtp("u1", "a@x.id", "123456", SECRET);
    expect(h).not.toContain("123456");
    expect(otpMatches(h, "u1", "a@x.id", "123456", SECRET)).toBe(true);
    expect(otpMatches(h, "u1", "a@x.id", "123457", SECRET)).toBe(false);
    expect(otpMatches(h, "u2", "a@x.id", "123456", SECRET)).toBe(false);
    expect(otpMatches(h, "u1", "b@x.id", "123456", SECRET)).toBe(false);
    expect(otpMatches(h, "u1", "a@x.id", "123456", "y".repeat(40))).toBe(false);
  });

  it("status: kedaluwarsa, terkunci, dan normal", () => {
    const now = new Date("2026-11-18T10:00:00Z");
    expect(otpState({ expiresAt: new Date(now.getTime() - 1), attempts: 0 }, now)).toBe("expired");
    expect(otpState({ expiresAt: new Date(now.getTime() + 1000), attempts: OTP_MAX_ATTEMPTS }, now)).toBe("locked");
    expect(otpState({ expiresAt: new Date(now.getTime() + 1000), attempts: OTP_MAX_ATTEMPTS - 1 }, now)).toBe("ok");
  });
});

describe("readSmtpConfig", () => {
  const base = { SMTP_HOST: "smtp.x.id", SMTP_USER: "u", SMTP_PASSWORD: "p", SMTP_FROM: "A <a@x.id>" };
  it("null bila ada variabel yang kosong", () => {
    expect(readSmtpConfig({})).toBeNull();
    expect(readSmtpConfig({ ...base, SMTP_PASSWORD: "" })).toBeNull();
  });
  it("port bawaan 587 tanpa TLS langsung; 465 otomatis secure; SMTP_SECURE menimpa", () => {
    expect(readSmtpConfig(base)).toMatchObject({ port: 587, secure: false });
    expect(readSmtpConfig({ ...base, SMTP_PORT: "465" })).toMatchObject({ port: 465, secure: true });
    expect(readSmtpConfig({ ...base, SMTP_PORT: "587", SMTP_SECURE: "true" })).toMatchObject({ secure: true });
  });
});
