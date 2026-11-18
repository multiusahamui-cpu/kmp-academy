import { describe, expect, it } from "vitest";
import { applyPercent, bestAutoDiscount, generateCode, isDiscountActive, isValidCodeFormat, normalizeCode, quotePrice, validateDiscountInput, type DiscountLike } from "../shared/pricing";

const now = new Date("2026-11-19T00:00:00Z");
const d = (o: Partial<DiscountLike> = {}): DiscountLike => ({ id: "d1", kind: "AUTO", percent: 20, startsAt: new Date("2026-11-01T00:00:00Z"), endsAt: new Date("2026-12-01T00:00:00Z"), maxRedemptions: null, redemptionCount: 0, cancelledAt: null, ...o });

describe("applyPercent", () => {
  it("memotong dengan pembulatan ke bawah pada potongan", () => {
    expect(applyPercent(100000, 25)).toBe(75000);
    expect(applyPercent(99999, 33)).toBe(99999 - 32999);
    expect(applyPercent(1000, 100)).toBe(0);
    expect(applyPercent(1000, 0)).toBe(1000);
  });
  it("menolak masukan tidak valid", () => {
    expect(() => applyPercent(-1, 10)).toThrow();
    expect(() => applyPercent(1000, 101)).toThrow();
    expect(() => applyPercent(1000, 10.5)).toThrow();
  });
});

describe("isDiscountActive", () => {
  it("memeriksa periode, pembatalan, dan kuota", () => {
    expect(isDiscountActive(d(), now)).toBe(true);
    expect(isDiscountActive(d({ startsAt: new Date("2026-12-01T00:00:00Z"), endsAt: new Date("2026-12-31T00:00:00Z") }), now)).toBe(false);
    expect(isDiscountActive(d({ endsAt: now }), now)).toBe(false);
    expect(isDiscountActive(d({ cancelledAt: new Date() }), now)).toBe(false);
    expect(isDiscountActive(d({ maxRedemptions: 5, redemptionCount: 5 }), now)).toBe(false);
    expect(isDiscountActive(d({ maxRedemptions: 5, redemptionCount: 4 }), now)).toBe(true);
  });
});

describe("bestAutoDiscount dan quotePrice", () => {
  it("memilih persen terbesar, tidak menumpuk, mengabaikan kode dan yang tidak aktif", () => {
    const list = [d({ id: "a", percent: 10 }), d({ id: "b", percent: 30 }), d({ id: "c", percent: 90, cancelledAt: new Date() }), d({ id: "k", kind: "CODE", percent: 80 })];
    expect(bestAutoDiscount(list, now)?.id).toBe("b");
    expect(bestAutoDiscount([], now)).toBeNull();
  });
  it("kode menang hanya bila persennya lebih besar", () => {
    const auto = d({ id: "auto", percent: 30 });
    expect(quotePrice(100000, auto, d({ id: "k", kind: "CODE", percent: 50 }))).toMatchObject({ discountId: "k", finalPrice: 50000, viaCode: true });
    expect(quotePrice(100000, auto, d({ id: "k", kind: "CODE", percent: 30 }))).toMatchObject({ discountId: "auto", finalPrice: 70000, viaCode: false });
    expect(quotePrice(100000, null, null)).toMatchObject({ discountId: null, finalPrice: 100000, percent: 0 });
    expect(quotePrice(100000, null, d({ kind: "CODE", percent: 100 })).finalPrice).toBe(0);
  });
});

describe("kode", () => {
  it("normalisasi dan format", () => {
    expect(normalizeCode("  koperasi50 ")).toBe("KOPERASI50");
    expect(isValidCodeFormat("KOPERASI50")).toBe(true);
    expect(isValidCodeFormat("AB")).toBe(false);
    expect(isValidCodeFormat("ADA SPASI")).toBe(false);
    expect(isValidCodeFormat("-DEPAN")).toBe(false);
  });
  it("kode acak memakai alfabet aman dan panjang sesuai", () => {
    const c = generateCode((m) => Math.floor(Math.random() * m), 12);
    expect(c).toMatch(/^[A-HJ-KM-NP-Z2-9]{12}$/);
  });
});

describe("validateDiscountInput", () => {
  const ok = { kind: "CODE", percent: 25, startsAt: "2026-11-20T00:00:00Z", endsAt: "2026-12-20T00:00:00Z", code: "hemat25", reason: "" };
  it("menerima input valid dan menormalkan kode", () => {
    const r = validateDiscountInput(ok, { now, reasonRequired: false });
    expect(r.ok && r.value.code).toBe("HEMAT25");
  });
  it("menolak persen, periode, dan alasan yang salah", () => {
    expect(validateDiscountInput({ ...ok, percent: 0 }, { now, reasonRequired: false }).ok).toBe(false);
    expect(validateDiscountInput({ ...ok, percent: 101 }, { now, reasonRequired: false }).ok).toBe(false);
    expect(validateDiscountInput({ ...ok, endsAt: "2026-11-10T00:00:00Z", startsAt: "2026-11-01T00:00:00Z" }, { now, reasonRequired: false }).ok).toBe(false);
    expect(validateDiscountInput({ ...ok, endsAt: "2028-12-20T00:00:00Z" }, { now, reasonRequired: false }).ok).toBe(false);
    expect(validateDiscountInput(ok, { now, reasonRequired: true }).ok).toBe(false);
    expect(validateDiscountInput({ ...ok, reason: "Promo akhir tahun" }, { now, reasonRequired: true }).ok).toBe(true);
  });
  it("AUTO tidak butuh kode; kuota harus bilangan bulat positif", () => {
    expect(validateDiscountInput({ ...ok, kind: "AUTO", code: undefined }, { now, reasonRequired: false }).ok).toBe(true);
    expect(validateDiscountInput({ ...ok, maxRedemptions: 0 }, { now, reasonRequired: false }).ok).toBe(false);
  });
});
