
import { successResponse, errorResponse } from "../utils/response";
import { db } from "../db";
import { users } from "../schema/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { JWT_SECRET } from "../lib/jwt-secret";
import { getConfigBool, getConfigInt, getConfigValue } from "../lib/system-config";

// Masa berlaku token mengikuti Konfigurasi Sistem (login_session_hours).
const tokenLifetime = async (): Promise<number> => (await getConfigInt("login_session_hours")) * 60 * 60;

const registerSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(255),
  email: z.string().trim().toLowerCase().email("Format email tidak valid").max(255),
  password: z.string().min(1, "Password wajib diisi").max(200),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1).max(255),
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
    const { name, email, password } = parsed.data;

    const minLength = await getConfigInt("password_min_length");
    if (password.length < minLength) {
      return errorResponse(res, `Password minimal ${minLength} karakter`, 400);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await db.insert(users).values({
      name,
      email,
      password: hashedPassword,
      role: "STUDENT"
    }).returning();

    // Generate Token
    const token = jwt.sign({ id: newUser[0].id, role: newUser[0].role }, JWT_SECRET, { expiresIn: await tokenLifetime() });

    successResponse(res, { token, user: { id: newUser[0].id, name: newUser[0].name, role: newUser[0].role } }, "Pendaftaran berhasil", 201);
  } catch (error: any) {
    if (error.code === '23505') { // Unique constraint violation (Email)
       return errorResponse(res, "Email sudah terdaftar", 400);
    }
    errorResponse(res, "Pendaftaran gagal", 500, error);
  }
};

export const login = async (req: any, res: any) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return errorResponse(res, "Email atau password salah", 401);
    }
    const { email, password } = parsed.data;

    // 1. Check DB for User
    const userResult = await db.select().from(users).where(eq(users.email, email)).limit(1);
    
    if (userResult.length === 0) {
      return errorResponse(res, "Email atau password salah", 401);
    }

    const user = userResult[0];

    // 2. Validate Password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return errorResponse(res, "Email atau password salah", 401);
    }

    if (user.status !== 'ACTIVE') {
       return errorResponse(res, "Akun dibekukan atau diblokir. Hubungi Admin.", 403);
    }

    // Mode maintenance: hanya Superadmin yang boleh masuk.
    if (user.role !== "SUPERADMIN" && (await getConfigBool("maintenance_mode"))) {
      return errorResponse(res, await getConfigValue("maintenance_message"), 503);
    }

    // 3. Generate Token
    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email }, 
      JWT_SECRET, 
      { expiresIn: await tokenLifetime() }
    );

    successResponse(res, { 
      token, 
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

export const logout = async (req: any, res: any) => {
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
    const { name, bio, avatar } = req.body;
    await db.update(users)
      .set({ name, bio, avatar })
      .where(eq(users.id, req.user.id));
      
    successResponse(res, null, "Profile updated");
  } catch (error) {
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
