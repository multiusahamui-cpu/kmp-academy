
import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import routes from "./routes";
import { errorResponse } from "./utils/response";

const app: any = express();

// --- Global Middleware ---
app.use(helmet()); // Security Headers
app.use(cors()); // Cross-Origin Resource Sharing
app.use(express.json()); // Parse JSON body
app.use(express.urlencoded({ extended: true }));
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
app.use((err: Error, req: any, res: any, next: any) => {
  console.error(err.stack);
  errorResponse(res, "Internal Server Error", 500, err.message);
});

export default app;
