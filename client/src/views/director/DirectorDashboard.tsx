import React, { useState } from "react";
import {
  Megaphone,
  ShieldCheck,
  Users,
  TrendingUp,
  Star,
  AlertTriangle,
  Send,
  FileText,
  Inbox,
  Clock,
} from "lucide-react";
import { MOCK_COURSES } from "../../constants";
import { ManagementReport, UserRole } from "../../types";
import IdentityCard from "../../components/IdentityCard";

// Mock Reports (Usually fetched from API)
const MOCK_REPORTS: ManagementReport[] = [
  {
    id: "rep-1",
    generatedDate: "2023-10-27",
    type: "WEEKLY",
    period: "Week 4 Oct 2023",
    summary: {
      totalRevenue: 15000000,
      newStudents: 45,
      contentModerated: 12,
      activeIssues: 2,
    },
    status: "SUBMITTED",
    adminNote:
      "Revenue stabil, peningkatan signfikan di kelas Digital Marketing.",
  },
];

const DirectorDashboard: React.FC = () => {
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [reports, setReports] = useState(MOCK_REPORTS);

  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMsg) return;
    alert(`Pesan Broadcast berhasil dikirim: "${broadcastMsg}"`);
    setBroadcastMsg("");
  };

  const markReportRead = (id: string) => {
    setReports((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "READ" } : r)),
    );
  };

  return (
    <div className="space-y-8">
      {/* 0. Header with Identity Card */}
      <div className="grid grid-cols-1 md:grid-cols-5 lg:grid-cols-3 gap-6 items-center">
        {/* Welcome Text Section */}
        <div className="order-2 md:order-1 md:col-span-2 lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 h-full flex flex-col justify-center min-h-[180px]">
          <h1 className="font-sans text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Panel Eksekutif Direktur
          </h1>
          <p className="text-gray-500 dark:text-slate-400 text-lg leading-relaxed">
            Selamat datang, Bapak <strong>Ulpermadi Ibrahim</strong>. Sistem
            operasional berjalan optimal. Silakan tinjau laporan manajemen dan
            performa partner di bawah ini.
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
            role={UserRole.DIRECTOR}
            name="Ulpermadi Ibrahim"
            avatarUrl="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
            joinDate={new Date("2023-01-01")}
            isActive={true}
            hasPurchased={true}
            sequence={1}
          />
        </div>
      </div>

      {/* 1. Executive Summary */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Executive Overview
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-kodman-800 to-kodman-900 p-6 rounded-xl shadow-lg text-white">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-kodman-200 text-sm font-bold uppercase">
                  Total Revenue
                </p>
                <h3 className="text-3xl font-bold mt-1">Rp 1.2M</h3>
              </div>
              <div className="p-2 bg-white/10 rounded-lg">
                <TrendingUp size={24} />
              </div>
            </div>
            <div className="text-xs text-kodman-300 flex items-center">
              <span className="text-green-400 font-bold mr-1">+12%</span> vs
              bulan lalu
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-gray-500 dark:text-slate-400 text-sm font-bold uppercase">
                  Active Students
                </p>
                <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  5,420
                </h3>
              </div>
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600">
                <Users size={24} />
              </div>
            </div>
            <div className="text-xs text-gray-500 flex items-center">
              <span className="text-green-600 font-bold mr-1">+85</span>{" "}
              registrasi baru minggu ini
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-gray-500 dark:text-slate-400 text-sm font-bold uppercase">
                  Brand Health (NPS)
                </p>
                <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  72
                </h3>
              </div>
              <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-yellow-600">
                <Star size={24} />
              </div>
            </div>
            <div className="text-xs text-gray-500">
              Kategori:{" "}
              <span className="font-bold text-green-600">Excellent</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-gray-500 dark:text-slate-400 text-sm font-bold uppercase">
                  Partner (Mentor/Creator)
                </p>
                <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  128
                </h3>
              </div>
              <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-600">
                <ShieldCheck size={24} />
              </div>
            </div>
            <div className="text-xs text-gray-500">Active Contributors</div>
          </div>
        </div>
      </section>

      {/* NEW: Management Reports Inbox */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
            <Inbox className="mr-2 text-kodman-600" /> Laporan Manajemen Rutin
          </h2>
          <span className="px-2 py-1 bg-red-100 text-red-600 text-xs font-bold rounded-full">
            {reports.filter((r) => r.status === "SUBMITTED").length} Baru
          </span>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map((report) => (
            <div
              key={report.id}
              className={`bg-white dark:bg-slate-900 rounded-lg border p-5 transition ${report.status === "SUBMITTED" ? "border-kodman-400 shadow-md ring-1 ring-kodman-200" : "border-gray-200 opacity-80 hover:opacity-100"}`}
            >
              <div className="flex justify-between items-start mb-3">
                <span
                  className={`px-2 py-1 text-xs font-bold rounded uppercase ${report.type === "WEEKLY" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}
                >
                  {report.type} REPORT
                </span>
                <span className="text-xs text-gray-500">
                  {report.generatedDate}
                </span>
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-1">
                {report.period}
              </h3>
              <p className="text-sm text-gray-600 italic mb-4">
                &quot;{report.adminNote}&quot;
              </p>

              <div className="bg-gray-50 dark:bg-slate-800 p-3 rounded text-xs space-y-1 mb-4">
                <div className="flex justify-between">
                  <span>Revenue:</span>{" "}
                  <span className="font-bold">
                    Rp {report.summary.totalRevenue.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>New Students:</span>{" "}
                  <span className="font-bold">
                    {report.summary.newStudents}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Issues:</span>{" "}
                  <span className="font-bold text-red-500">
                    {report.summary.activeIssues}
                  </span>
                </div>
              </div>

              {report.status === "SUBMITTED" ? (
                <button
                  onClick={() => markReportRead(report.id)}
                  className="w-full py-2 bg-kodman-600 text-white rounded text-xs font-bold hover:bg-kodman-700"
                >
                  Tandai Sudah Dibaca
                </button>
              ) : (
                <button
                  disabled
                  className="w-full py-2 bg-gray-100 text-gray-400 rounded text-xs font-bold cursor-default"
                >
                  Sudah Dibaca
                </button>
              )}
            </div>
          ))}
          {reports.length === 0 && (
            <div className="col-span-full py-8 text-center text-gray-500 bg-gray-50 border border-dashed rounded-lg">
              Belum ada laporan manajemen yang masuk dari Admin.
            </div>
          )}
        </div>
      </section>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* 2. Quality Control (Mutu) */}
        <section className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
              <ShieldCheck className="mr-2 text-kodman-600" /> Penjaminan Mutu
              Akademik
            </h2>
            <button className="text-sm text-kodman-600 hover:underline">
              Lihat Laporan Lengkap
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-800">
              <h3 className="font-bold text-gray-700 dark:text-slate-300 text-sm">
                Top Rated Courses
              </h3>
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-bold">
                Safe Zone
              </span>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-slate-800">
              {MOCK_COURSES.slice(0, 3).map((course, idx) => (
                <div
                  key={course.id}
                  className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-800/50 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-kodman-100 flex items-center justify-center text-kodman-700 font-bold text-xs">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white text-sm">
                        {course.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {course.instructor} • {course.studentsEnrolled} Siswa
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-yellow-500 font-bold text-sm">
                    <Star size={14} fill="currentColor" /> 4.9
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-gray-100 dark:border-slate-800 bg-red-50 dark:bg-red-900/10">
              <div className="flex items-start gap-3">
                <AlertTriangle
                  className="text-red-500 flex-shrink-0"
                  size={20}
                />
                <div>
                  <h4 className="font-bold text-red-700 dark:text-red-400 text-sm">
                    Perhatian Diperlukan
                  </h4>
                  <p className="text-xs text-red-600 dark:text-red-300 mt-1">
                    Kursus <strong>&quot;Dasar Akuntansi Keuangan&quot;</strong>{" "}
                    mendapatkan 3 review rendah minggu ini. Perlu evaluasi
                    materi.
                  </p>
                  <button className="mt-2 text-xs font-bold text-red-700 underline">
                    Tinjau Kursus
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Communication */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
            <Megaphone className="mr-2 text-orange-500" /> Komunikasi Publik
          </h2>

          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-6">
            <h3 className="font-bold text-gray-800 dark:text-white mb-4 text-sm">
              Kirim Broadcast Message
            </h3>
            <form onSubmit={handleBroadcast}>
              <div className="mb-4">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Target Audience
                </label>
                <select className="w-full p-2 text-sm border border-gray-300 dark:border-slate-700 dark:bg-slate-800 rounded bg-gray-50 dark:text-white">
                  <option>Semua User (Public)</option>
                  <option>Hanya Mentor & Creator</option>
                  <option>Internal Staff (Admin)</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Pesan
                </label>
                <textarea
                  rows={4}
                  value={broadcastMsg}
                  onChange={(e) => setBroadcastMsg(e.target.value)}
                  className="w-full p-2 text-sm border border-gray-300 dark:border-slate-700 dark:bg-slate-800 rounded focus:ring-2 focus:ring-kodman-500 dark:text-white"
                  placeholder="Tulis pesan motivasi atau pengumuman..."
                ></textarea>
              </div>
              <button className="w-full py-2 bg-kodman-600 hover:bg-kodman-700 text-white rounded font-bold text-sm flex items-center justify-center shadow-md">
                <Send size={16} className="mr-2" /> Kirim Pesan
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-slate-800">
              <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">
                Riwayat Pengumuman
              </h4>
              <div className="space-y-3">
                <div className="flex gap-3 text-xs">
                  <div className="w-1 bg-gray-300 rounded-full"></div>
                  <div>
                    <p className="text-gray-800 dark:text-white font-medium">
                      Maintenance Server Minggu Malam
                    </p>
                    <p className="text-gray-400">Kemarin, 14:00 • All Users</p>
                  </div>
                </div>
                <div className="flex gap-3 text-xs">
                  <div className="w-1 bg-gray-300 rounded-full"></div>
                  <div>
                    <p className="text-gray-800 dark:text-white font-medium">
                      Update Kebijakan Royalti 2024
                    </p>
                    <p className="text-gray-400">20 Okt • Mentor & Creator</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* 4. Strategic Reports Link */}
      <section className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg">
            <FileText size={24} />
          </div>
          <div>
            <h3 className="font-bold text-blue-900 dark:text-blue-300">
              Laporan Akademik & Keuangan Lengkap
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-400">
              Unduh data bulanan untuk keperluan rapat strategis.
            </p>
          </div>
        </div>
        <button className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 shadow-sm">
          Buka Report Center
        </button>
      </section>
    </div>
  );
};

export default DirectorDashboard;
