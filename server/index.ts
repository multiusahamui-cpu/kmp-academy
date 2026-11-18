import app from "./App";
import { checkConnection } from "./db";
import { connectSessionStore } from "./lib/session";
import * as dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config({ quiet: true });

const PORT = Number(process.env.PORT) || 5100;
const HOST = process.env.HOST || "127.0.0.1";

const startServer = async () => {
  // 0. Ensure Static Directory Exists
  const staticDir = path.join(process.cwd(), "static");
  if (!fs.existsSync(staticDir)) {
    fs.mkdirSync(staticDir, { recursive: true });
    console.log(`📂 Created static directory at: ${staticDir}`);
  }

  // 1. Check Database Connection
  await checkConnection();

  // 1b. Sambungkan Redis (sesi); produksi berhenti bila gagal
  try {
    await connectSessionStore();
  } catch (err) {
    console.error("FATAL: Redis tidak dapat dihubungi.", err);
    process.exit(1);
  }

  // 2. Start Express Server
  app.listen(PORT, HOST, () => {
    console.log(`
      🚀 KMP - ADNG ACADEMY Backend is running!
      📡 Server: http://${HOST}:${PORT}
      🏥 Health: http://${HOST}:${PORT}/api/health
      📂 CDN:    http://${HOST}:${PORT}/cdn
    `);
  });
};

startServer();
