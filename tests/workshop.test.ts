import { describe, expect, it } from "vitest";
import { splitWorkshopRevenue, validateDecisionNote, validateProposal } from "../shared/workshop";

describe("splitWorkshopRevenue", () => {
  it("60/25/15 dari 250000", () => {
    expect(splitWorkshopRevenue(250000, 60, 25)).toMatchObject({ owner: 150000, mentor: 62500, platform: 37500, platformPercent: 15 });
  });
  it("selalu berjumlah utuh, sisa pembulatan untuk Lembaga", () => {
    const s = splitWorkshopRevenue(33333, 60, 25);
    expect(s.owner + s.mentor + s.platform).toBe(33333);
    expect(s).toMatchObject({ owner: 19999, mentor: 8333, platform: 5001 });
  });
  it("bagian Mentor dipangkas bila total melebihi 100", () => {
    const s = splitWorkshopRevenue(1000, 90, 25);
    expect(s).toMatchObject({ ownerPercent: 90, mentorPercent: 10, platformPercent: 0, owner: 900, mentor: 100, platform: 0 });
  });
  it("jumlah nol atau tak valid menghasilkan nol", () => {
    expect(splitWorkshopRevenue(0, 60, 25)).toMatchObject({ owner: 0, mentor: 0, platform: 0 });
    expect(splitWorkshopRevenue(NaN, 60, 25).platform).toBe(0);
  });
});

describe("validateProposal", () => {
  const base = { sourceCourseId: "abc", title: "Workshop Akuntansi", description: "x", price: 100000 };
  it("menerima proposal wajar", () => expect(validateProposal(base).ok).toBe(true));
  it("menolak judul pendek, harga bukan bulat positif, dan tanpa sumber", () => {
    expect(validateProposal({ ...base, title: "ab" }).ok).toBe(false);
    expect(validateProposal({ ...base, price: 0 }).ok).toBe(false);
    expect(validateProposal({ ...base, price: 10.5 }).ok).toBe(false);
    expect(validateProposal({ ...base, price: "100" }).ok).toBe(false);
    expect(validateProposal({ ...base, sourceCourseId: "" }).ok).toBe(false);
  });
});

describe("validateDecisionNote", () => {
  it("penolakan wajib beralasan, persetujuan boleh kosong", () => {
    expect(validateDecisionNote({ note: "pendek" }, true).ok).toBe(false);
    expect(validateDecisionNote({ note: "Alasan yang cukup jelas" }, true).ok).toBe(true);
    expect(validateDecisionNote({}, false)).toEqual({ ok: true, value: "" });
  });
});
