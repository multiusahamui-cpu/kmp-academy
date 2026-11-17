import React, { useState } from "react";
import { UserRole, WishlistItem } from "../types";
import {
  TrendingUp,
  Users,
  BookOpen,
  AlertCircle,
  Clock,
  CheckCircle,
  Calendar,
  DollarSign,
  Heart,
  Play,
  Activity,
  FileText,
  ArrowRight,
  Wallet,
} from "lucide-react";
import { MOCK_COURSES } from "../constants";
import IdentityCard from "../components/IdentityCard";

interface DashboardProps {
  role: UserRole;
  onNavigate?: (view: string) => void;
  onOpenLearning?: (courseId: string) => void;
  wishlistItems?: WishlistItem[];
}

const Dashboard: React.FC<DashboardProps> = ({
  role,
  onNavigate = () => {},
  onOpenLearning = () => {},
  wishlistItems = [],
}) => {
  // --- MOCK USER DATA FOR IDENTITY CARD ---
  // In a real app, this comes from Global State / Context / API
  const mockUser = {
    name: role === UserRole.DIRECTOR ? "Ulpermadi Ibrahim" : "User Kodman",
    avatarUrl:
      role === UserRole.DIRECTOR
        ? "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
        : undefined,
    joinDate: new Date("2024-01-15"), // Example Join Date
    // Simulation Logic:
    isActive: true, // For Mentor/Creator
    hasPurchased: true, // For Student (Set to true to show card for demo)
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Selamat Pagi";
    if (hour < 15) return "Selamat Siang";
    if (hour < 18) return "Selamat Sore";
    return "Selamat Malam";
  };

  const renderDashboardContent = () => {
    switch (role) {
      case UserRole.STUDENT:
        return (
          <StudentDashboard
            onOpenLearning={onOpenLearning}
            wishlistItems={wishlistItems}
            onNavigate={onNavigate}
          />
        );
      case UserRole.MENTOR:
        return <MentorDashboard />;
      case UserRole.CREATOR:
        return <CreatorDashboard onNavigate={onNavigate} />;
      case UserRole.ADMIN_SYSTEM:
      case UserRole.SUPERADMIN:
        return <AdminDashboard />;
      default:
        return <p>Dashboard not found.</p>;
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. Header with Identity Card */}
      <div className="grid grid-cols-1 md:grid-cols-5 lg:grid-cols-3 gap-6 items-center">
        {/* Welcome Text Section */}
        <div className="order-2 md:order-1 md:col-span-2 lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 h-full flex flex-col justify-center min-h-[180px]">
          <h1 className="font-sans text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {getGreeting()}, {role}!
          </h1>
          <p className="text-gray-500 dark:text-slate-400 text-lg leading-relaxed">
            {role === UserRole.STUDENT &&
              "Kartu Member Anda aktif! Terus belajar untuk meningkatkan skill."}
            {role === UserRole.MENTOR &&
              "Identitas Profesional Mentor Anda telah aktif. Selamat mengajar!"}
            {role === UserRole.CREATOR &&
              "Kartu Creator Gold Anda siap. Terus berkarya!"}
            {role === UserRole.DIRECTOR &&
              "Selamat datang di Panel Eksekutif, Pak Direktur."}
            {(role === UserRole.ADMIN_SYSTEM || role === UserRole.SUPERADMIN) &&
              "Sistem berjalan normal. Kartu akses Admin aktif."}
          </p>
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800 flex items-center text-sm text-gray-400 font-mono">
            <Clock size={14} className="mr-2" />
            {new Date().toLocaleDateString("id-ID", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </div>
        </div>

        {/* Identity Card Section */}
        <div className="order-1 md:order-2 md:col-span-3 lg:col-span-1 flex justify-center w-full">
          <IdentityCard
            role={role}
            name={mockUser.name}
            avatarUrl={mockUser.avatarUrl}
            joinDate={mockUser.joinDate}
            isActive={mockUser.isActive}
            hasPurchased={mockUser.hasPurchased}
          />
        </div>
      </div>

      {renderDashboardContent()}
    </div>
  );
};

// --- SUB-DASHBOARDS ---

interface StudentDashProps {
  onOpenLearning: (id: string) => void;
  wishlistItems: WishlistItem[];
  onNavigate: (view: string) => void;
}

const StudentDashboard: React.FC<StudentDashProps> = ({
  onOpenLearning,
  wishlistItems,
  onNavigate,
}) => {
  // Mock "Last Accessed" Course
  const lastCourse = MOCK_COURSES[0];

  return (
    <div className="space-y-6">
      {/* Hero Progress */}
      <div className="bg-gradient-to-r from-kodman-800 to-kodman-600 rounded-xl p-6 text-white shadow-lg flex flex-col md:flex-row items-center gap-6 relative overflow-hidden group">
        {/* Background Decoration */}
        <div className="absolute -right-10 -bottom-10 opacity-10 transform rotate-12 group-hover:scale-110 transition duration-700">
          <BookOpen size={200} />
        </div>

        <div className="flex-1 relative z-10">
          <span className="inline-block px-2 py-1 bg-white/20 rounded text-xs font-bold mb-2 backdrop-blur-sm">
            Terakhir Diakses
          </span>
          <h2 className="text-2xl font-bold mb-2">{lastCourse.title}</h2>
          <p className="text-kodman-100 text-sm mb-4">
            Modul 4: State Management Fundamentals
          </p>
          <div className="w-full bg-black/20 rounded-full h-2 mb-2">
            <div
              className="bg-green-400 h-2 rounded-full shadow-[0_0_10px_rgba(74,222,128,0.5)]"
              style={{ width: "35%" }}
            ></div>
          </div>
          <p className="text-xs text-kodman-200">35% Selesai</p>
        </div>
        <button
          onClick={() => onOpenLearning(lastCourse.id)}
          className="px-6 py-3 bg-white text-kodman-900 rounded-full font-bold text-sm hover:bg-gray-100 shadow-xl flex items-center transform transition hover:-translate-y-1 relative z-10"
        >
          <Play size={18} className="mr-2 fill-current" /> Lanjut Belajar
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Wishlist Preview */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-6 md:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center">
              <Heart size={18} className="mr-2 text-pink-500 fill-current" />{" "}
              Wishlist Anda ({wishlistItems.length})
            </h3>
            <button
              onClick={() => onNavigate("catalog")}
              className="text-sm text-kodman-600 hover:underline"
            >
              Lihat Katalog
            </button>
          </div>

          <div className="space-y-3">
            {wishlistItems.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-lg">
                <p className="text-gray-500 dark:text-slate-400 text-sm">
                  Belum ada item di wishlist.
                </p>
                <button
                  onClick={() => onNavigate("catalog")}
                  className="mt-2 text-xs font-bold text-kodman-600"
                >
                  Jelajahi Kursus
                </button>
              </div>
            ) : (
              wishlistItems.slice(0, 3).map((item) => (
                <div
                  key={item.courseId}
                  className="flex gap-4 p-3 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg transition border border-transparent hover:border-gray-100 dark:hover:border-slate-700"
                >
                  <img
                    src={item.thumbnail}
                    className="w-16 h-16 object-cover rounded"
                    alt=""
                  />
                  <div className="flex-1">
                    <h4 className="font-bold text-sm text-gray-900 dark:text-white line-clamp-1">
                      {item.title}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">
                      Ditambahkan: {item.addedAt}
                    </p>
                    <p className="text-sm font-bold text-kodman-600 mt-1">
                      {new Intl.NumberFormat("id-ID", {
                        style: "currency",
                        currency: "IDR",
                        maximumFractionDigits: 0,
                      }).format(item.price)}
                    </p>
                  </div>
                  <button
                    onClick={() => onNavigate("catalog")}
                    className="self-center px-3 py-1.5 border border-kodman-600 text-kodman-600 dark:text-kodman-400 dark:border-kodman-400 rounded text-xs font-bold hover:bg-kodman-50 dark:hover:bg-kodman-900/20"
                  >
                    Lihat
                  </button>
                </div>
              ))
            )}
            {wishlistItems.length > 3 && (
              <button className="w-full text-center text-xs text-gray-500 pt-2 hover:text-gray-700">
                + {wishlistItems.length - 3} item lainnya
              </button>
            )}
          </div>
        </div>

        {/* Upcoming Schedule */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-6">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center">
            <Calendar size={18} className="mr-2 text-orange-500" /> Jadwal
            Workshop
          </h3>
          <div className="space-y-4">
            <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border-l-4 border-orange-500 hover:shadow-md transition cursor-pointer">
              <p className="text-xs font-bold text-orange-700 dark:text-orange-400 mb-1 flex items-center">
                <Clock size={12} className="mr-1" /> BESOK, 19:00 WIB
              </p>
              <p className="text-sm font-bold text-gray-900 dark:text-white">
                Workshop Digital Marketing
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Sesi 3: Social Media Ads
              </p>
              <div className="mt-2 text-xs text-blue-600 hover:underline flex items-center">
                Link Zoom <ArrowRight size={10} className="ml-1" />
              </div>
            </div>
            <div className="text-center py-4 text-gray-500 text-sm">
              Tidak ada jadwal lain minggu ini.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const MentorDashboard = () => (
  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
    <StatCard
      title="Total Siswa Aktif"
      value="24"
      icon={<Users className="text-blue-500" />}
      change="+4"
    />
    <StatCard
      title="Tugas Perlu Dinilai"
      value="5"
      icon={<BookOpen className="text-orange-500" />}
      change="Urgent"
    />
    <StatCard
      title="Jadwal Mengajar"
      value="2"
      icon={<Calendar className="text-purple-500" />}
      change="Minggu Ini"
    />
    {/* Changed label from 'Est. Pendapatan' to 'Saldo Efektif' */}
    <StatCard
      title="Saldo Efektif"
      value="Rp 4.2jt"
      icon={<DollarSign className="text-green-500" />}
      change="Bulan Ini"
    />

    <div className="md:col-span-2 lg:col-span-3 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-6">
      <h3 className="font-bold text-gray-900 dark:text-white mb-4">
        Jadwal Kelas Berikutnya
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 dark:bg-slate-800 text-gray-500">
            <tr>
              <th className="px-4 py-3 rounded-l-lg">Topik / Materi</th>
              <th className="px-4 py-3">Batch</th>
              <th className="px-4 py-3">Waktu</th>
              <th className="px-4 py-3 text-right rounded-r-lg">Link Zoom</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
            <tr>
              <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                Social Media Ads Strategy
              </td>
              <td className="px-4 py-3">Batch 12</td>
              <td className="px-4 py-3">Besok, 19:00 WIB</td>
              <td className="px-4 py-3 text-right">
                <button className="text-blue-600 hover:underline">
                  Buka Zoom
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-6">
      <h3 className="font-bold text-gray-900 dark:text-white mb-4">
        Pengingat
      </h3>
      <ul className="space-y-3">
        <li className="flex items-start text-sm text-gray-600 dark:text-slate-300">
          <AlertCircle
            size={16}
            className="mr-2 text-red-500 flex-shrink-0 mt-0.5"
          />
          Input nilai tugas akhir Batch 11 sebelum Jumat.
        </li>
        <li className="flex items-start text-sm text-gray-600 dark:text-slate-300">
          <CheckCircle
            size={16}
            className="mr-2 text-green-500 flex-shrink-0 mt-0.5"
          />
          Proposal Workshop &quot;Basic Accounting&quot; disetujui Admin.
        </li>
      </ul>
    </div>
  </div>
);

const CreatorDashboard: React.FC<{ onNavigate: (view: string) => void }> = ({
  onNavigate,
}) => (
  <div className="space-y-6">
    <div className="grid md:grid-cols-3 gap-6">
      <StatCard
        title="Total Penjualan"
        value="Rp 12.500.000"
        icon={<TrendingUp className="text-green-500" />}
        change="+15%"
      />
      <StatCard
        title="Siswa Terdaftar"
        value="150"
        icon={<Users className="text-blue-500" />}
        change="+12"
      />
      <StatCard
        title="Rating Rata-rata"
        value="4.8/5.0"
        icon={<Heart className="text-red-500" />}
        change="Stabil"
      />
    </div>

    <div className="grid md:grid-cols-2 gap-6">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-6">
        <h3 className="font-bold text-gray-900 dark:text-white mb-4">
          Status Konten
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
            <div>
              <p className="font-bold text-gray-800 dark:text-white">
                Mastering React
              </p>
              <p className="text-xs text-gray-500">Updated: 2 hari lalu</p>
            </div>
            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded">
              PUBLISHED
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
            <div>
              <p className="font-bold text-gray-800 dark:text-white">
                Dasar Akuntansi
              </p>
              <p className="text-xs text-gray-500">Updated: 5 jam lalu</p>
            </div>
            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-bold rounded">
              PENDING REVIEW
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-gray-900 dark:text-white">
            Royalti Bulan Ini
          </h3>
          <button
            onClick={() => onNavigate("wallet")}
            className="px-3 py-1 bg-kodman-50 dark:bg-kodman-900/30 text-kodman-700 dark:text-kodman-400 border border-kodman-200 dark:border-kodman-700 rounded text-xs font-bold flex items-center hover:bg-kodman-100 dark:hover:bg-kodman-900/50"
          >
            <Wallet size={12} className="mr-1" /> Dompet Saya
          </button>
        </div>
        <div className="h-32 flex items-end justify-between gap-2 px-2">
          {[40, 65, 30, 80, 55, 90, 70].map((h, i) => (
            <div
              key={i}
              className="w-full bg-kodman-200 dark:bg-kodman-900 rounded-t-sm relative group"
            >
              <div
                className="absolute bottom-0 left-0 right-0 bg-kodman-500 rounded-t-sm transition-all duration-500"
                style={{ height: `${h}%` }}
              ></div>
              <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded">
                Rp {h}00k
              </div>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-gray-500 mt-2">
          7 Hari Terakhir
        </p>
      </div>
    </div>
  </div>
);

const AdminDashboard = () => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateReport = (type: "WEEKLY" | "MONTHLY") => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      alert(
        `Laporan ${type} telah berhasil digenerate dan dikirim ke Dashboard Direktur.`,
      );
    }, 1500);
  };

  return (
    <div className="space-y-6">
      {/* 1. Report Generator Widget (Wakil Direktur Function) */}
      <div className="bg-gradient-to-r from-purple-700 to-purple-900 rounded-xl p-6 text-white shadow-lg flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold flex items-center mb-1">
            <FileText className="mr-2" /> Routine Management Report
          </h2>
          <p className="text-purple-200 text-sm">
            Generate laporan otomatis sistem untuk disampaikan ke Direktur.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => handleGenerateReport("WEEKLY")}
            disabled={isGenerating}
            className="px-4 py-2 bg-white text-purple-900 rounded font-bold text-sm hover:bg-gray-100 flex items-center"
          >
            {isGenerating ? (
              "Generating..."
            ) : (
              <>
                <Clock size={16} className="mr-2" /> Report Mingguan
              </>
            )}
          </button>
          <button
            onClick={() => handleGenerateReport("MONTHLY")}
            disabled={isGenerating}
            className="px-4 py-2 bg-purple-600 border border-purple-400 text-white rounded font-bold text-sm hover:bg-purple-500 flex items-center"
          >
            {isGenerating ? (
              "Generating..."
            ) : (
              <>
                <Calendar size={16} className="mr-2" /> Report Bulanan
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total User"
          value="1,240"
          icon={<Users className="text-blue-500" />}
          change="+50"
        />
        <StatCard
          title="Transaksi (Bulan ini)"
          value="Rp 45.2jt"
          icon={<DollarSign className="text-green-500" />}
          change="+12%"
        />
        <StatCard
          title="Pending Review"
          value="3 Kursus"
          icon={<Clock className="text-orange-500" />}
          change="Action Needed"
        />
        <StatCard
          title="Server Uptime"
          value="99.9%"
          icon={<Activity className="text-purple-500" />}
          change="Healthy"
        />
      </div>

      {/* 3. Operational Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-6">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4">
            Butuh Persetujuan (Role Upgrade)
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-200"></div>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">
                    John Doe
                  </p>
                  <p className="text-xs text-gray-500">Request: MENTOR</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1 text-xs border border-red-200 text-red-600 rounded hover:bg-red-50">
                  Tolak
                </button>
                <button className="px-3 py-1 text-xs bg-kodman-600 text-white rounded hover:bg-kodman-700">
                  Approve
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-6">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4">
            Log Sistem Terkini
          </h3>
          <div className="space-y-2 text-xs font-mono text-gray-600 dark:text-slate-400">
            <p>
              [10:45:12] Cron Job &quot;Payout Settlement&quot; executed
              successfully.
            </p>
            <p>[10:42:00] New user registration: user@example.com</p>
            <p>[10:30:15] Payment received: TRX-005 (Bayarind)</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper Components
interface StatCardProps {
  title: React.ReactNode;
  value: React.ReactNode;
  icon: React.ReactNode;
  change: React.ReactNode;
}

const StatCard = ({ title, value, icon, change }: StatCardProps) => (
  <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 transition-all hover:border-kodman-200 dark:hover:border-slate-600">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-sm font-medium text-gray-500 dark:text-slate-400 mb-1">
          {title}
        </p>
        <h3 className="font-sans text-2xl font-bold text-gray-900 dark:text-white">
          {value}
        </h3>
      </div>
      <div className="p-2 bg-gray-50 dark:bg-slate-800 rounded-lg">{icon}</div>
    </div>
    <div className="mt-2 text-xs text-green-600 dark:text-green-400 font-bold font-mono">
      {change}
    </div>
  </div>
);

export default Dashboard;
