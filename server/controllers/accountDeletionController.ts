import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import multer from "multer";
import { and, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { accountDeletionRequests, balanceSettlements, courses, transactions, users } from "../schema/schema";
import { successResponse, errorResponse } from "../utils/response";
import { notifyUser } from "../lib/cards";
import { proofPath, removeProofFile, saveProofFile } from "../lib/proof-storage";
import {
  DECIDER_ROLES,
  DELETION_ROLES,
  PROOF_MAX_BYTES,
  checkCanApprove,
  detectProofType,
  validateSettlement,
  validateText,
} from "@shared/account-deletion";

const inRoles = (role: string, list: readonly string[]): boolean => list.includes(role);

// ---------------------------------------------------------------------------
// Sisi pemilik akun (Student, Mentor, Creator)
// ---------------------------------------------------------------------------

/** Status pengajuan terakhir + hal yang perlu diselesaikan sebelum akun bisa ditutup. */
export const getMyDeletion = async (req: any, res: any) => {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, req.user.id)).limit(1);
    if (!user) return errorResponse(res, "Pengguna tidak ditemukan", 404);
    if (!inRoles(user.role, DELETION_ROLES)) return successResponse(res, { eligible: false }, "Tidak berlaku");

    const [latest] = await db
      .select()
      .from(accountDeletionRequests)
      .where(eq(accountDeletionRequests.userId, user.id))
      .orderBy(desc(accountDeletionRequests.createdAt))
      .limit(1);
    const [pub] = await db
      .select({ n: count() })
      .from(courses)
      .where(and(eq(courses.instructorId, user.id), eq(courses.status, "PUBLISHED")));

    successResponse(res, { eligible: true, balance: user.walletBalance, publishedCourses: Number(pub?.n ?? 0), request: latest ?? null }, "Status penghapusan akun");
  } catch (error) {
    errorResponse(res, "Gagal memuat status penghapusan akun", 500, error);
  }
};

const requestSchema = z.object({ reason: z.string(), password: z.string().min(1, "Password wajib diisi").max(200) });

export const requestDeletion = async (req: any, res: any) => {
  try {
    const parsed = requestSchema.safeParse(req.body);
    if (!parsed.success) return errorResponse(res, parsed.error.issues[0]?.message || "Data tidak valid", 400);
    const reason = validateText(parsed.data.reason, "Alasan");
    if (!reason.ok) return errorResponse(res, reason.message, 400);

    const [user] = await db.select().from(users).where(eq(users.id, req.user.id)).limit(1);
    if (!user) return errorResponse(res, "Pengguna tidak ditemukan", 404);
    if (!inRoles(user.role, DELETION_ROLES)) return errorResponse(res, "Akun ini tidak dapat mengajukan penghapusan dari menu ini.", 403);
    if (!(await bcrypt.compare(parsed.data.password, user.password))) return errorResponse(res, "Password salah", 400);

    try {
      await db.transaction(async (tx) => {
        await tx.insert(accountDeletionRequests).values({ userId: user.id, reason: reason.value });
        const deciders = await tx.select({ id: users.id }).from(users).where(inArray(users.role, ["ADMIN_SYSTEM", "DIRECTOR"]));
        for (const d of deciders) {
          await notifyUser(tx, d.id, "Pengajuan penghapusan akun", `${user.name} mengajukan penghapusan akun. Tinjau di menu Penghapusan Akun.`);
        }
      });
    } catch (error: any) {
      if (error?.code === "23505") return errorResponse(res, "Anda sudah memiliki pengajuan yang menunggu.", 409);
      throw error;
    }
    console.info(`[akun] pengajuan penghapusan userId=${user.id}`);
    successResponse(res, null, "Pengajuan penghapusan akun dikirim. Akun tetap aktif sampai disetujui.");
  } catch (error) {
    errorResponse(res, "Gagal mengajukan penghapusan akun", 500, error);
  }
};

export const cancelDeletion = async (req: any, res: any) => {
  try {
    const done = await db
      .update(accountDeletionRequests)
      .set({ status: "CANCELLED", decidedAt: new Date() })
      .where(and(eq(accountDeletionRequests.userId, req.user.id), eq(accountDeletionRequests.status, "PENDING")))
      .returning({ id: accountDeletionRequests.id });
    if (done.length === 0) return errorResponse(res, "Tidak ada pengajuan yang menunggu.", 404);
    successResponse(res, null, "Pengajuan dibatalkan");
  } catch (error) {
    errorResponse(res, "Gagal membatalkan pengajuan", 500, error);
  }
};

// ---------------------------------------------------------------------------
// Sisi Admin dan Direktur
// ---------------------------------------------------------------------------

const settlementOut = (s: typeof balanceSettlements.$inferSelect) => ({
  id: s.id,
  requestId: s.requestId,
  amount: s.amount,
  transferDate: s.transferDate,
  bankRef: s.bankRef,
  note: s.note,
  proofMime: s.proofMime,
  settledByName: s.settledByName,
  createdAt: s.createdAt,
});

export const listDeletions = async (req: any, res: any) => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : "PENDING";
    if (!["PENDING", "APPROVED", "REJECTED", "CANCELLED", "ALL"].includes(status)) return errorResponse(res, "Status tidak valid", 400);

    const rows = await db
      .select({
        id: accountDeletionRequests.id,
        status: accountDeletionRequests.status,
        reason: accountDeletionRequests.reason,
        createdAt: accountDeletionRequests.createdAt,
        decidedByName: accountDeletionRequests.decidedByName,
        decidedByRole: accountDeletionRequests.decidedByRole,
        decidedAt: accountDeletionRequests.decidedAt,
        decisionNote: accountDeletionRequests.decisionNote,
        userId: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        role: users.role,
        cardNumber: users.cardNumber,
        balance: users.walletBalance,
      })
      .from(accountDeletionRequests)
      .innerJoin(users, eq(users.id, accountDeletionRequests.userId))
      .where(status === "ALL" ? undefined : eq(accountDeletionRequests.status, status))
      .orderBy(desc(accountDeletionRequests.createdAt))
      .limit(200);

    const ids = rows.map((r) => r.id);
    const userIds = [...new Set(rows.map((r) => r.userId))];
    const settles = ids.length ? await db.select().from(balanceSettlements).where(inArray(balanceSettlements.requestId, ids)) : [];
    const pubs = userIds.length
      ? await db
          .select({ userId: courses.instructorId, n: count() })
          .from(courses)
          .where(and(inArray(courses.instructorId, userIds), eq(courses.status, "PUBLISHED")))
          .groupBy(courses.instructorId)
      : [];

    successResponse(
      res,
      rows.map((r) => ({
        ...r,
        publishedCourses: Number(pubs.find((p) => p.userId === r.userId)?.n ?? 0),
        settlement: (() => {
          const s = settles.find((x) => x.requestId === r.id);
          return s ? settlementOut(s) : null;
        })(),
      })),
      "Daftar pengajuan penghapusan akun",
    );
  } catch (error) {
    errorResponse(res, "Gagal memuat pengajuan", 500, error);
  }
};

const decisionSchema = z.object({ decision: z.enum(["APPROVE", "REJECT"]), note: z.string() });

/** Admin atau Direktur (salah satu) memutuskan; catatan wajib. Menyetujui = akun diarsipkan. */
export const decideDeletion = async (req: any, res: any) => {
  try {
    const parsed = decisionSchema.safeParse(req.body);
    if (!parsed.success) return errorResponse(res, "Keputusan tidak valid", 400);
    const note = validateText(parsed.data.note, "Catatan");
    if (!note.ok) return errorResponse(res, note.message, 400);
    const { decision } = parsed.data;

    const [actor] = await db.select({ name: users.name }).from(users).where(eq(users.id, req.user.id)).limit(1);

    const outcome = await db.transaction(async (tx) => {
      const [reqRow] = await tx.select().from(accountDeletionRequests).where(eq(accountDeletionRequests.id, req.params.id)).for("update").limit(1);
      if (!reqRow) return { code: 404 as const, message: "Pengajuan tidak ditemukan" };
      if (reqRow.status !== "PENDING") return { code: 409 as const, message: "Pengajuan ini sudah diputuskan atau dibatalkan." };

      const [target] = await tx.select().from(users).where(eq(users.id, reqRow.userId)).for("update").limit(1);
      if (!target) return { code: 404 as const, message: "Pengguna tidak ditemukan" };
      if (!inRoles(target.role, DELETION_ROLES)) return { code: 403 as const, message: "Akun ini tidak dapat diarsipkan dari menu ini." };

      const now = new Date();
      if (decision === "APPROVE") {
        const can = checkCanApprove(target.walletBalance);
        if (!can.ok) return { code: 409 as const, message: can.message };
        await tx.update(users).set({ status: "ARCHIVED", archivedAt: now, updatedAt: now }).where(eq(users.id, target.id));
      }
      await tx
        .update(accountDeletionRequests)
        .set({
          status: decision === "APPROVE" ? "APPROVED" : "REJECTED",
          decidedBy: req.user.id,
          decidedByName: actor?.name ?? null,
          decidedByRole: req.user.role,
          decidedAt: now,
          decisionNote: note.value,
        })
        .where(eq(accountDeletionRequests.id, reqRow.id));
      if (decision === "REJECT") {
        await notifyUser(tx, target.id, "Pengajuan penghapusan akun ditolak", `Catatan: ${note.value}`);
      }
      return { code: 200 as const, message: decision === "APPROVE" ? "Akun diarsipkan" : "Pengajuan ditolak" };
    });

    if (outcome.code !== 200) return errorResponse(res, outcome.message, outcome.code);
    console.info(`[akun] penghapusan ${decision} requestId=${req.params.id} oleh=${req.user.id}`);
    successResponse(res, null, outcome.message);
  } catch (error) {
    errorResponse(res, "Gagal memproses keputusan", 500, error);
  }
};

const proofUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: PROOF_MAX_BYTES, files: 1 } });

export const proofUploadMiddleware = (req: any, res: any, next: any) => {
  proofUpload.single("proof")(req, res, (err: any) => {
    if (!err) return next();
    if (err.code === "LIMIT_FILE_SIZE") return errorResponse(res, "Ukuran bukti transfer maksimal 5 MB.", 400);
    return errorResponse(res, "Berkas bukti tidak dapat diproses.", 400);
  });
};

/**
 * Admin menandai saldo diselesaikan lewat transfer: nominal harus sama dengan saldo, bukti wajib diunggah.
 * Dalam satu transaksi: saldo menjadi nol, tercatat sebagai mutasi dompet DEBIT, dan riwayat penyelesaian disimpan.
 */
export const settleBalance = async (req: any, res: any) => {
  let savedFile: string | null = null;
  try {
    const file = req.file as { buffer: Buffer } | undefined;
    if (!file || file.buffer.length === 0) return errorResponse(res, "Unggah bukti transfer terlebih dahulu.", 400);
    const proof = detectProofType(file.buffer);
    if (!proof) return errorResponse(res, "Bukti harus berupa JPG, PNG, WebP, atau PDF.", 400);
    const noteRaw = typeof req.body?.note === "string" ? req.body.note.trim().slice(0, 500) : "";

    const [actor] = await db.select({ name: users.name }).from(users).where(eq(users.id, req.user.id)).limit(1);
    const fileName = `${crypto.randomUUID()}.${proof.ext}`;

    const outcome = await db.transaction(async (tx) => {
      const [reqRow] = await tx.select().from(accountDeletionRequests).where(eq(accountDeletionRequests.id, req.params.id)).for("update").limit(1);
      if (!reqRow) return { code: 404 as const, message: "Pengajuan tidak ditemukan" };
      if (reqRow.status !== "PENDING") return { code: 409 as const, message: "Pengajuan ini sudah diputuskan atau dibatalkan." };

      const [target] = await tx.select().from(users).where(eq(users.id, reqRow.userId)).for("update").limit(1);
      if (!target) return { code: 404 as const, message: "Pengguna tidak ditemukan" };

      const v = validateSettlement({ amount: req.body?.amount, balance: target.walletBalance, transferDate: req.body?.transferDate, bankRef: req.body?.bankRef });
      if (!v.ok) return { code: 400 as const, message: v.message };

      await saveProofFile(fileName, file.buffer);
      savedFile = fileName;

      const [settlement] = await tx
        .insert(balanceSettlements)
        .values({
          userId: target.id,
          requestId: reqRow.id,
          amount: v.value.amount,
          transferDate: v.value.transferDate,
          bankRef: v.value.bankRef,
          note: noteRaw || null,
          proofFile: fileName,
          proofMime: proof.mime,
          settledBy: req.user.id,
          settledByName: actor?.name ?? null,
        })
        .returning({ id: balanceSettlements.id });

      await tx.update(users).set({ walletBalance: sql`${users.walletBalance} - ${v.value.amount}`, updatedAt: new Date() }).where(eq(users.id, target.id));
      await tx.insert(transactions).values({
        userId: target.id,
        description: "Penyelesaian saldo penutupan akun (transfer)",
        amount: v.value.amount,
        type: "DEBIT",
        status: "SUCCESS",
        referenceId: settlement.id,
        paymentMethod: "TRANSFER_MANUAL",
      });
      await notifyUser(tx, target.id, "Saldo diselesaikan", `Saldo Rp${v.value.amount.toLocaleString("id-ID")} telah ditransfer kepada Anda (ref ${v.value.bankRef}).`);
      return { code: 200 as const, message: "Saldo ditandai selesai" };
    });

    if (outcome.code !== 200) {
      if (savedFile) await removeProofFile(savedFile);
      return errorResponse(res, outcome.message, outcome.code);
    }
    console.info(`[akun] saldo diselesaikan requestId=${req.params.id} oleh=${req.user.id}`);
    successResponse(res, null, outcome.message);
  } catch (error) {
    if (savedFile) await removeProofFile(savedFile);
    errorResponse(res, "Gagal menyelesaikan saldo", 500, error);
  }
};

/** Bukti transfer hanya untuk Admin dan Direktur; berkas dibaca dari nama di database, bukan dari input. */
export const getSettlementProof = async (req: any, res: any) => {
  try {
    if (!inRoles(req.user.role, DECIDER_ROLES)) return errorResponse(res, "Tidak diizinkan", 403);
    const [s] = await db.select().from(balanceSettlements).where(eq(balanceSettlements.id, req.params.id)).limit(1);
    if (!s) return errorResponse(res, "Bukti tidak ditemukan", 404);
    res.setHeader("Content-Type", s.proofMime);
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Content-Disposition", "inline");
    res.sendFile(proofPath(s.proofFile), (err: any) => {
      if (err && !res.headersSent) errorResponse(res, "Berkas bukti tidak tersedia", 404);
    });
  } catch (error) {
    errorResponse(res, "Gagal membuka bukti", 500, error);
  }
};

/** Daftar Akun Archived: Admin dan Direktur, hanya baca (akun final, tidak ada pemulihan). */
export const listArchived = async (req: any, res: any) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 100) : "";
    const page = Math.max(1, Number(req.query.page) || 1);
    const size = 20;
    const like = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
    const where = q
      ? and(eq(users.status, "ARCHIVED"), or(ilike(users.name, like), ilike(users.email, like), ilike(users.phone, like), ilike(users.cardNumber, like)))
      : eq(users.status, "ARCHIVED");

    const [total] = await db.select({ n: count() }).from(users).where(where);
    const rows = await db
      .select({ id: users.id, name: users.name, email: users.email, phone: users.phone, role: users.role, cardNumber: users.cardNumber, archivedAt: users.archivedAt, createdAt: users.createdAt })
      .from(users)
      .where(where)
      .orderBy(desc(users.archivedAt))
      .limit(size)
      .offset((page - 1) * size);

    const ids = rows.map((r) => r.id);
    const reqs = ids.length
      ? await db
          .select()
          .from(accountDeletionRequests)
          .where(and(inArray(accountDeletionRequests.userId, ids), eq(accountDeletionRequests.status, "APPROVED")))
          .orderBy(desc(accountDeletionRequests.decidedAt))
      : [];
    const settles = reqs.length ? await db.select().from(balanceSettlements).where(inArray(balanceSettlements.requestId, reqs.map((r) => r.id))) : [];

    successResponse(
      res,
      {
        total: Number(total?.n ?? 0),
        page,
        size,
        items: rows.map((r) => {
          const rq = reqs.find((x) => x.userId === r.id);
          const st = rq ? settles.find((s) => s.requestId === rq.id) : undefined;
          return {
            ...r,
            reason: rq?.reason ?? null,
            decidedByName: rq?.decidedByName ?? null,
            decidedByRole: rq?.decidedByRole ?? null,
            decidedAt: rq?.decidedAt ?? null,
            decisionNote: rq?.decisionNote ?? null,
            settlement: st ? settlementOut(st) : null,
          };
        }),
      },
      "Daftar akun archived",
    );
  } catch (error) {
    errorResponse(res, "Gagal memuat daftar akun archived", 500, error);
  }
};
