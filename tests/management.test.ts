import { describe, expect, it } from "vitest";
import { reportPeriod, validateBroadcast } from "../shared/management";

describe("reportPeriod", () => {
  const now = new Date("2026-11-19T03:00:00Z");
  it("mingguan: tujuh hari terakhir sampai sekarang", () => {
    const p = reportPeriod("WEEKLY", now);
    expect(p.end.getTime()).toBe(now.getTime());
    expect(now.getTime() - p.start.getTime()).toBe(7 * 86_400_000);
  });
  it("bulanan: bulan kalender sebelumnya menurut WIB", () => {
    const p = reportPeriod("MONTHLY", now);
    expect(p.start.toISOString()).toBe("2026-09-30T17:00:00.000Z");
    expect(p.end.toISOString()).toBe("2026-10-31T17:00:00.000Z");
  });
  it("bulanan di Januari mengambil Desember tahun sebelumnya", () => {
    const p = reportPeriod("MONTHLY", new Date("2026-01-15T00:00:00Z"));
    expect(p.start.toISOString()).toBe("2025-11-30T17:00:00.000Z");
    expect(p.end.toISOString()).toBe("2025-12-31T17:00:00.000Z");
  });
  it("tepat lewat tengah malam WIB sudah dihitung bulan baru", () => {
    const p = reportPeriod("MONTHLY", new Date("2026-10-31T17:30:00Z"));
    expect(p.end.toISOString()).toBe("2026-10-31T17:00:00.000Z");
  });
});

describe("validateBroadcast", () => {
  it("menerima siaran sah", () => {
    expect(validateBroadcast({ title: " Libur ", body: " Layanan libur ", audience: "ALL" })).toEqual({ ok: true, value: { title: "Libur", body: "Layanan libur", audience: "ALL" } });
  });
  it("menolak judul/isi pendek, terlalu panjang, dan sasaran selain yang diizinkan", () => {
    expect(validateBroadcast({ title: "x", body: "isi isi", audience: "ALL" }).ok).toBe(false);
    expect(validateBroadcast({ title: "Judul", body: "x", audience: "ALL" }).ok).toBe(false);
    expect(validateBroadcast({ title: "Judul", body: "x".repeat(2001), audience: "ALL" }).ok).toBe(false);
    expect(validateBroadcast({ title: "Judul", body: "isi isi", audience: "ADMIN_SYSTEM" }).ok).toBe(false);
    expect(validateBroadcast(null).ok).toBe(false);
  });
});
