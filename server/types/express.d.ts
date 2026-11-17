
import { UserRole } from "../schema/schema";

declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      id: string;
      email: string;
      role: UserRole; // Simplified for basic matching
    };
  }
}
