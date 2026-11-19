import { describe, expect, it } from "vitest";
import { isStaffRole, validateAppointment, validateDismissal } from "../shared/appointments";

describe("validateAppointment", () => {
  const base = { email: " Budi@X.id ", role: "DIRECTOR", note: "SK 01/2026" };
  it("menormalkan email dan menerima jabatan sah", () => {
    expect(validateAppointment(base)).toEqual({ ok: true, value: { email: "budi@x.id", role: "DIRECTOR", note: "SK 01/2026" } });
    expect(validateAppointment({ ...base, role: "ADMIN_SYSTEM" }).ok).toBe(true);
  });
  it("menolak jabatan lain (termasuk SUPERADMIN), email buruk, dasar pendek", () => {
    expect(validateAppointment({ ...base, role: "SUPERADMIN" }).ok).toBe(false);
    expect(validateAppointment({ ...base, email: "bukan-email" }).ok).toBe(false);
    expect(validateAppointment({ ...base, note: "x" }).ok).toBe(false);
    expect(validateAppointment(null).ok).toBe(false);
  });
});

describe("validateDismissal & isStaffRole", () => {
  it("alasan minimal 5 karakter", () => {
    expect(validateDismissal({ note: "Masa jabatan berakhir" }).ok).toBe(true);
    expect(validateDismissal({ note: "ab" }).ok).toBe(false);
  });
  it("hanya Direktur dan Admin Sistem", () => {
    expect(isStaffRole("DIRECTOR")).toBe(true);
    expect(isStaffRole("MENTOR")).toBe(false);
  });
});
