import app from "./App";
import { checkConnection } from "./db";
import * as dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  // 0. Ensure Static Directory Exists
  const staticDir = path.join(process.cwd(), "static");
  if (!fs.existsSync(staticDir)) {
    fs.mkdirSync(staticDir, { recursive: true });
    console.log(`📂 Created static directory at: ${staticDir}`);
  }

  // 1. Check Database Connection
  await checkConnection();

  // 2. Start Express Server
  app.listen(PORT, () => {
    console.log(`
      🚀 KMP - ADNG ACADEMY Backend is running!
      📡 Server: http://localhost:${PORT}
      🏥 Health: http://localhost:${PORT}/api/health
      📂 CDN:    http://localhost:${PORT}/cdn
    `);
  });
};

startServer();
