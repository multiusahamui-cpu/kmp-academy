import { describe, expect, it } from "vitest";
import { cardPrefixFor, formatCardNumber, shadowCardNumber } from "@shared/card";

describe("aturan kartu", () => {
  it("awalan sesuai role", () => {
    expect(cardPrefixFor("STUDENT")).toBe("S");
    expect(cardPrefixFor("CREATOR")).toBe("C");
    expect(cardPrefixFor("MENTOR")).toBe("M");
    expect(cardPrefixFor("DIRECTOR")).toBe("A");
    expect(cardPrefixFor("ADMIN_SYSTEM")).toBe("A");
    expect(cardPrefixFor("SUPERADMIN")).toBe("A");
    expect(cardPrefixFor("PARTNER_B2B")).toBeNull();
    expect(cardPrefixFor("LAINNYA")).toBeNull();
  });

  it("format nomor PREFIX.YY.MM.NNNNNN", () => {
    expect(formatCardNumber("S", new Date("2026-11-17T03:00:00Z"), 42)).toBe("S.26.11.000042");
  });

  it("bulan mengikuti WIB, bukan UTC", () => {
    // 31 Okt 2026 18:00 UTC = 1 Nov 2026 01:00 WIB
    expect(formatCardNumber("S", new Date("2026-10-31T18:00:00Z"), 1)).toBe("S.26.11.000001");
  });

  it("nomor bayangan memakai tanda bintang", () => {
    expect(shadowCardNumber("S", new Date("2026-11-17T03:00:00Z"))).toBe("S.26.11.******");
  });
});
