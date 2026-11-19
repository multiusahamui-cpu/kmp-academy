import { describe, expect, it } from "vitest";
import { LEGAL_KINDS, currentVersion, requiredKindsForRole, validateLegalInput } from "../shared/legal";
import { LEGAL_DRAFTS } from "../shared/legal-drafts";

describe("requiredKindsForRole", () => {
  it("semua peran: syarat dan privasi; mentor dan creator ditambah perjanjian", () => {
    expect(requiredKindsForRole("STUDENT")).toEqual(["TERMS", "PRIVACY"]);
    expect(requiredKindsForRole("MENTOR")).toEqual(["TERMS", "PRIVACY", "MENTOR_AGREEMENT"]);
    expect(requiredKindsForRole("CREATOR")).toEqual(["TERMS", "PRIVACY", "CREATOR_AGREEMENT"]);
  });
});

describe("validateLegalInput", () => {
  it("menerima judul dan isi yang cukup, menolak yang pendek", () => {
    expect(validateLegalInput({ title: " Judul ", body: "x".repeat(120) }).ok).toBe(true);
    expect(validateLegalInput({ title: "ab", body: "x".repeat(120) }).ok).toBe(false);
    expect(validateLegalInput({ title: "Judul", body: "pendek" }).ok).toBe(false);
    expect(validateLegalInput(null).ok).toBe(false);
  });
});

describe("currentVersion", () => {
  it("memilih versi terbit tertinggi dan mengabaikan draf", () => {
    const docs = [
      { kind: "TERMS", version: 1, status: "PUBLISHED" },
      { kind: "TERMS", version: 2, status: "PUBLISHED" },
      { kind: "TERMS", version: 3, status: "DRAFT" },
      { kind: "PRIVACY", version: 1, status: "DRAFT" },
    ];
    expect(currentVersion(docs, "TERMS")?.version).toBe(2);
    expect(currentVersion(docs, "PRIVACY")).toBeNull();
  });
});

describe("LEGAL_DRAFTS", () => {
  it("ada draf lolos validasi untuk tiap jenis dan masih bertanda belum final", () => {
    for (const k of LEGAL_KINDS) {
      const d = LEGAL_DRAFTS[k.id];
      expect(validateLegalInput(d).ok).toBe(true);
      expect(d.body).toContain("[PERLU DIKONFIRMASI");
    }
  });
  it("perjanjian mentor dan creator memuat pembagian hasil yang disepakati", () => {
    expect(LEGAL_DRAFTS.MENTOR_AGREEMENT.body).toMatch(/60/);
    expect(LEGAL_DRAFTS.MENTOR_AGREEMENT.body).toMatch(/25/);
    expect(LEGAL_DRAFTS.CREATOR_AGREEMENT.body).toMatch(/70/);
  });
});
