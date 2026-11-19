import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import { legalAcceptances, legalDocuments } from "../schema/schema";
import { successResponse, errorResponse } from "../utils/response";
import { LEGAL_KINDS, currentVersion, isLegalKind, requiredKindsForRole, validateLegalInput, type LegalKind } from "@shared/legal";
import { LEGAL_DRAFTS } from "@shared/legal-drafts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: unknown): v is string => typeof v === "string" && UUID_RE.test(v);

/** Membuat draf versi 1 untuk tiap jenis yang belum punya dokumen. Aman dipanggil berulang. */
export const ensureLegalDrafts = async (): Promise<void> => {
  for (const k of LEGAL_KINDS) {
    const [exists] = await db.select({ id: legalDocuments.id }).from(legalDocuments).where(eq(legalDocuments.kind, k.id)).limit(1);
    if (exists) continue;
    const d = LEGAL_DRAFTS[k.id];
    await db.insert(legalDocuments).values({ kind: k.id, version: 1, title: d.title, body: d.body, status: "DRAFT" }).onConflictDoNothing();
  }
};

const publishedOf = async (kind: string) => {
  const [d] = await db.select().from(legalDocuments).where(and(eq(legalDocuments.kind, kind), eq(legalDocuments.status, "PUBLISHED"))).orderBy(desc(legalDocuments.version)).limit(1);
  return d ?? null;
};

/** Benar bila belum ada dokumen terbit untuk jenis itu (tidak memblokir sebelum diterbitkan), atau pengguna sudah menyetujui versi berlaku. */
export const hasAcceptedCurrent = async (userId: string, kind: LegalKind): Promise<boolean> => {
  const doc = await publishedOf(kind);
  if (!doc) return true;
  const [a] = await db.select({ id: legalAcceptances.id }).from(legalAcceptances).where(and(eq(legalAcceptances.userId, userId), eq(legalAcceptances.documentId, doc.id))).limit(1);
  return !!a;
};

export const ACCEPTANCE_REQUIRED_CODE = "LEGAL_ACCEPTANCE_REQUIRED";
/** Mengirim 403 dan mengembalikan false bila pengguna belum menyetujui versi berlaku dokumen itu. */
export const requireAcceptance = async (req: any, res: any, kind: LegalKind): Promise<boolean> => {
  if (await hasAcceptedCurrent(req.user.id, kind)) return true;
  res.status(403).json({ success: false, code: ACCEPTANCE_REQUIRED_CODE, message: "Anda perlu menyetujui versi terbaru perjanjian terlebih dahulu." });
  return false;
};

// --- Publik ---
export const getPublicDocs = async (_req: any, res: any) => {
  try {
    const rows = await db.select().from(legalDocuments).where(eq(legalDocuments.status, "PUBLISHED"));
    const out = LEGAL_KINDS.map((k) => currentVersion(rows, k.id)).filter((d): d is NonNullable<typeof d> => !!d)
      .map((d) => ({ id: d.id, kind: d.kind, version: d.version, title: d.title, body: d.body, publishedAt: d.publishedAt }));
    successResponse(res, out, "Dokumen hukum");
  } catch (error) {
    errorResponse(res, "Gagal memuat dokumen", 500, error);
  }
};

// --- Pengguna ---
export const getPending = async (req: any, res: any) => {
  try {
    const kinds = requiredKindsForRole(req.user.role);
    const docs = await db.select().from(legalDocuments).where(and(inArray(legalDocuments.kind, kinds), eq(legalDocuments.status, "PUBLISHED")));
    const current = kinds.map((k) => currentVersion(docs, k)).filter((d): d is NonNullable<typeof d> => !!d);
    const accepted = current.length === 0 ? [] : await db.select({ documentId: legalAcceptances.documentId }).from(legalAcceptances)
      .where(and(eq(legalAcceptances.userId, req.user.id), inArray(legalAcceptances.documentId, current.map((d) => d.id))));
    const done = new Set(accepted.map((a) => a.documentId));
    successResponse(res, current.filter((d) => !done.has(d.id)).map((d) => ({ id: d.id, kind: d.kind, version: d.version, title: d.title, body: d.body })), "Menunggu persetujuan");
  } catch (error) {
    errorResponse(res, "Gagal memuat dokumen", 500, error);
  }
};

export const accept = async (req: any, res: any) => {
  try {
    if (!isUuid(req.body?.documentId)) return errorResponse(res, "Dokumen tidak valid.", 400);
    const [d] = await db.select().from(legalDocuments).where(eq(legalDocuments.id, req.body.documentId)).limit(1);
    if (!d || d.status !== "PUBLISHED") return errorResponse(res, "Dokumen tidak valid.", 400);
    if (!requiredKindsForRole(req.user.role).includes(d.kind as LegalKind)) return errorResponse(res, "Dokumen ini tidak berlaku untuk peran Anda.", 400);
    const cur = await publishedOf(d.kind);
    if (!cur || cur.id !== d.id) return errorResponse(res, "Dokumen sudah diperbarui. Muat ulang untuk membaca versi terbaru.", 409);
    await db.insert(legalAcceptances).values({ userId: req.user.id, documentId: d.id }).onConflictDoNothing();
    successResponse(res, null, "Persetujuan dicatat", 201);
  } catch (error) {
    errorResponse(res, "Gagal mencatat persetujuan", 500, error);
  }
};

// --- Pengelolaan (Direktur dan Superadmin) ---
export const listDocs = async (_req: any, res: any) => {
  try {
    const rows = await db.select({
      id: legalDocuments.id, kind: legalDocuments.kind, version: legalDocuments.version, title: legalDocuments.title, status: legalDocuments.status,
      updatedAt: legalDocuments.updatedAt, publishedAt: legalDocuments.publishedAt,
      accepted: sql<number>`(select count(*)::int from academy.legal_acceptances a where a.document_id = ${sql.raw('"academy"."legal_documents"."id"')})`,
    }).from(legalDocuments).orderBy(legalDocuments.kind, desc(legalDocuments.version));
    successResponse(res, rows, "Dokumen hukum");
  } catch (error) {
    errorResponse(res, "Gagal memuat dokumen", 500, error);
  }
};

export const getDoc = async (req: any, res: any) => {
  try {
    if (!isUuid(req.params.id)) return errorResponse(res, "Dokumen tidak ditemukan", 404);
    const [d] = await db.select().from(legalDocuments).where(eq(legalDocuments.id, req.params.id)).limit(1);
    if (!d) return errorResponse(res, "Dokumen tidak ditemukan", 404);
    successResponse(res, d, "Dokumen");
  } catch (error) {
    errorResponse(res, "Gagal memuat dokumen", 500, error);
  }
};

/** Draf versi baru. Hanya satu draf terbuka per jenis. Isi awal boleh disalin dari versi berlaku (dikirim klien). */
export const createDraft = async (req: any, res: any) => {
  try {
    if (!isLegalKind(req.body?.kind)) return errorResponse(res, "Jenis dokumen tidak valid.", 400);
    const v = validateLegalInput(req.body);
    if (!v.ok) return errorResponse(res, v.message, 400);
    const kind = req.body.kind as LegalKind;
    const result = await db.transaction(async (tx) => {
      const existing = await tx.select({ id: legalDocuments.id, status: legalDocuments.status, version: legalDocuments.version }).from(legalDocuments).where(eq(legalDocuments.kind, kind));
      if (existing.some((e) => e.status === "DRAFT")) return "HAS_DRAFT" as const;
      const version = existing.reduce((m, e) => Math.max(m, e.version), 0) + 1;
      const [d] = await tx.insert(legalDocuments).values({ kind, version, title: v.value.title, body: v.value.body, status: "DRAFT", createdBy: req.user.id }).returning({ id: legalDocuments.id });
      return d.id;
    });
    if (result === "HAS_DRAFT") return errorResponse(res, "Sudah ada draf terbuka untuk jenis ini. Selesaikan atau terbitkan dulu.", 409);
    successResponse(res, { id: result }, "Draf dibuat", 201);
  } catch (error) {
    errorResponse(res, "Gagal membuat draf", 500, error);
  }
};

export const updateDraft = async (req: any, res: any) => {
  try {
    if (!isUuid(req.params.id)) return errorResponse(res, "Dokumen tidak ditemukan", 404);
    const v = validateLegalInput(req.body);
    if (!v.ok) return errorResponse(res, v.message, 400);
    const r = await db.update(legalDocuments).set({ title: v.value.title, body: v.value.body, updatedAt: new Date() })
      .where(and(eq(legalDocuments.id, req.params.id), eq(legalDocuments.status, "DRAFT"))).returning({ id: legalDocuments.id });
    if (r.length === 0) {
      const [d] = await db.select({ id: legalDocuments.id }).from(legalDocuments).where(eq(legalDocuments.id, req.params.id)).limit(1);
      return d ? errorResponse(res, "Dokumen yang sudah terbit tidak dapat diubah. Buat versi baru.", 409) : errorResponse(res, "Dokumen tidak ditemukan", 404);
    }
    successResponse(res, null, "Draf disimpan");
  } catch (error) {
    errorResponse(res, "Gagal menyimpan draf", 500, error);
  }
};

/** Teks yang menandakan draf belum dibersihkan. */
export const unfinishedMarkers = (body: string): string[] => {
  const out: string[] = [];
  if (body.includes("[PERLU DIKONFIRMASI")) out.push("masih ada bagian [PERLU DIKONFIRMASI]");
  if (body.includes("CATATAN INTERNAL")) out.push("masih ada CATATAN INTERNAL");
  return out;
};

export const publishDoc = async (req: any, res: any) => {
  try {
    if (!isUuid(req.params.id)) return errorResponse(res, "Dokumen tidak ditemukan", 404);
    const result = await db.transaction(async (tx) => {
      const [d] = await tx.select().from(legalDocuments).where(eq(legalDocuments.id, req.params.id)).for("update");
      if (!d) return { code: 404 as const, message: "Dokumen tidak ditemukan" };
      if (d.status !== "DRAFT") return { code: 409 as const, message: "Dokumen sudah terbit." };
      const problems = unfinishedMarkers(d.body);
      if (problems.length > 0) return { code: 400 as const, message: `Belum bisa diterbitkan: ${problems.join(", ")}.` };
      await tx.update(legalDocuments).set({ status: "PUBLISHED", publishedAt: new Date(), publishedBy: req.user.id, updatedAt: new Date() }).where(eq(legalDocuments.id, d.id));
      return { code: 200 as const, message: "Dokumen diterbitkan" };
    });
    if (result.code !== 200) return errorResponse(res, result.message, result.code);
    console.info(`[hukum] terbit ${req.params.id} oleh=${req.user.id}`);
    successResponse(res, null, result.message);
  } catch (error) {
    errorResponse(res, "Gagal menerbitkan dokumen", 500, error);
  }
};

