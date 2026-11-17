/**
 * Konfigurasi Sistem Academy — daftar parameter yang boleh diatur Superadmin.
 *
 * Sumber kebenaran daftar parameter ada DI SINI (kode), bukan di database:
 * database hanya menyimpan nilai yang sudah diubah (tabel academy.system_config).
 * Parameter yang tidak ada di daftar ini ditolak server. Secret (password
 * database, JWT_SECRET, SMTP) TIDAK PERNAH masuk ke sini — tetap di .env.
 *
 * Dipakai bersama oleh server (validasi, nilai bawaan) dan client (form, nilai bawaan).
 */

export type ConfigType = "boolean" | "integer" | "text" | "longtext" | "email" | "phone";
export type ConfigGroupId = "umum" | "keamanan" | "pembelajaran";

export interface ConfigDefinition {
  key: string;
  group: ConfigGroupId;
  label: string;
  description: string;
  type: ConfigType;
  /** Nilai bawaan (dipakai selama belum pernah diubah). Boolean ditulis "on"/"off". */
  defaultValue: string;
  min?: number;
  max?: number;
  maxLength?: number;
  unit?: string;
  allowEmpty?: boolean;
  /** true = boleh dibaca tanpa login lewat GET /api/config/public. */
  isPublic: boolean;
}

export const CONFIG_GROUPS: { id: ConfigGroupId; label: string; description: string }[] = [
  { id: "umum", label: "Umum & Akses", description: "Identitas situs, kontak bantuan, pengumuman, maintenance, dan pendaftaran." },
  { id: "keamanan", label: "Keamanan Sesi", description: "Masa berlaku login, auto-logout, dan aturan password." },
  { id: "pembelajaran", label: "Pembelajaran", description: "Nilai bawaan ujian dan batas unggah materi." },
];

export const CONFIG_DEFINITIONS: ConfigDefinition[] = [
  // ── Umum & Akses ──
  {
    key: "site_name", group: "umum", type: "text", isPublic: true,
    label: "Nama situs",
    description: "Ditampilkan di kepala halaman dan sidebar.",
    defaultValue: "KMP - ADNG ACADEMY", maxLength: 60,
  },
  {
    key: "support_email", group: "umum", type: "email", isPublic: true,
    label: "Email bantuan",
    description: "Alamat email yang ditampilkan kepada pengguna untuk bantuan.",
    defaultValue: "support.academy@kodman.id", maxLength: 120,
  },
  {
    key: "support_whatsapp", group: "umum", type: "phone", isPublic: true,
    label: "WhatsApp bantuan",
    description: "Nomor WhatsApp bantuan, format internasional (contoh +62812...).",
    defaultValue: "+628128089916", maxLength: 20,
  },
  {
    key: "announcement_text", group: "umum", type: "longtext", isPublic: true, allowEmpty: true,
    label: "Teks pengumuman",
    description: "Tampil sebagai pita di bagian atas semua halaman. Kosongkan untuk menyembunyikan.",
    defaultValue: "", maxLength: 300,
  },
  {
    key: "maintenance_mode", group: "umum", type: "boolean", isPublic: true,
    label: "Mode maintenance",
    description: "Bila aktif, hanya Superadmin yang bisa login dan memakai aplikasi; pengguna lain melihat pesan maintenance.",
    defaultValue: "off",
  },
  {
    key: "maintenance_message", group: "umum", type: "longtext", isPublic: true,
    label: "Pesan maintenance",
    description: "Pesan yang dilihat pengguna selama mode maintenance aktif.",
    defaultValue: "Sistem sedang dalam pemeliharaan. Silakan coba beberapa saat lagi.", maxLength: 300,
  },
  {
    key: "registration_open", group: "umum", type: "boolean", isPublic: true,
    label: "Pendaftaran publik dibuka",
    description: "Bila dimatikan, form Daftar Baru disembunyikan dan server menolak pendaftaran baru.",
    defaultValue: "on",
  },

  // ── Keamanan Sesi ──
  {
    key: "login_session_hours", group: "keamanan", type: "integer", isPublic: false,
    label: "Masa berlaku login",
    description: "Lama sebuah login berlaku sebelum pengguna harus masuk lagi. Berlaku untuk login berikutnya.",
    defaultValue: "24", min: 1, max: 168, unit: "jam",
  },
  {
    key: "auto_logout_minutes", group: "keamanan", type: "integer", isPublic: true,
    label: "Auto-logout saat diam",
    description: "Pengguna dikeluarkan otomatis setelah tidak ada aktivitas selama waktu ini. Isi 0 untuk menonaktifkan.",
    defaultValue: "0", min: 0, max: 720, unit: "menit",
  },
  {
    key: "password_min_length", group: "keamanan", type: "integer", isPublic: true,
    label: "Panjang minimal password",
    description: "Berlaku untuk pendaftaran akun baru.",
    defaultValue: "8", min: 8, max: 64, unit: "karakter",
  },

  // ── Pembelajaran ──
  {
    key: "default_passing_grade", group: "pembelajaran", type: "integer", isPublic: true,
    label: "Nilai lulus ujian bawaan",
    description: "Nilai awal yang terisi saat Creator membuat ujian baru; Creator tetap bisa mengubahnya per kursus.",
    defaultValue: "70", min: 1, max: 100, unit: "poin",
  },
  {
    key: "max_upload_mb", group: "pembelajaran", type: "integer", isPublic: true,
    label: "Batas ukuran unggah materi",
    description: "Ukuran maksimal satu berkas materi. Batas atas 50 MB mengikuti batas nginx.",
    defaultValue: "50", min: 1, max: 50, unit: "MB",
  },
];

const DEFINITION_BY_KEY = new Map(CONFIG_DEFINITIONS.map((d) => [d.key, d]));

export function getConfigDefinition(key: string): ConfigDefinition | undefined {
  return DEFINITION_BY_KEY.get(key);
}

export type ConfigValidation = { ok: true; value: string } | { ok: false; message: string };

/** Memvalidasi dan menormalkan nilai yang akan disimpan. */
export function validateConfigValue(def: ConfigDefinition, raw: unknown): ConfigValidation {
  let text: string;
  if (typeof raw === "boolean") text = raw ? "on" : "off";
  else if (typeof raw === "number" && Number.isFinite(raw)) text = String(raw);
  else if (typeof raw === "string") text = raw.trim();
  else return { ok: false, message: `${def.label}: nilai tidak valid.` };

  switch (def.type) {
    case "boolean": {
      const v = text.toLowerCase();
      if (v === "on" || v === "true") return { ok: true, value: "on" };
      if (v === "off" || v === "false") return { ok: true, value: "off" };
      return { ok: false, message: `${def.label}: pilih aktif atau nonaktif.` };
    }
    case "integer": {
      if (!/^\d+$/.test(text)) return { ok: false, message: `${def.label}: harus berupa bilangan bulat.` };
      const n = Number(text);
      if (def.min !== undefined && n < def.min) return { ok: false, message: `${def.label}: minimal ${def.min}${def.unit ? " " + def.unit : ""}.` };
      if (def.max !== undefined && n > def.max) return { ok: false, message: `${def.label}: maksimal ${def.max}${def.unit ? " " + def.unit : ""}.` };
      return { ok: true, value: String(n) };
    }
    default: {
      if (!text) {
        return def.allowEmpty ? { ok: true, value: "" } : { ok: false, message: `${def.label}: tidak boleh kosong.` };
      }
      if (def.maxLength !== undefined && text.length > def.maxLength) {
        return { ok: false, message: `${def.label}: maksimal ${def.maxLength} karakter.` };
      }
      if (def.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
        return { ok: false, message: `${def.label}: format email tidak valid.` };
      }
      if (def.type === "phone" && !/^\+?\d{8,15}$/.test(text)) {
        return { ok: false, message: `${def.label}: hanya angka, boleh diawali +, 8-15 digit.` };
      }
      return { ok: true, value: text };
    }
  }
}

/** Nilai efektif sebuah parameter: nilai tersimpan bila valid, selain itu nilai bawaan. */
export function resolveConfigValue(def: ConfigDefinition, stored: string | undefined): string {
  if (stored === undefined) return def.defaultValue;
  const checked = validateConfigValue(def, stored);
  return checked.ok ? checked.value : def.defaultValue;
}

/** Bentuk konfigurasi publik yang dikirim ke browser (tanpa login). */
export interface PublicConfig {
  siteName: string;
  supportEmail: string;
  supportWhatsapp: string;
  announcementText: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  registrationOpen: boolean;
  autoLogoutMinutes: number;
  passwordMinLength: number;
  defaultPassingGrade: number;
  maxUploadMb: number;
}

/** Menyusun PublicConfig dari fungsi pembaca nilai (key -> nilai efektif). */
export function buildPublicConfig(read: (key: string) => string): PublicConfig {
  return {
    siteName: read("site_name"),
    supportEmail: read("support_email"),
    supportWhatsapp: read("support_whatsapp"),
    announcementText: read("announcement_text"),
    maintenanceMode: read("maintenance_mode") === "on",
    maintenanceMessage: read("maintenance_message"),
    registrationOpen: read("registration_open") === "on",
    autoLogoutMinutes: Number(read("auto_logout_minutes")),
    passwordMinLength: Number(read("password_min_length")),
    defaultPassingGrade: Number(read("default_passing_grade")),
    maxUploadMb: Number(read("max_upload_mb")),
  };
}

export const DEFAULT_PUBLIC_CONFIG: PublicConfig = buildPublicConfig(
  (key) => getConfigDefinition(key)?.defaultValue ?? "",
);
