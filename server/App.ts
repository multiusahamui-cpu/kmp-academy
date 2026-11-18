
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import routes from "./routes";
import { errorResponse } from "./utils/response";
import { buildCorsOptions } from "./lib/security";
import { buildSessionMiddleware } from "./lib/session";
import { originGuard } from "./middleware/csrf";

const app: any = express();

// Di balik nginx (satu proxy): IP klien dibaca dari X-Forwarded-For agar rate limit tepat.
app.set("trust proxy", 1);

// --- Global Middleware ---
app.use(helmet()); // Security Headers
app.use(cors(buildCorsOptions())); // CORS ketat: hanya ALLOWED_ORIGINS
app.use(express.json()); // Parse JSON body
app.use(express.urlencoded({ extended: true }));
app.use(buildSessionMiddleware()); // Sesi di Redis (cookie httpOnly)
app.use(originGuard); // Tolak POST/PUT/DELETE lintas-origin tak dikenal (CSRF)
app.use(morgan("dev")); // Logger

// --- Static Files (Local CDN) ---
// Serve static files from 'static' directory, accessible via /cdn
app.use("/cdn", express.static("static")); 

// --- Routes ---
app.use("/api", routes);

// --- 404 Handler ---
app.use((req: any, res: any) => {
  errorResponse(res, "Endpoint not found", 404);
});

// --- Global Error Handler ---
app.use((err: Error, req: any, res: any, _next: any) => {
  console.error(err.stack);
  errorResponse(res, "Internal Server Error", 500, err.message);
});

export default app;
