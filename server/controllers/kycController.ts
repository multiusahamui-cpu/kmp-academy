import crypto from "node:crypto";
import multer from "multer";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../db";
import { kycAccessLog, kycRecords, users } from "../schema/schema";
import { successResponse, errorResponse } from "../utils/response";
import { deletePrivate, privateAccess, putPrivate } from "../lib/storage";
import { PROOF_MAX_BYTES, detectProofType } from "@shared/account-deletion";
import { KYC_IMAGE_MIMES, isDigitalcoopKycComplete, maskNik, normalizeNik, validateKycInput, validateRejectNote } from "@shared/kyc";
import { decryptNik, encryptNik, kycCryptoConfigured, nikFingerprint } from "../lib/kyc-crypto";
import { BridgeError, bridge } from "../lib/digitalcoop-bridge";
import { notifyUser } from "../lib/cards";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: unknown): v is string => typeof v === "string" && UUID_RE.test(v);
const rand = () => crypto.randomBytes(8).toString("hex");

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: PROOF_MAX_BYTES, files: 2 } });
export const kycUploadMiddleware = (req: any, res: any, next: any) => {
  upload.fields([{ name: "ktp", maxCount: 1 }, { name: "selfie", maxCount: 1 }])(req, res, (err: any) => {
    if (!err) return next();
    if (err.code === "LIMIT_FILE_SIZE") return errorResponse(res, "Ukuran tiap foto maksimal 5 MB.", 400);
    return errorResponse(res, "Berkas tidak dapat diproses.", 400);
  });
};

type Img = { key: string; mime: string };
/** Mengenali foto dari isinya (hanya JPG/PNG/WebP), lalu menyimpannya di R2 privat. */
const storeImage = async (userId: string, kind: "ktp" | "selfie", buf: Buffer): Promise<Img | { error: string }> => {
  const t = detectProofType(buf);
  if (!t || !(KYC_IMAGE_MIMES as readonly string[]).includes(t.mime)) return { error: `Foto ${kind === "ktp" ? "KTP" : "selfie"} harus berformat JPG, PNG, atau WebP.` };
  const key = `kyc/${userId}/${kind}-${rand()}.${t.ext}`;
  await putPrivate(key, buf, t.mime);
  return { key, mime: t.mime };
};

const isUniqueViolation = (e: any): boolean => e?.code === "23505" || e?.cause?.code === "23505";

/** Menulis catatan KYC pengguna (baru atau menggantikan yang DITOLAK), memakai dua berkas yang sudah tersimpan. */
const saveRecord = async (userId: string, status: "PENDING" | "VERIFIED", source: "MANUAL" | "DIGITALCOOP", input: { nik: string; fullName: string }, ktp: Img, selfie: Img) => {
  const values = {
    status, source, fullName: input.fullName, nikEnc: encryptNik(input.nik), nikLast4: input.nik.slice(-4), nikFingerprint: nikFingerprint(input.nik),
    ktpKey: ktp.key, ktpMime: ktp.mime, selfieKey: selfie.key, selfieMime: selfie.mime,
    rejectNote: null, submittedAt: new Date(), reviewedAt: status === "VERIFIED" ? new Date() : null, reviewedBy: null,
  };
  return db.transaction(async (tx) => {
    const [old] = await tx.select().from(kycRecords).where(eq(kycRecords.userId, userId)).for("update").limit(1);
    if (old && old.status !== "REJECTED") return { ok: false as const, code: 409, message: old.status === "VERIFIED" ? "Identitas Anda sudah terverifikasi." : "Pengajuan Anda sedang ditinjau." };
    if (old) await tx.update(kycRecords).set(values).where(eq(kycRecords.id, old.id));
    else await tx.insert(kycRecords).values({ userId, ...values });
    await notifyUser(tx, userId, status === "VERIFIED" ? "Identitas terverifikasi" : "Pengajuan KYC diterima", status === "VERIFIED" ? "Data KYC Anda dari digitalcoop.id sudah disalin dan terverifikasi." : "Admin akan meninjau foto KTP dan selfie Anda.", "AKUN");
    return { ok: true as const, old: old ? ([{ key: old.ktpKey }, { key: old.selfieKey }] as { key: string }[]) : [] };
  });
};

const cleanup = async (keys: (string | undefined)[]) => { for (const k of keys) if (k) await deletePrivate(k).catch(() => undefined); };

// --- Pengguna ---

export const me = async (req: any, res: any) => {
  try {
    const [rec] = await db.select().from(kycRecords).where(eq(kycRecords.userId, req.user.id)).limit(1);
    const [u] = await db.select({ dc: users.digitalcoopUserId, kyc: users.kycStatus }).from(users).where(eq(users.id, req.user.id)).limit(1);
    const linked = !!u?.dc;
    successResponse(res, {
      status: rec?.status ?? "NONE",
      source: rec?.source ?? null,
      fullName: rec?.fullName ?? null,
      nikMasked: rec ? `${"*".repeat(12)}${rec.nikLast4}` : null,
      rejectNote: rec?.status === "REJECTED" ? rec.rejectNote : null,
      submittedAt: rec?.submittedAt ?? null,
      linked,
      // Anggota digitalcoop.id yang KYC-nya lengkap tidak wajib KYC ulang; datanya dapat disalin dengan tombol.
      exempt: linked && isDigitalcoopKycComplete(u?.kyc),
      ready: kycCryptoConfigured(),
    }, "Status KYC");
  } catch (error) {
    errorResponse(res, "Gagal memuat status KYC", 500, error);
  }
};

export const submit = async (req: any, res: any) => {
  const stored: (string | undefined)[] = [];
  try {
    if (!kycCryptoConfigured()) return errorResponse(res, "KYC belum dapat dipakai: kunci enkripsi server belum diatur. Hubungi Admin.", 503);
    const v = validateKycInput(req.body ?? {});
    if (!v.ok) return errorResponse(res, v.message, 400);
    const f = req.files as { ktp?: { buffer: Buffer }[]; selfie?: { buffer: Buffer }[] } | undefined;
    if (!f?.ktp?.[0]?.buffer?.length || !f?.selfie?.[0]?.buffer?.length) return errorResponse(res, "Unggah foto KTP dan selfie dengan KTP.", 400);
    const [cur] = await db.select({ s: kycRecords.status }).from(kycRecords).where(eq(kycRecords.userId, req.user.id)).limit(1);
    if (cur && cur.s !== "REJECTED") return errorResponse(res, cur.s === "VERIFIED" ? "Identitas Anda sudah terverifikasi." : "Pengajuan Anda sedang ditinjau.", 409);
    const ktp = await storeImage(req.user.id, "ktp", f.ktp[0].buffer);
    if ("error" in ktp) return errorResponse(res, ktp.error, 400);
    stored.push(ktp.key);
    const selfie = await storeImage(req.user.id, "selfie", f.selfie[0].buffer);
    if ("error" in selfie) { await cleanup(stored); return errorResponse(res, selfie.error, 400); }
    stored.push(selfie.key);
    const r = await saveRecord(req.user.id, "PENDING", "MANUAL", v.value, ktp, selfie);
    if (!r.ok) { await cleanup(stored); return errorResponse(res, r.message, r.code); }
    await cleanup(r.old.map((o) => o.key)); // berkas pengajuan lama yang ditolak
    successResponse(res, null, "Pengajuan KYC dikirim. Admin akan meninjau.");
  } catch (error) {
    await cleanup(stored);
    if (isUniqueViolation(error)) return errorResponse(res, "NIK ini sudah dipakai akun lain. Hubungi Admin bila ini keliru.", 409);
    errorResponse(res, "Gagal mengirim KYC", 500, error);
  }
};

/** Menyalin data KYC dari digitalcoop.id (NIK + foto) ke database dan R2 privat milik Academy. */
export const importDigitalcoop = async (req: any, res: any) => {
  const stored: (string | undefined)[] = [];
  try {
    if (!kycCryptoConfigured()) return errorResponse(res, "KYC belum dapat dipakai: kunci enkripsi server belum diatur. Hubungi Admin.", 503);
    const [u] = await db.select({ dc: users.digitalcoopUserId }).from(users).where(eq(users.id, req.user.id)).limit(1);
    if (!u?.dc) return errorResponse(res, "Akun Anda tidak tertaut dengan digitalcoop.id.", 400);
    const [cur] = await db.select({ s: kycRecords.status }).from(kycRecords).where(eq(kycRecords.userId, req.user.id)).limit(1);
    if (cur && cur.s !== "REJECTED") return errorResponse(res, cur.s === "VERIFIED" ? "Identitas Anda sudah terverifikasi." : "Pengajuan Anda sedang ditinjau.", 409);
    const kyc = await bridge.ambilKyc(u.dc);
    if (!isDigitalcoopKycComplete(kyc.kycStatus)) return errorResponse(res, "Verifikasi KYC Anda di digitalcoop.id belum selesai. Selesaikan di sana atau unggah manual di sini.", 409);
    const v = validateKycInput({ nik: normalizeNik(kyc.nik), fullName: kyc.nama });
    if (!v.ok) return errorResponse(res, "Data KYC di digitalcoop.id tidak lengkap. Unggah manual di sini.", 422);
    const ktp = await storeImage(req.user.id, "ktp", Buffer.from(kyc.ktp?.base64 ?? "", "base64"));
    if ("error" in ktp) return errorResponse(res, "Foto KTP dari digitalcoop.id tidak dapat dipakai. Unggah manual di sini.", 422);
    stored.push(ktp.key);
    const selfie = await storeImage(req.user.id, "selfie", Buffer.from(kyc.selfie?.base64 ?? "", "base64"));
    if ("error" in selfie) { await cleanup(stored); return errorResponse(res, "Foto selfie dari digitalcoop.id tidak dapat dipakai. Unggah manual di sini.", 422); }
    stored.push(selfie.key);
    const r = await saveRecord(req.user.id, "VERIFIED", "DIGITALCOOP", v.value, ktp, selfie);
    if (!r.ok) { await cleanup(stored); return errorResponse(res, r.message, r.code); }
    await cleanup(r.old.map((o) => o.key));
    console.info(`[kyc] disalin dari digitalcoop.id user=${req.user.id}`);
    successResponse(res, null, "Data KYC disalin dari digitalcoop.id dan terverifikasi.");
  } catch (error) {
    await cleanup(stored);
    if (error instanceof BridgeError) return errorResponse(res, error.message, error.status >= 500 ? 502 : error.status);
    if (isUniqueViolation(error)) return errorResponse(res, "NIK ini sudah dipakai akun lain. Hubungi Admin.", 409);
    errorResponse(res, "Gagal menyalin KYC", 500, error);
  }
};

// --- Admin Sistem ---

export const adminList = async (req: any, res: any) => {
  try {
    const status = ["PENDING", "VERIFIED", "REJECTED"].includes(String(req.query.status)) ? String(req.query.status) : "PENDING";
    const rows = await db.select({
      id: kycRecords.id, status: kycRecords.status, source: kycRecords.source, fullName: kycRecords.fullName, nikLast4: kycRecords.nikLast4,
      submittedAt: kycRecords.submittedAt, reviewedAt: kycRecords.reviewedAt, rejectNote: kycRecords.rejectNote, userName: users.name, userEmail: users.email, userRole: users.role,
    }).from(kycRecords).innerJoin(users, eq(users.id, kycRecords.userId)).where(eq(kycRecords.status, status)).orderBy(desc(kycRecords.submittedAt)).limit(200);
    successResponse(res, rows.map((r) => ({ ...r, nikMasked: `${"*".repeat(12)}${r.nikLast4}` })), "Antrean KYC");
  } catch (error) {
    errorResponse(res, "Gagal memuat antrean KYC", 500, error);
  }
};

const loadRecord = async (id: unknown) => (isUuid(id) ? (await db.select().from(kycRecords).where(eq(kycRecords.id, id)).limit(1))[0] : undefined);
const logAccess = (recordId: string, actorId: string, file: "ktp" | "selfie" | "nik") => db.insert(kycAccessLog).values({ recordId, actorId, file });

/** Membuka foto (ktp | selfie) lewat tautan bertanda tangan singkat; setiap pembukaan dicatat. */
export const adminFile = async (req: any, res: any) => {
  try {
    const rec = await loadRecord(req.params.id);
    const which = req.params.file;
    if (!rec || (which !== "ktp" && which !== "selfie")) return errorResponse(res, "Berkas tidak ditemukan", 404);
    const key = which === "ktp" ? rec.ktpKey : rec.selfieKey;
    const mime = which === "ktp" ? rec.ktpMime : rec.selfieMime;
    await logAccess(rec.id, req.user.id, which);
    const access = await privateAccess(key, mime, 60);
    res.setHeader("Cache-Control", "private, no-store");
    if (access.type === "redirect") return res.redirect(302, access.url);
    res.setHeader("Content-Type", mime);
    res.setHeader("Content-Disposition", "inline");
    res.sendFile(access.path, (err: any) => { if (err && !res.headersSent) errorResponse(res, "Berkas tidak tersedia", 404); });
  } catch (error) {
    errorResponse(res, "Gagal membuka berkas", 500, error);
  }
};

/** NIK utuh hanya ditampilkan atas permintaan eksplisit Admin dan dicatat. */
export const adminNik = async (req: any, res: any) => {
  try {
    const rec = await loadRecord(req.params.id);
    if (!rec) return errorResponse(res, "Data tidak ditemukan", 404);
    await logAccess(rec.id, req.user.id, "nik");
    res.setHeader("Cache-Control", "private, no-store");
    successResponse(res, { nik: decryptNik(rec.nikEnc), nikMasked: maskNik(decryptNik(rec.nikEnc)) }, "NIK");
  } catch (error) {
    errorResponse(res, "Gagal membuka NIK", 500, error);
  }
};

const decide = async (req: any, res: any, approve: boolean) => {
  try {
    let note: string | null = null;
    if (!approve) {
      const n = validateRejectNote(req.body?.note);
      if (!n.ok) return errorResponse(res, n.message, 400);
      note = n.value;
    }
    const rec = await loadRecord(req.params.id);
    if (!rec) return errorResponse(res, "Data tidak ditemukan", 404);
    const out = await db.transaction(async (tx) => {
      const [done] = await tx.update(kycRecords).set({ status: approve ? "VERIFIED" : "REJECTED", rejectNote: note, reviewedAt: new Date(), reviewedBy: req.user.id })
        .where(and(eq(kycRecords.id, rec.id), eq(kycRecords.status, "PENDING"))).returning({ userId: kycRecords.userId });
      if (!done) return false;
      await notifyUser(tx, done.userId, approve ? "Identitas terverifikasi" : "KYC ditolak", approve ? "Verifikasi identitas Anda disetujui." : `Pengajuan KYC ditolak: ${note}. Silakan kirim ulang.`, "AKUN");
      return true;
    });
    if (!out) return errorResponse(res, "Pengajuan ini sudah diputuskan.", 409);
    successResponse(res, null, approve ? "KYC disetujui" : "KYC ditolak");
  } catch (error) {
    errorResponse(res, "Gagal memutuskan KYC", 500, error);
  }
};
export const adminApprove = (req: any, res: any) => decide(req, res, true);
export const adminReject = (req: any, res: any) => decide(req, res, false);
