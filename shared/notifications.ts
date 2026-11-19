// Kategori notifikasi dan aturan pengaturannya. Murni (tanpa database), dipakai server dan klien.

export interface NotificationCategoryDef {
  id: "AKUN" | "PEMBAYARAN" | "BELAJAR" | "ADMIN" | "INFO";
  label: string;
  description: string;
  /** Tidak boleh dimatikan: menyangkut uang, keamanan, atau keputusan atas pengajuan pengguna. */
  locked: boolean;
  /** Boleh dikirim lewat email bila pengguna mengaktifkannya. */
  email: boolean;
  /** Hanya relevan untuk staf (Admin, Direktur, Superadmin). */
  staffOnly: boolean;
}

export const NOTIFICATION_CATEGORIES: readonly NotificationCategoryDef[] = [
  { id: "AKUN", label: "Akun & keamanan", description: "Perubahan email, keputusan pengajuan (role, penghapusan akun), penyelesaian saldo, dan kartu anggota.", locked: true, email: true, staffOnly: false },
  { id: "PEMBAYARAN", label: "Pembayaran", description: "Pembayaran diterima atau ditolak, top-up, dan pengembalian ke dompet.", locked: true, email: true, staffOnly: false },
  { id: "BELAJAR", label: "Pembelajaran", description: "Sertifikat terbit dan status kursus yang Anda ajukan.", locked: false, email: true, staffOnly: false },
  { id: "ADMIN", label: "Antrean kerja staf", description: "Bukti pembayaran, kursus, dan pengajuan yang menunggu keputusan Anda.", locked: false, email: false, staffOnly: true },
  { id: "INFO", label: "Informasi umum", description: "Sambutan dan pengumuman.", locked: false, email: false, staffOnly: false },
];

export type NotificationCategory = NotificationCategoryDef["id"];

export const STAFF_ROLES: readonly string[] = ["SUPERADMIN", "ADMIN_SYSTEM", "DIRECTOR"];

const byId = new Map(NOTIFICATION_CATEGORIES.map((c) => [c.id as string, c]));
export const isCategory = (v: unknown): v is NotificationCategory => typeof v === "string" && byId.has(v);
export const isLockedCategory = (id: string): boolean => byId.get(id)?.locked ?? false;
export const isEmailCategory = (id: string): boolean => byId.get(id)?.email ?? false;
export const emailCategoryIds = (): string[] => NOTIFICATION_CATEGORIES.filter((c) => c.email).map((c) => c.id);

export interface NotificationSettings {
  mutedCategories: NotificationCategory[];
  notifyEmail: boolean;
}

/** Nilai bawaan pengguna yang belum pernah menyimpan pengaturan: semua aktif, email mati (opt-in). */
export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = { mutedCategories: [], notifyEmail: false };

export type SettingsValidation = { ok: true; value: NotificationSettings } | { ok: false; message: string };

export const validateNotificationSettings = (input: unknown): SettingsValidation => {
  const o = (input ?? {}) as { mutedCategories?: unknown; notifyEmail?: unknown };
  if (typeof o.notifyEmail !== "boolean") return { ok: false, message: "Pengaturan email tidak valid." };
  if (!Array.isArray(o.mutedCategories)) return { ok: false, message: "Daftar kategori tidak valid." };
  const muted: NotificationCategory[] = [];
  for (const c of o.mutedCategories) {
    if (!isCategory(c)) return { ok: false, message: "Kategori notifikasi tidak dikenal." };
    if (isLockedCategory(c)) return { ok: false, message: `Notifikasi "${byId.get(c)?.label}" tidak dapat dimatikan.` };
    if (!muted.includes(c)) muted.push(c);
  }
  return { ok: true, value: { mutedCategories: muted, notifyEmail: o.notifyEmail } };
};

/** Apakah notifikasi dari kategori ini dibuat untuk pengguna dengan daftar bisu tersebut. Kategori terkunci selalu dibuat. */
export const shouldCreate = (category: string, muted: readonly string[]): boolean => isLockedCategory(category) || !muted.includes(category);

/** Apakah sebuah notifikasi berhak dikirim lewat email. */
export const shouldEmail = (category: string, settings: { notifyEmail: boolean }): boolean => settings.notifyEmail && isEmailCategory(category);

export const EMAIL_MAX_ATTEMPTS = 3;
/** Notifikasi yang lebih tua dari ini tidak lagi dikirim lewat email (sudah basi). */
export const EMAIL_MAX_AGE_HOURS = 24;

export const buildNotificationEmail = (title: string, body: string): { subject: string; text: string } => ({
  subject: `[KMP - ADNG Academy] ${title}`.replace(/[\r\n]+/g, " ").slice(0, 200),
  text: `${body}\n\n--\nAnda menerima email ini karena mengaktifkan notifikasi email di KMP - ADNG Academy.\nUntuk berhenti, matikan di Pengaturan Profil > Notifikasi.`,
});
