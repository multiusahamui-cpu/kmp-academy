import React, { useState } from "react";
import { UserRole } from "../types";
import {
  X,
  Mail,
  Lock,
  User,
  GraduationCap,
  ArrowRight,
  Eye,
  EyeOff,
  Shield,
  Loader2,
} from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (role: UserRole) => void;
}

const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<"LOGIN" | "REGISTER">("LOGIN");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<UserRole>(UserRole.STUDENT);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true); // Start loading

    // Simulate Network Request Delay (1.5 seconds)
    setTimeout(() => {
      let targetRole = UserRole.STUDENT;

      if (activeTab === "LOGIN") {
        // Mock Login Logic based on Email domain/keyword for demo purposes
        if (email.includes("admin")) targetRole = UserRole.ADMIN_SYSTEM;
        else if (email.includes("director")) targetRole = UserRole.DIRECTOR;
        else if (email.includes("mentor")) targetRole = UserRole.MENTOR;
        else if (email.includes("creator")) targetRole = UserRole.CREATOR;
        else if (email.includes("super")) targetRole = UserRole.SUPERADMIN;
        else targetRole = UserRole.STUDENT; // Default
      } else {
        // Register Logic
        targetRole = role;
      }

      setIsLoading(false); // Stop loading
      onAuthSuccess(targetRole);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-slate-800 animate-fade-in-up">
        {/* Header */}
        <div className="relative h-32 bg-kodman-900 flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60')] bg-cover opacity-20 mix-blend-overlay"></div>
          <div className="relative z-10 text-center">
            <GraduationCap size={40} className="text-white mx-auto mb-2" />
            <h2 className="text-xl font-bold text-white tracking-wide">
              KMP - ADNG ACADEMY
            </h2>
          </div>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-slate-800">
          <button
            className={`flex-1 py-4 text-sm font-bold transition ${activeTab === "LOGIN" ? "text-kodman-600 border-b-2 border-kodman-600 bg-gray-50 dark:bg-slate-800" : "text-gray-500 hover:text-gray-800 dark:text-slate-400"}`}
            onClick={() => setActiveTab("LOGIN")}
          >
            Masuk (Login)
          </button>
          <button
            className={`flex-1 py-4 text-sm font-bold transition ${activeTab === "REGISTER" ? "text-kodman-600 border-b-2 border-kodman-600 bg-gray-50 dark:bg-slate-800" : "text-gray-500 hover:text-gray-800 dark:text-slate-400"}`}
            onClick={() => setActiveTab("REGISTER")}
          >
            Daftar Baru
          </button>
        </div>

        {/* Form */}
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {activeTab === "REGISTER" && (
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">
                  Nama Lengkap
                </label>
                <div className="relative">
                  <User
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    size={18}
                  />
                  <input
                    type="text"
                    required
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg focus:ring-2 focus:ring-kodman-500 outline-none"
                    placeholder="Nama Anda"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  type="email"
                  required
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg focus:ring-2 focus:ring-kodman-500 outline-none"
                  placeholder="email@contoh.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">
                Password
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg focus:ring-2 focus:ring-kodman-500 outline-none"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {activeTab === "REGISTER" && (
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">
                  Saya ingin mendaftar sebagai
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole(UserRole.STUDENT)}
                    className={`p-3 border rounded-lg text-sm font-bold flex flex-col items-center justify-center transition ${role === UserRole.STUDENT ? "bg-kodman-50 border-kodman-500 text-kodman-700" : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"}`}
                  >
                    <GraduationCap size={20} className="mb-1" />
                    Student
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole(UserRole.MENTOR)}
                    className={`p-3 border rounded-lg text-sm font-bold flex flex-col items-center justify-center transition ${role === UserRole.MENTOR ? "bg-purple-50 border-purple-500 text-purple-700" : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"}`}
                  >
                    <Shield size={20} className="mb-1" />
                    Mentor
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 text-white rounded-lg font-bold shadow-lg flex items-center justify-center transition transform active:scale-95 ${isLoading ? "bg-kodman-400 cursor-not-allowed" : "bg-kodman-600 hover:bg-kodman-700"}`}
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="mr-2 animate-spin" />{" "}
                  Memproses...
                </>
              ) : (
                <>
                  {activeTab === "LOGIN" ? "Masuk Sekarang" : "Buat Akun Baru"}{" "}
                  <ArrowRight size={18} className="ml-2" />
                </>
              )}
            </button>
          </form>

          {activeTab === "LOGIN" && (
            <div className="mt-6 text-center text-xs text-gray-500 dark:text-slate-400">
              <p className="mb-2">Demo Tip: Gunakan email dengan kata kunci:</p>
              <div className="flex flex-wrap justify-center gap-2">
                <span className="bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded border dark:border-slate-700">
                  admin@...
                </span>
                <span className="bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded border dark:border-slate-700">
                  director@...
                </span>
                <span className="bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded border dark:border-slate-700">
                  mentor@...
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
