// Masuk dari digitalcoop.id (menu "KMP-ADNG Academy") dan onboarding akun tertaut.
//   POST /api/auth/digitalcoop/sso         {tiket}  → login (akun tertaut) atau mulai onboarding
//   GET  /api/auth/digitalcoop/onboarding           → data yang akan disalin + pilihan yang tersedia
//   POST /api/auth/digitalcoop/onboarding  {setuju, peran, modePassword, password, email?}
// Spesifikasi: LEARNING-CENTER-CONTEXT.md (bagian 3).
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { users } from "../schema/schema";
import { successResponse, errorResponse } from "../utils/response";
import { startSession } from "../lib/session";
import { getConfigBool, getConfigInt, getConfigValue } from "../lib/system-config";
import { issueCard, notifyUser } from "../lib/cards";
import { normalizePhone } from "@shared/phone";
import {
  BridgeError,
  CONSENT_VERSION,
  ONBOARDING_TTL_MS,
  aturanMasuk,
  bridge,
  patchSinkron,
  type ProfilDigitalcoop,
} from "../lib/digitalcoop-bridge";

declare module "express-session" {
  interface SessionData {
    /** Profil digitalcoop.id menunggu persetujuan onboarding (sementara, 15 menit). */
    dcOnboarding?: { profil: ProfilDigitalcoop; at: number };
  }
}

const sessionLifetimeMs = async (): Promise<number> => (await getConfigInt("login_session_hours")) * 60 * 60 * 1000;

const fail = (res: any, err: unknown, ctx: string) => {
  if (err instanceof BridgeError) return errorResponse(res, err.message, err.status === 401 ? 401 : err.status >= 500 ? 502 : err.status);
  console.error(`[digitalcoop] ${ctx}`, err);
  return errorResponse(res, "Terjadi kesalahan.", 500);
};

const pendingProfil = (req: any): ProfilDigitalcoop | null => {
  const o = req.session?.dcOnboarding as { profil: ProfilDigitalcoop; at: number } | undefined;
  if (!o || Date.now() - o.at > ONBOARDING_TTL_MS) return null;
  return o.profil;
};

const userPayload = (u: typeof users.$inferSelect) => ({ id: u.id, name: u.name, email: u.email, role: u.role, avatar: u.avatar });

export const ssoDigitalcoop = async (req: any, res: any) => {
  try {
    const tiket = typeof req.body?.tiket === "string" ? req.body.tiket : "";
    if (!/^[A-Za-z0-9_-]{40,64}$/.test(tiket)) return errorResponse(res, "Tautan masuk tidak valid.", 400);
    const profil = await bridge.tukarTiket(tiket);
    const dasar = aturanMasuk("STUDENT", profil);
    if (!dasar.ok) return errorResponse(res, dasar.message, 403);
    const [linked] = await db.select().from(users).where(eq(users.digitalcoopUserId, profil.digitalcoopUserId)).limit(1);
    if (linked) {
      if (linked.status !== "ACTIVE") {
        return errorResponse(res, linked.status === "ARCHIVED" ? "Akun Academy Anda telah ditutup." : "Akun Academy Anda dibekukan atau diblokir. Hubungi Admin.", 403);
      }
      const rule = aturanMasuk(linked.role, profil);
      if (!rule.ok) return errorResponse(res, rule.message, 403);
      if (linked.role !== "SUPERADMIN" && (await getConfigBool("maintenance_mode"))) {
        return errorResponse(res, await getConfigValue("maintenance_message"), 503);
      }
      await db.update(users).set(patchSinkron(profil, new Date())).where(eq(users.id, linked.id));
      await startSession(req, linked.id, await sessionLifetimeMs());
      return successResponse(res, { user: userPayload(linked) }, "Login berhasil");
    }
    req.session.dcOnboarding = { profil, at: Date.now() };
    await new Promise<void>((resolve, reject) => req.session.save((e: Error | null) => (e ? reject(e) : resolve())));
    return successResponse(res, { onboarding: true }, "Persetujuan diperlukan");
  } catch (err) {
    return fail(res, err, "sso");
  }
};

export const getOnboarding = async (req: any, res: any) => {
  const p = pendingProfil(req);
  if (!p) return errorResponse(res, "Sesi persetujuan berakhir. Buka lagi dari menu KMP-ADNG Academy di digitalcoop.id.", 401);
  return successResponse(res, {
    data: {
      nama: p.nama,
      nomorAnggota: p.nomorAnggota,
      email: p.email,
      phone: p.phone,
      kycStatus: p.kycStatus,
      wilayah: p.wilayah,
    },
    perluEmail: !p.email,
    bolehCreator: p.contentCreator,
    consentVersion: CONSENT_VERSION,
    passwordMinLength: await getConfigInt("password_min_length"),
  });
};

const onboardingSchema = z.object({
  setuju: z.literal(true),
  peran: z.enum(["STUDENT", "CREATOR"]),
  modePassword: z.enum(["SAMA", "BARU"]),
  password: z.string().min(1).max(200),
  email: z.string().trim().toLowerCase().email().max(255).optional(),
});

export const submitOnboarding = async (req: any, res: any) => {
  try {
    const p = pendingProfil(req);
    if (!p) return errorResponse(res, "Sesi persetujuan berakhir. Buka lagi dari menu KMP-ADNG Academy di digitalcoop.id.", 401);
    const parsed = onboardingSchema.safeParse(req.body);
    if (!parsed.success) return errorResponse(res, "Lengkapi persetujuan, pilihan peran, dan password.", 400);
    const { peran, modePassword, password } = parsed.data;
    if (peran === "CREATOR" && !p.contentCreator) {
      return errorResponse(res, "Peran Creator khusus pemegang role Content Creator di digitalcoop.id. Ajukan role itu lebih dulu.", 403);
    }
    // Email wajib di Academy (OTP lupa password dikirim ke email).
    const email = (p.email ?? parsed.data.email ?? "").trim().toLowerCase();
    if (!email) return errorResponse(res, "Email wajib diisi (dipakai untuk OTP lupa password).", 400);
    const phone = p.phone ? normalizePhone(p.phone) : null;

    if (modePassword === "SAMA") {
      const cocok = await bridge.verifikasiPassword(p.digitalcoopUserId, password);
      if (!cocok) return errorResponse(res, "Password digitalcoop.id tidak cocok.", 400);
    } else {
      const min = await getConfigInt("password_min_length");
      if (password.length < min) return errorResponse(res, `Password minimal ${min} karakter.`, 400);
    }
    const hash = await bcrypt.hash(password, 10);
    const now = new Date();

    const created = await db.transaction(async (tx) => {
      const [u] = await tx
        .insert(users)
        .values({
          name: p.nama.slice(0, 255),
          email,
          phone,
          password: hash,
          role: peran,
          digitalcoopUserId: p.digitalcoopUserId,
          consentAt: now,
          consentVersion: CONSENT_VERSION,
          linkedAt: now,
          ...patchSinkron(p, now),
        })
        .returning();
      // Kartu Creator terbit saat akun aktif; kartu Student terbit setelah kursus pertama (aturan Academy).
      if (peran === "CREATOR") await issueCard(tx, u.id, null, now);
      await notifyUser(tx, u.id, "Selamat datang di KMP-ADNG Academy", "Akun Anda tertaut dengan digitalcoop.id. Anda juga dapat masuk langsung di academy.digitalcoop.id.");
      return u;
    });

    delete req.session.dcOnboarding;
    await startSession(req, created.id, await sessionLifetimeMs());
    return successResponse(res, { user: userPayload(created) }, "Akun Academy dibuat", 201);
  } catch (err: any) {
    if (err?.code === "23505") {
      const detail = String(err.constraint ?? err.detail ?? "");
      const apa = detail.includes("digitalcoop") ? "Akun digitalcoop.id ini sudah tertaut" : detail.includes("phone") ? "No HP Anda sudah dipakai akun Academy lain" : "Email sudah dipakai akun Academy lain";
      return errorResponse(res, `${apa}. Hubungi Admin Academy.`, 409);
    }
    return fail(res, err, "onboarding");
  }
};

/**
 * Dipanggil saat login biasa untuk akun tertaut: cek status terkini di digitalcoop.id dan segarkan profil.
 * digitalcoop.id tidak dapat dihubungi → login tetap diizinkan (Academy tidak boleh ikut mati), dicatat di log.
 */
export const cekAkunTertaut = async (user: typeof users.$inferSelect): Promise<{ ok: true } | { ok: false; message: string }> => {
  if (!user.digitalcoopUserId) return { ok: true };
  try {
    const profil = await bridge.status(user.digitalcoopUserId);
    const rule = aturanMasuk(user.role, profil);
    if (!rule.ok) return rule;
    await db.update(users).set(patchSinkron(profil, new Date())).where(eq(users.id, user.id));
    return { ok: true };
  } catch (err) {
    if (err instanceof BridgeError && err.status === 404) return { ok: false, message: "Akun digitalcoop.id tertaut tidak ditemukan. Hubungi Admin." };
    console.warn("[digitalcoop] status tidak dapat dicek saat login; login diizinkan", err instanceof Error ? err.message : err);
    return { ok: true };
  }
};
