
import { successResponse, errorResponse } from "../utils/response";
import { db } from "../db";
import { users } from "../schema/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { startSession, endSession } from "../lib/session";
import { normalizePhone, looksLikeEmail } from "@shared/phone";
import { getConfigBool, getConfigInt, getConfigValue } from "../lib/system-config";
import { cekAkunTertaut } from "./digitalcoopController";

// Masa berlaku sesi mengikuti Konfigurasi Sistem (login_session_hours).
const sessionLifetimeMs = async (): Promise<number> => (await getConfigInt("login_session_hours")) * 60 * 60 * 1000;

const registerSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(255),
  email: z.string().trim().toLowerCase().email("Format email tidak valid").max(255),
  password: z.string().min(1, "Password wajib diisi").max(200),
  phone: z.string().trim().max(30).optional(),
});

// `identifier` = email atau No HP. `email` tetap diterima agar klien lama tidak rusak.
const loginSchema = z.object({
  identifier: z.string().trim().min(1).max(255).optional(),
  email: z.string().trim().min(1).max(255).optional(),
  password: z.string().min(1).max(200),
});

export const register = async (req: any, res: any) => {
  try {
    // `role` dari body sengaja diabaikan: pendaftaran publik selalu STUDENT.
    // Peran lain hanya diberikan dari dalam Academy oleh admin.
    if (!(await getConfigBool("registration_open"))) {
      return errorResponse(res, "Pendaftaran akun baru sedang ditutup.", 403);
    }

    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return errorResponse(res, parsed.error.issues[0]?.message || "Data pendaftaran tidak valid", 400);
    }
    const { name, email, password, phone: rawPhone } = parsed.data;

    let phone: string | null = null;
    if (rawPhone) {
      phone = normalizePhone(rawPhone);
      if (!phone) return errorResponse(res, "Format No HP tidak valid. Contoh: 0812 3456 789", 400);
    }

    const minLength = await getConfigInt("password_min_length");
    if (password.length < minLength) {
      return errorResponse(res, `Password minimal ${minLength} karakter`, 400);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await db.insert(users).values({
      name,
      email,
      phone,
      password: hashedPassword,
      role: "STUDENT"
    }).returning();

    await startSession(req, newUser[0].id, await sessionLifetimeMs());

    successResponse(res, { user: { id: newUser[0].id, name: newUser[0].name, role: newUser[0].role } }, "Pendaftaran berhasil", 201);
  } catch (error: any) {
    if (error.code === '23505') { // Unique constraint violation (Email atau No HP)
       const detail = String(error.constraint ?? error.detail ?? "");
       return errorResponse(res, detail.includes("phone") ? "No HP sudah terdaftar" : "Email sudah terdaftar", 400);
    }
    errorResponse(res, "Pendaftaran gagal", 500, error);
  }
};

export const login = async (req: any, res: any) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return errorResponse(res, "Email/No HP atau password salah", 401);
    }
    const { password } = parsed.data;
    const identifier = (parsed.data.identifier ?? parsed.data.email ?? "").trim();
    if (!identifier) return errorResponse(res, "Email/No HP atau password salah", 401);

    // 1. Cari akun lewat email atau No HP (pesan galat sama agar akun tidak bisa ditebak)
    let userResult: (typeof users.$inferSelect)[] = [];
    if (looksLikeEmail(identifier)) {
      userResult = await db.select().from(users).where(eq(users.email, identifier.toLowerCase())).limit(1);
    } else {
      const phone = normalizePhone(identifier);
      if (phone) userResult = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
    }
    
    if (userResult.length === 0) {
      return errorResponse(res, "Email/No HP atau password salah", 401);
    }

    const user = userResult[0];

    // 2. Validate Password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return errorResponse(res, "Email/No HP atau password salah", 401);
    }

    if (user.status !== 'ACTIVE') {
       return errorResponse(res, "Akun dibekukan atau diblokir. Hubungi Admin.", 403);
    }

    // Mode maintenance: hanya Superadmin yang boleh masuk.
    if (user.role !== "SUPERADMIN" && (await getConfigBool("maintenance_mode"))) {
      return errorResponse(res, await getConfigValue("maintenance_message"), 503);
    }

    // Akun tertaut digitalcoop.id: status & role dicek ulang di sumbernya (dicabut/diblokir → ditolak).
    const tautan = await cekAkunTertaut(user);
    if (!tautan.ok) return errorResponse(res, tautan.message, 403);

    // 3. Mulai sesi baru (disimpan di Redis, ID sesi diganti)
    await startSession(req, user.id, await sessionLifetimeMs());

    successResponse(res, { 
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        role: user.role, 
        avatar: user.avatar 
      } 
    }, "Login berhasil");

  } catch (error) {
    errorResponse(res, "Login gagal", 500, error);
  }
};

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Password saat ini wajib diisi").max(200),
  newPassword: z.string().min(1, "Password baru wajib diisi").max(200),
  confirmPassword: z.string().max(200),
});

export const changePassword = async (req: any, res: any) => {
  try {
    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return errorResponse(res, parsed.error.issues[0]?.message || "Data tidak valid", 400);
    }
    const { currentPassword, newPassword, confirmPassword } = parsed.data;

    if (newPassword !== confirmPassword) {
      return errorResponse(res, "Konfirmasi password tidak sama", 400);
    }
    const minLength = await getConfigInt("password_min_length");
    if (newPassword.length < minLength) {
      return errorResponse(res, `Password baru minimal ${minLength} karakter`, 400);
    }

    const [user] = await db.select().from(users).where(eq(users.id, req.user.id)).limit(1);
    if (!user) return errorResponse(res, "Pengguna tidak ditemukan", 404);

    if (!(await bcrypt.compare(currentPassword, user.password))) {
      return errorResponse(res, "Password saat ini salah", 400);
    }
    if (await bcrypt.compare(newPassword, user.password)) {
      return errorResponse(res, "Password baru tidak boleh sama dengan password lama", 400);
    }

    // Semua sesi lain akun ini jadi tidak sah (loginAt lebih lama dari passwordChangedAt); sesi ini tetap.
    const now = new Date();
    await db.update(users)
      .set({ password: await bcrypt.hash(newPassword, 10), passwordChangedAt: now, updatedAt: now })
      .where(eq(users.id, user.id));
    req.session.loginAt = now.getTime();

    // Jejak minimal tanpa menyimpan password apa pun.
    console.info(`[auth] password diganti userId=${user.id}`);
    successResponse(res, null, "Password berhasil diganti");
  } catch (error) {
    errorResponse(res, "Gagal mengganti password", 500, error);
  }
};

export const logout = async (req: any, res: any) => {
  await endSession(req, res);
  successResponse(res, null, "Logged out successfully");
};

export const getProfile = async (req: any, res: any) => {
  try {
    const user = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.id, req.user.id)
    });
    
    if(!user) return errorResponse(res, "User not found", 404);

    successResponse(res, { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        role: user.role, 
        avatar: user.avatar,
        joinedAt: user.createdAt,
        cardNumber: user.cardNumber,
        cardIssuedAt: user.cardIssuedAt,
        isMember: Boolean(user.digitalcoopUserId),
    }, "Profile data");
  } catch (error) {
    errorResponse(res, "Failed to fetch profile", 500);
  }
};

export const updateProfile = async (req: any, res: any) => {
  try {
    const { name, bio, avatar, phone: rawPhone } = req.body;

    // No HP opsional; bila diisi harus valid dan dipakai sebagai alternatif login.
    let phone: string | null | undefined;
    if (rawPhone === "" || rawPhone === null) phone = null;
    else if (typeof rawPhone === "string") {
      phone = normalizePhone(rawPhone);
      if (!phone) return errorResponse(res, "Format No HP tidak valid. Contoh: 0812 3456 789", 400);
    }

    await db.update(users)
      .set({ name, bio, avatar, ...(phone !== undefined ? { phone } : {}), updatedAt: new Date() })
      .where(eq(users.id, req.user.id));
      
    successResponse(res, null, "Profile updated");
  } catch (error: any) {
    if (error?.code === "23505") return errorResponse(res, "No HP sudah dipakai akun lain", 400);
    errorResponse(res, "Failed to update profile", 500, error);
  }
};

export const submitKYC = async (req: any, res: any) => {
  try {
    // Handle KYC Upload Logic
    successResponse(res, null, "KYC submitted successfully");
  } catch (error) {
    errorResponse(res, "KYC submission failed", 500, error);
  }
};

export const getKycStatus = async (req: any, res: any) => {
  successResponse(res, { status: "VERIFIED" }, "KYC Status");
};
