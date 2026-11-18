import { describe, expect, it } from "vitest";
import { checkCanApprove, detectProofType, validateSettlement, validateText } from "../shared/account-deletion";
import { evaluateSession } from "../server/lib/session-user";

describe("validateText", () => {
  it("10-500 karakter setelah dipangkas", () => {
    expect(validateText("  pindah platform ", "Alasan")).toEqual({ ok: true, value: "pindah platform" });
    expect(validateText("pendek", "Alasan").ok).toBe(false);
    expect(validateText("x".repeat(501), "Alasan").ok).toBe(false);
    expect(validateText(undefined, "Alasan").ok).toBe(false);
  });
});

describe("checkCanApprove", () => {
  it("hanya saat saldo nol", () => {
    expect(checkCanApprove(0).ok).toBe(true);
    expect(checkCanApprove(1).ok).toBe(false);
    expect(checkCanApprove(250000).ok).toBe(false);
  });
});

describe("validateSettlement", () => {
  const now = new Date("2026-11-18T10:00:00Z");
  const ok = { amount: 150000, balance: 150000, transferDate: "2026-11-18", bankRef: "TRX-001" };
  it("menerima penyelesaian penuh yang lengkap", () => {
    expect(validateSettlement(ok, now)).toEqual({ ok: true, value: { amount: 150000, transferDate: "2026-11-18", bankRef: "TRX-001" } });
    expect(validateSettlement({ ...ok, amount: "150000" }, now).ok).toBe(true);
  });
  it("menolak nominal berbeda, saldo nol, tanggal buruk atau masa depan, referensi kosong", () => {
    expect(validateSettlement({ ...ok, amount: 149999 }, now).ok).toBe(false);
    expect(validateSettlement({ ...ok, amount: 1.5, balance: 1.5 }, now).ok).toBe(false);
    expect(validateSettlement({ ...ok, balance: 0, amount: 0 }, now).ok).toBe(false);
    expect(validateSettlement({ ...ok, transferDate: "18-11-2026" }, now).ok).toBe(false);
    expect(validateSettlement({ ...ok, transferDate: "2026-02-31" }, now).ok).toBe(false);
    expect(validateSettlement({ ...ok, transferDate: "2026-11-25" }, now).ok).toBe(false);
    expect(validateSettlement({ ...ok, bankRef: "ab" }, now).ok).toBe(false);
  });
});

describe("detectProofType", () => {
  const bytes = (s: string) => Uint8Array.from([...s].map((c) => c.charCodeAt(0)));
  it("mengenali PDF dan gambar, menolak lainnya", () => {
    expect(detectProofType(bytes("%PDF-1.7"))?.ext).toBe("pdf");
    expect(detectProofType(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]))?.ext).toBe("jpg");
    expect(detectProofType(bytes("<html>"))).toBeNull();
    expect(detectProofType(bytes("MZ\u0090"))).toBeNull();
    expect(detectProofType(new Uint8Array())).toBeNull();
  });
});

describe("sesi akun ARCHIVED", () => {
  it("ditolak 403 dengan pesan akun ditutup", () => {
    const r = evaluateSession({ userId: "u", loginAt: 1 }, { id: "u", role: "STUDENT", email: null, status: "ARCHIVED", passwordChangedAt: null });
    expect(r).toMatchObject({ ok: false, status: 403, message: "Akun ini telah ditutup." });
  });
});
