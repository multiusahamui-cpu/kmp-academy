import { describe, it, expect } from "vitest";
import { readJwtSecret } from "../server/lib/jwt-secret";

const env = (over: Record<string, string | undefined>) => over as NodeJS.ProcessEnv;

describe("readJwtSecret", () => {
  it("menolak secret kosong", () => {
    expect(() => readJwtSecret(env({}))).toThrow(/wajib diisi/);
    expect(() => readJwtSecret(env({ JWT_SECRET: "   " }))).toThrow(/wajib diisi/);
  });

  it("menolak nilai contoh", () => {
    expect(() => readJwtSecret(env({ JWT_SECRET: "default_secret" }))).toThrow(/nilai contoh/);
  });

  it("produksi: minimal 32 karakter", () => {
    expect(() => readJwtSecret(env({ JWT_SECRET: "pendek-sekali", NODE_ENV: "production" }))).toThrow(/minimal 32/);
    const kuat = "x".repeat(48);
    expect(readJwtSecret(env({ JWT_SECRET: kuat, NODE_ENV: "production" }))).toBe(kuat);
  });

  it("menerima secret yang layak di luar produksi", () => {
    expect(readJwtSecret(env({ JWT_SECRET: "dev-secret-lokal" }))).toBe("dev-secret-lokal");
  });
});
