
import { pgSchema, uuid, varchar, timestamp, text, integer, bigint, jsonb, boolean, unique, uniqueIndex, date, index, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// --- 1. Define Custom Schema 'academy' ---
export const academySchema = pgSchema("academy");

// Program Node: modul MLM/bonus terpisah dari skema academy utama (schema DB sendiri).
export const nodeProgramSchema = pgSchema("academy_node");

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
  // Kursus WORKSHOP: materi (modul) dibaca dari kursus sumber ini. Null = memakai modulnya sendiri.
  contentSourceId: uuid("content_source_id"),
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
  // Pembagian hasil dibekukan saat mendaftar (null = sebelum fitur bagi hasil / gratis tanpa nilai).
  creatorSharePercent: integer("creator_share_percent"),
  creatorShare: integer("creator_share"),
  platformShare: integer("platform_share"),
  // Khusus workshop: Mentor pengampu dan bagiannya (creator_share = bagian pemilik materi).
  mentorId: uuid("mentor_id").references(() => users.id, { onDelete: "set null" }),
  mentorSharePercent: integer("mentor_share_percent"),
  mentorShare: integer("mentor_share"),
  // Batch pencairan bagi hasil yang memuat pendaftaran ini (null = belum diposting).
  payoutBatchId: uuid("payout_batch_id"),
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

// Permintaan lupa password yang menunggu kode OTP (satu per user; kode disimpan sebagai HMAC, bukan polos).
export const passwordResetRequests = academySchema.table("password_reset_requests", {
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).primaryKey(),
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
  // PDF di R2 publik (certificates/<serial>.pdf). Hanya URL yang disimpan; kosong = belum dibuat (dibuat otomatis).
  pdfUrl: text("pdf_url"),
  issuedAt: timestamp("issued_at").defaultNow().notNull(),
}, (t) => [
  unique("certificates_user_course_unique").on(t.userId, t.courseId),
  unique("certificates_serial_unique").on(t.serial),
]);

// Tiket bantuan: pengguna membuka tiket, staf (Admin/Superadmin) membalas dan menutup.
export const helpdeskTickets = academySchema.table("helpdesk_tickets", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  subject: varchar("subject", { length: 150 }).notNull(),
  // AKUN | PEMBAYARAN | KURSUS | SERTIFIKAT | LAINNYA (lihat shared/helpdesk.ts)
  category: varchar("category", { length: 12 }).notNull(),
  // OPEN | ANSWERED | CLOSED
  status: varchar("status", { length: 10 }).notNull().default("OPEN"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  closedAt: timestamp("closed_at"),
  closedBy: uuid("closed_by").references(() => users.id, { onDelete: "set null" }),
}, (t) => ({
  userIdx: index("helpdesk_tickets_user_idx").on(t.userId, t.updatedAt),
  statusIdx: index("helpdesk_tickets_status_idx").on(t.status, t.updatedAt),
}));

export const helpdeskMessages = academySchema.table("helpdesk_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  ticketId: uuid("ticket_id").references(() => helpdeskTickets.id, { onDelete: "cascade" }).notNull(),
  authorId: uuid("author_id").references(() => users.id).notNull(),
  isStaff: boolean("is_staff").notNull().default(false),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  ticketIdx: index("helpdesk_messages_ticket_idx").on(t.ticketId, t.createdAt),
}));

// Riwayat eksekusi job berkala. Hanya dicatat bila ada yang diproses, gagal, atau dipicu manual.
export const jobRuns = academySchema.table("job_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  jobId: varchar("job_id", { length: 40 }).notNull(),
  trigger: varchar("trigger", { length: 10 }).notNull(), // SCHEDULE | MANUAL
  status: varchar("status", { length: 8 }).notNull(), // OK | ERROR
  affected: integer("affected").notNull().default(0),
  error: text("error"),
  startedAt: timestamp("started_at").notNull(),
  finishedAt: timestamp("finished_at").notNull(),
  triggeredBy: uuid("triggered_by").references(() => users.id, { onDelete: "set null" }),
}, (t) => ({
  jobIdx: index("job_runs_job_idx").on(t.jobId, t.startedAt),
}));

// Kelas Mentor (rombongan belajar). Siswa masuk lewat undangan Mentor atau kode gabung.
export const mentorClasses = academySchema.table("mentor_classes", {
  id: uuid("id").defaultRandom().primaryKey(),
  mentorId: uuid("mentor_id").references(() => users.id).notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description"),
  joinCode: varchar("join_code", { length: 8 }).notNull(),
  archived: boolean("archived").notNull().default(false),
  // Terisi bila kelas ini adalah workshop berbayar: anggota hanya masuk lewat pembelian kursus tersebut.
  courseId: uuid("course_id").references(() => courses.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  codeUq: uniqueIndex("mentor_classes_join_code_uq").on(t.joinCode),
  mentorIdx: index("mentor_classes_mentor_idx").on(t.mentorId),
}));

export const classMembers = academySchema.table("class_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  classId: uuid("class_id").references(() => mentorClasses.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  grade: integer("grade"),
  gradeNote: text("grade_note"),
  gradedAt: timestamp("graded_at"),
}, (t) => ({
  memberUq: uniqueIndex("class_members_class_user_uq").on(t.classId, t.userId),
  userIdx: index("class_members_user_idx").on(t.userId),
}));

export const classSessions = academySchema.table("class_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  classId: uuid("class_id").references(() => mentorClasses.id, { onDelete: "cascade" }).notNull(),
  title: varchar("title", { length: 150 }).notNull(),
  startsAt: timestamp("starts_at").notNull(),
  meetingUrl: varchar("meeting_url", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  classIdx: index("class_sessions_class_idx").on(t.classId, t.startsAt),
}));

// Laporan manajemen berkala: dibuat Admin (angka dibekukan saat dibuat), dibaca Direktur.
export const managementReports = academySchema.table("management_reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  kind: varchar("kind", { length: 8 }).notNull(), // WEEKLY | MONTHLY
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  snapshot: jsonb("snapshot").$type<Record<string, number>>().notNull(),
  note: text("note"),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  readAt: timestamp("read_at"),
  readBy: uuid("read_by").references(() => users.id, { onDelete: "set null" }),
}, (t) => ({
  createdIdx: index("management_reports_created_idx").on(t.createdAt),
}));

// Siaran Direktur ke kelompok pengguna (masuk sebagai notifikasi INFO).
export const broadcasts = academySchema.table("broadcasts", {
  id: uuid("id").defaultRandom().primaryKey(),
  authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
  title: varchar("title", { length: 120 }).notNull(),
  body: text("body").notNull(),
  audience: varchar("audience", { length: 10 }).notNull(),
  recipients: integer("recipients").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Sanksi mitra oleh Direktur. SUSPEND membekukan akun (users.status) sampai dicabut.
export const partnerSanctions = academySchema.table("partner_sanctions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  kind: varchar("kind", { length: 10 }).notNull(), // WARNING | SUSPEND
  reason: text("reason").notNull(),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  liftedAt: timestamp("lifted_at"),
  liftedBy: uuid("lifted_by").references(() => users.id, { onDelete: "set null" }),
  liftNote: text("lift_note"),
}, (t) => ({
  userIdx: index("partner_sanctions_user_idx").on(t.userId, t.createdAt),
}));

// Dokumen hukum berversi. Versi berlaku = versi PUBLISHED tertinggi per jenis. Draf awal dibuat dari kode.
export const legalDocuments = academySchema.table("legal_documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  kind: varchar("kind", { length: 20 }).notNull(), // TERMS | PRIVACY | MENTOR_AGREEMENT | CREATOR_AGREEMENT
  version: integer("version").notNull(),
  title: varchar("title", { length: 150 }).notNull(),
  body: text("body").notNull(),
  status: varchar("status", { length: 10 }).notNull().default("DRAFT"), // DRAFT | PUBLISHED
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  publishedBy: uuid("published_by").references(() => users.id, { onDelete: "set null" }),
  publishedAt: timestamp("published_at"),
}, (t) => ({
  kindVersionUq: uniqueIndex("legal_documents_kind_version_uq").on(t.kind, t.version),
}));

// Persetujuan pengguna atas versi dokumen tertentu (tidak pernah diubah).
export const legalAcceptances = academySchema.table("legal_acceptances", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  documentId: uuid("document_id").references(() => legalDocuments.id).notNull(),
  acceptedAt: timestamp("accepted_at").defaultNow().notNull(),
}, (t) => ({
  userDocUq: uniqueIndex("legal_acceptances_user_doc_uq").on(t.userId, t.documentId),
}));

// Proposal workshop: Mentor mengajukan dari kursus mandiri terbit; Admin menyetujui, sistem membuat kursus WORKSHOP dan kelasnya.
export const workshopProposals = academySchema.table("workshop_proposals", {
  id: uuid("id").defaultRandom().primaryKey(),
  sourceCourseId: uuid("source_course_id").references(() => courses.id).notNull(),
  mentorId: uuid("mentor_id").references(() => users.id).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  price: integer("price").notNull(),
  status: varchar("status", { length: 10 }).notNull().default("PENDING"), // PENDING | APPROVED | REJECTED | WITHDRAWN
  decidedBy: uuid("decided_by").references(() => users.id, { onDelete: "set null" }),
  decidedAt: timestamp("decided_at"),
  decisionNote: text("decision_note"),
  workshopCourseId: uuid("workshop_course_id").references(() => courses.id, { onDelete: "set null" }),
  classId: uuid("class_id").references(() => mentorClasses.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  mentorIdx: index("workshop_proposals_mentor_idx").on(t.mentorId, t.createdAt),
  statusIdx: index("workshop_proposals_status_idx").on(t.status, t.createdAt),
  pendingUq: uniqueIndex("workshop_proposals_pending_uq").on(t.mentorId, t.sourceCourseId).where(sql`status = 'PENDING'`),
}));

// Riwayat pengangkatan dan pemberhentian Direktur / Admin Sistem (tidak pernah diubah/dihapus oleh aplikasi).
export const roleAppointments = academySchema.table("role_appointments", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  userName: varchar("user_name", { length: 255 }).notNull(),
  action: varchar("action", { length: 8 }).notNull(), // APPOINT | DISMISS
  fromRole: varchar("from_role", { length: 20 }).notNull(),
  toRole: varchar("to_role", { length: 20 }).notNull(),
  note: text("note").notNull(),
  actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
  actorName: varchar("actor_name", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  createdIdx: index("role_appointments_created_idx").on(t.createdAt),
}));

// --- PENCAIRAN BAGI HASIL BULANAN ---
// Batch dibuat saat posting (tanggal 25, batas 00:00 WIB). Pendaftaran berbayar yang ikut diberi payout_batch_id.
export const payoutBatches = academySchema.table("payout_batches", {
  id: uuid("id").defaultRandom().primaryKey(),
  cutoffAt: timestamp("cutoff_at").notNull(), // UTC; pendaftaran sebelum waktu ini ikut batch
  status: varchar("status", { length: 10 }).notNull().default("POSTED"), // POSTED | APPROVED | COMPLETED | VOID
  postedBy: uuid("posted_by").references(() => users.id, { onDelete: "set null" }), // null = otomatis oleh job
  postedAt: timestamp("posted_at").defaultNow().notNull(),
  approvedBy: uuid("approved_by").references(() => users.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at"),
  voidedBy: uuid("voided_by").references(() => users.id, { onDelete: "set null" }),
  voidedAt: timestamp("voided_at"),
  voidNote: text("void_note"),
  completedAt: timestamp("completed_at"),
  salesCount: integer("sales_count").notNull().default(0),
  grossTotal: integer("gross_total").notNull().default(0),
  ownerTotal: integer("owner_total").notNull().default(0),
  mentorTotal: integer("mentor_total").notNull().default(0),
  platformTotal: integer("platform_total").notNull().default(0),
}, (t) => ({
  cutoffUq: uniqueIndex("payout_batches_cutoff_uq").on(t.cutoffAt).where(sql`status <> 'VOID'`),
  statusIdx: index("payout_batches_status_idx").on(t.status, t.cutoffAt),
}));

// Satu baris per penerima per batch (gabungan bagian pemilik materi dan Mentor).
export const payoutPayees = academySchema.table("payout_payees", {
  id: uuid("id").defaultRandom().primaryKey(),
  batchId: uuid("batch_id").references(() => payoutBatches.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  userName: varchar("user_name", { length: 255 }).notNull(),
  ownerAmount: integer("owner_amount").notNull().default(0),
  mentorAmount: integer("mentor_amount").notNull().default(0),
  amount: integer("amount").notNull(),
  status: varchar("status", { length: 8 }).notNull().default("PENDING"), // PENDING | PAID
  bankName: varchar("bank_name", { length: 50 }),
  accountNumber: varchar("account_number", { length: 50 }),
  holderName: varchar("holder_name", { length: 100 }),
  transferRef: varchar("transfer_ref", { length: 100 }),
  note: text("note"),
  // Bukti bayar: berkas di bucket R2 private (tidak ikut pencadangan database; kunci objek tidak boleh dihapus).
  proofKey: text("proof_key"),
  proofMime: varchar("proof_mime", { length: 50 }),
  proofSha256: varchar("proof_sha256", { length: 64 }),
  proofEmailedAt: timestamp("proof_emailed_at"),
  paidAt: timestamp("paid_at"),
  paidBy: uuid("paid_by").references(() => users.id, { onDelete: "set null" }),
}, (t) => ({
  batchUserUq: uniqueIndex("payout_payees_batch_user_uq").on(t.batchId, t.userId),
  userIdx: index("payout_payees_user_idx").on(t.userId),
}));

// KYC: satu catatan per pengguna. Foto KTP/selfie di R2 privat (hanya kuncinya di sini); NIK terenkripsi AES-256-GCM.
// Catatan keuangan/identitas permanen: ikut dipertahankan saat restore (berkas R2 tidak ikut, lihat runbook).
export const kycRecords = academySchema.table("kyc_records", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  status: varchar("status", { length: 12 }).notNull(), // PENDING | VERIFIED | REJECTED
  source: varchar("source", { length: 12 }).notNull(), // MANUAL | DIGITALCOOP
  fullName: varchar("full_name", { length: 150 }).notNull(),
  nikEnc: text("nik_enc").notNull(),
  nikLast4: varchar("nik_last4", { length: 4 }).notNull(),
  nikFingerprint: varchar("nik_fingerprint", { length: 64 }).notNull(),
  ktpKey: text("ktp_key").notNull(),
  ktpMime: varchar("ktp_mime", { length: 40 }).notNull(),
  selfieKey: text("selfie_key").notNull(),
  selfieMime: varchar("selfie_mime", { length: 40 }).notNull(),
  rejectNote: text("reject_note"),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }),
}, (t) => ({
  userUq: uniqueIndex("kyc_records_user_uq").on(t.userId),
  // Satu NIK hanya boleh terverifikasi/menunggu di satu akun.
  nikUq: uniqueIndex("kyc_records_nik_active_uq").on(t.nikFingerprint).where(sql`status <> 'REJECTED'`),
  statusIdx: index("kyc_records_status_idx").on(t.status),
}));

// Jejak setiap pembukaan berkas KYC oleh staf (tidak pernah diubah/dihapus aplikasi).
export const kycAccessLog = academySchema.table("kyc_access_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  recordId: uuid("record_id").references(() => kycRecords.id).notNull(),
  actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
  file: varchar("file", { length: 10 }).notNull(), // ktp | selfie | nik
  at: timestamp("at").defaultNow().notNull(),
});

// Industry Hub: profil talenta publik (opt-in). Portofolio/kompetensi dihitung dari sertifikat dan kursus, tidak disalin ke sini.
export const talentProfiles = academySchema.table("talent_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  slug: varchar("slug", { length: 60 }).notNull(),
  headline: varchar("headline", { length: 120 }).notNull(),
  bio: text("bio").notNull(),
  city: varchar("city", { length: 100 }),
  skills: jsonb("skills").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  linkedinUrl: text("linkedin_url"),
  portfolioUrl: text("portfolio_url"),
  isPublic: boolean("is_public").notNull().default(false),
  consentAt: timestamp("consent_at"),
  consentVersion: varchar("consent_version", { length: 30 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  userUq: uniqueIndex("talent_profiles_user_uq").on(t.userId),
  slugUq: uniqueIndex("talent_profiles_slug_uq").on(t.slug),
  publicIdx: index("talent_profiles_public_idx").on(t.isPublic),
}));

// Pesan dari calon pemberi kerja ke talenta (juga diteruskan ke inbox talenta). Catatan permanen untuk jejak penyalahgunaan.
export const talentInquiries = academySchema.table("talent_inquiries", {
  id: uuid("id").defaultRandom().primaryKey(),
  profileId: uuid("profile_id").references(() => talentProfiles.id).notNull(),
  senderName: varchar("sender_name", { length: 100 }).notNull(),
  company: varchar("company", { length: 120 }).notNull(),
  senderEmail: varchar("sender_email", { length: 200 }).notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  profileIdx: index("talent_inquiries_profile_idx").on(t.profileId, t.createdAt),
}));

// --- PROGRAM NODE (MODUL TERPISAH) ---
export const nodeRuleVersions = nodeProgramSchema.table("rule_versions", {
  id: uuid("id").defaultRandom().primaryKey(),
  version: integer("version").notNull().unique(),
  status: varchar("status", { length: 10 }).notNull().default("DRAFT"),
  nodePrice: integer("node_price").notNull().default(50_000),
  sponsorPercent: integer("sponsor_percent").notNull().default(20),
  levelPercent: integer("level_percent").notNull().default(1),
  maxLevels: integer("max_levels").notNull().default(10),
  pairingPercent: integer("pairing_percent").notNull().default(15),
  dailyPointMultiplier: integer("daily_point_multiplier").notNull().default(16),
  effectiveFrom: timestamp("effective_from"),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  check("node_rule_version_positive_ck", sql`${t.version} > 0`),
  check("node_rule_price_positive_ck", sql`${t.nodePrice} > 0`),
  check("node_rule_percent_range_ck", sql`${t.sponsorPercent} between 0 and 100 and ${t.levelPercent} between 0 and 100 and ${t.pairingPercent} between 0 and 100`),
  check("node_rule_limits_positive_ck", sql`${t.maxLevels} >= 0 and ${t.dailyPointMultiplier} > 0`),
]);

export const nodeAccounts = nodeProgramSchema.table("accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull().unique(),
  sponsorUserId: uuid("sponsor_user_id").references(() => users.id),
  placementParentUserId: uuid("placement_parent_user_id").references(() => users.id),
  placementSide: varchar("placement_side", { length: 5 }),
  referralCode: varchar("referral_code", { length: 24 }).notNull().unique(),
  status: varchar("status", { length: 10 }).notNull().default("ACTIVE"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const nodeTopupOrders = nodeProgramSchema.table("topup_orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  ruleVersionId: uuid("rule_version_id").references(() => nodeRuleVersions.id).notNull(),
  nodeCount: integer("node_count").notNull(),
  nodePrice: integer("node_price").notNull(),
  amount: bigint("amount", { mode: "number" }).notNull(),
  status: varchar("status", { length: 12 }).notNull().default("DRAFT"),
  paymentReference: varchar("payment_reference", { length: 100 }),
  decisionNote: text("decision_note"),
  decidedBy: uuid("decided_by").references(() => users.id, { onDelete: "set null" }),
  decidedAt: timestamp("decided_at"),
  paidAt: timestamp("paid_at"),
  settledAt: timestamp("settled_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("node_topup_user_created_idx").on(t.userId, t.createdAt),
  check("node_topup_positive_ck", sql`${t.nodeCount} > 0 and ${t.nodePrice} > 0 and ${t.amount} > 0`),
  check("node_topup_amount_ck", sql`${t.amount} = ${t.nodeCount}::bigint * ${t.nodePrice}::bigint`),
]);

export const nodeLots = nodeProgramSchema.table("node_lots", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  topupOrderId: uuid("topup_order_id").references(() => nodeTopupOrders.id).notNull().unique(),
  ruleVersionId: uuid("rule_version_id").references(() => nodeRuleVersions.id).notNull(),
  issuedNodes: integer("issued_nodes").notNull(),
  activeNodes: integer("active_nodes").notNull(),
  status: varchar("status", { length: 12 }).notNull().default("ACTIVE"),
  activatedAt: timestamp("activated_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("node_lots_user_status_idx").on(t.userId, t.status),
  check("node_lots_counts_ck", sql`${t.issuedNodes} > 0 and ${t.activeNodes} >= 0 and ${t.activeNodes} <= ${t.issuedNodes}`),
]);

export const nodeBonusLedger = nodeProgramSchema.table("bonus_ledger", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  ruleVersionId: uuid("rule_version_id").references(() => nodeRuleVersions.id).notNull(),
  kind: varchar("kind", { length: 16 }).notNull(),
  direction: varchar("direction", { length: 8 }).notNull(),
  amount: bigint("amount", { mode: "number" }).notNull(),
  points: integer("points").notNull().default(0),
  sourceType: varchar("source_type", { length: 30 }).notNull(),
  sourceId: uuid("source_id"),
  idempotencyKey: varchar("idempotency_key", { length: 150 }).notNull().unique(),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("node_bonus_user_created_idx").on(t.userId, t.createdAt),
  check("node_bonus_values_ck", sql`${t.amount} >= 0 and ${t.points} >= 0`),
  check("node_bonus_direction_ck", sql`${t.direction} in ('CREDIT', 'DEBIT')`),
]);

// Pengajuan pencairan Bonus Node. Saldo tidak disimpan ulang di tabel ini;
// saldo selalu dihitung dari bonus_ledger agar jejak debit/kredit dapat diaudit.
export const nodeBonusWithdrawals = nodeProgramSchema.table("bonus_withdrawals", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  requestedAmount: bigint("requested_amount", { mode: "number" }).notNull(),
  status: varchar("status", { length: 12 }).notNull().default("REQUESTED"),
  requestNote: text("request_note"),
  bankAccountId: uuid("bank_account_id").references(() => bankAccounts.id),
  bankName: varchar("bank_name", { length: 50 }),
  accountNumber: varchar("account_number", { length: 50 }),
  holderName: varchar("holder_name", { length: 100 }),
  decisionNote: text("decision_note"),
  transferReference: varchar("transfer_reference", { length: 100 }),
  decidedBy: uuid("decided_by").references(() => users.id, { onDelete: "set null" }),
  decidedAt: timestamp("decided_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("node_bonus_withdrawal_user_created_idx").on(t.userId, t.createdAt),
  index("node_bonus_withdrawal_status_created_idx").on(t.status, t.createdAt),
  check("node_bonus_withdrawal_amount_ck", sql`${t.requestedAmount} > 0`),
  check("node_bonus_withdrawal_status_ck", sql`${t.status} in ('REQUESTED', 'APPROVED', 'REJECTED')`),
]);

export const nodeDailySummaries = nodeProgramSchema.table("daily_summaries", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  businessDate: date("business_date").notNull(),
  activeNodes: integer("active_nodes").notNull(),
  capacityPoints: integer("capacity_points").notNull(),
  availablePoints: integer("available_points").notNull().default(0),
  paidPoints: integer("paid_points").notNull().default(0),
  expiredPoints: integer("expired_points").notNull().default(0),
  sponsorBonus: bigint("sponsor_bonus", { mode: "number" }).notNull().default(0),
  levelBonus: bigint("level_bonus", { mode: "number" }).notNull().default(0),
  pairingBonus: bigint("pairing_bonus", { mode: "number" }).notNull().default(0),
  totalBonus: bigint("total_bonus", { mode: "number" }).notNull().default(0),
  status: varchar("status", { length: 12 }).notNull().default("PREVIEW"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("node_daily_summary_user_date_uq").on(t.userId, t.businessDate),
  index("node_daily_user_date_idx").on(t.userId, t.businessDate),
  check("node_daily_values_ck", sql`${t.activeNodes} >= 0 and ${t.capacityPoints} >= 0 and ${t.availablePoints} >= 0 and ${t.paidPoints} >= 0 and ${t.expiredPoints} >= 0 and ${t.sponsorBonus} >= 0 and ${t.levelBonus} >= 0 and ${t.pairingBonus} >= 0 and ${t.totalBonus} >= 0`),
]);
