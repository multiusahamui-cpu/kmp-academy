import React, { useEffect, useState } from "react";
import { UserRole, Certificate } from "../../types";
import { CertificateDto, learningApi, mapCertificate } from "../../services/learning";
import {
  Shield,
  Briefcase,
  Award,
  CheckCircle,
  Clock,
  FileCheck,
  Linkedin,
  Lock,
} from "lucide-react";
import { apiMessage } from "../../services/classes";
import { roleApplicationsApi, type MyApplication } from "../../services/roleApplications";
import type { ApplyRole } from "@shared/roleApplication";
import TalentProfileEditor from "../../components/TalentProfileEditor";
import KycPanel from "../../components/KycPanel";
import { kycApi, type MyKyc } from "../../services/kyc";
import CertificateTemplate from "../../components/CertificateTemplate";
import ChangePasswordForm from "../../components/ChangePasswordForm";
import DeleteAccountPanel from "../../components/DeleteAccountPanel";
import EmailChangeForm from "../../components/EmailChangeForm";
import NotificationSettings from "../../components/NotificationSettings";
import ProfileForm from "../../components/ProfileForm";

interface ProfileSettingsProps {
  currentRole: UserRole;
  initialTab?: "notifications";
}

const ProfileSettings: React.FC<ProfileSettingsProps> = ({ currentRole, initialTab }) => {
  const [activeTab, setActiveTab] = useState<
    "profile" | "security" | "notifications" | "kyc" | "career" | "roles" | "certificates"
  >(initialTab ?? "profile");
  const [viewCert, setViewCert] = useState<Certificate | null>(null);
  const [kycData, setKycData] = useState<MyKyc | null>(null);
  const loadKyc = async () => { try { setKycData(await kycApi.me()); } catch { setKycData(null); } };
  useEffect(() => { void loadKyc(); }, []);
  // KYC dianggap beres bila terverifikasi di Academy, atau anggota digitalcoop.id dengan KYC lengkap.

  // Sertifikat dari server (dimuat saat tab dibuka)
  const [myCertificates, setMyCertificates] = useState<Certificate[]>([]);
  const [certsLoading, setCertsLoading] = useState(false);
  useEffect(() => {
    if (activeTab !== "certificates") return;
    let cancelled = false;
    setCertsLoading(true);
    learningApi
      .certificates()
      .then((res) => { if (!cancelled) setMyCertificates((res.data.data as CertificateDto[]).map(mapCertificate)); })
      .catch(() => { if (!cancelled) setMyCertificates([]); })
      .finally(() => { if (!cancelled) setCertsLoading(false); });
    return () => { cancelled = true; };
  }, [activeTab]);

  // Pengajuan naik peran (nyata, lewat backend)
  const [application, setApplication] = useState<{ last: MyApplication | null; kycOk: boolean } | null>(null);
  const [applyRole, setApplyRole] = useState<ApplyRole | null>(null);
  const [applyForm, setApplyForm] = useState({ profile: "", experience: "" });
  const [applyMsg, setApplyMsg] = useState("");
  const [applyBusy, setApplyBusy] = useState(false);
  const loadApplication = async () => { try { setApplication(await roleApplicationsApi.mine()); } catch { setApplication(null); } };
  useEffect(() => { if (activeTab === "roles") void loadApplication(); }, [activeTab]);
  const requestStatus: "NONE" | "PENDING" = application?.last?.status === "PENDING" ? "PENDING" : "NONE";

  const handleApplyRole = (role: ApplyRole) => {
    if (!application?.kycOk) {
      setApplyMsg("Selesaikan verifikasi identitas (KYC) terlebih dahulu sebelum mengajukan.");
      setActiveTab("kyc");
      return;
    }
    setApplyMsg("");
    setApplyRole(role);
  };
  const submitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyRole) return;
    setApplyBusy(true);
    setApplyMsg("");
    try {
      await roleApplicationsApi.apply({ requestedRole: applyRole, ...applyForm });
      setApplyRole(null);
      setApplyForm({ profile: "", experience: "" });
      await loadApplication();
    } catch (err) {
      setApplyMsg(apiMessage(err, "Gagal mengirim pengajuan."));
    } finally {
      setApplyBusy(false);
    }
  };

  // Logic: Student Optional, others Mandatory
  const isStudent = currentRole === UserRole.STUDENT;

  return (
    <div className="max-w-4xl mx-auto">
      {viewCert && (
        <CertificateTemplate
          data={viewCert}
          onClose={() => setViewCert(null)}
        />
      )}

      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Pengaturan Profil
      </h2>

      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden">
        <div className="flex border-b border-gray-200 dark:border-slate-800 overflow-x-auto">
          <button
            className={`px-6 py-3 text-sm font-medium whitespace-nowrap ${activeTab === "profile" ? "border-b-2 border-digitalcoop-600 text-digitalcoop-600 dark:text-digitalcoop-400" : "text-gray-500 hover:text-gray-700 dark:text-slate-400"}`}
            onClick={() => setActiveTab("profile")}
          >
            Informasi Akun
          </button>
          <button
            className={`px-6 py-3 text-sm font-medium whitespace-nowrap flex items-center gap-2 ${activeTab === "security" ? "border-b-2 border-digitalcoop-600 text-digitalcoop-600 dark:text-digitalcoop-400" : "text-gray-500 hover:text-gray-700 dark:text-slate-400"}`}
            onClick={() => setActiveTab("security")}
          >
            <Lock size={16} /> Keamanan
          </button>
          <button
            className={`px-6 py-3 text-sm font-medium whitespace-nowrap ${activeTab === "notifications" ? "border-b-2 border-digitalcoop-600 text-digitalcoop-600 dark:text-digitalcoop-400" : "text-gray-500 hover:text-gray-700 dark:text-slate-400"}`}
            onClick={() => setActiveTab("notifications")}
          >
            Notifikasi
          </button>
          <button
            className={`px-6 py-3 text-sm font-medium whitespace-nowrap flex items-center gap-2 ${activeTab === "kyc" ? "border-b-2 border-digitalcoop-600 text-digitalcoop-600 dark:text-digitalcoop-400" : "text-gray-500 hover:text-gray-700 dark:text-slate-400"}`}
            onClick={() => setActiveTab("kyc")}
          >
            <Shield size={16} /> Verifikasi (KYC)
          </button>
          {/* New Tab for Career */}
          <button
            className={`px-6 py-3 text-sm font-medium whitespace-nowrap flex items-center gap-2 ${activeTab === "career" ? "border-b-2 border-blue-600 text-blue-600 dark:text-blue-400" : "text-gray-500 hover:text-gray-700 dark:text-slate-400"}`}
            onClick={() => setActiveTab("career")}
          >
            <Linkedin size={16} /> Karir & Industry Hub
          </button>
          <button
            className={`px-6 py-3 text-sm font-medium whitespace-nowrap ${activeTab === "roles" ? "border-b-2 border-digitalcoop-600 text-digitalcoop-600 dark:text-digitalcoop-400" : "text-gray-500 hover:text-gray-700 dark:text-slate-400"}`}
            onClick={() => setActiveTab("roles")}
          >
            Upgrade Role
          </button>
          <button
            className={`px-6 py-3 text-sm font-medium whitespace-nowrap ${activeTab === "certificates" ? "border-b-2 border-digitalcoop-600 text-digitalcoop-600 dark:text-digitalcoop-400" : "text-gray-500 hover:text-gray-700 dark:text-slate-400"}`}
            onClick={() => setActiveTab("certificates")}
          >
            Sertifikat
          </button>
        </div>

        <div className="p-6">
          {activeTab === "security" && (
            <div className="space-y-10">
              <ChangePasswordForm />
              <EmailChangeForm />
              <DeleteAccountPanel />
            </div>
          )}
          {activeTab === "profile" && <ProfileForm />}
          {activeTab === "notifications" && <NotificationSettings role={currentRole} />}

          {activeTab === "kyc" && (
            <div>
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  Verifikasi Identitas (KYC)
                </h3>
                {isStudent ? (
                  <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 p-4 rounded-lg flex items-start gap-3 text-sm">
                    <Linkedin
                      className="text-blue-600 flex-shrink-0 mt-1"
                      size={20}
                    />
                    <div>
                      <p className="font-bold text-gray-800 dark:text-white">
                        Mengapa KYC Disarankan untuk Student?
                      </p>
                      <p className="text-gray-600 dark:text-slate-300 mt-1">
                        Verifikasi KTP membuka akses fitur{" "}
                        <strong>LinkedIn KMP - ADNG Industry Hub</strong>.
                        Middleware kami akan mempromosikan portofolio Anda
                        secara otomatis ke Mitra Industri Koperasi & UMKM yang
                        mencari talenta digital.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 p-4 rounded-lg flex items-start gap-3 text-sm">
                    <Shield
                      className="text-red-600 flex-shrink-0 mt-1"
                      size={20}
                    />
                    <div>
                      <p className="font-bold text-gray-800 dark:text-white">
                        Status: WAJIB (Mandatory)
                      </p>
                      <p className="text-gray-600 dark:text-slate-300 mt-1">
                        Sebagai <strong>{currentRole}</strong>, Anda wajib
                        melakukan verifikasi untuk legalitas kontrak kerjasama
                        dan pencairan dana (royalti/fee).
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {kycData ? <KycPanel kyc={kycData} onChanged={() => void loadKyc()} /> : <p className="text-sm text-gray-500">Memuat status KYC...</p>}
            </div>
          )}

          {activeTab === "career" && <TalentProfileEditor />}

          {activeTab === "roles" && (
            <div>
              <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg flex items-start gap-3">
                <Shield
                  className="text-digitalcoop-600 dark:text-digitalcoop-400 mt-1"
                  size={20}
                />
                <div>
                  <h3 className="font-bold text-digitalcoop-800 dark:text-digitalcoop-300">
                    Status Role Saat Ini: {currentRole}
                  </h3>
                  <p className="text-sm text-digitalcoop-700 dark:text-digitalcoop-400">
                    {currentRole === "STUDENT" &&
                      "Anda saat ini terdaftar sebagai Peserta. Anda bisa meningkatkan karir dengan menjadi Mentor atau Creator."}
                    {currentRole === "MENTOR" &&
                      "Anda adalah Mentor terverifikasi. Anda dapat membuka kelas Workshop."}
                    {currentRole === "CREATOR" &&
                      "Anda adalah Content Creator. Anda dapat membuat materi pembelajaran digital."}
                  </p>
                </div>
              </div>

              {applyMsg && <p role="alert" className="mb-4 text-sm text-red-600">{applyMsg}</p>}
              {application?.last?.status === "REJECTED" && requestStatus === "NONE" && (
                <p className="mb-4 text-sm text-red-700 dark:text-red-300">Pengajuan terakhir ditolak. {application.last.decisionNote ?? ""} Anda boleh mengajukan lagi.</p>
              )}
              {applyRole && (
                <form onSubmit={submitApplication} className="mb-6 border border-gray-200 dark:border-slate-800 rounded-lg p-5 space-y-4 bg-white dark:bg-slate-900">
                  <h4 className="font-bold dark:text-white">Pengajuan menjadi {applyRole === "MENTOR" ? "Mentor" : "Creator"}</h4>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Profil singkat (30-1000 karakter)</label>
                    <textarea required minLength={30} maxLength={1000} rows={3} value={applyForm.profile} onChange={(e) => setApplyForm({ ...applyForm, profile: e.target.value })} className="w-full p-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Pengalaman dan keahlian (30-2000 karakter)</label>
                    <textarea required minLength={30} maxLength={2000} rows={5} value={applyForm.experience} onChange={(e) => setApplyForm({ ...applyForm, experience: e.target.value })} className="w-full p-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded" />
                  </div>
                  <div className="flex gap-3">
                    <button type="submit" disabled={applyBusy} className="px-5 py-2 bg-digitalcoop-600 text-white rounded font-bold disabled:opacity-50">Kirim pengajuan</button>
                    <button type="button" onClick={() => setApplyRole(null)} className="px-5 py-2 border rounded dark:border-slate-700 dark:text-slate-200">Batal</button>
                  </div>
                </form>
              )}

              {requestStatus === "PENDING" ? (
                <div className="p-8 border border-dashed border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg text-center">
                  <Clock size={48} className="mx-auto text-yellow-500 mb-4" />
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                    Pengajuan Sedang Diproses
                  </h3>
                  <p className="text-gray-600 dark:text-slate-400">
                    Admin kami sedang meninjau permohonan Anda. Mohon tunggu 1-2
                    hari kerja.
                  </p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Mentor Card */}
                  <div className="border border-gray-200 dark:border-slate-800 rounded-lg p-6 hover:shadow-md transition bg-white dark:bg-slate-900">
                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center text-purple-600 dark:text-purple-400 mb-4">
                      <Briefcase size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                      Daftar Jadi Mentor
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mb-4 h-20">
                      Bagikan keahlian Anda secara langsung. Buka kelas Workshop
                      atau Bootcamp menggunakan materi yang sudah tersedia di
                      KMP - ADNG Academy.
                    </p>
                    <ul className="text-sm text-gray-600 dark:text-slate-400 space-y-2 mb-6">
                      <li className="flex items-center">
                        <CheckCircle
                          size={14}
                          className="text-green-500 mr-2"
                        />{" "}
                        Monetisasi skill mengajar
                      </li>
                      <li className="flex items-center">
                        <CheckCircle
                          size={14}
                          className="text-green-500 mr-2"
                        />{" "}
                        Tidak perlu buat materi video
                      </li>
                      <li className="flex items-center">
                        <CheckCircle
                          size={14}
                          className="text-green-500 mr-2"
                        />{" "}
                        Sertifikat Mentor Resmi
                      </li>
                    </ul>
                    <button
                      onClick={() => handleApplyRole("MENTOR")}
                      disabled={currentRole !== "STUDENT"}
                      className={`w-full py-2 border rounded font-bold transition ${currentRole !== "STUDENT" ? "bg-gray-100 dark:bg-slate-800 text-gray-400 cursor-not-allowed" : "border-purple-600 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20"}`}
                    >
                      {currentRole === "MENTOR" ? "Aktif" : currentRole === "STUDENT" ? "Ajukan Diri" : "Tidak tersedia"}
                    </button>
                  </div>

                  {/* Creator Card */}
                  <div className="border border-gray-200 dark:border-slate-800 rounded-lg p-6 hover:shadow-md transition bg-white dark:bg-slate-900">
                    <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center text-orange-600 dark:text-orange-400 mb-4">
                      <Award size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                      Daftar Jadi Creator
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mb-4 h-20">
                      Suka membuat konten digital? Buat modul pembelajaran
                      (Video/PDF) dan dapatkan royalti pasif dari setiap kelas
                      yang menggunakan materi Anda.
                    </p>
                    <ul className="text-sm text-gray-600 dark:text-slate-400 space-y-2 mb-6">
                      <li className="flex items-center">
                        <CheckCircle
                          size={14}
                          className="text-green-500 mr-2"
                        />{" "}
                        Passive Income (Royalti)
                      </li>
                      <li className="flex items-center">
                        <CheckCircle
                          size={14}
                          className="text-green-500 mr-2"
                        />{" "}
                        Fleksibilitas waktu kerja
                      </li>
                      <li className="flex items-center">
                        <CheckCircle
                          size={14}
                          className="text-green-500 mr-2"
                        />{" "}
                        Personal Branding
                      </li>
                    </ul>
                    <button
                      onClick={() => handleApplyRole("CREATOR")}
                      disabled={currentRole !== "STUDENT"}
                      className={`w-full py-2 border rounded font-bold transition ${currentRole !== "STUDENT" ? "bg-gray-100 dark:bg-slate-800 text-gray-400 cursor-not-allowed" : "border-orange-600 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20"}`}
                    >
                      {currentRole === "CREATOR" ? "Aktif" : currentRole === "STUDENT" ? "Ajukan Diri" : "Tidak tersedia"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "certificates" && (
            <div className="space-y-6">
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg flex items-center gap-3">
                <Award
                  className="text-green-600 dark:text-green-400"
                  size={24}
                />
                <div>
                  <h3 className="font-bold text-green-900 dark:text-green-300">
                    Sertifikat Kompetensi Digital
                  </h3>
                  <p className="text-sm text-green-700 dark:text-green-400">
                    Sertifikat ini diterbitkan resmi oleh KMP - ADNG Academy dan
                    dapat digunakan sebagai lampiran CV atau Portofolio.
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {myCertificates.map((cert) => (
                  <div
                    key={cert.id}
                    className="border border-gray-200 dark:border-slate-800 rounded-lg p-4 bg-white dark:bg-slate-900 hover:shadow-lg transition flex gap-4"
                  >
                    <div className="w-16 h-16 bg-digitalcoop-900 rounded flex items-center justify-center text-white shadow-sm flex-shrink-0">
                      <Award size={32} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 dark:text-white line-clamp-1">
                        {cert.courseTitle}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mb-2">
                        Terbit: {cert.issueDate}
                        {cert.serial ? ` · ${cert.serial}` : ""}
                      </p>
                      <div className="flex items-center gap-2">
                        {cert.grade > 0 && (
                          <span className="text-xs font-bold bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded">
                            Nilai: {cert.grade}
                          </span>
                        )}
                        <button
                          onClick={() => setViewCert(cert)}
                          className="text-xs font-bold text-digitalcoop-600 dark:text-digitalcoop-400 hover:underline flex items-center"
                        >
                          <FileCheck size={12} className="mr-1" /> Lihat / Cetak
                        </button>
                        {cert.pdfUrl && (
                          <a
                            href={cert.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-bold text-digitalcoop-600 dark:text-digitalcoop-400 hover:underline"
                          >
                            Unduh PDF
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                <div className="border border-dashed border-gray-300 dark:border-slate-700 rounded-lg p-4 flex flex-col items-center justify-center text-center text-gray-400 min-h-[120px]">
                  <p className="text-sm">
                    {certsLoading
                      ? "Memuat sertifikat..."
                      : myCertificates.length === 0
                        ? "Belum ada sertifikat. Selesaikan materi dan ujian kursus untuk mendapatkannya."
                        : "Selesaikan kursus lainnya untuk mendapatkan lebih banyak sertifikat."}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;
