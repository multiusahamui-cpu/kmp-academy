
import { Response } from "express";

export const successResponse = (res: any, data: any, message = "Success", statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

export const errorResponse = (res: any, message = "Internal Server Error", statusCode = 500, error?: any) => {
  return res.status(statusCode).json({
    success: false,
    message,
    error: process.env.NODE_ENV === "development" ? error : undefined,
  });
};
