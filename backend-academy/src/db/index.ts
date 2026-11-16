
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../schema/schema";
import * as dotenv from "dotenv";

dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error("❌ FATAL: DATABASE_URL is missing in environment variables.");
  (process as any).exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Required for Neon.tech usually
});

// Inisialisasi Drizzle dengan Schema
export const db = drizzle(pool, { schema });

// Test Connection Function
export const checkConnection = async () => {
  try {
    const client = await pool.connect();
    console.log("✅ Database Connected Successfully (PostgreSQL - Neon.tech)");
    client.release();
  } catch (err) {
    console.error("❌ FATAL: Database Connection Failed.");
    console.error("   Please check your .env file and ensure the database is running.");
    console.error("   Error Detail:", err);
    (process as any).exit(1); // Force exit application if DB is down
  }
};
