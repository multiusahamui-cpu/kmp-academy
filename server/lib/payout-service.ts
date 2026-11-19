// Inti pencairan bagi hasil bulanan: posting batch, persetujuan, pembatalan, dan pencatatan transfer.
// Posting memberi payout_batch_id pada pendaftaran berbayar sebelum batas (awal tanggal 25 WIB), sehingga tiap rupiah
// masuk tepat satu batch. Pembatalan melepas tag itu agar masuk posting berikutnya.
import fs from "node:fs/promises";
import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "../db";
import { bankAccounts, payoutBatches, payoutPayees, users } from "../schema/schema";
import { notifyUser } from "./cards";
import { isSmtpConfigured, sendMail } from "./mailer";
import { privateAccess } from "./storage";
import { payoutCutoffAt, periodLabel, previousCutoff } from "@shared/payout";

export const rowsOf = <T>(r: any): T[] => (Array.isArray(r) ? r : r?.rows ?? []);
const num = (v: unknown): number => (v == null ? 0 : Number(v));
export const rp = (n: number): string => `Rp ${new Intl.NumberFormat("id-ID").format(n)}`;

export type PostResult = { status: "CREATED"; batchId: string; salesCount: number; payees: number } | { status: "EXISTS" } | { status: "EMPTY" };

/** Memposting batch untuk batas terbaru. Aman dipanggil berulang: satu batch aktif per batas. */
export const postBatch = async (actorId: string | null, now: Date = new Date()): Promise<PostResult> => {
  const cutoff = payoutCutoffAt(now);
  return db.transaction(async (tx) => {
    const [dup] = await tx.select({ id: payoutBatches.id }).from(payoutBatches).where(and(eq(payoutBatches.cutoffAt, cutoff), ne(payoutBatches.status, "VOID"))).limit(1);
    if (dup) return { status: "EXISTS" } as const;
    const [b] = await tx.insert(payoutBatches).values({ cutoffAt: cutoff, postedBy: actorId }).onConflictDoNothing().returning({ id: payoutBatches.id });
    if (!b) return { status: "EXISTS" } as const;

    const tagged = rowsOf<{ id: string }>(await tx.execute(sql`update academy.enrollments set payout_batch_id = ${b.id}
      where payout_batch_id is null and coalesce(amount_paid, 0) > 0 and creator_share is not null and (enrolled_at at time zone 'UTC') < ${cutoff.toISOString()}::timestamptz
      returning id`));
    if (tagged.length === 0) {
      await tx.delete(payoutBatches).where(eq(payoutBatches.id, b.id));
      return { status: "EMPTY" } as const;
    }

    const [t] = rowsOf<any>(await tx.execute(sql`select count(*)::int n, coalesce(sum(amount_paid),0)::bigint gross, coalesce(sum(creator_share),0)::bigint owner,
      coalesce(sum(mentor_share),0)::bigint mentor, coalesce(sum(platform_share),0)::bigint platform from academy.enrollments where payout_batch_id = ${b.id}`));
    const payees = rowsOf<any>(await tx.execute(sql`select x.uid, u.name, sum(x.owner)::bigint owner, sum(x.mentor)::bigint mentor from (
        select c.instructor_id as uid, coalesce(e.creator_share, 0) as owner, 0 as mentor from academy.enrollments e join academy.courses c on c.id = e.course_id where e.payout_batch_id = ${b.id}
        union all
        select e.mentor_id as uid, 0 as owner, coalesce(e.mentor_share, 0) as mentor from academy.enrollments e where e.payout_batch_id = ${b.id} and e.mentor_id is not null
      ) x join academy.users u on u.id = x.uid where x.uid is not null group by x.uid, u.name having sum(x.owner) + sum(x.mentor) > 0`));
    for (const p of payees) {
      await tx.insert(payoutPayees).values({ batchId: b.id, userId: p.uid, userName: p.name, ownerAmount: num(p.owner), mentorAmount: num(p.mentor), amount: num(p.owner) + num(p.mentor) });
    }
    const allocated = payees.reduce((s, p) => s + num(p.owner) + num(p.mentor), 0);
    if (allocated !== num(t.owner) + num(t.mentor)) console.warn(`[pencairan] batch ${b.id}: bagian terbagi ${allocated} != total hak ${num(t.owner) + num(t.mentor)} (kursus tanpa pemilik?)`);
    await tx.update(payoutBatches).set({ salesCount: num(t.n), grossTotal: num(t.gross), ownerTotal: num(t.owner), mentorTotal: num(t.mentor), platformTotal: num(t.platform) }).where(eq(payoutBatches.id, b.id));

    const dirs = rowsOf<{ id: string }>(await tx.execute(sql`select id from academy.users where role = 'DIRECTOR' and status = 'ACTIVE'`));
    const label = periodLabel(cutoff, (await tx.select({ id: payoutBatches.id }).from(payoutBatches).where(and(eq(payoutBatches.cutoffAt, previousCutoff(cutoff)), ne(payoutBatches.status, "VOID"))).limit(1)).length > 0);
    for (const d of dirs) await notifyUser(tx, d.id, "Pencairan bagi hasil menunggu persetujuan", `Periode ${label}: ${payees.length} penerima, total ${rp(allocated)}. Mohon tinjau dan setujui.`, "ADMIN");
    return { status: "CREATED", batchId: b.id, salesCount: num(t.n), payees: payees.length } as const;
  });
};

export type Outcome = { ok: true } | { ok: false; code: 404 | 409; message: string };

export const approveBatch = async (batchId: string, actorId: string): Promise<Outcome> =>
  db.transaction(async (tx) => {
    const [b] = await tx.select().from(payoutBatches).where(eq(payoutBatches.id, batchId)).for("update");
    if (!b) return { ok: false, code: 404, message: "Batch tidak ditemukan" } as const;
    if (b.status !== "POSTED") return { ok: false, code: 409, message: "Batch ini tidak menunggu persetujuan." } as const;
    await tx.update(payoutBatches).set({ status: "APPROVED", approvedBy: actorId, approvedAt: new Date() }).where(eq(payoutBatches.id, b.id));
    const payees = await tx.select().from(payoutPayees).where(eq(payoutPayees.batchId, b.id));
    for (const p of payees) await notifyUser(tx, p.userId, "Bagi hasil disetujui", `Bagi hasil Anda sebesar ${rp(p.amount)} telah disetujui dan akan ditransfer ke rekening Anda. Pastikan rekening pencairan sudah terisi.`, "PEMBAYARAN");
    const admins = rowsOf<{ id: string }>(await tx.execute(sql`select id from academy.users where role = 'ADMIN_SYSTEM' and status = 'ACTIVE'`));
    for (const a of admins) await notifyUser(tx, a.id, "Pencairan bagi hasil disetujui", `${payees.length} penerima menunggu transfer manual. Catat nomor referensi setelah transfer.`, "ADMIN");
    return { ok: true } as const;
  });

export const voidBatch = async (batchId: string, actorId: string, note: string): Promise<Outcome> =>
  db.transaction(async (tx) => {
    const [b] = await tx.select().from(payoutBatches).where(eq(payoutBatches.id, batchId)).for("update");
    if (!b) return { ok: false, code: 404, message: "Batch tidak ditemukan" } as const;
    if (b.status !== "POSTED") return { ok: false, code: 409, message: "Hanya batch yang menunggu persetujuan yang dapat dibatalkan." } as const;
    await tx.execute(sql`update academy.enrollments set payout_batch_id = null where payout_batch_id = ${b.id}`);
    await tx.update(payoutBatches).set({ status: "VOID", voidedBy: actorId, voidedAt: new Date(), voidNote: note }).where(eq(payoutBatches.id, b.id));
    return { ok: true } as const;
  });

export interface ProofFile { key: string; mime: string; sha256: string }

/** Mencatat transfer manual untuk satu penerima beserta bukti bayarnya; rekening tujuan = rekening terbaru penerima, disalin saat itu. */
export const markPaid = async (payeeId: string, actorId: string, transferRef: string, note: string, proof: ProofFile): Promise<Outcome> =>
  db.transaction(async (tx) => {
    const [p] = await tx.select().from(payoutPayees).where(eq(payoutPayees.id, payeeId)).for("update");
    if (!p) return { ok: false, code: 404, message: "Penerima tidak ditemukan" } as const;
    const [b] = await tx.select().from(payoutBatches).where(eq(payoutBatches.id, p.batchId)).for("update");
    if (!b || b.status !== "APPROVED") return { ok: false, code: 409, message: "Batch belum disetujui Direktur atau sudah selesai." } as const;
    if (p.status === "PAID") return { ok: false, code: 409, message: "Penerima ini sudah ditandai ditransfer." } as const;
    const [bank] = await tx.select().from(bankAccounts).where(eq(bankAccounts.userId, p.userId)).orderBy(sql`${bankAccounts.createdAt} desc`).limit(1);
    if (!bank) return { ok: false, code: 409, message: "Penerima belum mengisi rekening pencairan." } as const;
    await tx.update(payoutPayees).set({ status: "PAID", bankName: bank.bankName, accountNumber: bank.accountNumber, holderName: bank.holderName, transferRef, note: note || null, proofKey: proof.key, proofMime: proof.mime, proofSha256: proof.sha256, paidAt: new Date(), paidBy: actorId }).where(eq(payoutPayees.id, p.id));
    const [left] = rowsOf<{ n: number }>(await tx.execute(sql`select count(*)::int n from academy.payout_payees where batch_id = ${b.id} and status = 'PENDING'`));
    if (num(left?.n) === 0) await tx.update(payoutBatches).set({ status: "COMPLETED", completedAt: new Date() }).where(eq(payoutBatches.id, b.id));
    await notifyUser(tx, p.userId, "Bukti pembayaran bagi hasil", `Bagi hasil sebesar ${rp(p.amount)} telah ditransfer ke ${bank.bankName} atas nama ${bank.holderName}. Referensi: ${transferRef}. Unduh bukti bayar di menu Bagi Hasil Saya.`, "PEMBAYARAN");
    return { ok: true } as const;
  });

/** Isi berkas privat: R2 lewat tautan bertanda tangan, lokal dari disk. */
export const readPrivateBytes = async (key: string, mime: string): Promise<Uint8Array> => {
  const a = await privateAccess(key, mime, 60);
  if (a.type === "file") return fs.readFile(a.path);
  const r = await fetch(a.url);
  if (!r.ok) throw new Error(`Gagal membaca bukti (${r.status})`);
  return new Uint8Array(await r.arrayBuffer());
};

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" };

/** Mengirim bukti bayar ke email penerima (lampiran). Mengembalikan false bila SMTP belum diatur atau pengiriman gagal. */
export const emailProof = async (payeeId: string, bytes?: Uint8Array): Promise<boolean> => {
  if (!isSmtpConfigured()) return false;
  try {
    const [r] = await db.select({ p: payoutPayees, email: users.email, name: users.name }).from(payoutPayees).innerJoin(users, eq(users.id, payoutPayees.userId)).where(eq(payoutPayees.id, payeeId)).limit(1);
    if (!r || r.p.status !== "PAID" || !r.p.proofKey || !r.p.proofMime || !r.email) return false;
    const content = bytes ?? (await readPrivateBytes(r.p.proofKey, r.p.proofMime));
    await sendMail({
      to: r.email,
      subject: "Bukti pembayaran bagi hasil KMP-ADNG Academy",
      text: `Halo ${r.name},\n\nBagi hasil Anda sebesar ${rp(r.p.amount)} telah ditransfer ke ${r.p.bankName} atas nama ${r.p.holderName}.\nNomor referensi: ${r.p.transferRef}.\n\nBukti bayar terlampir dan juga tersedia di menu Bagi Hasil Saya.\n\nKMP-ADNG Academy`,
      attachments: [{ filename: `bukti-bagi-hasil-${r.p.transferRef}.${EXT[r.p.proofMime] ?? "bin"}`.replace(/[^a-zA-Z0-9._-]/g, "_"), content: Buffer.from(content), contentType: r.p.proofMime }],
    });
    await db.update(payoutPayees).set({ proofEmailedAt: new Date() }).where(eq(payoutPayees.id, payeeId));
    return true;
  } catch (err: any) {
    console.error(`[pencairan] email bukti gagal (${payeeId}): ${err?.message}`);
    return false;
  }
};
