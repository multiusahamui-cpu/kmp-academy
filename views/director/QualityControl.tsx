import React from "react";
import {
  AlertTriangle,
  ThumbsDown,
  RefreshCcw,
  Search,
  Eye,
  MessageSquare,
  CheckCircle,
  XCircle,
} from "lucide-react";

const MOCK_LOW_RATED_COURSES = [
  {
    id: "c1",
    title: "Dasar Akuntansi Keuangan",
    instructor: "Ahmad Dahlan",
    rating: 3.2,
    reviews: 15,
    refundRate: "5.2%",
    issue:
      "Materi dinilai terlalu teoritis dan kualitas audio pada Modul 3 sangat rendah.",
  },
  {
    id: "c2",
    title: "Manajemen Koperasi Modern",
    instructor: "Dr. Rahmat",
    rating: 3.5,
    reviews: 42,
    refundRate: "2.1%",
    issue:
      "Studi kasus dianggap kadaluarsa (Tahun 2010) dan tidak relevan dengan era digital.",
  },
];

const MOCK_COMPLAINTS = [
  { id: "t1", category: "Video Playback", count: 45, trend: "UP" },
  { id: "t2", category: "Materi Outdated", count: 32, trend: "DOWN" },
  { id: "t3", category: "Sertifikat Error", count: 12, trend: "STABLE" },
];

const QualityControl: React.FC = () => {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <CheckCircle className="mr-3 text-kodman-600" /> Penjaminan Mutu
            (Quality Control)
          </h2>
          <p className="text-gray-500 dark:text-slate-400">
            Monitoring standar akademik dan kepuasan pengguna.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-red-50 dark:bg-red-900/10 p-6 rounded-xl border border-red-100 dark:border-red-900/30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-red-800 dark:text-red-400">
              Avg. Refund Rate
            </h3>
            <RefreshCcw className="text-red-500" size={24} />
          </div>
          <p className="text-3xl font-bold text-red-900 dark:text-white">
            2.4%
          </p>
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
            Warning Threshold: &gt; 5.0%
          </p>
        </div>
        <div className="bg-orange-50 dark:bg-orange-900/10 p-6 rounded-xl border border-orange-100 dark:border-orange-900/30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-orange-800 dark:text-orange-400">
              Low Rating Courses
            </h3>
            <ThumbsDown className="text-orange-500" size={24} />
          </div>
          <p className="text-3xl font-bold text-orange-900 dark:text-white">
            {MOCK_LOW_RATED_COURSES.length}
          </p>
          <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
            Rating dibawah 4.0
          </p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-xl border border-blue-100 dark:border-blue-900/30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-blue-800 dark:text-blue-400">
              Helpdesk Resolution
            </h3>
            <MessageSquare className="text-blue-500" size={24} />
          </div>
          <p className="text-3xl font-bold text-blue-900 dark:text-white">
            4.2 Jam
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            Rata-rata waktu penyelesaian
          </p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left: Course Alerts */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-950">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center">
                <AlertTriangle className="mr-2 text-red-500" size={18} /> Kursus
                Perlu Perhatian (Red Flag)
              </h3>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-slate-800">
              {MOCK_LOW_RATED_COURSES.map((course) => (
                <div
                  key={course.id}
                  className="p-6 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-bold text-lg text-gray-900 dark:text-white">
                        {course.title}
                      </h4>
                      <p className="text-sm text-gray-500">
                        Instructor:{" "}
                        <span className="font-medium text-kodman-600">
                          {course.instructor}
                        </span>
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-2 py-1 bg-red-100 text-red-700 rounded font-bold text-xs mb-1">
                        Rating: {course.rating} / 5.0
                      </span>
                      <p className="text-xs text-red-500 font-bold">
                        Refund: {course.refundRate}
                      </p>
                    </div>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/10 p-3 rounded text-sm text-red-800 dark:text-red-300 border border-red-100 dark:border-red-900/30 mb-4">
                    <strong>Top Issue:</strong> &quot;{course.issue}&quot;
                  </div>
                  <div className="flex gap-3">
                    <button className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded text-sm font-medium hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300 flex items-center">
                      <Eye size={16} className="mr-2" /> Audit Materi
                    </button>
                    <button className="px-4 py-2 bg-red-600 text-white rounded text-sm font-bold hover:bg-red-700 flex items-center">
                      <XCircle size={16} className="mr-2" /> Takedown Sementara
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Complaint Trends */}
        <div>
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 p-6">
            <h3 className="font-bold text-gray-900 dark:text-white mb-6">
              Tren Keluhan Pengguna
            </h3>
            <div className="space-y-6">
              {MOCK_COMPLAINTS.map((item) => (
                <div key={item.id}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
                      {item.category}
                    </span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded ${
                        item.trend === "UP"
                          ? "bg-red-100 text-red-600"
                          : item.trend === "DOWN"
                            ? "bg-green-100 text-green-600"
                            : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {item.trend === "UP"
                        ? "↑ NAIK"
                        : item.trend === "DOWN"
                          ? "↓ TURUN"
                          : "STABIL"}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${item.trend === "UP" ? "bg-red-500" : "bg-blue-500"}`}
                      style={{ width: `${item.count}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 text-right">
                    {item.count} Tiket Bulan Ini
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100 dark:border-slate-800">
              <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">
                Rekomendasi Sistem
              </h4>
              <ul className="text-sm text-gray-600 dark:text-slate-400 space-y-2 list-disc pl-4">
                <li>Upgrade server CDN untuk mengatasi isu buffering.</li>
                <li>
                  Wajibkan update materi bagi kursus berumur &gt; 2 tahun.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QualityControl;
