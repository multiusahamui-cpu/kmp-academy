import { desc, eq, lt } from "drizzle-orm";
import { db } from "../db";
import { jobRuns } from "../schema/schema";
import { expireStaleOrders, reconcileConfirming, reconcileVaOrders } from "./order-service";
import { sendPendingNotificationEmails } from "./notification-mail";

export interface JobDef {
  id: string;
  label: string;
  description: string;
  /** Kelipatan menit pada penjadwal 60 detik. */
  everyMinutes: number;
  /** Mengembalikan jumlah yang diproses. */
  run: () => Promise<number>;
}

export const JOBS: JobDef[] = [
  { id: "expire-orders", label: "Kedaluwarsa pesanan", description: "Menutup pesanan pembayaran yang lewat batas waktu dan melepas reservasinya.", everyMinutes: 1, run: () => expireStaleOrders() },
  { id: "reconcile-debit", label: "Rekonsiliasi debit dompet", description: "Memeriksa debit dompet digitalcoop.id yang statusnya belum pasti.", everyMinutes: 1, run: () => reconcileConfirming() },
  { id: "reconcile-va", label: "Rekonsiliasi Virtual Account", description: "Menyamakan pesanan VA yang tertunda dengan status di Midtrans.", everyMinutes: 5, run: () => reconcileVaOrders() },
  { id: "notification-mail", label: "Kirim email notifikasi", description: "Mengirim email untuk notifikasi yang pengguna aktifkan lewat email.", everyMinutes: 1, run: () => sendPendingNotificationEmails() },
];

export interface JobState {
  running: boolean;
  lastRunAt: Date | null;
  lastStatus: "OK" | "ERROR" | null;
  lastAffected: number;
  lastError: string | null;
}

const state = new Map<string, JobState>(JOBS.map((j) => [j.id, { running: false, lastRunAt: null, lastStatus: null, lastAffected: 0, lastError: null }]));

export const getJobState = (id: string): JobState | undefined => state.get(id);
export const findJob = (id: string): JobDef | undefined => JOBS.find((j) => j.id === id);

export type RunOutcome = "RAN" | "BUSY";

/**
 * Menjalankan satu job dengan kunci per proses (tidak tumpang tindih).
 * Riwayat dicatat bila ada yang diproses, gagal, atau dipicu manual, agar tabel tidak penuh baris kosong.
 */
export const runJob = async (job: JobDef, trigger: "SCHEDULE" | "MANUAL", triggeredBy: string | null = null): Promise<RunOutcome> => {
  const st = state.get(job.id)!;
  if (st.running) return "BUSY";
  st.running = true;
  const startedAt = new Date();
  let affected = 0;
  let error: string | null = null;
  try {
    affected = await job.run();
  } catch (err: any) {
    error = String(err?.message ?? err).slice(0, 500);
    console.error(`[job:${job.id}] gagal: ${error}`);
  } finally {
    const finishedAt = new Date();
    st.running = false;
    st.lastRunAt = finishedAt;
    st.lastStatus = error ? "ERROR" : "OK";
    st.lastAffected = affected;
    st.lastError = error;
    if (error || affected > 0 || trigger === "MANUAL") {
      try {
        await db.insert(jobRuns).values({ jobId: job.id, trigger, status: error ? "ERROR" : "OK", affected, error, startedAt, finishedAt, triggeredBy });
      } catch (e: any) {
        console.error(`[job:${job.id}] gagal mencatat riwayat: ${e?.message}`);
      }
    }
  }
  return "RAN";
};

export const RUN_RETENTION_DAYS = 30;
export const pruneJobRuns = async (now: Date = new Date()): Promise<void> => {
  await db.delete(jobRuns).where(lt(jobRuns.startedAt, new Date(now.getTime() - RUN_RETENTION_DAYS * 86_400_000)));
};

export const listRuns = (jobId: string, limit = 50) =>
  db.select().from(jobRuns).where(eq(jobRuns.jobId, jobId)).orderBy(desc(jobRuns.startedAt)).limit(limit);

let timer: NodeJS.Timeout | null = null;
let tick = 0;
/** Penjadwal 60 detik. Satu proses saja (pm2 fork). */
export const startJobScheduler = (): void => {
  if (timer) return;
  timer = setInterval(() => {
    tick += 1;
    for (const j of JOBS) if (tick % j.everyMinutes === 0) void runJob(j, "SCHEDULE");
    if (tick % 1440 === 0) void pruneJobRuns().catch((e) => console.error(`[job] prune gagal: ${e?.message}`));
  }, 60_000);
  timer.unref();
};
