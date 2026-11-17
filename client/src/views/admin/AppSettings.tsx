import React, { useState, useEffect } from "react";
import {
  Save,
  Server,
  Shield,
  Database,
  UserCheck,
  Search,
  History,
  ArrowRight,
  Cpu,
  HardDrive,
  Activity,
  Power,
  Terminal,
  Globe,
  Lock,
} from "lucide-react";
import { User, UserRole, UserStatus, ManagementHistory } from "../../types";

// Mock Data for App Settings Logic
const MOCK_AVAILABLE_STUDENTS: User[] = [
  {
    id: "s1",
    name: "Ahmad Calon",
    email: "ahmad@kodman.id",
    role: UserRole.STUDENT,
    memberSequence: 501,
    status: UserStatus.ACTIVE,
  },
  {
    id: "s2",
    name: "Dewi Admina",
    email: "dewi@kodman.id",
    role: UserRole.STUDENT,
    memberSequence: 502,
    status: UserStatus.ACTIVE,
  },
  {
    id: "s3",
    name: "Budi Manajemen",
    email: "budi.m@kodman.id",
    role: UserRole.STUDENT,
    memberSequence: 503,
    status: UserStatus.ACTIVE,
  },
];

const MOCK_HISTORY: ManagementHistory[] = [
  {
    id: "h1",
    role: "DIRECTOR",
    oldUserName: "Previous Director",
    newUserId: "dir-1",
    newUserName: "Ulpermadi Ibrahim",
    changedBy: "Super Admin",
    date: "2023-01-15",
  },
];

interface AppSettingsProps {
  isPolicyMode?: boolean;
}

const AppSettings: React.FC<AppSettingsProps> = ({ isPolicyMode = false }) => {
  // State for Organization Management
  const [isSelectingUser, setIsSelectingUser] = useState<
    "DIRECTOR" | "ADMIN" | null
  >(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [orgHistory, setOrgHistory] =
    useState<ManagementHistory[]>(MOCK_HISTORY);

  // System State
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [systemStats, setSystemStats] = useState({
    cpu: 12,
    ram: 45,
    disk: 30,
  });

  // Simulate Realtime System Stats
  useEffect(() => {
    const interval = setInterval(() => {
      setSystemStats({
        cpu: Math.floor(Math.random() * 30) + 10,
        ram: Math.floor(Math.random() * 10) + 40,
        disk: 30,
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleAppointUser = (student: User) => {
    if (!isSelectingUser) return;

    const confirmed = confirm(
      `Apakah Anda yakin ingin mengangkat ${student.name} sebagai ${isSelectingUser === "DIRECTOR" ? "DIREKTUR LEMBAGA" : "ADMIN SYSTEM"}? \n\nPeran Student akan dicabut dan ID baru dengan prefix "A" akan dibuat.`,
    );

    if (confirmed) {
      // 1. Create History Log
      const newHistory: ManagementHistory = {
        id: `h-${Date.now()}`,
        role: isSelectingUser,
        oldUserName: isSelectingUser === "DIRECTOR" ? "Ulpermadi Ibrahim" : "-", // Mock previous
        newUserId: student.id,
        newUserName: student.name,
        changedBy: "Super Admin",
        date: new Date().toLocaleDateString("id-ID"),
      };
      setOrgHistory([newHistory, ...orgHistory]);
      alert(
        `Berhasil! ${student.name} kini menjabat sebagai ${isSelectingUser}.`,
      );
      setIsSelectingUser(null);
    }
  };

  const filteredStudents = MOCK_AVAILABLE_STUDENTS.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (isPolicyMode) {
    return (
      <div className="max-w-4xl">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
          <Shield className="mr-3 text-kodman-600" /> Kebijakan Utama (Master
          Policy)
        </h2>
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 p-6 space-y-6">
          <div className="bg-yellow-50 dark:bg-yellow-900/10 border-l-4 border-yellow-400 p-4 mb-6">
            <p className="text-sm text-yellow-700 dark:text-yellow-500">
              <strong>Warning:</strong> Perubahan pada halaman ini bersifat
              legal dan akan berdampak langsung pada seluruh pengguna ekosistem
              KMP - ADNG ACADEMY.
            </p>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">
              Terms of Service (Global User Agreement)
            </label>
            <textarea
              className="w-full h-40 p-3 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-md focus:ring-kodman-500 focus:border-kodman-500 font-mono text-sm"
              defaultValue="1. DEFINISI&#10;Layanan KMP - ADNG Academy mencakup..."
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">
              Perjanjian Kerjasama Mentor (Digital Contract)
            </label>
            <textarea
              className="w-full h-32 p-3 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-md focus:ring-kodman-500 focus:border-kodman-500 font-mono text-sm"
              defaultValue="PASAL 1: BAGI HASIL&#10;Mentor berhak atas 70% dari..."
            />
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-slate-800">
            <button className="flex items-center px-6 py-2 bg-kodman-600 text-white rounded hover:bg-kodman-700 font-bold shadow-sm transition">
              <Save size={16} className="mr-2" /> Simpan & Publikasikan Revisi
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <Terminal className="mr-3 text-gray-700 dark:text-gray-300" />{" "}
            System Architecture & Config
          </h2>
          <p className="text-gray-500 text-sm font-mono">
            Backend: Node.js Express (v18.x) • Frontend: React Vite (v2.4)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`px-3 py-1 text-xs font-bold rounded-full uppercase border ${maintenanceMode ? "bg-red-100 text-red-700 border-red-200" : "bg-green-100 text-green-700 border-green-200"}`}
          >
            {maintenanceMode ? "Maintenance Mode" : "System Online"}
          </span>
          <button
            onClick={() => setMaintenanceMode(!maintenanceMode)}
            className="p-2 border rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-gray-300"
            title="Toggle Maintenance"
          >
            <Power size={18} />
          </button>
        </div>
      </div>

      {/* --- SYSTEM HEALTH DASHBOARD --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2 relative z-10">
            <span className="text-xs font-bold text-gray-500 uppercase">
              CPU Usage
            </span>
            <Cpu size={18} className="text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white relative z-10">
            {systemStats.cpu}%
          </div>
          <div
            className="absolute bottom-0 left-0 h-1 bg-blue-500 transition-all duration-1000"
            style={{ width: `${systemStats.cpu}%` }}
          ></div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2 relative z-10">
            <span className="text-xs font-bold text-gray-500 uppercase">
              RAM Usage
            </span>
            <Activity size={18} className="text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white relative z-10">
            {systemStats.ram}%
          </div>
          <div
            className="absolute bottom-0 left-0 h-1 bg-purple-500 transition-all duration-1000"
            style={{ width: `${systemStats.ram}%` }}
          ></div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2 relative z-10">
            <span className="text-xs font-bold text-gray-500 uppercase">
              Storage (CDN)
            </span>
            <HardDrive size={18} className="text-green-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white relative z-10">
            {systemStats.disk}%
          </div>
          <div
            className="absolute bottom-0 left-0 h-1 bg-green-500"
            style={{ width: `${systemStats.disk}%` }}
          ></div>
        </div>
      </div>

      {/* Database & Middleware Config */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* DB Config */}
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 p-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-slate-800">
            <Database className="text-kodman-600 dark:text-kodman-400" />
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Database Orchestra
              </h3>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                PostgreSQL (Neon.tech) via Drizzle ORM
              </p>
            </div>
          </div>

          <div className="space-y-4 font-mono text-sm">
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">
                Connection String
              </label>
              <div className="flex items-center bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded px-3 py-2 text-gray-600 dark:text-slate-400">
                <Lock size={12} className="mr-2" />
                <span className="truncate">
                  postgres://kodman_user:*****@ep-aged-wood.aws.neon.tech/kodman_db
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">
                  Active Schema
                </label>
                <input
                  type="text"
                  disabled
                  value="academy"
                  className="w-full p-2 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded text-gray-800 dark:text-white font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">
                  Pool Size
                </label>
                <input
                  type="text"
                  disabled
                  value="10 Connections"
                  className="w-full p-2 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded text-gray-600 dark:text-slate-400"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Middleware & Security */}
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 p-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-slate-800">
            <Shield className="text-kodman-600 dark:text-kodman-400" />
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Security & Middleware
              </h3>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Auth, CORS, and Headers Protection
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
              <div className="flex items-center">
                <Lock
                  size={16}
                  className="text-green-600 dark:text-green-400 mr-2"
                />
                <span className="text-sm font-bold text-green-800 dark:text-green-300">
                  JWT Authentication
                </span>
              </div>
              <span className="text-xs bg-white dark:bg-slate-900 px-2 py-1 rounded border dark:border-slate-600">
                Enabled
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
              <div className="flex items-center">
                <Globe
                  size={16}
                  className="text-blue-600 dark:text-blue-400 mr-2"
                />
                <span className="text-sm font-bold text-blue-800 dark:text-blue-300">
                  CORS Policy
                </span>
              </div>
              <span className="text-xs text-blue-700 dark:text-blue-300">
                Strict Origin
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded border border-gray-200 dark:border-slate-700">
              <div className="flex items-center">
                <Shield
                  size={16}
                  className="text-gray-600 dark:text-slate-400 mr-2"
                />
                <span className="text-sm font-bold text-gray-700 dark:text-slate-300">
                  Helmet (Headers)
                </span>
              </div>
              <span className="text-xs bg-white dark:bg-slate-900 px-2 py-1 rounded border dark:border-slate-600">
                Active
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Storage & CDN Config */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 p-6">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-slate-800">
          <Server className="text-kodman-600 dark:text-kodman-400" />
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Storage & Local CDN
            </h3>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Multer Driver + Apache .htaccess Security
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded border border-gray-200 dark:border-slate-700">
            <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
              Root Directory
            </span>
            <span className="font-mono text-sm bg-white dark:bg-slate-900 px-2 py-1 rounded border dark:border-slate-600 text-gray-600 dark:text-slate-300">
              ~/backend-academy/static
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded border border-gray-200 dark:border-slate-700">
            <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
              Public Access URL
            </span>
            <span className="font-mono text-sm bg-white dark:bg-slate-900 px-2 py-1 rounded border dark:border-slate-600 text-gray-600 dark:text-slate-300">
              https://cdn.kodman.id/files/
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded border border-gray-200 dark:border-slate-700">
            <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
              Metadata Table
            </span>
            <span className="font-mono text-sm bg-white dark:bg-slate-900 px-2 py-1 rounded border dark:border-slate-600 text-purple-600 dark:text-purple-400 font-bold">
              academy.cdn
            </span>
          </div>
        </div>
      </div>

      {/* --- MANAJEMEN STRUKTUR ORGANISASI --- */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-2">
            <UserCheck
              className="text-kodman-600 dark:text-kodman-400"
              size={24}
            />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Manajemen Pengurus (Struktur Organisasi)
            </h3>
          </div>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Tetapkan Direktur Lembaga dan Admin Sistem. Posisi ini memiliki
            akses level tinggi.
          </p>
        </div>

        <div className="p-6 grid md:grid-cols-2 gap-8">
          {/* Slot Direktur */}
          <div className="border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/10 rounded-xl p-5 relative">
            <div className="absolute -top-3 left-4 bg-yellow-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
              HIGHEST AUTHORITY
            </div>
            <h4 className="font-bold text-yellow-800 dark:text-yellow-500 mb-4">
              Direktur Lembaga
            </h4>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-yellow-200 dark:bg-yellow-800 rounded-full flex items-center justify-center text-yellow-700 dark:text-yellow-300 font-bold text-xl">
                U
              </div>
              <div>
                <p className="font-bold text-gray-900 dark:text-white">
                  Ulpermadi Ibrahim
                </p>
                <p className="text-xs text-gray-500 font-mono">
                  ID: A.24.01.000001
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsSelectingUser("DIRECTOR")}
              className="w-full py-2 bg-white dark:bg-slate-800 border border-yellow-300 dark:border-yellow-700 text-yellow-700 dark:text-yellow-500 rounded font-bold text-sm hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition shadow-sm"
            >
              Ganti Direktur
            </button>
          </div>

          {/* Slot Admin */}
          <div className="border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 rounded-xl p-5">
            <h4 className="font-bold text-gray-700 dark:text-slate-300 mb-4">
              Admin Sistem
            </h4>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gray-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-gray-600 dark:text-slate-400 font-bold text-xl">
                S
              </div>
              <div>
                <p className="font-bold text-gray-900 dark:text-white">
                  System Administrator
                </p>
                <p className="text-xs text-gray-500 font-mono">
                  ID: A.24.01.000002
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsSelectingUser("ADMIN")}
              className="w-full py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded font-bold text-sm hover:bg-gray-100 dark:hover:bg-slate-700 transition shadow-sm"
            >
              + Tambah / Ganti Admin
            </button>
          </div>
        </div>

        {/* History Log */}
        <div className="bg-gray-50 dark:bg-slate-950 p-6 border-t border-gray-200 dark:border-slate-800">
          <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center">
            <History size={14} className="mr-1" /> Riwayat Perubahan Struktur
          </h4>
          <div className="space-y-3">
            {orgHistory.map((hist) => (
              <div
                key={hist.id}
                className="text-xs flex gap-2 text-gray-600 dark:text-slate-400"
              >
                <span className="font-mono text-gray-400">[{hist.date}]</span>
                <span>
                  <strong>{hist.changedBy}</strong> mengangkat{" "}
                  <strong>{hist.newUserName}</strong> sebagai{" "}
                  <span className="font-bold text-kodman-600">{hist.role}</span>
                  .
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* --- MODAL SELECT USER --- */}
      {isSelectingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-lg shadow-xl border border-gray-200 dark:border-slate-800 overflow-hidden animate-fade-in-up">
            <div className="p-4 border-b border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 flex justify-between items-center">
              <h3 className="font-bold text-gray-900 dark:text-white">
                Pilih Kandidat{" "}
                {isSelectingUser === "DIRECTOR" ? "Direktur" : "Admin"}
              </h3>
              <button
                onClick={() => setIsSelectingUser(null)}
                className="text-gray-500 hover:text-red-500"
              >
                Tutup
              </button>
            </div>
            <div className="p-4">
              <div className="relative mb-4">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={16}
                />
                <input
                  autoFocus
                  type="text"
                  placeholder="Cari nama student..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded text-sm focus:ring-kodman-500"
                />
              </div>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {filteredStudents.length === 0 ? (
                  <p className="text-center text-sm text-gray-500 py-4">
                    Tidak ada student ditemukan.
                  </p>
                ) : (
                  filteredStudents.map((student) => (
                    <div
                      key={student.id}
                      className="flex justify-between items-center p-3 border border-gray-100 dark:border-slate-800 rounded hover:bg-gray-50 dark:hover:bg-slate-800/50 transition"
                    >
                      <div>
                        <p className="font-bold text-sm text-gray-900 dark:text-white">
                          {student.name}
                        </p>
                        <p className="text-xs text-gray-500">{student.email}</p>
                      </div>
                      <button
                        onClick={() => handleAppointUser(student)}
                        className="px-3 py-1.5 bg-kodman-600 text-white text-xs font-bold rounded hover:bg-kodman-700 flex items-center"
                      >
                        Pilih <ArrowRight size={12} className="ml-1" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppSettings;
