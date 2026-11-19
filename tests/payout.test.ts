import { describe, expect, it } from "vitest";
import { isPostingDay, maskAccount, nextCutoffAt, payoutCutoffAt, periodLabel, previousCutoff, validateBankAccount, validateTransfer, validateVoidNote } from "../shared/payout";

const iso = (d: Date) => d.toISOString();

describe("batas posting (awal tanggal 25 WIB)", () => {
  it("sebelum tgl 25 memakai tgl 25 bulan lalu, mulai tgl 25 memakai bulan ini", () => {
    expect(iso(payoutCutoffAt(new Date("2026-11-19T05:00:00Z")))).toBe("2026-10-24T17:00:00.000Z");
    expect(iso(payoutCutoffAt(new Date("2026-11-25T03:00:00Z")))).toBe("2026-11-24T17:00:00.000Z");
    expect(iso(payoutCutoffAt(new Date("2026-11-30T03:00:00Z")))).toBe("2026-11-24T17:00:00.000Z");
  });
  it("tepat pada batas dan sesaat sebelumnya", () => {
    expect(iso(payoutCutoffAt(new Date("2026-11-24T17:00:00Z")))).toBe("2026-11-24T17:00:00.000Z");
    expect(iso(payoutCutoffAt(new Date("2026-11-24T16:59:59Z")))).toBe("2026-10-24T17:00:00.000Z");
  });
  it("melintasi pergantian tahun", () => {
    expect(iso(payoutCutoffAt(new Date("2027-01-10T00:00:00Z")))).toBe("2026-12-24T17:00:00.000Z");
    expect(iso(previousCutoff(new Date("2027-01-24T17:00:00Z")))).toBe("2026-12-24T17:00:00.000Z");
    expect(iso(nextCutoffAt(new Date("2026-12-26T00:00:00Z")))).toBe("2027-01-24T17:00:00.000Z");
  });
  it("hari posting mengikuti tanggal WIB, bukan UTC", () => {
    expect(isPostingDay(new Date("2026-11-24T17:00:00Z"))).toBe(true); // 00:00 WIB tgl 25
    expect(isPostingDay(new Date("2026-11-24T16:59:00Z"))).toBe(false);
    expect(isPostingDay(new Date("2026-11-25T16:59:00Z"))).toBe(true); // 23:59 WIB tgl 25
    expect(isPostingDay(new Date("2026-11-25T17:00:00Z"))).toBe(false);
  });
  it("label periode", () => {
    expect(periodLabel(new Date("2026-11-24T17:00:00Z"), true)).toBe("25 Okt 2026 - 24 Nov 2026");
    expect(periodLabel(new Date("2026-11-24T17:00:00Z"), false)).toBe("Sejak awal - 24 Nov 2026");
  });
});

describe("validasi", () => {
  it("rekening: angka 6-25 digit, spasi dan strip dibuang", () => {
    expect(validateBankAccount({ bankName: "BCA", accountNumber: "123 456-7890", holderName: "Budi" })).toEqual({ ok: true, value: { bankName: "BCA", accountNumber: "1234567890", holderName: "Budi" } });
    expect(validateBankAccount({ bankName: "BCA", accountNumber: "12ab", holderName: "Budi" }).ok).toBe(false);
    expect(validateBankAccount({ bankName: "", accountNumber: "1234567", holderName: "Budi" }).ok).toBe(false);
    expect(validateBankAccount(null).ok).toBe(false);
  });
  it("transfer dan pembatalan", () => {
    expect(validateTransfer({ transferRef: " TRF-1 ", note: "" })).toEqual({ ok: true, value: { transferRef: "TRF-1", note: "" } });
    expect(validateTransfer({ transferRef: "x" }).ok).toBe(false);
    expect(validateVoidNote({ note: "pendek" }).ok).toBe(false);
    expect(validateVoidNote({ note: "Alasan yang cukup jelas" }).ok).toBe(true);
  });
  it("nomor rekening disamarkan", () => {
    expect(maskAccount("1234567890")).toBe("******7890");
    expect(maskAccount("123")).toBe("123");
  });
});
