import crypto from "node:crypto";
import { and, count, desc, eq, gte, ilike, isNotNull, or, sql } from "drizzle-orm";
import { db } from "../db";
import { certificates, courses, enrollments, talentInquiries, talentProfiles, users } from "../schema/schema";
import { successResponse, errorResponse } from "../utils/response";
import { SLUG_RE, TALENT_CONSENT_TEXT, TALENT_CONSENT_VERSION, slugBase, validateInquiry, validateTalentProfile } from "@shared/talent";
import { kycSatisfied } from "./roleApplicationController";
import { notifyUser } from "../lib/cards";

const PAGE = 24;
const DAILY_INQUIRY_CAP = 20; // per profil per 24 jam
const likeEscape = (s: string): string => s.replace(/[\\%_]/g, (m) => `\\${m}`);

// --- Publik (tanpa login) ---

/** Direktori: hanya profil yang dipublikasikan oleh pemiliknya (akun aktif). Tidak memuat kontak apa pun. */
export const directory = async (req: any, res: any) => {
  try {
    const q = String(req.query.q ?? "").trim().slice(0, 60);
    const page = Math.max(1, Math.min(100, Number(req.query.page) || 1));
    const conds = [eq(talentProfiles.isPublic, true), eq(users.status, "ACTIVE")];
    if (q) {
      const like = `%${likeEscape(q)}%`;
      conds.push(or(ilike(users.name, like), ilike(talentProfiles.headline, like), ilike(talentProfiles.city, like), sql`${talentProfiles.skills}::text ilike ${like}`)!);
    }
    const rows = await db.select({
      slug: talentProfiles.slug, name: users.name, avatar: users.avatar, headline: talentProfiles.headline, city: talentProfiles.city, skills: talentProfiles.skills,
    }).from(talentProfiles).innerJoin(users, eq(users.id, talentProfiles.userId)).where(and(...conds)).orderBy(desc(talentProfiles.updatedAt)).limit(PAGE + 1).offset((page - 1) * PAGE);
    successResponse(res, { items: rows.slice(0, PAGE), hasMore: rows.length > PAGE, page }, "Industry Hub");
  } catch (error) {
    errorResponse(res, "Gagal memuat direktori", 500, error);
  }
};

export const publicProfile = async (req: any, res: any) => {
  try {
    const slug = String(req.params.slug ?? "");
    if (!SLUG_RE.test(slug) || slug.length > 60) return errorResponse(res, "Profil tidak ditemukan", 404);
    const [p] = await db.select({
      id: talentProfiles.id, userId: talentProfiles.userId, slug: talentProfiles.slug, headline: talentProfiles.headline, bio: talentProfiles.bio, city: talentProfiles.city,
      skills: talentProfiles.skills, linkedinUrl: talentProfiles.linkedinUrl, portfolioUrl: talentProfiles.portfolioUrl, name: users.name, avatar: users.avatar,
    }).from(talentProfiles).innerJoin(users, eq(users.id, talentProfiles.userId)).where(and(eq(talentProfiles.slug, slug), eq(talentProfiles.isPublic, true), eq(users.status, "ACTIVE"))).limit(1);
    if (!p) return errorResponse(res, "Profil tidak ditemukan", 404);
    const certs = await db.select({ serial: certificates.serial, courseTitle: certificates.courseTitle, courseType: certificates.courseType, kind: certificates.kind, grade: certificates.grade, issuedAt: certificates.issuedAt })
      .from(certificates).where(eq(certificates.userId, p.userId)).orderBy(desc(certificates.issuedAt));
    const done = await db.select({ title: courses.title, type: courses.type, completedAt: enrollments.completedAt })
      .from(enrollments).innerJoin(courses, eq(courses.id, enrollments.courseId)).where(and(eq(enrollments.userId, p.userId), isNotNull(enrollments.completedAt))).orderBy(desc(enrollments.completedAt));
    const { id: _id, userId: _uid, ...pub } = p;
    successResponse(res, { ...pub, certificates: certs, completedCourses: done }, "Profil talenta");
  } catch (error) {
    errorResponse(res, "Gagal memuat profil", 500, error);
  }
};

/** Pesan calon pemberi kerja: disimpan, lalu diteruskan ke inbox talenta. Email pengirim hanya dilihat talenta itu. */
export const sendInquiry = async (req: any, res: any) => {
  try {
    const slug = String(req.params.slug ?? "");
    const v = validateInquiry(req.body ?? {});
    if (!v.ok) return errorResponse(res, v.message, 400);
    const [p] = await db.select({ id: talentProfiles.id, userId: talentProfiles.userId }).from(talentProfiles).innerJoin(users, eq(users.id, talentProfiles.userId))
      .where(and(eq(talentProfiles.slug, slug), eq(talentProfiles.isPublic, true), eq(users.status, "ACTIVE"))).limit(1);
    if (!p) return errorResponse(res, "Profil tidak ditemukan", 404);
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [{ n }] = await db.select({ n: count() }).from(talentInquiries).where(and(eq(talentInquiries.profileId, p.id), gte(talentInquiries.createdAt, since)));
    if (Number(n) >= DAILY_INQUIRY_CAP) return errorResponse(res, "Talenta ini sudah menerima banyak pesan hari ini. Coba lagi besok.", 429);
    await db.transaction(async (tx) => {
      await tx.insert(talentInquiries).values({ profileId: p.id, ...v.value });
      await notifyUser(tx, p.userId, `Pesan dari ${v.value.company}`, `${v.value.senderName} (${v.value.company}, ${v.value.senderEmail}) menulis: ${v.value.message}`, "INFO");
    });
    successResponse(res, null, "Pesan diteruskan ke talenta.");
  } catch (error) {
    errorResponse(res, "Gagal mengirim pesan", 500, error);
  }
};

// --- Pemilik profil (login) ---

const newSlug = async (name: string): Promise<string> => {
  for (let i = 0; i < 5; i += 1) {
    const slug = `${slugBase(name)}-${crypto.randomBytes(2).toString("hex")}`;
    const [hit] = await db.select({ id: talentProfiles.id }).from(talentProfiles).where(eq(talentProfiles.slug, slug)).limit(1);
    if (!hit) return slug;
  }
  return `${slugBase(name)}-${crypto.randomBytes(6).toString("hex")}`;
};

export const myProfile = async (req: any, res: any) => {
  try {
    const [p] = await db.select().from(talentProfiles).where(eq(talentProfiles.userId, req.user.id)).limit(1);
    successResponse(res, {
      profile: p ? { slug: p.slug, headline: p.headline, bio: p.bio, city: p.city ?? "", skills: p.skills, linkedinUrl: p.linkedinUrl ?? "", portfolioUrl: p.portfolioUrl ?? "", isPublic: p.isPublic } : null,
      kycOk: await kycSatisfied(req.user.id),
      consentVersion: TALENT_CONSENT_VERSION,
      consentText: TALENT_CONSENT_TEXT,
    }, "Profil talenta saya");
  } catch (error) {
    errorResponse(res, "Gagal memuat profil", 500, error);
  }
};

/** Menyimpan profil. Memublikasikan butuh KYC terverifikasi dan persetujuan eksplisit (versi dan waktunya dicatat). */
export const saveMyProfile = async (req: any, res: any) => {
  try {
    const v = validateTalentProfile(req.body ?? {});
    if (!v.ok) return errorResponse(res, v.message, 400);
    const wantPublic = req.body?.isPublic === true;
    const uid = req.user.id;
    const [me] = await db.select({ name: users.name, role: users.role, status: users.status }).from(users).where(eq(users.id, uid)).limit(1);
    if (!me || me.status !== "ACTIVE") return errorResponse(res, "Akun tidak aktif.", 403);
    if (wantPublic) {
      if (me.role !== "STUDENT") return errorResponse(res, "Industry Hub untuk akun Student.", 409);
      if (!(await kycSatisfied(uid))) return errorResponse(res, "Selesaikan verifikasi identitas (KYC) sebelum memublikasikan profil.", 403);
      if (req.body?.consent !== true) return errorResponse(res, "Centang persetujuan penayangan data untuk memublikasikan profil.", 400);
    }
    const now = new Date();
    const [cur] = await db.select().from(talentProfiles).where(eq(talentProfiles.userId, uid)).limit(1);
    const fields = { headline: v.value.headline, bio: v.value.bio, city: v.value.city || null, skills: v.value.skills, linkedinUrl: v.value.linkedinUrl, portfolioUrl: v.value.portfolioUrl, isPublic: wantPublic, updatedAt: now };
    const consent = wantPublic && (!cur?.isPublic || cur.consentVersion !== TALENT_CONSENT_VERSION) ? { consentAt: now, consentVersion: TALENT_CONSENT_VERSION } : {};
    if (cur) await db.update(talentProfiles).set({ ...fields, ...consent }).where(eq(talentProfiles.id, cur.id));
    else await db.insert(talentProfiles).values({ userId: uid, slug: await newSlug(me.name), ...fields, ...consent });
    successResponse(res, null, wantPublic ? "Profil dipublikasikan." : "Profil disimpan dan disembunyikan dari publik.");
  } catch (error) {
    errorResponse(res, "Gagal menyimpan profil", 500, error);
  }
};

/** Menyembunyikan profil seketika (mencabut persetujuan tayang) tanpa menghapus isinya. */
export const hideMyProfile = async (req: any, res: any) => {
  try {
    await db.update(talentProfiles).set({ isPublic: false, updatedAt: new Date() }).where(eq(talentProfiles.userId, req.user.id));
    successResponse(res, null, "Profil disembunyikan.");
  } catch (error) {
    errorResponse(res, "Gagal menyembunyikan profil", 500, error);
  }
};
