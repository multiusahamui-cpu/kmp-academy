
import { successResponse, errorResponse } from "../utils/response";
import { db } from "../db";
import { users } from "../schema/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "default_secret";

export const register = async (req: any, res: any) => {
  try {
    const { name, email, password, role } = req.body;
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await db.insert(users).values({
      name,
      email,
      password: hashedPassword,
      role: role || "STUDENT"
    }).returning();

    // Generate Token
    const token = jwt.sign({ id: newUser[0].id, role: newUser[0].role }, JWT_SECRET, { expiresIn: '1d' });

    successResponse(res, { token, user: { id: newUser[0].id, name: newUser[0].name, role: newUser[0].role } }, "Registration successful", 201);
  } catch (error: any) {
    if (error.code === '23505') { // Unique constraint violation (Email)
       return errorResponse(res, "Email already exists", 400);
    }
    errorResponse(res, "Registration failed", 500, error);
  }
};

export const login = async (req: any, res: any) => {
  try {
    const { email, password } = req.body;

    // 1. Check DB for User
    const userResult = await db.select().from(users).where(eq(users.email, email)).limit(1);
    
    if (userResult.length === 0) {
      return errorResponse(res, "Invalid email or password", 401);
    }

    const user = userResult[0];

    // 2. Validate Password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return errorResponse(res, "Invalid email or password", 401);
    }

    if (user.status !== 'ACTIVE') {
       return errorResponse(res, "Account is suspended or banned. Contact Admin.", 403);
    }

    // 3. Generate Token
    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email }, 
      JWT_SECRET, 
      { expiresIn: '1d' }
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
    }, "Login successful");

  } catch (error) {
    errorResponse(res, "Login failed", 500, error);
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
        avatar: user.avatar 
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
