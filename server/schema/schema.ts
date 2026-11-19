
import { pgSchema, uuid, varchar, timestamp, text, integer, jsonb, boolean, unique, uniqueIndex, date, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

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
  "BANNED",
  "ARCHIVED" // akun ditutup atas permintaan pemilik dan disetujui Admin/Direktur
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

export const applicationStatusEnum = academySchema.enum("application_status", [
  "PENDING",
  "APPROVED",
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
  email: varchar("email", { length: 255 }).unique(), // boleh kosong (akun tautan digitalcoop.id); unik bila ada
  password: text("password").notNull(), // Hashed
  passwordChangedAt: timestamp("password_changed_at"), // sesi lebih lama dari ini ditolak
  role: userRoleEnum("role").default("STUDENT").notNull(),
  status: userStatusEnum("status").default("ACTIVE").notNull(),
  avatar: text("avatar"),
  phone: varchar("phone", { length: 20 }).unique(), // format 62xxxxxxxxxx (lihat shared/phone.ts); unik bila ada
  bio: text("bio"),
  memberSequence: integer("member_sequence").generatedAlwaysAsIdentity(),
  walletBalance: integer("wallet_balance").default(0).notNull(), // Real Wallet Balance
  // Kartu identitas: nomor dibekukan saat terbit (lihat shared/card.ts). Kosong = belum terbit.
  cardNumber: varchar("card_number", { length: 24 }).unique(),
  cardIssuedAt: timestamp("card_issued_at"),
  // Tautan ke digitalcoop.id (diisi jembatan Fase C/D). Terisi = anggota resmi.
  digitalcoopUserId: varchar("digitalcoop_user_id", { length: 64 }).unique(),
  memberNumber: varchar("member_number", { length: 32 }),
  kycStatus: varchar("kyc_status", { length: 20 }),
  wilayah: varchar("wilayah", { length: 100 }),
  consentAt: timestamp("consent_at"),
  consentVersion: varchar("consent_version", { length: 20 }),
  linkedAt: timestamp("linked_at"),
  lastSyncedAt: timestamp("last_synced_at"),
  archivedAt: timestamp("archived_at"), // terisi bila status ARCHIVED
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Categories Table
export const categories = academySchema.table("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  description: text("description"),
  // Tidak dipakai lagi: jumlah kursus dihitung langsung dari tabel kursus.
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

  // Persetujuan lisensi, ujian, dan alur review terbit
  licenseAcceptedAt: timestamp("license_accepted_at"),
  licenseVersion: varchar("license_version", { length: 10 }),
  examEnabled: boolean("exam_enabled").default(false).notNull(),
  examPassingGrade: integer("exam_passing_grade").default(70).notNull(),
  examDurationMinutes: integer("exam_duration_minutes").default(60).notNull(),
  submittedAt: timestamp("submitted_at"),
  reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at"),
  reviewNote: text("review_note"),

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
  // Salinan harga saat mendaftar (null = pendaftaran sebelum fitur harga/promo).
  basePrice: integer("base_price"),
  discountPercent: integer("discount_percent"),
  discountId: uuid("discount_id"),
  amountPaid: integer("amount_paid"),
}, (t) => [unique("enrollments_user_course_unique").on(t.userId, t.courseId)]);

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

// --- KARTU, DAFTAR TUNGGU, NOTIFIKASI, PREFERENSI ---

// Riwayat penerbitan kartu (tidak pernah diubah/dihapus oleh aplikasi).
export const cardHistory = academySchema.table("card_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  cardNumber: varchar("card_number", { length: 24 }).notNull(),
  prefix: varchar("prefix", { length: 1 }).notNull(),
  event: varchar("event", { length: 20 }).notNull(), // ISSUED | REPLACED
  issuedBy: uuid("issued_by").references(() => users.id, { onDelete: "set null" }), // kosong = otomatis (student)
  issuedByName: varchar("issued_by_name", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Daftar tunggu calon mentor/creator (diisi dari digitalcoop.id, diputuskan Admin/Superadmin).
export const roleApplications = academySchema.table("role_applications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  requestedRole: varchar("requested_role", { length: 20 }).notNull(), // CREATOR | MENTOR
  profile: text("profile").notNull(),
  experience: text("experience").notNull(),
  status: applicationStatusEnum("status").default("PENDING").notNull(),
  decidedBy: uuid("decided_by").references(() => users.id, { onDelete: "set null" }),
  decidedAt: timestamp("decided_at"),
  decisionNote: text("decision_note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notifications = academySchema.table("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),
  readAt: timestamp("read_at"),
  // AKUN | PEMBAYARAN | BELAJAR | ADMIN | INFO (lihat shared/notifications.ts)
  category: varchar("category", { length: 12 }).notNull().default("INFO"),
  // Pengiriman email opt-in: emailedAt terisi bila sudah terkirim; emailAttempts membatasi percobaan ulang.
  emailedAt: timestamp("emailed_at"),
  emailAttempts: integer("email_attempts").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("notifications_user_idx").on(t.userId, t.createdAt),
  index("notifications_email_pending_idx").on(t.createdAt).where(sql`${t.emailedAt} is null`),
]);

export const userPreferences = academySchema.table("user_preferences", {
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).primaryKey(),
  theme: varchar("theme", { length: 10 }).default("light").notNull(),
  language: varchar("language", { length: 5 }).default("id").notNull(),
  notifyEmail: boolean("notify_email").default(true).notNull(),
  notifyInApp: boolean("notify_in_app").default(true).notNull(),
  // Kategori notifikasi dalam aplikasi yang dimatikan pengguna (kategori terkunci tidak bisa dimatikan).
  mutedCategories: jsonb("muted_categories").$type<string[]>().default([]).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Permintaan ganti email yang menunggu kode OTP (satu per user; kode disimpan sebagai HMAC, bukan polos).
export const emailChangeRequests = academySchema.table("email_change_requests", {
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).primaryKey(),
  newEmail: varchar("new_email", { length: 255 }).notNull(),
  codeHash: varchar("code_hash", { length: 64 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  attempts: integer("attempts").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Pengajuan penghapusan akun oleh pemilik; diputuskan Admin atau Direktur (salah satu).
export const accountDeletionRequests = academySchema.table("account_deletion_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  reason: text("reason").notNull(),
  status: varchar("status", { length: 12 }).default("PENDING").notNull(), // PENDING | APPROVED | REJECTED | CANCELLED
  createdAt: timestamp("created_at").defaultNow().notNull(),
  decidedBy: uuid("decided_by").references(() => users.id, { onDelete: "set null" }),
  decidedByName: varchar("decided_by_name", { length: 255 }),
  decidedByRole: varchar("decided_by_role", { length: 20 }),
  decidedAt: timestamp("decided_at"),
  decisionNote: text("decision_note"),
}, (t) => [uniqueIndex("account_deletion_one_pending").on(t.userId).where(sql`${t.status} = 'PENDING'`)]);

// Penyelesaian saldo lewat transfer manual oleh Admin, dengan bukti transfer (berkas privat).
export const balanceSettlements = academySchema.table("balance_settlements", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  requestId: uuid("request_id").references(() => accountDeletionRequests.id).notNull(),
  amount: integer("amount").notNull(),
  transferDate: date("transfer_date").notNull(),
  bankRef: varchar("bank_ref", { length: 100 }).notNull(),
  note: text("note"),
  proofFile: varchar("proof_file", { length: 100 }).notNull(),
  proofMime: varchar("proof_mime", { length: 50 }).notNull(),
  settledBy: uuid("settled_by").references(() => users.id, { onDelete: "set null" }),
  settledByName: varchar("settled_by_name", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Modul/kurikulum kursus. Berkas (video/PDF) ada di bucket private; kolom content_key = kunci objek.
export const courseModules = academySchema.table("course_modules", {
  id: uuid("id").defaultRandom().primaryKey(),
  courseId: uuid("course_id").references(() => courses.id, { onDelete: "cascade" }).notNull(),
  position: integer("position").notNull(),
  title: varchar("title", { length: 150 }).notNull(),
  description: text("description"),
  type: varchar("type", { length: 10 }).notNull(), // VIDEO | PDF | TEXT
  contentKey: text("content_key"),
  contentMime: varchar("content_mime", { length: 50 }),
  contentSize: integer("content_size"),
  textContent: text("text_content"),
  isFreePreview: boolean("is_free_preview").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [index("course_modules_course_idx").on(t.courseId, t.position)]);

// Bank soal ujian kursus. Kunci jawaban tidak pernah dikirim ke peserta.
export const courseExamQuestions = academySchema.table("course_exam_questions", {
  id: uuid("id").defaultRandom().primaryKey(),
  courseId: uuid("course_id").references(() => courses.id, { onDelete: "cascade" }).notNull(),
  position: integer("position").notNull(),
  question: text("question").notNull(),
  options: jsonb("options").$type<string[]>().notNull(), // tepat 4 pilihan
  correctIndex: integer("correct_index").notNull(), // 0-3
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [index("course_exam_questions_course_idx").on(t.courseId, t.position)]);

// Diskon kursus: AUTO (otomatis pada periode) atau CODE (kode promo, umum atau sekali pakai). Dibatalkan, tidak dihapus.
export const courseDiscounts = academySchema.table("course_discounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  courseId: uuid("course_id").references(() => courses.id, { onDelete: "cascade" }).notNull(),
  kind: varchar("kind", { length: 10 }).notNull(), // AUTO | CODE
  code: varchar("code", { length: 20 }),
  percent: integer("percent").notNull(), // 1-100
  startsAt: timestamp("starts_at").notNull(),
  endsAt: timestamp("ends_at").notNull(),
  maxRedemptions: integer("max_redemptions"), // null = tanpa batas
  redemptionCount: integer("redemption_count").default(0).notNull(),
  batchId: uuid("batch_id"), // kode sekali pakai yang dibuat massal
  createdBy: uuid("created_by").references(() => users.id).notNull(),
  createdByRole: varchar("created_by_role", { length: 20 }).notNull(),
  reason: text("reason"),
  cancelledAt: timestamp("cancelled_at"),
  cancelledBy: uuid("cancelled_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("course_discounts_code_unique").on(t.courseId, t.code).where(sql`${t.code} is not null`),
  index("course_discounts_course_idx").on(t.courseId),
]);

// Satu akun hanya sekali memakai satu diskon.
export const discountRedemptions = academySchema.table("discount_redemptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  discountId: uuid("discount_id").references(() => courseDiscounts.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  courseId: uuid("course_id").references(() => courses.id).notNull(),
  amountPaid: integer("amount_paid").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [unique("discount_redemptions_user_discount_unique").on(t.discountId, t.userId)]);

// Order pembayaran: pembelian kursus (VA, transfer manual, dompet digitalcoop.id) dan top-up dompet Academy (VA, manual).
export const paymentOrders = academySchema.table("payment_orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  kind: varchar("kind", { length: 10 }).notNull(), // COURSE | TOPUP
  courseId: uuid("course_id").references(() => courses.id),
  method: varchar("method", { length: 12 }).notNull(), // VA | MANUAL | DC_WALLET
  status: varchar("status", { length: 12 }).notNull().default("PENDING"),
  amount: integer("amount").notNull(), // jumlah yang harus dibayar (rupiah)
  basePrice: integer("base_price"),
  discountPercent: integer("discount_percent"),
  discountId: uuid("discount_id"),
  bank: varchar("bank", { length: 10 }),
  vaNumber: varchar("va_number", { length: 40 }),
  gatewayStatus: varchar("gateway_status", { length: 30 }),
  debitTxId: varchar("debit_tx_id", { length: 100 }),
  proofKey: text("proof_key"),
  proofMime: varchar("proof_mime", { length: 60 }),
  proofSha256: varchar("proof_sha256", { length: 64 }),
  proofUploadedAt: timestamp("proof_uploaded_at"),
  paidReference: varchar("paid_reference", { length: 100 }),
  paidDate: date("paid_date"),
  decidedBy: uuid("decided_by").references(() => users.id),
  decidedAt: timestamp("decided_at"),
  decisionNote: text("decision_note"),
  paidAt: timestamp("paid_at"),
  enrollmentId: uuid("enrollment_id"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("payment_orders_open_course_unique").on(t.userId, t.courseId)
    .where(sql`${t.kind} = 'COURSE' and ${t.status} in ('PENDING','VERIFYING','CONFIRMING')`),
  uniqueIndex("payment_orders_proof_sha_unique").on(t.proofSha256).where(sql`${t.proofSha256} is not null`),
  index("payment_orders_status_idx").on(t.status, t.createdAt),
  index("payment_orders_user_idx").on(t.userId, t.createdAt),
]);

// Progres belajar: satu baris per modul yang sudah diselesaikan peserta. Persentase di enrollments.progress diturunkan dari sini.
export const moduleProgress = academySchema.table("module_progress", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  courseId: uuid("course_id").references(() => courses.id).notNull(),
  moduleId: uuid("module_id").references(() => courseModules.id, { onDelete: "cascade" }).notNull(),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
}, (t) => [
  unique("module_progress_user_module_unique").on(t.userId, t.moduleId),
  index("module_progress_user_course_idx").on(t.userId, t.courseId),
]);

// Percobaan ujian. Penilaian selalu di server; kunci jawaban tidak pernah dikirim ke peserta.
export const examAttempts = academySchema.table("exam_attempts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  courseId: uuid("course_id").references(() => courses.id).notNull(),
  status: varchar("status", { length: 12 }).notNull().default("IN_PROGRESS"), // IN_PROGRESS | SUBMITTED | EXPIRED
  questionOrder: jsonb("question_order").$type<string[]>().notNull(),
  answers: jsonb("answers").$type<number[]>(),
  totalQuestions: integer("total_questions").notNull(),
  correctCount: integer("correct_count"),
  score: integer("score"),
  passingGrade: integer("passing_grade").notNull(), // salinan nilai lulus saat ujian dimulai
  passed: boolean("passed"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  deadlineAt: timestamp("deadline_at").notNull(),
  submittedAt: timestamp("submitted_at"),
}, (t) => [
  uniqueIndex("exam_attempts_open_unique").on(t.userId, t.courseId).where(sql`${t.status} = 'IN_PROGRESS'`),
  index("exam_attempts_user_course_idx").on(t.userId, t.courseId),
]);

// Sertifikat yang diterbitkan. Nama, judul, dan pengajar disalin saat terbit agar tidak berubah bila data sumber berubah.
export const certificates = academySchema.table("certificates", {
  id: uuid("id").defaultRandom().primaryKey(),
  serial: varchar("serial", { length: 30 }).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  courseId: uuid("course_id").references(() => courses.id).notNull(),
  kind: varchar("kind", { length: 16 }).notNull(), // EXAM | COMPLETION | PARTICIPATION
  attemptId: uuid("attempt_id"),
  studentName: varchar("student_name", { length: 255 }).notNull(),
  courseTitle: varchar("course_title", { length: 255 }).notNull(),
  courseType: varchar("course_type", { length: 20 }).notNull(),
  instructorName: varchar("instructor_name", { length: 255 }).notNull(),
  grade: integer("grade"),
  issuedAt: timestamp("issued_at").defaultNow().notNull(),
}, (t) => [
  unique("certificates_user_course_unique").on(t.userId, t.courseId),
  unique("certificates_serial_unique").on(t.serial),
]);
