
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../schema/schema";
import * as dotenv from "dotenv";

dotenv.config({ quiet: true });

if (!process.env.DATABASE_URL) {
  console.error("❌ FATAL: DATABASE_URL is missing in environment variables.");
  (process as any).exit(1);
}

// SSL diatur lewat DATABASE_URL (mis. `?sslmode=require`), seperti garuda-superapp.
// PostgreSQL lokal/VPS yang sama dengan digitalcoop.id tidak memakai SSL.
// PENTING (zona waktu): pin setiap koneksi ke UTC, menyamai standar garuda-superapp.
// Tanpa ini koneksi mewarisi timezone server (Asia/Jakarta), sehingga now()/defaultNow()
// menulis WIB sedangkan Drizzle mengirim `new Date()` sebagai UTC — keduanya beda 7 jam
// dan merusak semua perbandingan waktu (kedaluwarsa, cutoff, jendela harian).
// `-c timezone=UTC` diset saat handshake koneksi (bebas race, aman untuk connection pooling).
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  options: "-c timezone=UTC",
});

// Inisialisasi Drizzle dengan Schema
export const db = drizzle(pool, { schema });

// Test Connection Function
export const checkConnection = async () => {
  try {
    const client = await pool.connect();
    console.log("✅ Database Connected Successfully (PostgreSQL)");
    client.release();
  } catch (err) {
    console.error("❌ FATAL: Database Connection Failed.");
    console.error("   Please check your .env file and ensure the database is running.");
    console.error("   Error Detail:", err);
    (process as any).exit(1); // Force exit application if DB is down
  }
};
