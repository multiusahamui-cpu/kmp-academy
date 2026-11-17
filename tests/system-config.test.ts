import { describe, it, expect } from "vitest";
import {
  CONFIG_DEFINITIONS,
  DEFAULT_PUBLIC_CONFIG,
  buildPublicConfig,
  getConfigDefinition,
  resolveConfigValue,
  validateConfigValue,
} from "../shared/system-config";

const def = (key: string) => {
  const found = getConfigDefinition(key);
  if (!found) throw new Error(`definisi ${key} tidak ada`);
  return found;
};

describe("definisi konfigurasi", () => {
  it("key unik dan setiap nilai bawaan lolos validasinya sendiri", () => {
    const keys = CONFIG_DEFINITIONS.map((d) => d.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const d of CONFIG_DEFINITIONS) {
      expect(validateConfigValue(d, d.defaultValue), d.key).toEqual({ ok: true, value: d.defaultValue });
    }
  });

  it("tidak ada parameter yang berbau secret", () => {
    for (const d of CONFIG_DEFINITIONS) {
      expect(d.key).not.toMatch(/secret|password$|token|database|smtp/);
    }
  });
});

describe("validateConfigValue", () => {
  it("boolean: menerima on/off/true/false, menolak lainnya", () => {
    expect(validateConfigValue(def("maintenance_mode"), "on")).toEqual({ ok: true, value: "on" });
    expect(validateConfigValue(def("maintenance_mode"), true)).toEqual({ ok: true, value: "on" });
    expect(validateConfigValue(def("maintenance_mode"), "FALSE")).toEqual({ ok: true, value: "off" });
    expect(validateConfigValue(def("maintenance_mode"), "ya").ok).toBe(false);
  });

  it("integer: menegakkan batas min/max dan menolak bukan bilangan bulat", () => {
    const hours = def("login_session_hours");
    expect(validateConfigValue(hours, "24")).toEqual({ ok: true, value: "24" });
    expect(validateConfigValue(hours, 12)).toEqual({ ok: true, value: "12" });
    expect(validateConfigValue(hours, "0").ok).toBe(false);
    expect(validateConfigValue(hours, "169").ok).toBe(false);
    expect(validateConfigValue(hours, "1.5").ok).toBe(false);
    expect(validateConfigValue(hours, "-3").ok).toBe(false);
    expect(validateConfigValue(hours, "1e2").ok).toBe(false);
  });

  it("password minimal tidak bisa diturunkan di bawah 8", () => {
    expect(validateConfigValue(def("password_min_length"), "6").ok).toBe(false);
    expect(validateConfigValue(def("password_min_length"), "12").ok).toBe(true);
  });

  it("teks: kosong hanya boleh bila allowEmpty, panjang dibatasi", () => {
    expect(validateConfigValue(def("announcement_text"), "  ")).toEqual({ ok: true, value: "" });
    expect(validateConfigValue(def("site_name"), "  ").ok).toBe(false);
    expect(validateConfigValue(def("site_name"), "x".repeat(61)).ok).toBe(false);
    expect(validateConfigValue(def("site_name"), "  Academy  ")).toEqual({ ok: true, value: "Academy" });
  });

  it("email dan nomor WhatsApp divalidasi formatnya", () => {
    expect(validateConfigValue(def("support_email"), "bukan-email").ok).toBe(false);
    expect(validateConfigValue(def("support_email"), "a@b.id").ok).toBe(true);
    expect(validateConfigValue(def("support_whatsapp"), "0812-abc").ok).toBe(false);
    expect(validateConfigValue(def("support_whatsapp"), "+628123456789").ok).toBe(true);
  });

  it("menolak tipe nilai yang tidak dikenal", () => {
    expect(validateConfigValue(def("site_name"), { a: 1 }).ok).toBe(false);
    expect(validateConfigValue(def("site_name"), null).ok).toBe(false);
  });
});

describe("resolveConfigValue & konfigurasi publik", () => {
  it("nilai tersimpan yang rusak jatuh ke nilai bawaan", () => {
    expect(resolveConfigValue(def("max_upload_mb"), "9999")).toBe("50");
    expect(resolveConfigValue(def("max_upload_mb"), undefined)).toBe("50");
    expect(resolveConfigValue(def("max_upload_mb"), "10")).toBe("10");
  });

  it("nilai bawaan tidak mengubah perilaku lama", () => {
    expect(DEFAULT_PUBLIC_CONFIG).toMatchObject({
      maintenanceMode: false,
      registrationOpen: true,
      autoLogoutMinutes: 0,
      passwordMinLength: 8,
      defaultPassingGrade: 70,
    });
  });

  it("buildPublicConfig mengubah on/off dan angka ke tipe yang benar", () => {
    const values: Record<string, string> = { maintenance_mode: "on", auto_logout_minutes: "15" };
    const cfg = buildPublicConfig((key) => values[key] ?? def(key).defaultValue);
    expect(cfg.maintenanceMode).toBe(true);
    expect(cfg.autoLogoutMinutes).toBe(15);
  });
});
