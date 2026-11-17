import React, { useState } from "react";
import { UserRole, toUserRole } from "../types";
import { authApi } from "../services/api";
import { usePublicConfig } from "../services/publicConfig";
import {
  X,
  Mail,
  Lock,
  User,
  GraduationCap,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (role: UserRole) => void;
  /** Pesan informasi di atas form (mis. setelah auto-logout). */
  notice?: string;
}

const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  notice,
}) => {
  const config = usePublicConfig();
  const [activeTab, setActiveTab] = useState<"LOGIN" | "REGISTER">("LOGIN");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  // Pendaftaran ditutup lewat Konfigurasi Sistem: hanya form login yang tersedia.
  const canRegister = config.registrationOpen;
  const mode: "LOGIN" | "REGISTER" = canRegister ? activeTab : "LOGIN";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setIsLoading(true);

    try {
      const res =
        mode === "LOGIN"
          ? await authApi.login({ email, password })
          : await authApi.register({ name, email, password });

      const token = res.data?.data?.token;
      const userRole = toUserRole(res.data?.data?.user?.role);
      if (typeof token !== "string" || !token || !userRole) {
        throw new Error("Respons server tidak valid.");
      }

      try {
        localStorage.setItem("kodman_token", token);
      } catch {
        // Penyimpanan browser tidak tersedia: sesi hanya berlaku sampai halaman dimuat ulang.
      }
      setPassword("");
      onAuthSuccess(userRole);
      onClose();
    } catch (err) {
      const serverMsg = (err as { response?: { data?: { message?: string } } })
        .response?.data?.message;
      setErrorMsg(
        serverMsg || "Tidak dapat terhubung ke server. Coba lagi beberapa saat.",
      );
    } finally {
      setIsLoading(false);
    }
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
            className={`flex-1 py-4 text-sm font-bold transition ${mode === "LOGIN" ? "text-kodman-600 border-b-2 border-kodman-600 bg-gray-50 dark:bg-slate-800" : "text-gray-500 hover:text-gray-800 dark:text-slate-400"}`}
            onClick={() => {
              setActiveTab("LOGIN");
              setErrorMsg("");
            }}
          >
            Masuk (Login)
          </button>
          {canRegister && (
            <button
              className={`flex-1 py-4 text-sm font-bold transition ${mode === "REGISTER" ? "text-kodman-600 border-b-2 border-kodman-600 bg-gray-50 dark:bg-slate-800" : "text-gray-500 hover:text-gray-800 dark:text-slate-400"}`}
              onClick={() => {
                setActiveTab("REGISTER");
                setErrorMsg("");
              }}
            >
              Daftar Baru
            </button>
          )}
        </div>

        {/* Form */}
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === "REGISTER" && (
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
                  autoComplete="email"
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
                  minLength={mode === "REGISTER" ? config.passwordMinLength : undefined}
                  autoComplete={
                    mode === "LOGIN" ? "current-password" : "new-password"
                  }
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

            {notice && !errorMsg && (
              <div
                role="status"
                className="text-sm text-amber-800 bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300 rounded-lg px-3 py-2"
              >
                {notice}
              </div>
            )}

            {errorMsg && (
              <div
                role="alert"
                className="text-sm text-red-700 bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300 rounded-lg px-3 py-2"
              >
                {errorMsg}
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
                  {mode === "LOGIN" ? "Masuk Sekarang" : "Buat Akun Baru"}{" "}
                  <ArrowRight size={18} className="ml-2" />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-gray-500 dark:text-slate-400">
            Butuh bantuan? {config.supportEmail} · WA {config.supportWhatsapp}
          </p>

        </div>
      </div>
    </div>
  );
};

export default AuthModal;
