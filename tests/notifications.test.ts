import { describe, expect, it } from "vitest";
import {
  DEFAULT_NOTIFICATION_SETTINGS, NOTIFICATION_CATEGORIES, buildNotificationEmail, emailCategoryIds, isCategory, isLockedCategory, shouldCreate,
  shouldEmail, validateNotificationSettings,
} from "../shared/notifications";

describe("kategori notifikasi", () => {
  it("akun dan pembayaran terkunci; lainnya boleh dimatikan", () => {
    expect(isLockedCategory("AKUN")).toBe(true);
    expect(isLockedCategory("PEMBAYARAN")).toBe(true);
    for (const id of ["BELAJAR", "ADMIN", "INFO"]) expect(isLockedCategory(id)).toBe(false);
    expect(isLockedCategory("TIDAK-ADA")).toBe(false);
  });
  it("id unik dan dikenali", () => {
    const ids = NOTIFICATION_CATEGORIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(isCategory("BELAJAR")).toBe(true);
    expect(isCategory("belajar")).toBe(false);
    expect(isCategory(5)).toBe(false);
  });
  it("email hanya untuk akun, pembayaran, dan pembelajaran", () => {
    expect(emailCategoryIds().sort()).toEqual(["AKUN", "BELAJAR", "PEMBAYARAN"]);
  });
});

describe("shouldCreate", () => {
  it("melewati kategori yang dimatikan, kecuali yang terkunci", () => {
    expect(shouldCreate("INFO", ["INFO"])).toBe(false);
    expect(shouldCreate("INFO", [])).toBe(true);
    expect(shouldCreate("BELAJAR", ["INFO"])).toBe(true);
    expect(shouldCreate("PEMBAYARAN", ["PEMBAYARAN"])).toBe(true); // terkunci: tetap dibuat walau tersimpan bisu
    expect(shouldCreate("AKUN", ["AKUN"])).toBe(true);
  });
});

describe("shouldEmail", () => {
  it("butuh opt-in dan kategori yang boleh dikirim email", () => {
    expect(shouldEmail("PEMBAYARAN", { notifyEmail: true })).toBe(true);
    expect(shouldEmail("PEMBAYARAN", { notifyEmail: false })).toBe(false);
    expect(shouldEmail("ADMIN", { notifyEmail: true })).toBe(false);
    expect(shouldEmail("INFO", { notifyEmail: true })).toBe(false);
  });
  it("bawaan: semua aktif, email mati", () => {
    expect(DEFAULT_NOTIFICATION_SETTINGS).toEqual({ mutedCategories: [], notifyEmail: false });
  });
});

describe("validateNotificationSettings", () => {
  it("menerima masukan sah dan menghapus duplikat", () => {
    expect(validateNotificationSettings({ mutedCategories: ["INFO", "INFO", "ADMIN"], notifyEmail: true })).toEqual({ ok: true, value: { mutedCategories: ["INFO", "ADMIN"], notifyEmail: true } });
    expect(validateNotificationSettings({ mutedCategories: [], notifyEmail: false }).ok).toBe(true);
  });
  it("menolak mematikan kategori terkunci, kategori asing, dan bentuk salah", () => {
    expect(validateNotificationSettings({ mutedCategories: ["PEMBAYARAN"], notifyEmail: false }).ok).toBe(false);
    expect(validateNotificationSettings({ mutedCategories: ["XYZ"], notifyEmail: false }).ok).toBe(false);
    expect(validateNotificationSettings({ mutedCategories: "INFO", notifyEmail: false }).ok).toBe(false);
    expect(validateNotificationSettings({ mutedCategories: [], notifyEmail: "ya" }).ok).toBe(false);
    expect(validateNotificationSettings(null).ok).toBe(false);
  });
});

describe("buildNotificationEmail", () => {
  it("memberi awalan, memuat isi, dan tidak membiarkan baris baru di subjek", () => {
    const m = buildNotificationEmail("Sertifikat\r\nBcc: x@y.z terbit", "Isi pesan.");
    expect(m.subject.startsWith("[KMP - ADNG Academy] ")).toBe(true);
    expect(m.subject).not.toMatch(/[\r\n]/);
    expect(m.text).toContain("Isi pesan.");
    expect(m.text).toContain("Pengaturan Profil > Notifikasi");
  });
});
