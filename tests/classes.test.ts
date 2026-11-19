import { describe, expect, it } from "vitest";
import { JOIN_CODE_ALPHABET, generateJoinCode, normalizeJoinCode, validateClassInput, validateGrade, validateSessionInput } from "../shared/classes";

describe("kode gabung", () => {
  it("8 karakter dari alfabet tanpa karakter mirip", () => {
    const code = generateJoinCode((m) => Math.floor(Math.random() * m));
    expect(code).toMatch(/^[A-Z2-9]{8}$/);
    expect(JOIN_CODE_ALPHABET).not.toMatch(/[01OIL]/);
  });
  it("normalisasi mengabaikan huruf kecil, spasi, dan tanda hubung", () => {
    expect(normalizeJoinCode(" abcd-2345 ")).toBe("ABCD2345");
    expect(normalizeJoinCode(null)).toBe("");
  });
});

describe("validateClassInput", () => {
  it("menerima nama sah dan deskripsi kosong jadi null", () => {
    expect(validateClassInput({ name: "  Kelas A ", description: " " })).toEqual({ ok: true, value: { name: "Kelas A", description: null } });
  });
  it("menolak nama pendek dan deskripsi terlalu panjang atau bukan teks", () => {
    expect(validateClassInput({ name: "ab" }).ok).toBe(false);
    expect(validateClassInput({ name: "Kelas", description: "x".repeat(1001) }).ok).toBe(false);
    expect(validateClassInput({ name: "Kelas", description: 3 }).ok).toBe(false);
    expect(validateClassInput(null).ok).toBe(false);
  });
});

describe("validateSessionInput", () => {
  const base = { title: "Sesi 1", startsAt: "2026-12-01T10:00:00.000Z" };
  it("menerima sesi dengan atau tanpa tautan https", () => {
    expect(validateSessionInput(base).ok).toBe(true);
    expect(validateSessionInput({ ...base, meetingUrl: "https://zoom.us/j/1" }).ok).toBe(true);
  });
  it("menolak tautan non-https, waktu tidak valid, dan judul pendek", () => {
    expect(validateSessionInput({ ...base, meetingUrl: "http://zoom.us" }).ok).toBe(false);
    expect(validateSessionInput({ ...base, meetingUrl: "javascript:alert(1)" }).ok).toBe(false);
    expect(validateSessionInput({ ...base, startsAt: "besok" }).ok).toBe(false);
    expect(validateSessionInput({ ...base, title: "x" }).ok).toBe(false);
  });
});

describe("validateGrade", () => {
  it("menerima bilangan bulat 0-100 dan catatan opsional", () => {
    expect(validateGrade({ grade: 0 })).toEqual({ ok: true, value: { grade: 0, note: null } });
    expect(validateGrade({ grade: 100, note: " Bagus " })).toEqual({ ok: true, value: { grade: 100, note: "Bagus" } });
  });
  it("menolak di luar rentang, pecahan, bukan angka, dan catatan terlalu panjang", () => {
    for (const g of [-1, 101, 80.5, "80", null]) expect(validateGrade({ grade: g }).ok).toBe(false);
    expect(validateGrade({ grade: 80, note: "x".repeat(501) }).ok).toBe(false);
  });
});
