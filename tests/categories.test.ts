import { describe, expect, it } from "vitest";
import { slugify, validateCategoryInput } from "../shared/categories";

describe("slugify", () => {
  it("mengubah nama menjadi slug URL", () => {
    expect(slugify("Teknologi & Coding")).toBe("teknologi-coding");
    expect(slugify("  Keuangan   & Akuntansi ")).toBe("keuangan-akuntansi");
    expect(slugify("Kafé Ünik!")).toBe("kafe-unik");
  });
});

describe("validateCategoryInput", () => {
  it("menerima masukan sah; slug dibuat dari nama bila kosong; deskripsi kosong jadi null", () => {
    expect(validateCategoryInput({ name: "  Soft  Skills ", description: "  " })).toEqual({ ok: true, value: { name: "Soft Skills", slug: "soft-skills", description: null } });
    expect(validateCategoryInput({ name: "Marketing", slug: "Marketing-Digital", description: "Isi." })).toEqual({ ok: true, value: { name: "Marketing", slug: "marketing-digital", description: "Isi." } });
  });
  it("menolak nama pendek/bukan teks, slug tidak sah, dan deskripsi terlalu panjang", () => {
    expect(validateCategoryInput({ name: "A" }).ok).toBe(false);
    expect(validateCategoryInput({ name: 5 }).ok).toBe(false);
    expect(validateCategoryInput(null).ok).toBe(false);
    expect(validateCategoryInput({ name: "Ok", slug: "pakai spasi" }).ok).toBe(false);
    expect(validateCategoryInput({ name: "Ok", slug: "-x-" }).ok).toBe(false);
    expect(validateCategoryInput({ name: "!!!" }).ok).toBe(false);
    expect(validateCategoryInput({ name: "Ok", description: "x".repeat(301) }).ok).toBe(false);
    expect(validateCategoryInput({ name: "Ok", description: 3 }).ok).toBe(false);
  });
});
