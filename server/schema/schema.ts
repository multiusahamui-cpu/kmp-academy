
import { pgSchema, uuid, varchar, timestamp, text, integer, jsonb } from "drizzle-orm/pg-core";

// --- 1. Define Custom Schema 'academy' ---
export const academySchema = pgSchema("academy");

// --- 2. Enums ---
export const userRoleEnum = academySchema.enum("user_role", [
  "SUPERADMIN", 
  "ADMIN_SYSTEM", 
  "DIRECTOR", 
  "CREATOR", 
  "MENTOR", 
  "STUDENT", 
  "PARTNER_B2B"
]);

export const userStatusEnum = academySchema.enum("user_status", [
  "ACTIVE", 
  "SUSPENDED", 
  "BANNED"
]);

export const courseTypeEnum = academySchema.enum("course_type", [
  "MANDIRI",
  "WORKSHOP",
  "CERTIFICATION"
]);

export const courseStatusEnum = academySchema.enum("course_status", [
  "DRAFT",
  "PENDING_REVIEW",
  "PUBLISHED",
  "REJECTED"
]);

export const transactionTypeEnum = academySchema.enum("transaction_type", [
  "DEBIT", // Uang Keluar (Beli Kursus, Withdraw)
  "CREDIT" // Uang Masuk (Topup, Royalti, Fee)
]);

export const transactionStatusEnum = academySchema.enum("transaction_status", [
  "PENDING",
  "SUCCESS",
  "FAILED"
]);

// --- 3. Tables ---

// Users Table
export const users = academySchema.table("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: text("password").notNull(), // Hashed
  role: userRoleEnum("role").default("STUDENT").notNull(),
  status: userStatusEnum("status").default("ACTIVE").notNull(),
  avatar: text("avatar"),
  phone: varchar("phone", { length: 20 }),
  bio: text("bio"),
  memberSequence: integer("member_sequence").generatedAlwaysAsIdentity(),
  walletBalance: integer("wallet_balance").default(0).notNull(), // Real Wallet Balance
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Categories Table
export const categories = academySchema.table("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  count: integer("count").default(0),
});

// Courses Table
export const courses = academySchema.table("courses", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull(), // For SEO friendly URL
  description: text("description"),
  instructorId: uuid("instructor_id").references(() => users.id),
  instructorName: varchar("instructor_name", { length: 255 }), // Denormalized for query speed
  price: integer("price").default(0).notNull(),
  type: courseTypeEnum("type").default("MANDIRI").notNull(),
  status: courseStatusEnum("status").default("DRAFT").notNull(),
  thumbnail: text("thumbnail"),
  sessions: integer("sessions").default(0),
  categoryIds: jsonb("category_ids").$type<string[]>(), // Array of IDs
  
  // Rating Stats (Denormalized for performance)
  rating: integer("rating").default(0), // Disimpan skala 0-50 (misal 4.5 jadi 45) atau float logic di app
  totalReviews: integer("total_reviews").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Enrollments Table (Siswa mendaftar kursus)
export const enrollments = academySchema.table("enrollments", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  courseId: uuid("course_id").references(() => courses.id).notNull(),
  progress: integer("progress").default(0), // 0 - 100
  enrolledAt: timestamp("enrolled_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  lastAccessedAt: timestamp("last_accessed_at").defaultNow(),
});

// Wishlists Table
export const wishlists = academySchema.table("wishlists", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  courseId: uuid("course_id").references(() => courses.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Reviews Table
export const reviews = academySchema.table("reviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  courseId: uuid("course_id").references(() => courses.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  rating: integer("rating").notNull(), // 1 - 5
  comment: text("comment"),
  reply: text("reply"), // Balasan instruktur
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Transactions Table (Real Money Flow)
export const transactions = academySchema.table("transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  description: varchar("description", { length: 255 }).notNull(),
  amount: integer("amount").notNull(),
  type: transactionTypeEnum("type").notNull(), // CREDIT / DEBIT
  status: transactionStatusEnum("status").default("PENDING").notNull(),
  referenceId: varchar("reference_id", { length: 100 }), // Could be Course ID or Bank Ref ID
  paymentMethod: varchar("payment_method", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Bank Accounts Table (For Withdraw)
export const bankAccounts = academySchema.table("bank_accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  bankName: varchar("bank_name", { length: 50 }).notNull(),
  accountNumber: varchar("account_number", { length: 50 }).notNull(),
  holderName: varchar("holder_name", { length: 100 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// CDN / Storage Table
export const cdnFiles = academySchema.table("cdn_files", {
  id: uuid("id").defaultRandom().primaryKey(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  originalName: varchar("original_name", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  size: integer("size").notNull(),
  path: text("path").notNull(),
  url: text("url").notNull(),
  uploadedBy: uuid("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Export type helpers
export type User = typeof users.$inferSelect;
export type UserRole = User['role'];
export type Transaction = typeof transactions.$inferSelect;
export type BankAccount = typeof bankAccounts.$inferSelect;

// --- KONFIGURASI SISTEM (Superadmin) ---
// Hanya menyimpan nilai yang sudah diubah; daftar parameter & nilai bawaan ada di shared/system-config.ts.
export const systemConfig = academySchema.table("system_config", {
  key: varchar("key", { length: 64 }).primaryKey(),
  value: text("value").notNull(),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Jejak audit setiap perubahan konfigurasi (tidak pernah diubah/dihapus oleh aplikasi).
export const systemConfigHistory = academySchema.table("system_config_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: varchar("key", { length: 64 }).notNull(),
  oldValue: text("old_value"),
  newValue: text("new_value").notNull(),
  changedBy: uuid("changed_by").references(() => users.id, { onDelete: "set null" }),
  changedByName: varchar("changed_by_name", { length: 255 }),
  changedAt: timestamp("changed_at").defaultNow().notNull(),
});
