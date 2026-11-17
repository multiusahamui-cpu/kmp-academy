import {
  Category,
  Course,
  CourseType,
  CourseStatus,
  User,
  UserRole,
  UserStatus,
  Transaction,
  Settlement,
  WalletTransaction,
  Review,
} from "./types";

export const APP_NAME = "KMP - ADNG ACADEMY";

export const CONTACT_INFO = {
  lead: "Ulpermadi Ibrahim",
  emailLead: "ulpermadi@kodman.id",
  wa: "+628128089916",
  emailSupport: "support.academy@kodman.id",
  emailAdmin: "admin.academy@kodman.id",
  address:
    "Jl. Talang Betutu No. 7A, Kelurahan Kebon Melati, Kecamatan Tanah Abang, Jakarta Pusat",
};

export const MOCK_CATEGORIES: Category[] = [
  {
    id: "cat-1",
    name: "Teknologi & Coding",
    slug: "teknologi-coding",
    count: 12,
  },
  { id: "cat-2", name: "Bisnis Digital", slug: "bisnis-digital", count: 8 },
  {
    id: "cat-3",
    name: "Manajemen Koperasi",
    slug: "manajemen-koperasi",
    count: 5,
  },
  {
    id: "cat-4",
    name: "Keuangan & Akuntansi",
    slug: "keuangan-akuntansi",
    count: 7,
  },
  { id: "cat-5", name: "Soft Skills", slug: "soft-skills", count: 4 },
  { id: "cat-6", name: "Marketing", slug: "marketing", count: 10 },
  { id: "cat-7", name: "Sertifikasi Profesi", slug: "sertifikasi", count: 3 },
];

// --- 1. USERS MOCK DATA (Actors) ---
export const MOCK_USERS: User[] = [
  // --- PROVIDERS & INTERNAL ---
  {
    id: "u1",
    name: "Budi Santoso",
    email: "budi@creator.kodman.id",
    role: UserRole.CREATOR,
    status: UserStatus.ACTIVE,
    memberSequence: 1,
    joinDate: "2023-01-10",
    walletBalance: 2650000, // Awal 2.5jt + 150rb (Royalti Workshop)
  },
  {
    id: "u2",
    name: "Siti Aminah",
    email: "siti@mentor.kodman.id",
    role: UserRole.MENTOR,
    status: UserStatus.ACTIVE,
    memberSequence: 2,
    joinDate: "2023-02-15",
    walletBalance: 5250000, // Awal 4.2jt + 1.05jt (Fee Workshop)
  },
  {
    id: "u_partner",
    name: "LRQA Indonesia",
    email: "admin@lrqa.com",
    role: UserRole.PARTNER_B2B,
    status: UserStatus.ACTIVE,
    memberSequence: 90,
    joinDate: "2022-05-01",
    walletBalance: 6750000, // Fee Certification
  },
  {
    id: "u9",
    name: "Ulpermadi Ibrahim",
    email: "ulpermadi@kodman.id",
    role: UserRole.DIRECTOR,
    status: UserStatus.ACTIVE,
    memberSequence: 1,
    joinDate: "2022-12-01",
  },

  // --- STUDENTS (SCENARIO ACTORS) ---

  // Skenario Basic: Andi (Beli Mandiri 500rb)
  {
    id: "u3",
    name: "Andi Pratama",
    email: "andi@student.kodman.id",
    role: UserRole.STUDENT,
    status: UserStatus.ACTIVE,
    memberSequence: 101,
    joinDate: "2023-08-01",
    walletBalance: 100000, // 600rb Topup - 500rb Beli
  },

  // Skenario A (Workshop): Budi Raharjo (Topup 1.6jt -> Beli Workshop 1.5jt)
  {
    id: "u5",
    name: "Budi Raharjo",
    email: "b.raharjo@koperasi.id",
    role: UserRole.STUDENT,
    status: UserStatus.ACTIVE,
    memberSequence: 105,
    joinDate: "2023-10-25",
    walletBalance: 100000, // 1.6jt Topup - 1.5jt Beli
  },

  // Skenario B (Sertifikasi): Sarah Corporate (Topup 8jt -> Beli ISO 7.5jt)
  {
    id: "u6",
    name: "Sarah Corporate",
    email: "sarah@bigcorp.com",
    role: UserRole.STUDENT,
    status: UserStatus.ACTIVE,
    memberSequence: 106,
    joinDate: "2023-10-26",
    walletBalance: 500000, // 8jt Topup - 7.5jt Beli
  },
];

// --- 2. COURSES MOCK DATA (Products) ---
export const MOCK_COURSES: Course[] = [
  {
    id: "c1",
    title: "Mastering React & Vite Ecosystem",
    description:
      "Pelajari cara membangun aplikasi web modern dengan React, TypeScript, dan Vite dari dasar hingga mahir.",
    instructor: "Budi Santoso",
    instructorId: "u1",
    price: 500000,
    type: CourseType.MANDIRI,
    status: CourseStatus.PUBLISHED,
    thumbnail: "https://picsum.photos/seed/react/400/250",
    sessions: 5,
    modules: [
      {
        id: "m1",
        title: "Introduction & Setup",
        description: "Instalasi Node.js dan Vite",
        duration: "10:00",
        type: "VIDEO",
        isFreePreview: true,
      },
      {
        id: "m2",
        title: "Components & Props",
        description: "Memahami dasar komponen React",
        duration: "15:30",
        type: "VIDEO",
      },
      {
        id: "m3",
        title: "State Management (useState)",
        description: "Mengelola data lokal",
        duration: "20:00",
        type: "VIDEO",
      },
      {
        id: "m4",
        title: "Effect Hooks (useEffect)",
        description: "Side effects dan API calls",
        duration: "25:00",
        type: "VIDEO",
      },
      {
        id: "m5",
        title: "Final Project: Todo App",
        description: "Membuat aplikasi nyata",
        duration: "45:00",
        type: "VIDEO",
      },
    ],
    studentsEnrolled: 150,
    rating: 4.8,
    totalReviews: 24,
    categoryIds: ["cat-1"],
    examConfig: {
      isEnabled: true,
      passingGrade: 75,
      durationMinutes: 30,
      questions: [
        {
          id: "q1",
          question: "Apa fungsi utama dari useEffect di React?",
          options: ["State Management", "Side Effects", "Routing", "Styling"],
          correctOptionIndex: 1,
        },
        {
          id: "q2",
          question: "Perintah untuk membuat project Vite baru adalah...",
          options: [
            "npm create vite@latest",
            "npx create-react-app",
            "npm init react",
            "vite new app",
          ],
          correctOptionIndex: 0,
        },
        {
          id: "q3",
          question: "Manakah yang BUKAN merupakan hook bawaan React?",
          options: ["useState", "useEffect", "useRouter", "useContext"],
          correctOptionIndex: 2,
        },
      ],
    },
  },
  {
    id: "c2",
    title: "Workshop Digital Marketing Koperasi",
    description:
      "Strategi pemasaran digital khusus untuk pengembangan Koperasi di era modern. Materi dibuat oleh Budi Santoso, Diajarkan oleh Siti Aminah.",
    instructor: "Siti Aminah", // Facilitator
    instructorId: "u2", // Mentor ID
    price: 1500000,
    type: CourseType.WORKSHOP,
    status: CourseStatus.PUBLISHED,
    thumbnail: "https://picsum.photos/seed/marketing/400/250",
    sessions: 4,
    modules: [
      {
        id: "wm1",
        title: "Sesi 1: Mindset Digital",
        description: "Live Zoom Session",
        duration: "90:00",
        type: "VIDEO",
      },
      {
        id: "wm2",
        title: "Sesi 2: Content Strategy",
        description: "Live Zoom Session",
        duration: "90:00",
        type: "VIDEO",
      },
      {
        id: "wm3",
        title: "Sesi 3: Ads Optimization",
        description: "Live Zoom Session",
        duration: "90:00",
        type: "VIDEO",
      },
      {
        id: "wm4",
        title: "Sesi 4: CRM & Retention",
        description: "Live Zoom Session",
        duration: "90:00",
        type: "VIDEO",
      },
    ],
    studentsEnrolled: 46,
    rating: 4.9,
    totalReviews: 10,
    categoryIds: ["cat-2", "cat-6", "cat-3"],
    examConfig: {
      isEnabled: true,
      passingGrade: 70,
      durationMinutes: 45,
      questions: [
        {
          id: "wq1",
          question:
            "Platform iklan mana yang paling efektif untuk target B2B Koperasi?",
          options: ["Instagram Ads", "TikTok Ads", "LinkedIn Ads", "Pinterest"],
          correctOptionIndex: 2,
        },
        {
          id: "wq2",
          question:
            "Apa metrik utama dalam mengukur keberhasilan kampanye Lead Generation?",
          options: ["Likes", "Shares", "Cost Per Lead (CPL)", "Impressions"],
          correctOptionIndex: 2,
        },
      ],
    },
  },
  {
    id: "c3",
    title: "Dasar Akuntansi Keuangan",
    description: "Pengenalan akuntansi dasar untuk UMKM dan Koperasi.",
    instructor: "Ahmad Dahlan",
    price: 300000,
    type: CourseType.MANDIRI,
    status: CourseStatus.PENDING_REVIEW,
    thumbnail: "https://picsum.photos/seed/accounting/400/250",
    sessions: 8,
    studentsEnrolled: 0,
    rating: 0,
    totalReviews: 0,
    categoryIds: ["cat-4", "cat-3"],
  },
  {
    id: "c4",
    title: "ISO 27001 Lead Auditor Preparation",
    description:
      "Pelatihan persiapan sertifikasi internasional keamanan informasi (ISMS). Ujian resmi diselenggarakan oleh Partner.",
    instructor: "Partner LRQA Indonesia",
    instructorId: "u_partner",
    price: 7500000,
    type: CourseType.CERTIFICATION,
    status: CourseStatus.PUBLISHED,
    thumbnail: "https://picsum.photos/seed/iso/400/250",
    sessions: 5, // Hari pelatihan
    studentsEnrolled: 16,
    rating: 5.0,
    totalReviews: 2,
    categoryIds: ["cat-7", "cat-1"],
    examConfig: {
      isEnabled: true,
      passingGrade: 0,
      durationMinutes: 0,
      questions: [],
      externalProvider: "LRQA Indonesia",
      examLocation: "Hotel Mulia Senayan, Jakarta (Offline)",
      examDate: "25 November 2023, 09:00 WIB",
    },
  },
];

// --- REVIEWS DATA ---
export const MOCK_REVIEWS: Review[] = [
  {
    id: "rev-1",
    courseId: "c1",
    userId: "u3",
    userName: "Andi Pratama",
    rating: 5,
    comment:
      "Materinya sangat daging! Penjelasan Mas Budi mudah dipahami bahkan untuk pemula. Studi kasus Todo App sangat membantu.",
    createdAt: "22 Oktober 2023",
    reply: {
      instructorName: "Budi Santoso",
      comment:
        "Terima kasih Mas Andi! Senang bisa membantu perjalanan belajar React-nya.",
      repliedAt: "22 Oktober 2023",
    },
  },
  {
    id: "rev-2",
    courseId: "c1",
    userId: "u_generic",
    userName: "Rina S.",
    rating: 4,
    comment:
      "Secara keseluruhan bagus, tapi bagian Redux agak terlalu cepat penjelasannya. Mohon diperlambat di update berikutnya.",
    createdAt: "20 Oktober 2023",
  },
  {
    id: "rev-3",
    courseId: "c2",
    userId: "u5",
    userName: "Budi Raharjo",
    rating: 5,
    comment:
      "Workshop yang sangat interaktif. Mbak Siti sabar banget ngajarin setting Ads Manager dari nol. Recommended!",
    createdAt: "26 Oktober 2023",
  },
];

// --- 3. TRANSACTIONS (Inbound Money: Student -> System) ---
export const MOCK_TRANSACTIONS: Transaction[] = [
  // Skenario Basic (Andi)
  {
    id: "TRX-1001",
    date: "2023-10-20 14:30",
    userId: "u3",
    buyerName: "Andi Pratama",
    courseId: "c1",
    itemName: "Mastering React & Vite Ecosystem",
    amount: 500000,
    status: "PAID",
    paymentMethod: "Bayarind",
    type: "PURCHASE",
  },

  // Skenario A (Budi Raharjo -> Workshop)
  {
    id: "TRX-2002",
    date: "2023-10-25 10:00",
    userId: "u5",
    buyerName: "Budi Raharjo",
    courseId: "c2",
    itemName: "Workshop Digital Marketing Koperasi",
    amount: 1500000,
    status: "PAID",
    paymentMethod: "BCA Virtual Account",
    type: "PURCHASE",
  },

  // Skenario B (Sarah Corporate -> ISO)
  {
    id: "TRX-3001",
    date: "2023-10-26 09:00",
    userId: "u6",
    buyerName: "Sarah Corporate",
    courseId: "c4",
    itemName: "ISO 27001 Lead Auditor Prep",
    amount: 7500000,
    status: "PAID",
    paymentMethod: "Corporate Card",
    type: "PURCHASE",
  },
];

// --- 4. SETTLEMENTS (Outbound Money: System -> Partners) ---
// Logic:
// Mandiri: Platform 20%, Creator 80%
// Workshop: Platform 20%, Creator 10% (Royalty), Mentor 70%
// Certification: Platform 10%, Partner 90%

export const MOCK_SETTLEMENTS: Settlement[] = [
  // Settlement for TRX-1001 (Andi buys React - 500k) -> Creator Budi gets 80% (400k)
  {
    id: "SET-001",
    date: "2023-10-21",
    recipientId: "u1",
    recipientName: "Budi Santoso",
    recipientRole: UserRole.CREATOR,
    amount: 400000,
    status: "PROCESSED",
    details: "Sales Revenue: Mastering React (TRX-1001)",
    sourceTransactionId: "TRX-1001",
  },

  // --- SKENARIO A: WORKSHOP SETTLEMENTS ---
  // 1. Fee Mentor Siti (70% of 1.5jt = 1.050.000)
  {
    id: "SET-201",
    date: "2023-10-25",
    recipientId: "u2",
    recipientName: "Siti Aminah",
    recipientRole: UserRole.MENTOR,
    amount: 1050000,
    status: "PENDING",
    details: "Teaching Fee: Workshop DigMar (TRX-2002)",
    sourceTransactionId: "TRX-2002",
  },
  // 2. Royalty Creator Budi (10% of 1.5jt = 150.000)
  {
    id: "SET-202",
    date: "2023-10-25",
    recipientId: "u1",
    recipientName: "Budi Santoso",
    recipientRole: UserRole.CREATOR,
    amount: 150000,
    status: "PENDING",
    details: "Content Royalty: Workshop DigMar (TRX-2002)",
    sourceTransactionId: "TRX-2002",
  },

  // --- SKENARIO B: CERTIFICATION SETTLEMENTS ---
  // Partner LRQA (90% of 7.5jt = 6.750.000)
  {
    id: "SET-301",
    date: "2023-10-26",
    recipientId: "u_partner",
    recipientName: "LRQA Indonesia",
    recipientRole: UserRole.PARTNER_B2B,
    amount: 6750000,
    status: "PENDING",
    details: "Partner Share: ISO 27001 Prep (TRX-3001)",
    sourceTransactionId: "TRX-3001",
  },
];

// --- 5. USER WALLET HISTORY (View from User Perspective) ---
export const MOCK_WALLET_HISTORY: WalletTransaction[] = [
  // --- Skenario Basic: ANDI (Student) ---
  {
    id: "WH-301",
    date: "20 Oct 2023",
    userId: "u3",
    description: "Top Up Saldo (Via VA)",
    amount: 600000,
    type: "CREDIT",
    status: "SUCCESS",
  },
  {
    id: "WH-302",
    date: "20 Oct 2023",
    userId: "u3",
    description: "Pembelian: Mastering React",
    amount: 500000,
    type: "DEBIT",
    status: "SUCCESS",
    relatedRefId: "TRX-1001",
  },

  // --- Skenario A: BUDI RAHARJO (Workshop Student) ---
  {
    id: "WH-501",
    date: "25 Oct 2023",
    userId: "u5",
    description: "Top Up Saldo (Via Transfer)",
    amount: 1600000,
    type: "CREDIT",
    status: "SUCCESS",
  },
  {
    id: "WH-502",
    date: "25 Oct 2023",
    userId: "u5",
    description: "Pembelian: Workshop Digital Marketing",
    amount: 1500000,
    type: "DEBIT",
    status: "SUCCESS",
    relatedRefId: "TRX-2002",
  },

  // --- Skenario B: SARAH (Certification Student) ---
  {
    id: "WH-601",
    date: "26 Oct 2023",
    userId: "u6",
    description: "Top Up Saldo (Corporate Funding)",
    amount: 8000000,
    type: "CREDIT",
    status: "SUCCESS",
  },
  {
    id: "WH-602",
    date: "26 Oct 2023",
    userId: "u6",
    description: "Pembelian: ISO 27001 Lead Auditor",
    amount: 7500000,
    type: "DEBIT",
    status: "SUCCESS",
    relatedRefId: "TRX-3001",
  },

  // --- Partner Incoming (Siti & Budi S & LRQA) ---
  // Note: Pending settlements usually don't show in "Transaction History" until processed, but for demo we assume they see it in "Pending Income" section of Wallet UI.
  {
    id: "WH-101",
    date: "21 Oct 2023",
    userId: "u1",
    description: "Revenue: Mastering React (Andi)",
    amount: 400000,
    type: "CREDIT",
    status: "SUCCESS",
    relatedRefId: "SET-001",
  },
];
