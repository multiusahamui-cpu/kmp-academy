import { describe, expect, it } from "vitest";
import { looksLikeEmail, normalizePhone } from "@shared/phone";

describe("normalisasi No HP", () => {
  it("menyamakan berbagai penulisan", () => {
    expect(normalizePhone("0812-3456-789")).toBe("628123456789");
    expect(normalizePhone("+62 812 3456 789")).toBe("628123456789");
    expect(normalizePhone("6281234567890")).toBe("6281234567890");
    expect(normalizePhone("812 3456 789")).toBe("628123456789");
  });

  it("menolak nomor tidak valid", () => {
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone("abc")).toBeNull();
    expect(normalizePhone("0212345678")).toBeNull();
    expect(normalizePhone("0812")).toBeNull();
    expect(normalizePhone("+1 202 555 0100")).toBeNull();
  });

  it("membedakan email dan No HP", () => {
    expect(looksLikeEmail("a@digitalcoop.id")).toBe(true);
    expect(looksLikeEmail("0812345678")).toBe(false);
  });
});
