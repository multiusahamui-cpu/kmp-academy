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
import { useI18n, useT } from "../i18n";
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
  const { t, lang } = useI18n();
  const { profile } = useProfile();
  const displayName = profile?.name ?? "";
  const cardIssuedAt = profile?.cardIssuedAt ? new Date(profile.cardIssuedAt) : null;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t("dashboard.greetMorning");
    if (hour < 15) return t("dashboard.greetNoon");
    if (hour < 18) return t("dashboard.greetAfternoon");
    return t("dashboard.greetNight");
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
        return <p>{t("dashboard.notFound")}</p>;
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. Header with Identity Card */}
      <div className="grid grid-cols-1 md:grid-cols-5 lg:grid-cols-3 gap-6 items-center">
        {/* Welcome Text Section */}
        <div className="order-2 md:order-1 md:col-span-2 lg:col-span-2 bg-digitalcoop-gradient text-white p-6 rounded-2xl shadow-digitalcoop h-full flex flex-col justify-center min-h-[180px] relative overflow-hidden">
          <div className="absolute -top-16 -right-10 w-56 h-56 rounded-full bg-gold-400/25 blur-3xl pointer-events-none"></div>
          <h1 className="font-sans text-3xl font-bold text-white mb-2 relative">
            {getGreeting()}{displayName ? `, ${displayName}` : ""}!
          </h1>
          <p className="text-white/90 text-lg leading-relaxed relative">
            {role === UserRole.STUDENT &&
              (profile?.cardNumber
                ? t("dashboard.welStudentActive")
                : t("dashboard.welStudentInactive"))}
            {role === UserRole.MENTOR &&
              (profile?.cardNumber
                ? t("dashboard.welMentorActive")
                : t("dashboard.welMentorInactive"))}
            {role === UserRole.CREATOR &&
              (profile?.cardNumber
                ? t("dashboard.welCreatorActive")
                : t("dashboard.welCreatorInactive"))}
            {role === UserRole.DIRECTOR &&
              t("dashboard.welDirector")}
            {(role === UserRole.ADMIN_SYSTEM || role === UserRole.SUPERADMIN) &&
              t("dashboard.welAdmin")}
          </p>
          <div className="mt-4 pt-4 border-t border-white/20 flex items-center text-sm text-white/80 relative">
            <Clock size={14} className="mr-2" />
            {new Date().toLocaleDateString(lang === "id" ? "id-ID" : "en-US", {
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
  const t = useT();
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
      <div className="bg-gradient-to-r from-digitalcoop-800 to-digitalcoop-600 rounded-xl p-6 text-white shadow-lg flex flex-col md:flex-row items-center gap-6 relative overflow-hidden group">
        {/* Background Decoration */}
        <div className="absolute -right-10 -bottom-10 opacity-10 transform rotate-12 group-hover:scale-110 transition duration-700">
          <BookOpen size={200} />
        </div>

        <div className="flex-1 relative z-10">
          {lastCourse ? (
            <>
              <span className="inline-block px-2 py-1 bg-white/20 rounded text-xs font-bold mb-2 backdrop-blur-sm">
                {t("dashboard.lastAccessed")}
              </span>
              <h2 className="text-2xl font-bold mb-2">{lastCourse.title}</h2>
              <p className="text-digitalcoop-100 text-sm mb-4">{lastCourse.instructor}</p>
              <div className="w-full bg-black/20 rounded-full h-2 mb-2">
                <div
                  className="bg-green-400 h-2 rounded-full shadow-[0_0_10px_rgba(74,222,128,0.5)]"
                  style={{ width: `${lastCourse.progress}%` }}
                ></div>
              </div>
              <p className="text-xs text-digitalcoop-200">{t("dashboard.percentDone", { n: lastCourse.progress })}</p>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold mb-2">{t("dashboard.startTitle")}</h2>
              <p className="text-digitalcoop-100 text-sm">{t("dashboard.startDesc")}</p>
            </>
          )}
        </div>
        {lastCourse ? (
          <button
            onClick={() => onOpenLearning(lastCourse.id)}
            className="px-6 py-3 bg-white text-digitalcoop-900 rounded-full font-bold text-sm hover:bg-gray-100 shadow-xl flex items-center transform transition hover:-translate-y-1 relative z-10"
          >
            <Play size={18} className="mr-2 fill-current" /> {t("dashboard.continueLearning")}
          </button>
        ) : (
          <button
            onClick={() => onNavigate("catalog")}
            className="px-6 py-3 bg-white text-digitalcoop-900 rounded-full font-bold text-sm hover:bg-gray-100 shadow-xl flex items-center transform transition hover:-translate-y-1 relative z-10"
          >
            {t("dashboard.viewCatalog")}
          </button>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Wishlist Preview */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-6 md:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center">
              <Heart size={18} className="mr-2 text-pink-500 fill-current" />{" "}
              {t("dashboard.wishlistTitle", { n: wishlistItems.length })}
            </h3>
            <button
              onClick={() => onNavigate("catalog")}
              className="text-sm text-digitalcoop-600 hover:underline"
            >
              {t("dashboard.viewCatalog")}
            </button>
          </div>

          <div className="space-y-3">
            {wishlistItems.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-lg">
                <p className="text-gray-500 dark:text-slate-400 text-sm">
                  {t("dashboard.wishlistEmpty")}
                </p>
                <button
                  onClick={() => onNavigate("catalog")}
                  className="mt-2 text-xs font-bold text-digitalcoop-600"
                >
                  {t("dashboard.exploreCourses")}
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
                      {t("dashboard.added", { date: item.addedAt })}
                    </p>
                    <p className="text-sm font-bold text-digitalcoop-600 mt-1">
                      {new Intl.NumberFormat("id-ID", {
                        style: "currency",
                        currency: "IDR",
                        maximumFractionDigits: 0,
                      }).format(item.price)}
                    </p>
                  </div>
                  <button
                    onClick={() => onNavigate("catalog")}
                    className="self-center px-3 py-1.5 border border-digitalcoop-600 text-digitalcoop-600 dark:text-digitalcoop-400 dark:border-digitalcoop-400 rounded text-xs font-bold hover:bg-digitalcoop-50 dark:hover:bg-digitalcoop-900/20"
                  >
                    {t("dashboard.view")}
                  </button>
                </div>
              ))
            )}
            {wishlistItems.length > 3 && (
              <button className="w-full text-center text-xs text-gray-500 pt-2 hover:text-gray-700">
                {t("dashboard.moreItems", { n: wishlistItems.length - 3 })}
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
  const t = useT();
  const { data, loading, error, reload } = useAsync(() => classesApi.mine());
  const upcoming = (data ?? [])
    .flatMap((c) => c.sessions.map((s) => ({ ...s, className: c.name })))
    .sort((x, y) => x.startsAt.localeCompare(y.startsAt))
    .slice(0, 3);
  return (
    <Card title={t("dashboard.scheduleTitle")} right={<Calendar size={18} className="text-orange-500" />}>
      <StateBox loading={loading} error={error} onRetry={reload}>
        {upcoming.length === 0 ? (
          <Empty>{t("dashboard.scheduleEmpty")}</Empty>
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
                    {t("dashboard.openLink")} <ArrowRight size={10} className="ml-1" />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
        <button onClick={() => onNavigate("classes")} className="mt-3 text-xs text-digitalcoop-600 underline">{t("dashboard.allClasses")}</button>
      </StateBox>
    </Card>
  );
};

const MentorDashboard: React.FC<{ onNavigate: (view: string) => void }> = ({ onNavigate }) => {
  const t = useT();
  const { data, loading, error, reload } = useAsync(() => classesApi.list());
  const active = (data ?? []).filter((c) => !c.archived);
  return (
    <StateBox loading={loading} error={error} onRetry={reload}>
      <div className="space-y-6">
        <div className="grid md:grid-cols-3 gap-6">
          <StatCard title={t("dashboard.activeClasses")} value={num(active.length)} icon={<BookOpen className="text-orange-500" />} change={t("dashboard.notArchived")} />
          <StatCard title={t("dashboard.totalStudents")} value={num(active.reduce((n, c) => n + c.members, 0))} icon={<Users className="text-blue-500" />} change={t("dashboard.acrossActive")} />
          <StatCard title={t("dashboard.scheduledClasses")} value={num(active.filter((c) => c.nextSession).length)} icon={<Calendar className="text-purple-500" />} change={t("dashboard.hasUpcoming")} />
        </div>
        <Card title={t("dashboard.nextPerClass")} right={<button onClick={() => onNavigate("my-classes")} className="text-xs text-digitalcoop-600 underline">{t("dashboard.manageClasses")}</button>}>
          {active.length === 0 ? (
            <Empty>{t("dashboard.mentorEmpty")}</Empty>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-gray-500"><tr><th className="py-2">{t("dashboard.colClass")}</th><th className="text-right">{t("dashboard.colStudents")}</th><th className="text-right">{t("dashboard.colNext")}</th></tr></thead>
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

const CreatorDashboard: React.FC<{ onNavigate: (view: string) => void }> = ({
  onNavigate,
}) => {
  const t = useT();
  const stLabel = (st: string) => (({ PUBLISHED: t("dashboard.stPublished"), PENDING_REVIEW: t("dashboard.stPending"), DRAFT: t("dashboard.stDraft"), REJECTED: t("dashboard.stRejected") } as Record<string, string>)[st] ?? st);
  const { data, loading, error, reload } = useAsync(() =>
    reportsApi.creatorSummary(),
  );
  return (
    <StateBox loading={loading} error={error} onRetry={reload}>
      {data && (
        <div className="space-y-6">
          <div className="grid md:grid-cols-4 gap-6">
            <StatCard
              title={t("dashboard.totalSales")}
              value={rupiah(data.salesTotal)}
              icon={<TrendingUp className="text-green-500" />}
              change={t("dashboard.thisMonth", { v: rupiah(data.salesThisMonth) })}
            />
            <StatCard
              title={t("dashboard.yourShare", { p: data.sharePercent })}
              value={rupiah(data.earningsTotal)}
              icon={<Wallet className="text-digitalcoop-500" />}
              change={t("dashboard.thisMonth", { v: rupiah(data.earningsThisMonth) })}
            />
            <StatCard
              title={t("dashboard.enrolledStudents")}
              value={num(data.students)}
              icon={<Users className="text-blue-500" />}
              change={t("dashboard.allYourCourses")}
            />
            <StatCard
              title={t("dashboard.avgRating")}
              value={data.totalReviews > 0 ? `${data.averageRating.toFixed(1)}/5.0` : "-"}
              icon={<Heart className="text-red-500" />}
              change={t("dashboard.reviews", { n: num(data.totalReviews) })}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card title={t("dashboard.contentStatus")}>
              {data.content.length === 0 ? (
                <Empty>{t("dashboard.creatorEmpty")}</Empty>
              ) : (
                <div className="space-y-3">
                  {data.content.map((c) => (
                    <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                      <div className="min-w-0">
                        <p className="font-bold text-gray-800 dark:text-white truncate">{c.title}</p>
                        <p className="text-xs text-gray-500">{t("dashboard.updated", { date: dateId(c.updatedAt) })}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-bold rounded shrink-0 ${STATUS_STYLE[c.status] ?? STATUS_STYLE.DRAFT}`}>
                        {stLabel(c.status)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card
              title={t("dashboard.last7days")}
              right={
                <button
                  onClick={() => onNavigate("my-courses")}
                  className="px-3 py-1 bg-digitalcoop-50 dark:bg-digitalcoop-900/30 text-digitalcoop-700 dark:text-digitalcoop-400 border border-digitalcoop-200 dark:border-digitalcoop-700 rounded text-xs font-bold"
                >
                  {t("dashboard.setPriceDiscount")}
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
              <p className="text-xs text-gray-500 mt-3">{t("dashboard.priceNote")}</p>
            </Card>

            <Card
              title={t("dashboard.wallet")}
              right={
                <button
                  onClick={() => onNavigate("wallet")}
                  className="px-3 py-1 bg-digitalcoop-50 dark:bg-digitalcoop-900/30 text-digitalcoop-700 dark:text-digitalcoop-400 border border-digitalcoop-200 dark:border-digitalcoop-700 rounded text-xs font-bold flex items-center"
                >
                  <Wallet size={12} className="mr-1" /> {t("dashboard.myWallet")}
                </button>
              }
            >
              <p className="text-sm text-gray-600 dark:text-slate-300">
                {t("dashboard.creatorWalletNote")}
              </p>
            </Card>
          </div>
        </div>
      )}
    </StateBox>
  );
};

const AdminDashboard = () => {
  const t = useT();
  const { data, loading, error, reload } = useAsync(() => reportsApi.stats());
  return (
    <StateBox loading={loading} error={error} onRetry={reload}>
      {data && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title={t("dashboard.totalUsers")}
              value={num(data.users.total)}
              icon={<Users className="text-blue-500" />}
              change={t("dashboard.newThisMonth", { n: num(data.users.newThisMonth) })}
            />
            <StatCard
              title={t("dashboard.revenueThisMonth")}
              value={rupiah(data.sales.revenueThisMonth)}
              icon={<TrendingUp className="text-green-500" />}
              change={t("dashboard.enrollments", { n: num(data.sales.enrollmentsThisMonth) })}
            />
            <StatCard
              title={t("dashboard.pendingReviewTitle")}
              value={t("dashboard.pendingReviewVal", { n: num(data.courses.pendingReview) })}
              icon={<Clock className="text-orange-500" />}
              change={data.courses.pendingReview > 0 ? t("dashboard.needAction") : t("dashboard.noQueue")}
            />
            <StatCard
              title={t("dashboard.serverUp")}
              value={uptimeLabel(data.uptimeSeconds, t)}
              icon={<AlertCircle className="text-purple-500" />}
              change={t("dashboard.sinceRestart")}
            />
          </div>

          <ManagementReports canGenerate />

          <Card title={t("dashboard.opsQueue")}>
            <ul className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <li>{t("dashboard.qPayments")} <b>{num(data.queue.pendingPayments)}</b></li>
              <li>{t("dashboard.qDeletions")} <b>{num(data.queue.openDeletions)}</b></li>
              <li>{t("dashboard.qApplications")} <b>{num(data.queue.pendingApplications)}</b></li>
              <li>{t("dashboard.qReviews")} <b>{num(data.queue.pendingReviews)}</b></li>
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
  <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 transition-all hover:border-digitalcoop-200 dark:hover:border-slate-600">
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
