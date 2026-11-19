import { describe, expect, it } from "vitest";
import { splitRevenue } from "../shared/revenue";
import { CONFIG_DEFINITIONS, validateConfigValue } from "../shared/system-config";

describe("splitRevenue", () => {
  it("70/30 dan jumlah selalu utuh", () => {
    expect(splitRevenue(100000, 70)).toEqual({ percent: 70, creator: 70000, platform: 30000 });
    const s = splitRevenue(100001, 70);
    expect(s.creator + s.platform).toBe(100001);
    expect(s.creator).toBe(70000);
  });
  it("gratis atau tidak valid menghasilkan nol", () => {
    expect(splitRevenue(0, 70)).toEqual({ percent: 70, creator: 0, platform: 0 });
    expect(splitRevenue(-5, 70).creator).toBe(0);
    expect(splitRevenue(Number.NaN, 70).platform).toBe(0);
  });
  it("persentase dijepit ke 0-100", () => {
    expect(splitRevenue(1000, 150)).toEqual({ percent: 100, creator: 1000, platform: 0 });
    expect(splitRevenue(1000, -3)).toEqual({ percent: 0, creator: 0, platform: 1000 });
    expect(splitRevenue(1000, Number.NaN).percent).toBe(0);
  });
});

describe("konfigurasi creator_share_percent", () => {
  const def = CONFIG_DEFINITIONS.find((d) => d.key === "creator_share_percent")!;
  it("bawaan 70, bukan publik, menerima 0-100 dan menolak di luar itu", () => {
    expect(def.defaultValue).toBe("70");
    expect(def.isPublic).toBe(false);
    expect(validateConfigValue(def, "100")).toEqual({ ok: true, value: "100" });
    expect(validateConfigValue(def, "0")).toEqual({ ok: true, value: "0" });
    expect(validateConfigValue(def, "101").ok).toBe(false);
    expect(validateConfigValue(def, "70.5").ok).toBe(false);
  });
});
