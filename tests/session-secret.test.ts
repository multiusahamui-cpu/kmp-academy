import { describe, it, expect } from "vitest";
import { readSessionSecret } from "../server/lib/session-secret";

const env = (over: Record<string, string | undefined>) => over as NodeJS.ProcessEnv;

describe("readSessionSecret", () => {
  it("menolak secret kosong", () => {
    expect(() => readSessionSecret(env({}))).toThrow(/wajib diisi/);
    expect(() => readSessionSecret(env({ SESSION_SECRET: "   " }))).toThrow(/wajib diisi/);
  });

  it("menolak nilai contoh", () => {
    expect(() => readSessionSecret(env({ SESSION_SECRET: "default_secret" }))).toThrow(/nilai contoh/);
  });

  it("produksi: minimal 32 karakter", () => {
    expect(() => readSessionSecret(env({ SESSION_SECRET: "pendek-sekali", NODE_ENV: "production" }))).toThrow(/minimal 32/);
    const kuat = "x".repeat(48);
    expect(readSessionSecret(env({ SESSION_SECRET: kuat, NODE_ENV: "production" }))).toBe(kuat);
  });

  it("menerima secret yang layak di luar produksi", () => {
    expect(readSessionSecret(env({ SESSION_SECRET: "dev-secret-lokal" }))).toBe("dev-secret-lokal");
  });
});
