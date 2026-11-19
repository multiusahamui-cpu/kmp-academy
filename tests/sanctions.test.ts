import { describe, expect, it } from "vitest";
import { shouldReactivate, validateLiftNote, validateSanction } from "../shared/sanctions";

describe("validateSanction", () => {
  it("menerima peringatan dan pembekuan dengan alasan cukup", () => {
    expect(validateSanction({ kind: "WARNING", reason: "  Laporan terlambat berulang " })).toEqual({ ok: true, value: { kind: "WARNING", reason: "Laporan terlambat berulang" } });
    expect(validateSanction({ kind: "SUSPEND", reason: "Pelanggaran perjanjian kerja sama" }).ok).toBe(true);
  });
  it("menolak jenis asing, alasan pendek atau terlalu panjang", () => {
    expect(validateSanction({ kind: "BAN", reason: "alasan cukup panjang" }).ok).toBe(false);
    expect(validateSanction({ kind: "WARNING", reason: "pendek" }).ok).toBe(false);
    expect(validateSanction({ kind: "WARNING", reason: "x".repeat(1001) }).ok).toBe(false);
    expect(validateSanction(null).ok).toBe(false);
  });
});

describe("validateLiftNote & shouldReactivate", () => {
  it("catatan pencabutan minimal 10 karakter", () => {
    expect(validateLiftNote({ note: "Sudah diselesaikan" })).toEqual({ ok: true, value: "Sudah diselesaikan" });
    expect(validateLiftNote({ note: "ok" }).ok).toBe(false);
    expect(validateLiftNote(undefined).ok).toBe(false);
  });
  it("aktif kembali hanya bila SUSPENDED dan tak ada pembekuan lain", () => {
    expect(shouldReactivate("SUSPENDED", 0)).toBe(true);
    expect(shouldReactivate("SUSPENDED", 1)).toBe(false);
    expect(shouldReactivate("ARCHIVED", 0)).toBe(false);
    expect(shouldReactivate("ACTIVE", 0)).toBe(false);
  });
});
