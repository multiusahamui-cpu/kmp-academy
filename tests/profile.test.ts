import { describe, expect, it } from "vitest";
import { detectImageType, validateBio, validateName } from "../shared/profile";

describe("validateName", () => {
  it("merapikan spasi dan menerima nama wajar", () => {
    expect(validateName("  Budi   Santoso ")).toEqual({ ok: true, value: "Budi Santoso" });
  });
  it("menolak terlalu pendek, terlalu panjang, bukan teks, dan karakter kontrol", () => {
    expect(validateName("A").ok).toBe(false);
    expect(validateName("x".repeat(101)).ok).toBe(false);
    expect(validateName(123).ok).toBe(false);
    expect(validateName("Bu\u0000di").ok).toBe(false);
  });
});

describe("validateBio", () => {
  it("kosong menjadi null, teks dipangkas, terlalu panjang ditolak", () => {
    expect(validateBio("  ")).toEqual({ ok: true, value: null });
    expect(validateBio(undefined)).toEqual({ ok: true, value: null });
    expect(validateBio(" halo ")).toEqual({ ok: true, value: "halo" });
    expect(validateBio("x".repeat(501)).ok).toBe(false);
    expect(validateBio(5).ok).toBe(false);
  });
});

describe("detectImageType", () => {
  it("mengenali JPG, PNG, WebP dari isi berkas", () => {
    expect(detectImageType(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]))?.ext).toBe("jpg");
    expect(detectImageType(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))?.ext).toBe("png");
    const webp = Uint8Array.from([..."RIFF"].map((c) => c.charCodeAt(0)).concat([0, 0, 0, 0], [..."WEBP"].map((c) => c.charCodeAt(0))));
    expect(detectImageType(webp)?.ext).toBe("webp");
  });
  it("menolak GIF, SVG, HTML, dan berkas kosong", () => {
    expect(detectImageType(Uint8Array.from([..."GIF89a"].map((c) => c.charCodeAt(0))))).toBeNull();
    expect(detectImageType(Uint8Array.from([..."<svg xmlns"].map((c) => c.charCodeAt(0))))).toBeNull();
    expect(detectImageType(Uint8Array.from([..."<html>"].map((c) => c.charCodeAt(0))))).toBeNull();
    expect(detectImageType(new Uint8Array())).toBeNull();
  });
});
