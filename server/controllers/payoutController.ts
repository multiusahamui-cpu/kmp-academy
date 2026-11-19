import crypto from "node:crypto";
import multer from "multer";
import { desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import { bankAccounts, payoutBatches, payoutPayees } from "../schema/schema";
import { successResponse, errorResponse } from "../utils/response";
import { approveBatch, emailProof, markPaid, postBatch, rowsOf, voidBatch } from "../lib/payout-service";
import { deletePrivate, privateAccess, putPrivate } from "../lib/storage";
import { PROOF_MAX_BYTES, detectProofType } from "@shared/account-deletion";
import { nextCutoffAt, periodLabel, previousCutoff, validateBankAccount, validateTransfer, validateVoidNote, maskAccount } from "@shared/payout";
import { csvCell } from "./reportController";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: unknown): v is string => typeof v === "string" && UUID_RE.test(v);
const num = (v: unknown): number => (v == null ? 0 : Number(v));

/** Pendaftaran yang ikut: milik batch tertentu, atau semua yang belum diposting. */
const scope = (batchId: string | null) =>
  batchId ? sql`e.payout_batch_id = ${batchId}` : sql`(e.payout_batch_id is null and coalesce(e.amount_paid, 0) > 0 and e.creator_share is not null)`;

/** Rangkuman uang masuk dan bagi hasil per judul kursus. */
const courseSummary = async (batchId: string | null) => {
  const rows = rowsOf<any>(await db.execute(sql`select c.id, c.title, c.type::text as type, c.instructor_name as owner,
      string_agg(distinct m.name, ', ') as mentors,
      count(*)::int as sales, coalesce(sum(e.amount_paid), 0)::bigint as gross,
      coalesce(sum(e.creator_share), 0)::bigint as owner_share, coalesce(sum(e.mentor_share), 0)::bigint as mentor_share, coalesce(sum(e.platform_share), 0)::bigint as platform_share
    from academy.enrollments e join academy.courses c on c.id = e.course_id left join academy.users m on m.id = e.mentor_id
    where ${scope(batchId)} group by c.id, c.title, c.type, c.instructor_name order by c.title`));
  const courses = rows.map((r) => ({ id: r.id, title: r.title, type: r.type, owner: r.owner, mentors: r.mentors, sales: num(r.sales), gross: num(r.gross), ownerShare: num(r.owner_share), mentorShare: num(r.mentor_share), platformShare: num(r.platform_share) }));
  const totals = courses.reduce((t, c) => ({ sales: t.sales + c.sales, gross: t.gross + c.gross, ownerShare: t.ownerShare + c.ownerShare, mentorShare: t.mentorShare + c.mentorShare, platformShare: t.platformShare + c.platformShare }), { sales: 0, gross: 0, ownerShare: 0, mentorShare: 0, platformShare: 0 });
  return { courses, totals };
};

const hasPrevious = async (cutoff: Date): Promise<boolean> =>
  (await db.select({ id: payoutBatches.id }).from(payoutBatches).where(sql`${payoutBatches.cutoffAt} = ${previousCutoff(cutoff).toISOString()}::timestamp and ${payoutBatches.status} <> 'VOID'`).limit(1)).length > 0;

// --- Admin / Direktur ---

export const overview = async (_req: any, res: any) => {
  try {
    const now = new Date();
    const next = nextCutoffAt(now);
    const accrual = await courseSummary(null);
    const batches = await db.select().from(payoutBatches).where(inArray(payoutBatches.status, ["POSTED", "APPROVED"])).orderBy(desc(payoutBatches.cutoffAt)).limit(60);
    const items = [];
    for (const b of batches) items.push({ ...b, period: periodLabel(b.cutoffAt, await hasPrevious(b.cutoffAt)) });
    successResponse(res, { nextCutoffAt: next, accrual, batches: items }, "Pencairan bagi hasil");
  } catch (error) {
    errorResponse(res, "Gagal memuat pencairan", 500, error);
  }
};

export const getBatch = async (req: any, res: any) => {
  try {
    if (!isUuid(req.params.id)) return errorResponse(res, "Batch tidak ditemukan", 404);
    const [b] = await db.select().from(payoutBatches).where(eq(payoutBatches.id, req.params.id)).limit(1);
    if (!b) return errorResponse(res, "Batch tidak ditemukan", 404);
    const payees = await db.select().from(payoutPayees).where(eq(payoutPayees.batchId, b.id)).orderBy(desc(payoutPayees.amount));
    const withBank = [];
    for (const p of payees) {
      const [bank] = p.status === "PAID" ? [null] : await db.select().from(bankAccounts).where(eq(bankAccounts.userId, p.userId)).orderBy(desc(bankAccounts.createdAt)).limit(1);
      withBank.push({
        id: p.id, userName: p.userName, ownerAmount: p.ownerAmount, mentorAmount: p.mentorAmount, amount: p.amount, status: p.status, transferRef: p.transferRef, note: p.note, paidAt: p.paidAt, hasProof: !!p.proofKey, proofEmailedAt: p.proofEmailedAt,
        bank: p.status === "PAID" ? (p.bankName ? { bankName: p.bankName, account: maskAccount(p.accountNumber ?? ""), holderName: p.holderName } : null) : bank ? { bankName: bank.bankName, account: maskAccount(bank.accountNumber), holderName: bank.holderName } : null,
      });
    }
    successResponse(res, { batch: { ...b, period: periodLabel(b.cutoffAt, await hasPrevious(b.cutoffAt)) }, courses: (await courseSummary(b.id)).courses, payees: withBank }, "Detail batch");
  } catch (error) {
    errorResponse(res, "Gagal memuat batch", 500, error);
  }
};

/** Laporan uang masuk lengkap per judul kursus (CSV), dengan subtotal tiap judul dan total akhir. */
export const exportTransactions = async (req: any, res: any) => {
  try {
    if (!isUuid(req.params.id)) return errorResponse(res, "Batch tidak ditemukan", 404);
    const [b] = await db.select().from(payoutBatches).where(eq(payoutBatches.id, req.params.id)).limit(1);
    if (!b) return errorResponse(res, "Batch tidak ditemukan", 404);
    const rows = rowsOf<any>(await db.execute(sql`select c.title, c.type::text as type, c.instructor_name as owner, m.name as mentor, u.name as buyer,
        to_char(((e.enrolled_at at time zone 'UTC') at time zone 'Asia/Jakarta'), 'YYYY-MM-DD HH24:MI') as at,
        e.base_price, e.discount_percent, e.amount_paid, e.creator_share, e.mentor_share, e.platform_share
      from academy.enrollments e join academy.courses c on c.id = e.course_id join academy.users u on u.id = e.user_id left join academy.users m on m.id = e.mentor_id
      where e.payout_batch_id = ${b.id} order by c.title, e.enrolled_at`));
    const head = ["Judul kursus", "Tipe", "Pemilik materi", "Mentor", "Tanggal (WIB)", "Pembeli", "Harga dasar", "Diskon %", "Dibayar", "Bagian pemilik", "Bagian Mentor", "Bagian Lembaga"];
    const lines = [head.map(csvCell).join(",")];
    let cur: string | null = null;
    let sub = { n: 0, paid: 0, owner: 0, mentor: 0, platform: 0 };
    const all = { n: 0, paid: 0, owner: 0, mentor: 0, platform: 0 };
    const flush = () => { if (cur !== null) lines.push([`SUBTOTAL ${cur}`, "", "", "", "", `${sub.n} transaksi`, "", "", sub.paid, sub.owner, sub.mentor, sub.platform].map(csvCell).join(",")); };
    for (const r of rows) {
      if (r.title !== cur) { flush(); cur = r.title; sub = { n: 0, paid: 0, owner: 0, mentor: 0, platform: 0 }; }
      lines.push([r.title, r.type, r.owner, r.mentor, r.at, r.buyer, r.base_price, r.discount_percent, r.amount_paid, r.creator_share, r.mentor_share, r.platform_share].map(csvCell).join(","));
      for (const t of [sub, all]) { t.n += 1; t.paid += num(r.amount_paid); t.owner += num(r.creator_share); t.mentor += num(r.mentor_share); t.platform += num(r.platform_share); }
    }
    flush();
    lines.push(["TOTAL", "", "", "", "", `${all.n} transaksi`, "", "", all.paid, all.owner, all.mentor, all.platform].map(csvCell).join(","));
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="uang-masuk-per-judul-${b.cutoffAt.toISOString().slice(0, 10)}.csv"`);
    res.send(`\uFEFF${lines.join("\r\n")}`);
  } catch (error) {
    errorResponse(res, "Gagal membuat laporan", 500, error);
  }
};

export const postNow = async (req: any, res: any) => {
  try {
    const r = await postBatch(req.user.id);
    if (r.status === "EXISTS") return errorResponse(res, "Periode terbaru sudah diposting.", 409);
    if (r.status === "EMPTY") return errorResponse(res, "Tidak ada transaksi baru sebelum batas posting.", 409);
    console.info(`[pencairan] posting manual ${r.batchId} oleh=${req.user.id}`);
    successResponse(res, { id: r.batchId }, "Batch diposting", 201);
  } catch (error) {
    errorResponse(res, "Gagal memposting", 500, error);
  }
};

const respond = (res: any, o: { ok: true } | { ok: false; code: number; message: string }, okMsg: string) =>
  o.ok ? successResponse(res, null, okMsg) : errorResponse(res, o.message, o.code);

export const approve = async (req: any, res: any) => {
  try {
    if (!isUuid(req.params.id)) return errorResponse(res, "Batch tidak ditemukan", 404);
    const o = await approveBatch(req.params.id, req.user.id);
    if (o.ok) console.info(`[pencairan] disetujui ${req.params.id} oleh=${req.user.id}`);
    respond(res, o, "Batch disetujui");
  } catch (error) {
    errorResponse(res, "Gagal menyetujui", 500, error);
  }
};

export const voidIt = async (req: any, res: any) => {
  try {
    if (!isUuid(req.params.id)) return errorResponse(res, "Batch tidak ditemukan", 404);
    const v = validateVoidNote(req.body);
    if (!v.ok) return errorResponse(res, v.message, 400);
    const o = await voidBatch(req.params.id, req.user.id, v.value);
    if (o.ok) console.info(`[pencairan] dibatalkan ${req.params.id} oleh=${req.user.id}`);
    respond(res, o, "Batch dibatalkan. Transaksinya masuk posting berikutnya.");
  } catch (error) {
    errorResponse(res, "Gagal membatalkan", 500, error);
  }
};

const proofUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: PROOF_MAX_BYTES, files: 1 } });
export const payProofMiddleware = (req: any, res: any, next: any) => {
  proofUpload.single("proof")(req, res, (err: any) => {
    if (!err) return next();
    if (err.code === "LIMIT_FILE_SIZE") return errorResponse(res, "Ukuran bukti bayar maksimal 5 MB.", 400);
    return errorResponse(res, "Berkas bukti tidak dapat diproses.", 400);
  });
};

/** Mencatat transfer manual: bukti bayar wajib diunggah (disimpan privat), lalu dikirim ke inbox dan email penerima. */
export const pay = async (req: any, res: any) => {
  let key: string | null = null;
  try {
    if (!isUuid(req.params.pid)) return errorResponse(res, "Penerima tidak ditemukan", 404);
    const v = validateTransfer(req.body);
    if (!v.ok) return errorResponse(res, v.message, 400);
    const file = req.file as { buffer: Buffer } | undefined;
    if (!file || file.buffer.length === 0) return errorResponse(res, "Unggah bukti bayar (JPG, PNG, WebP, atau PDF).", 400);
    const type = detectProofType(file.buffer);
    if (!type) return errorResponse(res, "Bukti harus berupa JPG, PNG, WebP, atau PDF.", 400);
    key = `payout-proofs/${req.params.pid}-${crypto.randomBytes(8).toString("hex")}.${type.ext}`;
    await putPrivate(key, file.buffer, type.mime);
    const o = await markPaid(req.params.pid, req.user.id, v.value.transferRef, v.value.note, { key, mime: type.mime, sha256: crypto.createHash("sha256").update(file.buffer).digest("hex") });
    if (!o.ok) { await deletePrivate(key); key = null; return errorResponse(res, o.message, o.code); }
    key = null; // sudah tercatat: berkas bukti tidak boleh dihapus lagi
    console.info(`[pencairan] transfer dicatat ${req.params.pid} oleh=${req.user.id}`);
    const emailed = await emailProof(req.params.pid, file.buffer);
    successResponse(res, { emailed }, emailed ? "Transfer dicatat dan bukti dikirim ke email penerima." : "Transfer dicatat dan bukti masuk ke inbox penerima. Email belum terkirim; gunakan Kirim ulang di Arsip.");
  } catch (error) {
    if (key) await deletePrivate(key).catch(() => undefined);
    errorResponse(res, "Gagal mencatat transfer", 500, error);
  }
};

const sendProof = async (res: any, key: string | null, mime: string | null) => {
  if (!key || !mime) return errorResponse(res, "Bukti tidak ditemukan", 404);
  const access = await privateAccess(key, mime);
  res.setHeader("Cache-Control", "private, no-store");
  if (access.type === "redirect") return res.redirect(302, access.url);
  res.setHeader("Content-Type", mime);
  res.setHeader("Content-Disposition", "inline");
  res.sendFile(access.path, (err: any) => { if (err && !res.headersSent) errorResponse(res, "Berkas tidak tersedia", 404); });
};

export const adminProof = async (req: any, res: any) => {
  try {
    if (!isUuid(req.params.pid)) return errorResponse(res, "Bukti tidak ditemukan", 404);
    const [p] = await db.select({ key: payoutPayees.proofKey, mime: payoutPayees.proofMime }).from(payoutPayees).where(eq(payoutPayees.id, req.params.pid)).limit(1);
    await sendProof(res, p?.key ?? null, p?.mime ?? null);
  } catch (error) {
    errorResponse(res, "Gagal membuka bukti", 500, error);
  }
};

export const resendProof = async (req: any, res: any) => {
  try {
    if (!isUuid(req.params.pid)) return errorResponse(res, "Penerima tidak ditemukan", 404);
    const ok = await emailProof(req.params.pid);
    if (!ok) return errorResponse(res, "Email belum dapat dikirim. Periksa pengaturan SMTP, lalu coba lagi.", 502);
    successResponse(res, null, "Bukti dikirim ulang ke email penerima");
  } catch (error) {
    errorResponse(res, "Gagal mengirim email", 500, error);
  }
};

/** Arsip pembayaran: transfer yang sudah dibayar dan batch yang selesai atau dibatalkan. */
export const archive = async (_req: any, res: any) => {
  try {
    const batches = await db.select().from(payoutBatches).where(inArray(payoutBatches.status, ["COMPLETED", "VOID"])).orderBy(desc(payoutBatches.cutoffAt)).limit(60);
    const items = [];
    for (const b of batches) items.push({ ...b, period: periodLabel(b.cutoffAt, await hasPrevious(b.cutoffAt)) });
    const paid = await db.select({
      id: payoutPayees.id, batchId: payoutPayees.batchId, cutoffAt: payoutBatches.cutoffAt, userName: payoutPayees.userName, amount: payoutPayees.amount, transferRef: payoutPayees.transferRef, paidAt: payoutPayees.paidAt,
      bankName: payoutPayees.bankName, accountNumber: payoutPayees.accountNumber, holderName: payoutPayees.holderName, proofEmailedAt: payoutPayees.proofEmailedAt, proofKey: payoutPayees.proofKey,
    }).from(payoutPayees).innerJoin(payoutBatches, eq(payoutBatches.id, payoutPayees.batchId)).where(eq(payoutPayees.status, "PAID")).orderBy(desc(payoutPayees.paidAt)).limit(200);
    const periods = new Map<string, string>();
    const payments = [];
    for (const p of paid) {
      if (!periods.has(p.batchId)) periods.set(p.batchId, periodLabel(p.cutoffAt, await hasPrevious(p.cutoffAt)));
      payments.push({ id: p.id, batchId: p.batchId, period: periods.get(p.batchId), userName: p.userName, amount: p.amount, transferRef: p.transferRef, paidAt: p.paidAt, bank: p.bankName ? { bankName: p.bankName, account: maskAccount(p.accountNumber ?? ""), holderName: p.holderName } : null, proofEmailedAt: p.proofEmailedAt, hasProof: !!p.proofKey });
    }
    successResponse(res, { batches: items, payments }, "Arsip pembayaran");
  } catch (error) {
    errorResponse(res, "Gagal memuat arsip", 500, error);
  }
};

// --- Penerima (Creator / Mentor) ---

export const mine = async (req: any, res: any) => {
  try {
    const uid = req.user.id;
    const [acc] = rowsOf<any>(await db.execute(sql`select
        coalesce(sum(e.creator_share) filter (where c.instructor_id = ${uid}), 0)::bigint as owner,
        coalesce(sum(e.mentor_share) filter (where e.mentor_id = ${uid}), 0)::bigint as mentor
      from academy.enrollments e join academy.courses c on c.id = e.course_id where ${scope(null)} and (c.instructor_id = ${uid} or e.mentor_id = ${uid})`));
    const history = await db.select({
      batchId: payoutBatches.id, cutoffAt: payoutBatches.cutoffAt, batchStatus: payoutBatches.status, amount: payoutPayees.amount, ownerAmount: payoutPayees.ownerAmount, mentorAmount: payoutPayees.mentorAmount,
      status: payoutPayees.status, transferRef: payoutPayees.transferRef, paidAt: payoutPayees.paidAt, proofKey: payoutPayees.proofKey,
    }).from(payoutPayees).innerJoin(payoutBatches, eq(payoutBatches.id, payoutPayees.batchId)).where(sql`${payoutPayees.userId} = ${uid} and ${payoutBatches.status} <> 'VOID'`).orderBy(desc(payoutBatches.cutoffAt)).limit(60);
    const items = [];
    for (const { proofKey, ...h } of history) items.push({ ...h, hasProof: !!proofKey, period: periodLabel(h.cutoffAt, await hasPrevious(h.cutoffAt)) });
    const [bank] = await db.select().from(bankAccounts).where(eq(bankAccounts.userId, uid)).orderBy(desc(bankAccounts.createdAt)).limit(1);
    successResponse(res, {
      nextCutoffAt: nextCutoffAt(new Date()),
      accrued: { owner: num(acc?.owner), mentor: num(acc?.mentor), total: num(acc?.owner) + num(acc?.mentor) },
      bank: bank ? { bankName: bank.bankName, account: maskAccount(bank.accountNumber), holderName: bank.holderName } : null,
      history: items,
    }, "Bagi hasil saya");
  } catch (error) {
    errorResponse(res, "Gagal memuat bagi hasil", 500, error);
  }
};

/** Rincian per judul kursus untuk satu batch milik penerima yang login. */
export const myStatement = async (req: any, res: any) => {
  try {
    const uid = req.user.id;
    if (!isUuid(req.params.batchId)) return errorResponse(res, "Batch tidak ditemukan", 404);
    const [p] = await db.select({ id: payoutPayees.id }).from(payoutPayees).innerJoin(payoutBatches, eq(payoutBatches.id, payoutPayees.batchId))
      .where(sql`${payoutPayees.batchId} = ${req.params.batchId} and ${payoutPayees.userId} = ${uid} and ${payoutBatches.status} <> 'VOID'`).limit(1);
    if (!p) return errorResponse(res, "Batch tidak ditemukan", 404);
    const rows = rowsOf<any>(await db.execute(sql`select c.title, c.type::text as type, count(*)::int as sales, coalesce(sum(e.amount_paid), 0)::bigint as gross,
        coalesce(sum(e.creator_share) filter (where c.instructor_id = ${uid}), 0)::bigint as owner, coalesce(sum(e.mentor_share) filter (where e.mentor_id = ${uid}), 0)::bigint as mentor
      from academy.enrollments e join academy.courses c on c.id = e.course_id
      where e.payout_batch_id = ${req.params.batchId} and (c.instructor_id = ${uid} or e.mentor_id = ${uid}) group by c.id, c.title, c.type order by c.title`));
    successResponse(res, rows.map((r) => ({ title: r.title, type: r.type, sales: num(r.sales), gross: num(r.gross), ownerShare: num(r.owner), mentorShare: num(r.mentor) })), "Rincian");
  } catch (error) {
    errorResponse(res, "Gagal memuat rincian", 500, error);
  }
};

export const saveBankAccount = async (req: any, res: any) => {
  try {
    const v = validateBankAccount(req.body);
    if (!v.ok) return errorResponse(res, v.message, 400);
    await db.insert(bankAccounts).values({ userId: req.user.id, ...v.value });
    successResponse(res, null, "Rekening disimpan", 201);
  } catch (error) {
    errorResponse(res, "Gagal menyimpan rekening", 500, error);
  }
};

/** Bukti bayar milik penerima yang login untuk satu batch. */
export const myProof = async (req: any, res: any) => {
  try {
    if (!isUuid(req.params.batchId)) return errorResponse(res, "Bukti tidak ditemukan", 404);
    const [p] = await db.select({ key: payoutPayees.proofKey, mime: payoutPayees.proofMime }).from(payoutPayees)
      .where(sql`${payoutPayees.batchId} = ${req.params.batchId} and ${payoutPayees.userId} = ${req.user.id} and ${payoutPayees.status} = 'PAID'`).limit(1);
    await sendProof(res, p?.key ?? null, p?.mime ?? null);
  } catch (error) {
    errorResponse(res, "Gagal membuka bukti", 500, error);
  }
};
