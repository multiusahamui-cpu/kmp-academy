import React, { useState } from "react";
import {
  X,
  Target,
  Zap,
  Server,
  GitMerge,
  Users,
  HelpCircle,
  Shield,
  FileText,
  Book,
  AlertTriangle,
  Code2,
  Heart,
} from "lucide-react";

interface InformationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const InformationCenterModal: React.FC<InformationCenterModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState("OBJECTIVE");

  if (!isOpen) return null;

  const MENU_ITEMS = [
    { id: "OBJECTIVE", label: "Objektif Platform", icon: Target },
    { id: "ADVANTAGES", label: "Keunggulan", icon: Zap },
    { id: "ARCHITECTURE", label: "Arsitektur Sistem", icon: Server },
    { id: "WORKFLOW", label: "Alur Kerja (Workflow)", icon: GitMerge },
    { id: "ROLES", label: "Panduan Role", icon: Users },
    { id: "FAQ", label: "FAQ", icon: HelpCircle },
    { id: "PRIVACY", label: "Kebijakan Privasi", icon: Shield },
    { id: "TERMS", label: "Syarat & Ketentuan", icon: FileText },
    { id: "GLOSSARY", label: "Glosarium Istilah", icon: Book },
    { id: "DISCLAIMER", label: "Penafian (Disclaimer)", icon: AlertTriangle },
    { id: "TECH", label: "Tech Stack & Credits", icon: Code2 },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "OBJECTIVE":
        return (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-xl font-bold text-kodman-600 dark:text-kodman-400 mb-4">
              1. Objektif Platform KMP - ADNG Academy
            </h3>
            <p className="text-gray-700 dark:text-slate-300 leading-relaxed">
              KMP - ADNG Academy dibangun dengan visi utama untuk{" "}
              <strong>mendigitalisasi Koperasi dan UMKM di Indonesia</strong>{" "}
              melalui pendidikan vokasi yang terstruktur dan terukur.
            </p>
            <ul className="list-disc pl-5 space-y-3 text-gray-600 dark:text-slate-400">
              <li className="bg-blue-50 dark:bg-blue-900/10 p-3 rounded-lg border-l-4 border-kodman-500 shadow-sm">
                <strong className="text-kodman-700 dark:text-kodman-300 block mb-1 text-base">
                  Transformasi Siswa (Good to Great)
                </strong>
                <span className="text-sm">
                  Mendorong proses <em>Upskilling</em> yang berkelanjutan untuk
                  meningkatkan level kompetensi anggota secara radikal. Kami
                  memfasilitasi perjalanan transformasi dari kemampuan standar
                  menjadi tenaga ahli luar biasa (High Impact Talent) yang siap
                  memimpin perubahan industri.
                </span>
              </li>
              <li>
                Mencetak talenta digital yang siap kerja di lingkungan industri
                Koperasi modern.
              </li>
              <li>
                Menyediakan platform monetisasi bagi para ahli (Mentor/Creator)
                untuk berbagi ilmu.
              </li>
              <li>
                Menstandarisasi kurikulum pelatihan berbasis kompetensi industri
                (SKKNI).
              </li>
              <li>
                Menciptakan ekosistem belajar yang transparan dengan sistem
                royalti otomatis.
              </li>
            </ul>
          </div>
        );
      case "ADVANTAGES":
        return (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-xl font-bold text-kodman-600 dark:text-kodman-400 mb-4">
              2. Keunggulan Platform
            </h3>
            <div className="grid gap-4">
              <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-lg border border-gray-100 dark:border-slate-700">
                <h4 className="font-bold text-gray-900 dark:text-white mb-1">
                  Multi-Role Ecosystem
                </h4>
                <p className="text-sm text-gray-600 dark:text-slate-400">
                  Satu akun dapat bertransformasi. Student hari ini bisa menjadi
                  Mentor atau Creator esok hari.
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-lg border border-gray-100 dark:border-slate-700">
                <h4 className="font-bold text-gray-900 dark:text-white mb-1">
                  Automated Royalty Settlement
                </h4>
                <p className="text-sm text-gray-600 dark:text-slate-400">
                  Sistem keuangan transparan yang membagi hasil penjualan antara
                  Platform, Creator, dan Mentor secara otomatis.
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-lg border border-gray-100 dark:border-slate-700">
                <h4 className="font-bold text-gray-900 dark:text-white mb-1">
                  B2B Integration
                </h4>
                <p className="text-sm text-gray-600 dark:text-slate-400">
                  Fitur khusus untuk Koperasi/Perusahaan yang ingin mendaftarkan
                  anggotanya secara massal (Bulk Voucher).
                </p>
              </div>
            </div>
          </div>
        );
      case "ARCHITECTURE":
        return (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-xl font-bold text-kodman-600 dark:text-kodman-400 mb-4">
              3. Arsitektur Sistem
            </h3>
            <p className="text-gray-700 dark:text-slate-300">
              Sistem ini dibangun dengan pendekatan{" "}
              <strong>Monolithic Modular</strong> untuk memastikan performa
              tinggi namun tetap mudah dikelola.
            </p>
            <div className="p-4 bg-slate-900 text-white rounded-lg font-mono text-xs overflow-x-auto">
              <p>USER (Browser) &lt;--&gt; [LOAD BALANCER]</p>
              <p className="pl-8">|</p>
              <p className="pl-8">v</p>
              <p>[FRONTEND: React + Vite + Tailwind]</p>
              <p className="pl-8">|</p>
              <p className="pl-8">v (REST API)</p>
              <p>[BACKEND: Node.js + Express]</p>
              <p className="pl-8">|--&gt; [AUTH: JWT Middleware]</p>
              <p className="pl-8">
                |--&gt; [DATABASE: PostgreSQL + Drizzle ORM]
              </p>
              <p className="pl-8">|--&gt; [STORAGE: Local CDN / S3]</p>
            </div>
          </div>
        );
      case "WORKFLOW":
        return (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-xl font-bold text-kodman-600 dark:text-kodman-400 mb-4">
              4. Alur Kerja Sistem (Workflow)
            </h3>
            <ul className="space-y-3 text-sm text-gray-700 dark:text-slate-300">
              <li className="flex gap-3">
                <span className="font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded h-fit">
                  1
                </span>
                <div>
                  <strong>Registrasi:</strong> User mendaftar dan otomatis masuk
                  sebagai <strong>Student</strong>. Ini adalah satu-satunya
                  titik masuk yang tersedia untuk pengguna umum.
                </div>
              </li>
              <li className="flex gap-3">
                <span className="font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded h-fit">
                  2
                </span>
                <div>
                  <strong>Upgrade Peran (Opsional):</strong> Student yang ingin
                  menjadi Creator atau Mentor mengajukan proposal via menu{" "}
                  <em>Settings &gt; Profil &amp; Role</em>. Admin akan mereview
                  dan menyetujui atau menolak pengajuan tersebut.
                </div>
              </li>
              <li className="flex gap-3">
                <span className="font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded h-fit">
                  3
                </span>
                <div>
                  <strong>Produksi Konten:</strong> Creator mengunggah materi
                  (Video/PDF). Materi masuk status <em>Draft</em> lalu{" "}
                  <em>Pending Review</em>.
                </div>
              </li>
              <li className="flex gap-3">
                <span className="font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded h-fit">
                  4
                </span>
                <div>
                  <strong>Moderasi:</strong> Admin Sistem mereview konten. Jika
                  lolos, status menjadi <em>Published</em>.
                </div>
              </li>
              <li className="flex gap-3">
                <span className="font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded h-fit">
                  5
                </span>
                <div>
                  <strong>Pembelajaran:</strong> Student membeli akses kursus
                  (Mandiri) atau mendaftar Workshop (Live).
                </div>
              </li>
              <li className="flex gap-3">
                <span className="font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded h-fit">
                  6
                </span>
                <div>
                  <strong>Penyelesaian:</strong> Student mengerjakan kuis/ujian.
                  Jika lulus passing grade, Sertifikat diterbitkan otomatis.
                </div>
              </li>
            </ul>
          </div>
        );
      case "ROLES":
        return (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-xl font-bold text-kodman-600 dark:text-kodman-400 mb-4">
              5. Panduan Role / Pemakai
            </h3>

            {/* Mandatory Path Banner */}
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg p-4">
              <p className="text-sm font-bold text-amber-800 dark:text-amber-300 mb-1">
                ⚠ Jalur Wajib (Mandatory Path)
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                Semua pengguna <strong>wajib memulai sebagai Student</strong>.
                Tidak ada pendaftaran langsung sebagai Creator atau Mentor.
                Upgrade peran hanya dapat diajukan setelah akun Student aktif
                dan memenuhi syarat yang ditetapkan platform.
              </p>
              <div className="mt-3 flex items-center gap-2 text-xs font-mono text-amber-800 dark:text-amber-300">
                <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded font-bold">
                  Student
                </span>
                <span>→</span>
                <span className="bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 px-2 py-0.5 rounded font-bold">
                  Creator
                </span>
                <span className="text-amber-600">atau</span>
                <span className="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded font-bold">
                  Mentor
                </span>
                <span className="text-amber-600">atau keduanya</span>
              </div>
            </div>

            {/* Role Cards */}
            <div className="space-y-3">
              <div className="border-l-4 border-blue-500 pl-3">
                <h4 className="font-bold">
                  Student{" "}
                  <span className="text-xs font-normal text-blue-600 dark:text-blue-400 ml-1">
                    (Titik Masuk Wajib)
                  </span>
                </h4>
                <p className="text-xs text-gray-600 dark:text-slate-400">
                  Pengguna umum. Bisa membeli kursus, mengakses materi, ujian,
                  dan mendapat sertifikat. Semua akun baru dimulai dari sini.
                </p>
              </div>
              <div className="border-l-4 border-orange-500 pl-3">
                <h4 className="font-bold">
                  Content Creator{" "}
                  <span className="text-xs font-normal text-orange-600 dark:text-orange-400 ml-1">
                    (Upgrade dari Student)
                  </span>
                </h4>
                <p className="text-xs text-gray-600 dark:text-slate-400">
                  Pembuat aset digital. Tidak wajib mengajar live. Mendapat
                  royalti pasif dari penggunaan materinya. Tetap memiliki akses
                  area Student untuk mengikuti kursus lain.
                </p>
              </div>
              <div className="border-l-4 border-purple-500 pl-3">
                <h4 className="font-bold">
                  Mentor{" "}
                  <span className="text-xs font-normal text-purple-600 dark:text-purple-400 ml-1">
                    (Upgrade dari Student)
                  </span>
                </h4>
                <p className="text-xs text-gray-600 dark:text-slate-400">
                  Pengajar aktif. Membuka kelas Workshop/Bootcamp, membimbing
                  siswa, dan memberi nilai tugas. Tetap memiliki akses area
                  Student untuk mengikuti kursus lain.
                </p>
              </div>
              <div className="border-l-4 border-green-500 pl-3">
                <h4 className="font-bold">
                  Creator + Mentor{" "}
                  <span className="text-xs font-normal text-green-600 dark:text-green-400 ml-1">
                    (Peran Ganda)
                  </span>
                </h4>
                <p className="text-xs text-gray-600 dark:text-slate-400">
                  Dimungkinkan memiliki kedua peran sekaligus. Sidebar akan
                  menampilkan area Creator, area Mentor, dan area Student dalam
                  satu tampilan terintegrasi.
                </p>
              </div>
              <div className="border-l-4 border-yellow-500 pl-3">
                <h4 className="font-bold">Direktur Lembaga</h4>
                <p className="text-xs text-gray-600 dark:text-slate-400">
                  Pemegang keputusan tertinggi. Memantau laporan strategis dan
                  governance partner. Ditunjuk langsung oleh Superadmin, bukan
                  jalur upgrade.
                </p>
              </div>
              <div className="border-l-4 border-red-500 pl-3">
                <h4 className="font-bold">Admin Sistem / Superadmin</h4>
                <p className="text-xs text-gray-600 dark:text-slate-400">
                  Pengelola operasional dan sistem platform. Ditunjuk internal,
                  tidak tersedia via jalur pendaftaran umum.
                </p>
              </div>
            </div>
          </div>
        );
      case "FAQ":
        return (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-xl font-bold text-kodman-600 dark:text-kodman-400 mb-4">
              6. Frequently Asked Questions
            </h3>
            <details className="bg-gray-50 dark:bg-slate-800 p-3 rounded-lg cursor-pointer">
              <summary className="font-bold text-gray-900 dark:text-white text-sm">
                Apakah sertifikat diakui industri?
              </summary>
              <p className="mt-2 text-xs text-gray-600 dark:text-slate-400">
                Ya, untuk kategori Certification, kami bekerjasama dengan
                partner resmi seperti BNSP dan lembaga internasional.
              </p>
            </details>
            <details className="bg-gray-50 dark:bg-slate-800 p-3 rounded-lg cursor-pointer">
              <summary className="font-bold text-gray-900 dark:text-white text-sm">
                Bagaimana cara mencairkan saldo?
              </summary>
              <p className="mt-2 text-xs text-gray-600 dark:text-slate-400">
                Saldo dapat dicairkan (Withdraw) ke rekening bank yang terdaftar
                di menu Settings &gt; Wallet. Proses maksimal 2x24 jam kerja.
              </p>
            </details>
            <details className="bg-gray-50 dark:bg-slate-800 p-3 rounded-lg cursor-pointer">
              <summary className="font-bold text-gray-900 dark:text-white text-sm">
                Bisakah saya menjadi Mentor dan Creator sekaligus?
              </summary>
              <p className="mt-2 text-xs text-gray-600 dark:text-slate-400">
                Bisa. Sistem mendukung peran ganda. Anda akan mendapatkan
                dashboard gabungan untuk memantau performa kedua peran tersebut.
              </p>
            </details>
          </div>
        );
      case "PRIVACY":
        return (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-xl font-bold text-kodman-600 dark:text-kodman-400 mb-4">
              7. Kebijakan Privasi
            </h3>
            <p className="text-sm text-gray-700 dark:text-slate-300">
              Kami menghargai privasi data Anda. KMP - ADNG Academy mengumpulkan
              data (Nama, Email, NIK untuk sertifikat) semata-mata untuk
              keperluan operasional akademik dan legalitas sertifikasi.
            </p>
            <p className="text-sm text-gray-700 dark:text-slate-300 mt-2">
              Data KTP (KYC) disimpan dalam server terenkripsi dan tidak
              dibagikan kepada pihak ketiga selain untuk keperluan verifikasi
              hukum jika diperlukan.
            </p>
          </div>
        );
      case "TERMS":
        return (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-xl font-bold text-kodman-600 dark:text-kodman-400 mb-4">
              8. Syarat & Ketentuan
            </h3>
            <ul className="list-decimal pl-5 space-y-2 text-sm text-gray-700 dark:text-slate-300">
              <li>User wajib memberikan data yang valid saat pendaftaran.</li>
              <li>
                Dilarang keras membagikan akun (Account Sharing) atau membajak
                materi kursus.
              </li>
              <li>
                Refund hanya dapat diajukan maksimal 24 jam setelah pembelian
                jika materi belum diakses lebih dari 10%.
              </li>
              <li>
                Platform berhak membekukan akun yang terindikasi melakukan
                pelanggaran tanpa pemberitahuan sebelumnya.
              </li>
            </ul>
          </div>
        );
      case "GLOSSARY":
        return (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-xl font-bold text-kodman-600 dark:text-kodman-400 mb-4">
              9. Glosarium Istilah
            </h3>
            <div className="grid grid-cols-1 gap-3">
              <div className="text-sm">
                <strong className="text-kodman-600">LMS:</strong> Learning
                Management System.
              </div>
              <div className="text-sm">
                <strong className="text-kodman-600">KYC:</strong> Know Your
                Customer (Verifikasi Identitas KTP).
              </div>
              <div className="text-sm">
                <strong className="text-kodman-600">Settlement:</strong> Proses
                pencairan dana dari sistem ke pengguna.
              </div>
              <div className="text-sm">
                <strong className="text-kodman-600">Assembling:</strong> Proses
                Mentor menggunakan materi Creator lain untuk kelas Workshop.
              </div>
            </div>
          </div>
        );
      case "DISCLAIMER":
        return (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-xl font-bold text-kodman-600 dark:text-kodman-400 mb-4">
              A. Penafian (Disclaimer)
            </h3>
            <p className="text-sm text-gray-700 dark:text-slate-300 border-l-4 border-yellow-500 pl-4 py-2 bg-yellow-50 dark:bg-yellow-900/10">
              Platform ini disediakan &quot;sebagaimana adanya&quot;. KMP - ADNG
              Academy tidak menjamin kelulusan kerja atau kesuksesan bisnis
              instan setelah mengikuti pelatihan. Hasil tergantung pada
              ketekunan masing-masing peserta.
            </p>
            <p className="text-sm text-gray-700 dark:text-slate-300 mt-2">
              Materi investasi atau keuangan bukan merupakan saran finansial
              profesional. Segala keputusan investasi adalah tanggung jawab
              pribadi.
            </p>
          </div>
        );
      case "TECH":
        return (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-xl font-bold text-kodman-600 dark:text-kodman-400 mb-4">
              B. Technology Stack & Credits
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-2">
                  Frontend
                </h4>
                <ul className="text-xs text-gray-600 dark:text-slate-400 space-y-1">
                  <li>React 18 (Hooks & Functional)</li>
                  <li>Vite (Build Tool)</li>
                  <li>Tailwind CSS (Styling)</li>
                  <li>Lucide React (Iconography)</li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-2">
                  Backend
                </h4>
                <ul className="text-xs text-gray-600 dark:text-slate-400 space-y-1">
                  <li>Node.js & Express</li>
                  <li>Drizzle ORM</li>
                  <li>PostgreSQL (Neon Tech)</li>
                  <li>JWT Auth & Bcrypt</li>
                </ul>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-800">
              <p className="text-xs text-gray-500">
                Developed by <strong>Ulpermadi Ibrahim</strong> & Team.
                <br />
                &copy; {new Date().getFullYear()} All Rights Reserved.
              </p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row relative">
        {/* Mobile Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 md:hidden p-2 bg-gray-200 dark:bg-slate-800 rounded-full"
        >
          <X size={20} />
        </button>

        {/* Sidebar Navigation */}
        <div className="w-full md:w-1/3 bg-gray-50 dark:bg-slate-950 border-r border-gray-200 dark:border-slate-800 flex flex-col">
          <div className="p-6 border-b border-gray-200 dark:border-slate-800">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
              <div className="bg-kodman-600 text-white p-1.5 rounded-lg mr-2">
                <Heart size={18} fill="currentColor" />
              </div>
              Pusat Informasi
            </h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
              Dokumentasi & Panduan Sistem
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-1">
            {MENU_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition ${
                  activeTab === item.id
                    ? "bg-white dark:bg-slate-800 text-kodman-600 dark:text-kodman-400 shadow-sm border border-gray-200 dark:border-slate-700"
                    : "text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-900"
                }`}
              >
                <item.icon
                  size={16}
                  className={`mr-3 ${activeTab === item.id ? "text-kodman-500" : "text-gray-400"}`}
                />
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-900">
          {/* Header Desktop */}
          <div className="hidden md:flex justify-between items-center p-6 border-b border-gray-100 dark:border-slate-800">
            <h3 className="font-bold text-gray-500 dark:text-slate-500 text-sm tracking-wide uppercase">
              {MENU_ITEMS.find((m) => m.id === activeTab)?.label}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-red-500 transition"
            >
              <X size={24} />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 scroll-smooth">
            {renderContent()}

            {/* SPECIAL FOOTER */}
            <div className="mt-12 pt-8 border-t border-gray-100 dark:border-slate-800 text-center">
              <p className="text-xs text-gray-400 dark:text-slate-600 font-mono flex items-center justify-center gap-2">
                <Heart
                  size={12}
                  className="text-red-500 fill-current animate-pulse"
                />
                Made with Love for Quality Education for Indonesian People
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InformationCenterModal;
