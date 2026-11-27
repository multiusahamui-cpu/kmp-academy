import React, { useState } from "react";
import { UserRole, toUserRole } from "../types";
import { authApi } from "../services/api";
import { useT } from "../i18n";
import ForgotPasswordForm from "./ForgotPasswordForm";
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
  const t = useT();
  const config = usePublicConfig();
  const [activeTab, setActiveTab] = useState<"LOGIN" | "REGISTER">("LOGIN");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [forgot, setForgot] = useState(false);
  const [doneMsg, setDoneMsg] = useState("");

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
          ? await authApi.login({ identifier: email, password })
          : await authApi.register({ name, email, password, phone: phone || undefined });

      const userRole = toUserRole(res.data?.data?.user?.role);
      if (!userRole) {
        throw new Error(t("auth.invalidResp"));
      }
      setPassword("");
      onAuthSuccess(userRole);
      onClose();
    } catch (err) {
      const serverMsg = (err as { response?: { data?: { message?: string } } })
        .response?.data?.message;
      setErrorMsg(
        serverMsg || t("auth.connErr"),
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-slate-800 animate-fade-in-up">
        {/* Header */}
        <div className="relative h-32 bg-digitalcoop-900 flex items-center justify-center overflow-hidden">
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
            className={`flex-1 py-4 text-sm font-bold transition ${mode === "LOGIN" ? "text-digitalcoop-600 border-b-2 border-digitalcoop-600 bg-gray-50 dark:bg-slate-800" : "text-gray-500 hover:text-gray-800 dark:text-slate-400"}`}
            onClick={() => {
              setActiveTab("LOGIN");
              setForgot(false);
              setErrorMsg("");
            }}
          >
            {t("auth.tabLogin")}
          </button>
          {canRegister && (
            <button
              className={`flex-1 py-4 text-sm font-bold transition ${mode === "REGISTER" ? "text-digitalcoop-600 border-b-2 border-digitalcoop-600 bg-gray-50 dark:bg-slate-800" : "text-gray-500 hover:text-gray-800 dark:text-slate-400"}`}
              onClick={() => {
                setActiveTab("REGISTER");
                setForgot(false);
                setErrorMsg("");
              }}
            >
              {t("auth.tabRegister")}
            </button>
          )}
        </div>

        {/* Form */}
        {forgot && mode === "LOGIN" ? (
          <ForgotPasswordForm
            onBack={() => setForgot(false)}
            onDone={(m) => {
              setForgot(false);
              setDoneMsg(m);
            }}
          />
        ) : (
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === "REGISTER" && (
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">
                  {t("auth.fullName")}
                </label>
                <div className="relative">
                  <User
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    size={18}
                  />
                  <input
                    type="text"
                    required
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg focus:ring-2 focus:ring-digitalcoop-500 outline-none"
                    placeholder={t("auth.namePlaceholder")}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">
                {mode === "LOGIN" ? t("auth.emailOrPhone") : t("auth.emailAddress")}
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  type={mode === "LOGIN" ? "text" : "email"}
                  required
                  autoComplete={mode === "LOGIN" ? "username" : "email"}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg focus:ring-2 focus:ring-digitalcoop-500 outline-none"
                  placeholder={mode === "LOGIN" ? t("auth.emailPlaceholderLogin") : t("auth.emailPlaceholderReg")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {mode === "REGISTER" && (
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">
                  {t("auth.phoneLabel")}
                </label>
                <input
                  type="tel"
                  autoComplete="tel"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg focus:ring-2 focus:ring-digitalcoop-500 outline-none"
                  placeholder={t("auth.phonePlaceholder")}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">
                {t("auth.password")}
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
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg focus:ring-2 focus:ring-digitalcoop-500 outline-none"
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

            {mode === "LOGIN" && (
              <div className="text-right -mt-3">
                <button type="button" onClick={() => { setForgot(true); setDoneMsg(""); setErrorMsg(""); }} className="text-xs font-bold text-digitalcoop-600 hover:underline">
                  {t("auth.forgotPassword")}
                </button>
              </div>
            )}

            {doneMsg && !errorMsg && (
              <div role="status" className="text-sm text-green-800 bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300 rounded-lg px-3 py-2">
                {doneMsg}
              </div>
            )}

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
              className={`w-full py-3 text-white rounded-lg font-bold shadow-lg flex items-center justify-center transition transform active:scale-95 ${isLoading ? "bg-digitalcoop-400 cursor-not-allowed" : "bg-digitalcoop-600 hover:bg-digitalcoop-700"}`}
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="mr-2 animate-spin" />{" "}
                  {t("auth.processing")}
                </>
              ) : (
                <>
                  {mode === "LOGIN" ? t("auth.loginNow") : t("auth.createAccount")}{" "}
                  <ArrowRight size={18} className="ml-2" />
                </>
              )}
            </button>
          </form>

          {mode === "LOGIN" && (
            <a
              href="https://digitalcoop.id/member/academy?masuk=1"
              className="mt-4 block w-full rounded-lg border border-digitalcoop-600 py-3 text-center text-sm font-bold text-digitalcoop-600 hover:bg-digitalcoop-50 dark:hover:bg-slate-800"
              data-testid="btn-masuk-digitalcoop"
            >
              {t("auth.ssoLogin")}
            </a>
          )}

          <p className="mt-6 text-center text-xs text-gray-500 dark:text-slate-400">
            {t("auth.needHelp")} {config.supportEmail} · WA {config.supportWhatsapp}
          </p>

        </div>
        )}
      </div>
    </div>
  );
};

export default AuthModal;
