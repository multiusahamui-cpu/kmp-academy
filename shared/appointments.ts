// Pengangkatan Direktur dan Admin Sistem oleh Superadmin. Murni (tanpa database).

export const STAFF_ROLES = [
  { id: "DIRECTOR", label: "Direktur" },
  { id: "ADMIN_SYSTEM", label: "Admin Sistem" },
] as const;
export type StaffRole = (typeof STAFF_ROLES)[number]["id"];

export const isStaffRole = (v: unknown): v is StaffRole => STAFF_ROLES.some((r) => r.id === v);
export const staffLabel = (role: string): string => STAFF_ROLES.find((r) => r.id === role)?.label ?? role;

export const NOTE_MIN = 5;
export const NOTE_MAX = 500;

export type Result<T> = { ok: true; value: T } | { ok: false; message: string };

const noteOf = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

export const validateAppointment = (input: unknown): Result<{ email: string; role: StaffRole; note: string }> => {
  const o = (input ?? {}) as Record<string, unknown>;
  const email = typeof o.email === "string" ? o.email.trim().toLowerCase() : "";
  const note = noteOf(o.note);
  if (!email || !email.includes("@")) return { ok: false, message: "Email pengguna wajib diisi." };
  if (!isStaffRole(o.role)) return { ok: false, message: "Jabatan tidak valid." };
  if (note.length < NOTE_MIN || note.length > NOTE_MAX) return { ok: false, message: `Dasar pengangkatan ${NOTE_MIN}-${NOTE_MAX} karakter (mis. nomor SK).` };
  return { ok: true, value: { email, role: o.role, note } };
};

export const validateDismissal = (input: unknown): Result<string> => {
  const note = noteOf((input as { note?: unknown } | null | undefined)?.note);
  if (note.length < NOTE_MIN || note.length > NOTE_MAX) return { ok: false, message: `Alasan pemberhentian ${NOTE_MIN}-${NOTE_MAX} karakter.` };
  return { ok: true, value: note };
};
