
import type { Config } from "drizzle-kit";
import * as dotenv from "dotenv";
dotenv.config();

export default {
  schema: "./src/schema/*",
  out: "./drizzle",
  driver: "pg",
  dbCredentials: {
    connectionString: process.env.DATABASE_URL || "",
  },
  // Penting: Kita menggunakan schema kustom 'academy'
  schemaFilter: ["academy"],
} satisfies Config;
