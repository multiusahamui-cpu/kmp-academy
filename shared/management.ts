// Periode laporan manajemen dan aturan siaran Direktur. Murni (tanpa database), dipakai server dan klien.

export type ReportKind = "WEEKLY" | "MONTHLY";
export const isReportKind = (v: unknown): v is ReportKind => v === "WEEKLY" || v === "MONTHLY";

const WIB_MS = 7 * 3600_000;

/**
 * Periode laporan sebagai [start, end) dalam instan UTC.
 * WEEKLY: 7 hari terakhir sampai sekarang. MONTHLY: satu bulan kalender sebelumnya menurut WIB.
 */
export const reportPeriod = (kind: ReportKind, now: Date = new Date()): { start: Date; end: Date } => {
  if (kind === "WEEKLY") return { start: new Date(now.getTime() - 7 * 86_400_000), end: now };
  const wib = new Date(now.getTime() + WIB_MS);
  const y = wib.getUTCFullYear();
  const m = wib.getUTCMonth();
  return { start: new Date(Date.UTC(y, m - 1, 1) - WIB_MS), end: new Date(Date.UTC(y, m, 1) - WIB_MS) };
};

export const BROADCAST_AUDIENCES = [
  { id: "ALL", label: "Semua pengguna" },
  { id: "STUDENT", label: "Siswa" },
  { id: "CREATOR", label: "Creator" },
  { id: "MENTOR", label: "Mentor" },
] as const;
export type BroadcastAudience = (typeof BROADCAST_AUDIENCES)[number]["id"];

export const BROADCAST_TITLE_MAX = 120;
export const BROADCAST_BODY_MAX = 2000;
export const REPORT_NOTE_MAX = 1000;

export type Result<T> = { ok: true; value: T } | { ok: false; message: string };

export const validateBroadcast = (input: unknown): Result<{ title: string; body: string; audience: BroadcastAudience }> => {
  const o = (input ?? {}) as Record<string, unknown>;
  const title = typeof o.title === "string" ? o.title.trim() : "";
  const body = typeof o.body === "string" ? o.body.trim() : "";
  const audience = BROADCAST_AUDIENCES.find((a) => a.id === o.audience)?.id;
  if (title.length < 3 || title.length > BROADCAST_TITLE_MAX) return { ok: false, message: `Judul 3-${BROADCAST_TITLE_MAX} karakter.` };
  if (body.length < 5 || body.length > BROADCAST_BODY_MAX) return { ok: false, message: `Isi 5-${BROADCAST_BODY_MAX} karakter.` };
  if (!audience) return { ok: false, message: "Sasaran tidak valid." };
  return { ok: true, value: { title, body, audience } };
};
