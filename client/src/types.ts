
export enum UserRole {
  PUBLIC = 'PUBLIC',
  SUPERADMIN = 'SUPERADMIN',
  ADMIN_SYSTEM = 'ADMIN_SYSTEM',
  DIRECTOR = 'DIRECTOR', // Direktur Lembaga
  CREATOR = 'CREATOR',
  MENTOR = 'MENTOR', // Guru Pembimbing
  STUDENT = 'STUDENT',
  PARTNER_B2B = 'PARTNER_B2B' // External Provider (e.g. LRQA, BNSP)
}

// Mengubah nilai role dari server menjadi UserRole yang dikenal aplikasi.
// PUBLIC bukan role akun, jadi tidak pernah diterima dari server.
export const toUserRole = (value: unknown): UserRole | null => {
  const roles = Object.values(UserRole) as string[];
  if (typeof value !== 'string' || value === UserRole.PUBLIC || !roles.includes(value)) return null;
  return value as UserRole;
};

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED', // Sementara
  BANNED = 'BANNED' // Permanen (Blokir Tetap)
}

export enum KYCStatus {
  UNVERIFIED = 'UNVERIFIED',
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED'
}

export interface ViolationRecord {
  id: string;
  date: string;
  reason: string;
  type: 'TEMPORARY' | 'PERMANENT';
  adminNotes: string; // Catatan dari Direktur
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  status?: UserStatus;
  kycStatus?: KYCStatus; // Added KYC
  violationHistory?: ViolationRecord[];
  memberSequence?: number; // Urutan pendaftaran untuk generate ID Card
  joinDate?: string;
  walletBalance?: number; // Mock Balance
}

export interface ManagementHistory {
  id: string;
  role: 'DIRECTOR' | 'ADMIN';
  oldUserId?: string;
  oldUserName?: string;
  newUserId: string;
  newUserName: string;
  changedBy: string; // Superadmin Name
  date: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  count: number; // Jumlah kursus dalam kategori ini
}

export enum CourseType {
  MANDIRI = 'MANDIRI', // Self-paced
  WORKSHOP = 'WORKSHOP', // Rombongan
  CERTIFICATION = 'CERTIFICATION' // Sertifikasi Profesi (BNSP/ISO)
}

export enum CourseStatus {
  DRAFT = 'DRAFT',
  PENDING_REVIEW = 'PENDING_REVIEW',
  PUBLISHED = 'PUBLISHED',
  REJECTED = 'REJECTED'
}

// --- Management Report Types ---
export interface ManagementReport {
  id: string;
  generatedDate: string;
  type: 'WEEKLY' | 'MONTHLY';
  period: string; // e.g., "Week 4 Oct 2023"
  summary: {
    totalRevenue: number;
    newStudents: number;
    contentModerated: number;
    activeIssues: number;
  };
  status: 'SUBMITTED' | 'READ';
  adminNote?: string;
}

// --- Exam & Certificate Types ---
export interface ExamQuestion {
  id: string;
  question: string;
  options: string[]; // Array of 4 options
  correctOptionIndex: number; // 0-3
}

export interface ExamConfig {
  isEnabled: boolean;
  passingGrade: number; // e.g., 70
  durationMinutes: number;
  questions: ExamQuestion[];
  // For Certifications
  externalProvider?: string; // e.g. "BNSP", "LRQA", "SGS"
  examLocation?: string; // e.g. "Hotel Mulia, Jakarta" or "Online Proctored"
  examDate?: string;
}

export interface Certificate {
  id: string;
  courseId: string;
  courseTitle: string;
  courseType: CourseType; // Added to distinguish signature layout
  studentName: string;
  instructorName: string; // Signature authority
  issueDate: string;
  grade: number;
  signatureUrl?: string; // Mock URL
  /** Nomor resmi sertifikat (KMPA-tahun-kode) untuk verifikasi publik. */
  serial?: string;
  /** EXAM = lulus ujian, COMPLETION = menyelesaikan materi, PARTICIPATION = keikutsertaan (kursus sertifikasi). */
  kind?: 'EXAM' | 'COMPLETION' | 'PARTICIPATION';
}

export interface Module {
  id: string;
  title: string;
  description: string;
  videoUrl?: string; // Mock URL
  duration: string; // "10:00"
  type: 'VIDEO' | 'QUIZ' | 'PDF';
  isFreePreview?: boolean;
}

export interface Review {
  id: string;
  courseId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number; // 1 - 5
  comment: string;
  createdAt: string;
  reply?: {
    instructorName: string;
    comment: string;
    repliedAt: string;
  }
}

export interface Course {
  id: string;
  title: string;
  description: string;
  instructor: string;
  instructorId?: string; // ID of the Content Creator
  price: number;
  /** Harga setelah diskon otomatis yang sedang berlaku (dihitung server). */
  finalPrice?: number;
  discountPercent?: number;
  discountEndsAt?: string | null;
  type: CourseType;
  status: CourseStatus;
  thumbnail: string;
  sessions: number; // Total Modul
  modules?: Module[]; // Detail Modul
  studentsEnrolled: number;
  
  // Rating Stats
  rating: number; // Average 0.0 - 5.0
  totalReviews: number;

  categoryIds: string[]; // Array of Category IDs (Max 3)
  /** Kursus ini memiliki ujian akhir (dari server). */
  examEnabled?: boolean;
  examConfig?: ExamConfig; // Optional Exam Configuration
  
  // Licensing & Rights
  licenseAgreement?: {
    isExclusiveToKodman: boolean;
    acceptedAt: string;
    version: string;
  };
}

export interface CartItem {
  courseId: string;
  title: string;
  price: number;
  thumbnail: string;
  type: CourseType;
  qty: number;
}

export interface WishlistItem {
  courseId: string;
  title: string;
  price: number;
  thumbnail: string;
  addedAt: string;
}

export interface Ticket {
  id: string;
  subject: string;
  status: 'OPEN' | 'CLOSED' | 'IN_PROGRESS';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  user: string;
  date: string;
}

// --- Wallet & Payment Types ---
export type WalletProvider = 'BAYARIND' | 'OVO' | 'DANA' | 'GOPAY';

export interface ConnectedWallet {
  provider: WalletProvider;
  accountNumber: string; // Phone number or ID
  accountName: string;
  isLinked: boolean;
  isDefault: boolean;
  lastUsed?: string;
}

// --- Cron & System Types ---
export interface CronJob {
  id: string;
  name: string;
  schedule: string; // e.g., "0 0 * * *"
  lastRun: string;
  nextRun: string;
  status: 'IDLE' | 'RUNNING' | 'FAILED' | 'SUCCESS';
  description: string;
}

// --- Proposal & Role Types ---
export interface RoleRequest {
  id: string;
  userId: string;
  userName: string;
  requestedRole: UserRole.MENTOR | UserRole.CREATOR;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  date: string;
}

export interface WorkshopProposal {
  id: string;
  courseId: string; // Reference to existing Course
  courseTitle: string;
  mentorId: string;
  mentorName: string;
  creatorName: string; // For revenue share context
  proposedSchedule: string; // Free text description for now, e.g. "Senin & Kamis, 19.00"
  startDate: string;
  maxParticipants: number;
  proposedPrice: number;
  revenueShare: {
    platform: number; // e.g., 20%
    creator: number; // e.g., 10% (Royalty)
    mentor: number; // e.g., 70%
  };
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

// --- Finance & B2B Types ---
export interface Transaction {
  id: string;
  date: string;
  userId: string; // Buyer ID
  buyerName: string;
  courseId: string; // Item Bought
  itemName: string;
  amount: number;
  status: 'PAID' | 'PENDING' | 'FAILED';
  paymentMethod: string;
  type: 'PURCHASE'; // Flag
}

export interface WalletTransaction {
   id: string;
   date: string;
   userId: string; // Owner
   description: string;
   amount: number;
   type: 'DEBIT' | 'CREDIT'; // Debit = Uang Keluar (Beli), Credit = Uang Masuk (Topup/Refund/Fee)
   status: 'SUCCESS' | 'PENDING' | 'FAILED';
   relatedRefId?: string; // Reference to Transaction ID or Settlement ID
}

export interface Settlement {
  id: string;
  date: string;
  recipientId: string;
  recipientName: string;
  recipientRole: UserRole.MENTOR | UserRole.CREATOR | UserRole.PARTNER_B2B;
  amount: number;
  status: 'PROCESSED' | 'PENDING';
  details: string; // e.g., "Royalty for Oct 2023"
  sourceTransactionId?: string; // Link to inbound transaction
}

export interface VoucherBatch {
  id: string;
  sponsorName: string; // e.g. "Koperasi Makmur Jaya"
  courseId: string;
  courseTitle: string;
  totalCodes: number;
  usedCodes: number;
  generatedDate: string;
  prefix: string; // e.g. "KOP-MAKMUR-"
  status: 'ACTIVE' | 'EXPIRED';
}
