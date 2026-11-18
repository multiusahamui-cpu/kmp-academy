import { describe, expect, it } from "vitest";
import { isOriginAllowed } from "../server/middleware/csrf";

const prod = { NODE_ENV: "production", ALLOWED_ORIGINS: "https://academy.digitalcoop.id" } as NodeJS.ProcessEnv;

describe("isOriginAllowed", () => {
  it("origin sama dengan Host diizinkan", () => {
    expect(isOriginAllowed("https://academy.digitalcoop.id", "academy.digitalcoop.id", prod)).toBe(true);
  });

  it("origin dalam ALLOWED_ORIGINS diizinkan walau Host berbeda (di balik proxy)", () => {
    expect(isOriginAllowed("https://academy.digitalcoop.id", "127.0.0.1:5100", prod)).toBe(true);
  });

  it("origin asing ditolak", () => {
    expect(isOriginAllowed("https://jahat.example", "academy.digitalcoop.id", prod)).toBe(false);
    expect(isOriginAllowed("bukan-url", "academy.digitalcoop.id", prod)).toBe(false);
  });

  it("localhost hanya di luar produksi", () => {
    expect(isOriginAllowed("http://localhost:5173", "127.0.0.1:5100", { NODE_ENV: "development" } as NodeJS.ProcessEnv)).toBe(true);
    expect(isOriginAllowed("http://localhost:5173", "127.0.0.1:5100", prod)).toBe(false);
  });
});
