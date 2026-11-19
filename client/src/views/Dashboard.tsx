import React, { useEffect, useState } from "react";
import { UserRole, WishlistItem } from "../types";
import {
  TrendingUp,
  Users,
  BookOpen,
  AlertCircle,
  Clock,
  Calendar,
  Heart,
  Play,
  ArrowRight,
  Wallet,
} from "lucide-react";
import { userApi } from "../services/api";
import IdentityCard from "../components/IdentityCard";
import { useProfile } from "../services/profile";
import { reportsApi } from "../services/reports";
import { classesApi } from "../services/classes";
import ManagementReports from "../components/ManagementReports";
import { Bars, Card, Empty, StateBox, dateId, dateTimeId, num, rupiah, uptimeLabel, useAsync } from "../components/ReportBits";

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
  const { profile } = useProfile();
  const displayName = profile?.name ?? "";
  const cardIssuedAt = profile?.cardIssuedAt ? new Date(profile.cardIssuedAt) : null;

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
        return <MentorDashboard onNavigate={onNavigate ?? (() => undefined)} />;
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
            {getGreeting()}{displayName ? `, ${displayName}` : ""}!
          </h1>
          <p className="text-gray-500 dark:text-slate-400 text-lg leading-relaxed">
            {role === UserRole.STUDENT &&
              (profile?.cardNumber
                ? "Kartu Student Anda aktif! Terus belajar untuk meningkatkan skill."
                : "Ikuti kursus pertama Anda untuk mendapatkan Kartu Student.")}
            {role === UserRole.MENTOR &&
              (profile?.cardNumber
                ? "Identitas Profesional Mentor Anda telah aktif. Selamat mengajar!"
                : "Kartu Mentor Anda menunggu diterbitkan oleh Admin.")}
            {role === UserRole.CREATOR &&
              (profile?.cardNumber
                ? "Kartu Creator Anda siap. Terus berkarya!"
                : "Kartu Creator Anda menunggu diterbitkan oleh Admin.")}
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
            name={displayName}
            avatarUrl={profile?.avatar ?? undefined}
            cardNumber={profile?.cardNumber}
            issuedAt={cardIssuedAt}
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
  // Kursus yang terakhir dibuka: dari data pendaftaran nyata.
  const [lastCourse, setLastCourse] = useState<{ id: string; title: string; instructor: string; progress: number } | null>(null);
  useEffect(() => {
    let cancelled = false;
    userApi
      .getMyCourses()
      .then((res) => {
        const rows: { enrollment: { progress?: number | null; lastAccessedAt?: string | null }; course: { id: string; title: string; instructorName?: string | null } }[] = res.data?.data ?? [];
        const sorted = [...rows].sort((a, b) => new Date(b.enrollment.lastAccessedAt ?? 0).getTime() - new Date(a.enrollment.lastAccessedAt ?? 0).getTime());
        const pick = sorted.find((r) => (r.enrollment.progress ?? 0) < 100) ?? sorted[0];
        if (!cancelled) setLastCourse(pick ? { id: pick.course.id, title: pick.course.title, instructor: pick.course.instructorName ?? "", progress: pick.enrollment.progress ?? 0 } : null);
      })
      .catch(() => { if (!cancelled) setLastCourse(null); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-6">
      {/* Hero Progress */}
      <div className="bg-gradient-to-r from-kodman-800 to-kodman-600 rounded-xl p-6 text-white shadow-lg flex flex-col md:flex-row items-center gap-6 relative overflow-hidden group">
        {/* Background Decoration */}
        <div className="absolute -right-10 -bottom-10 opacity-10 transform rotate-12 group-hover:scale-110 transition duration-700">
          <BookOpen size={200} />
        </div>

        <div className="flex-1 relative z-10">
          {lastCourse ? (
            <>
              <span className="inline-block px-2 py-1 bg-white/20 rounded text-xs font-bold mb-2 backdrop-blur-sm">
                Terakhir Diakses
              </span>
              <h2 className="text-2xl font-bold mb-2">{lastCourse.title}</h2>
              <p className="text-kodman-100 text-sm mb-4">{lastCourse.instructor}</p>
              <div className="w-full bg-black/20 rounded-full h-2 mb-2">
                <div
                  className="bg-green-400 h-2 rounded-full shadow-[0_0_10px_rgba(74,222,128,0.5)]"
                  style={{ width: `${lastCourse.progress}%` }}
                ></div>
              </div>
              <p className="text-xs text-kodman-200">{lastCourse.progress}% Selesai</p>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold mb-2">Mulai perjalanan belajar Anda</h2>
              <p className="text-kodman-100 text-sm">Anda belum mengikuti kursus. Jelajahi katalog untuk memilih kursus pertama.</p>
            </>
          )}
        </div>
        {lastCourse ? (
          <button
            onClick={() => onOpenLearning(lastCourse.id)}
            className="px-6 py-3 bg-white text-kodman-900 rounded-full font-bold text-sm hover:bg-gray-100 shadow-xl flex items-center transform transition hover:-translate-y-1 relative z-10"
          >
            <Play size={18} className="mr-2 fill-current" /> Lanjut Belajar
          </button>
        ) : (
          <button
            onClick={() => onNavigate("catalog")}
            className="px-6 py-3 bg-white text-kodman-900 rounded-full font-bold text-sm hover:bg-gray-100 shadow-xl flex items-center transform transition hover:-translate-y-1 relative z-10"
          >
            Lihat Katalog
          </button>
        )}
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
        <StudentSchedule onNavigate={onNavigate} />
      </div>
    </div>
  );
};

const StudentSchedule: React.FC<{ onNavigate: (view: string) => void }> = ({ onNavigate }) => {
  const { data, loading, error, reload } = useAsync(() => classesApi.mine());
  const upcoming = (data ?? [])
    .flatMap((c) => c.sessions.map((s) => ({ ...s, className: c.name })))
    .sort((x, y) => x.startsAt.localeCompare(y.startsAt))
    .slice(0, 3);
  return (
    <Card title="Jadwal Kelas" right={<Calendar size={18} className="text-orange-500" />}>
      <StateBox loading={loading} error={error} onRetry={reload}>
        {upcoming.length === 0 ? (
          <Empty>Belum ada sesi kelas mendatang.</Empty>
        ) : (
          <div className="space-y-3">
            {upcoming.map((s) => (
              <div key={s.id} className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border-l-4 border-orange-500">
                <p className="text-xs font-bold text-orange-700 dark:text-orange-400 mb-1 flex items-center">
                  <Clock size={12} className="mr-1" /> {dateTimeId(s.startsAt)}
                </p>
                <p className="text-sm font-bold text-gray-900 dark:text-white">{s.className}</p>
                <p className="text-xs text-gray-500 mt-1">{s.title}</p>
                {s.meetingUrl && (
                  <a href={s.meetingUrl} target="_blank" rel="noopener noreferrer" className="mt-2 text-xs text-blue-600 hover:underline flex items-center">
                    Buka tautan <ArrowRight size={10} className="ml-1" />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
        <button onClick={() => onNavigate("classes")} className="mt-3 text-xs text-kodman-600 underline">Semua kelas</button>
      </StateBox>
    </Card>
  );
};

const MentorDashboard: React.FC<{ onNavigate: (view: string) => void }> = ({ onNavigate }) => {
  const { data, loading, error, reload } = useAsync(() => classesApi.list());
  const active = (data ?? []).filter((c) => !c.archived);
  return (
    <StateBox loading={loading} error={error} onRetry={reload}>
      <div className="space-y-6">
        <div className="grid md:grid-cols-3 gap-6">
          <StatCard title="Kelas Aktif" value={num(active.length)} icon={<BookOpen className="text-orange-500" />} change="Tidak diarsipkan" />
          <StatCard title="Total Siswa" value={num(active.reduce((n, c) => n + c.members, 0))} icon={<Users className="text-blue-500" />} change="Di semua kelas aktif" />
          <StatCard title="Kelas Berjadwal" value={num(active.filter((c) => c.nextSession).length)} icon={<Calendar className="text-purple-500" />} change="Punya sesi mendatang" />
        </div>
        <Card title="Sesi Berikutnya per Kelas" right={<button onClick={() => onNavigate("my-classes")} className="text-xs text-kodman-600 underline">Kelola kelas</button>}>
          {active.length === 0 ? (
            <Empty>Belum ada kelas. Buat kelas di menu Rombongan Belajar.</Empty>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-gray-500"><tr><th className="py-2">Kelas</th><th className="text-right">Siswa</th><th className="text-right">Sesi berikutnya</th></tr></thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {active.map((c) => (
                  <tr key={c.id}>
                    <td className="py-2 font-medium text-gray-900 dark:text-white">{c.name}</td>
                    <td className="text-right font-mono">{num(c.members)}</td>
                    <td className="text-right">{c.nextSession ? dateTimeId(c.nextSession) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </StateBox>
  );
};

const STATUS_STYLE: Record<string, string> = {
  PUBLISHED: "bg-green-100 text-green-700",
  PENDING_REVIEW: "bg-yellow-100 text-yellow-700",
  DRAFT: "bg-gray-100 text-gray-700",
  REJECTED: "bg-red-100 text-red-700",
};
const STATUS_LABEL: Record<string, string> = {
  PUBLISHED: "TERBIT",
  PENDING_REVIEW: "MENUNGGU REVIEW",
  DRAFT: "DRAF",
  REJECTED: "DITOLAK",
};

const CreatorDashboard: React.FC<{ onNavigate: (view: string) => void }> = ({
  onNavigate,
}) => {
  const { data, loading, error, reload } = useAsync(() =>
    reportsApi.creatorSummary(),
  );
  return (
    <StateBox loading={loading} error={error} onRetry={reload}>
      {data && (
        <div className="space-y-6">
          <div className="grid md:grid-cols-4 gap-6">
            <StatCard
              title="Total Penjualan"
              value={rupiah(data.salesTotal)}
              icon={<TrendingUp className="text-green-500" />}
              change={`${rupiah(data.salesThisMonth)} bulan ini`}
            />
            <StatCard
              title={`Bagian Anda (${data.sharePercent}%)`}
              value={rupiah(data.earningsTotal)}
              icon={<Wallet className="text-kodman-500" />}
              change={`${rupiah(data.earningsThisMonth)} bulan ini`}
            />
            <StatCard
              title="Siswa Terdaftar"
              value={num(data.students)}
              icon={<Users className="text-blue-500" />}
              change="Semua kursus Anda"
            />
            <StatCard
              title="Rating Rata-rata"
              value={data.totalReviews > 0 ? `${data.averageRating.toFixed(1)}/5.0` : "-"}
              icon={<Heart className="text-red-500" />}
              change={`${num(data.totalReviews)} ulasan`}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card title="Status Konten">
              {data.content.length === 0 ? (
                <Empty>Belum ada kursus.</Empty>
              ) : (
                <div className="space-y-3">
                  {data.content.map((c) => (
                    <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                      <div className="min-w-0">
                        <p className="font-bold text-gray-800 dark:text-white truncate">{c.title}</p>
                        <p className="text-xs text-gray-500">Diperbarui: {dateId(c.updatedAt)}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-bold rounded shrink-0 ${STATUS_STYLE[c.status] ?? STATUS_STYLE.DRAFT}`}>
                        {STATUS_LABEL[c.status] ?? c.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card
              title="Penjualan 7 Hari Terakhir"
              right={
                <button
                  onClick={() => onNavigate("my-courses")}
                  className="px-3 py-1 bg-kodman-50 dark:bg-kodman-900/30 text-kodman-700 dark:text-kodman-400 border border-kodman-200 dark:border-kodman-700 rounded text-xs font-bold"
                >
                  Atur harga dan diskon
                </button>
              }
            >
              <Bars
                items={data.last7Days.map((d) => ({
                  label: d.date.slice(5),
                  value: d.revenue,
                  title: `${d.date}: ${rupiah(d.revenue)}`,
                }))}
                height={128}
              />
              <p className="text-xs text-gray-500 mt-3">Harga ditetapkan Anda per kursus. Diskon dengan jadwal mulai dan berakhir diatur di tab Promo pada tiap kursus.</p>
            </Card>

            <Card
              title="Dompet"
              right={
                <button
                  onClick={() => onNavigate("wallet")}
                  className="px-3 py-1 bg-kodman-50 dark:bg-kodman-900/30 text-kodman-700 dark:text-kodman-400 border border-kodman-200 dark:border-kodman-700 rounded text-xs font-bold flex items-center"
                >
                  <Wallet size={12} className="mr-1" /> Dompet Saya
                </button>
              }
            >
              <p className="text-sm text-gray-600 dark:text-slate-300">
                Bagian Anda dari penjualan dicatat per pendaftaran dengan persentase yang berlaku saat itu. Pencairan ke Dompet belum tersedia.
              </p>
            </Card>
          </div>
        </div>
      )}
    </StateBox>
  );
};

const AdminDashboard = () => {
  const { data, loading, error, reload } = useAsync(() => reportsApi.stats());
  return (
    <StateBox loading={loading} error={error} onRetry={reload}>
      {data && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Pengguna"
              value={num(data.users.total)}
              icon={<Users className="text-blue-500" />}
              change={`+${num(data.users.newThisMonth)} bulan ini`}
            />
            <StatCard
              title="Pendapatan (Bulan ini)"
              value={rupiah(data.sales.revenueThisMonth)}
              icon={<TrendingUp className="text-green-500" />}
              change={`${num(data.sales.enrollmentsThisMonth)} pendaftaran`}
            />
            <StatCard
              title="Menunggu Review"
              value={`${num(data.courses.pendingReview)} Kursus`}
              icon={<Clock className="text-orange-500" />}
              change={data.courses.pendingReview > 0 ? "Perlu tindakan" : "Tidak ada antrean"}
            />
            <StatCard
              title="Server Aktif"
              value={uptimeLabel(data.uptimeSeconds)}
              icon={<AlertCircle className="text-purple-500" />}
              change="Sejak restart terakhir"
            />
          </div>

          <ManagementReports canGenerate />

          <Card title="Antrean Operasional">
            <ul className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <li>Pembayaran menunggu verifikasi: <b>{num(data.queue.pendingPayments)}</b></li>
              <li>Permintaan hapus akun: <b>{num(data.queue.openDeletions)}</b></li>
              <li>Lamaran pengajar: <b>{num(data.queue.pendingApplications)}</b></li>
              <li>Review kursus: <b>{num(data.queue.pendingReviews)}</b></li>
            </ul>
          </Card>
        </div>
      )}
    </StateBox>
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
