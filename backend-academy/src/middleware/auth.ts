
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { errorResponse } from "../utils/response";

const JWT_SECRET = process.env.JWT_SECRET || "default_secret";

export const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return errorResponse(res, "Access Denied. No token provided.", 401);
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (error) {
    return errorResponse(res, "Invalid Token.", 403);
  }
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: any, res: any, next: any) => {
    if (!req.user) {
      return errorResponse(res, "Unauthorized.", 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return errorResponse(res, "Forbidden. You do not have permission.", 403);
    }

    next();
  };
};
