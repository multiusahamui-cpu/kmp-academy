import React, { useEffect, useState } from "react";
import { UserRole, Certificate, KYCStatus } from "../../types";
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
  Globe,
} from "lucide-react";
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
  const [requestStatus, setRequestStatus] = useState<"NONE" | "PENDING">(
    "NONE",
  );
  const [viewCert, setViewCert] = useState<Certificate | null>(null);
  const [kycData, setKycData] = useState<MyKyc | null>(null);
  const loadKyc = async () => { try { setKycData(await kycApi.me()); } catch { setKycData(null); } };
  useEffect(() => { void loadKyc(); }, []);
  // KYC dianggap beres bila terverifikasi di Academy, atau anggota digitalcoop.id dengan KYC lengkap.
  const kycStatus: KYCStatus = kycData?.status === 'VERIFIED' || kycData?.exempt ? KYCStatus.VERIFIED : kycData?.status === 'PENDING' ? KYCStatus.PENDING : KYCStatus.UNVERIFIED;

  // LinkedIn KMP - ADNG State
  const [isJobSeekerActive, setIsJobSeekerActive] = useState(false);

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

  const handleApplyRole = (role: string) => {
    // Simulating API call
    if (kycStatus !== KYCStatus.VERIFIED) {
      alert(
        "Harap selesaikan Verifikasi Identitas (KYC) terlebih dahulu sebelum mengajukan upgrade role.",
      );
      setActiveTab("kyc");
      return;
    }
    setRequestStatus("PENDING");
    alert(`Pengajuan untuk menjadi ${role} berhasil dikirim ke Admin!`);
  };

  const toggleJobSeeker = () => {
    if (kycStatus !== KYCStatus.VERIFIED) {
      alert("Fitur ini terkunci. Harap verifikasi KTP (KYC) terlebih dahulu.");
      return;
    }
    setIsJobSeekerActive(!isJobSeekerActive);
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
            className={`px-6 py-3 text-sm font-medium whitespace-nowrap ${activeTab === "profile" ? "border-b-2 border-kodman-600 text-kodman-600 dark:text-kodman-400" : "text-gray-500 hover:text-gray-700 dark:text-slate-400"}`}
            onClick={() => setActiveTab("profile")}
          >
            Informasi Akun
          </button>
          <button
            className={`px-6 py-3 text-sm font-medium whitespace-nowrap flex items-center gap-2 ${activeTab === "security" ? "border-b-2 border-kodman-600 text-kodman-600 dark:text-kodman-400" : "text-gray-500 hover:text-gray-700 dark:text-slate-400"}`}
            onClick={() => setActiveTab("security")}
          >
            <Lock size={16} /> Keamanan
          </button>
          <button
            className={`px-6 py-3 text-sm font-medium whitespace-nowrap ${activeTab === "notifications" ? "border-b-2 border-kodman-600 text-kodman-600 dark:text-kodman-400" : "text-gray-500 hover:text-gray-700 dark:text-slate-400"}`}
            onClick={() => setActiveTab("notifications")}
          >
            Notifikasi
          </button>
          <button
            className={`px-6 py-3 text-sm font-medium whitespace-nowrap flex items-center gap-2 ${activeTab === "kyc" ? "border-b-2 border-kodman-600 text-kodman-600 dark:text-kodman-400" : "text-gray-500 hover:text-gray-700 dark:text-slate-400"}`}
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
            className={`px-6 py-3 text-sm font-medium whitespace-nowrap ${activeTab === "roles" ? "border-b-2 border-kodman-600 text-kodman-600 dark:text-kodman-400" : "text-gray-500 hover:text-gray-700 dark:text-slate-400"}`}
            onClick={() => setActiveTab("roles")}
          >
            Upgrade Role
          </button>
          <button
            className={`px-6 py-3 text-sm font-medium whitespace-nowrap ${activeTab === "certificates" ? "border-b-2 border-kodman-600 text-kodman-600 dark:text-kodman-400" : "text-gray-500 hover:text-gray-700 dark:text-slate-400"}`}
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

          {activeTab === "career" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                  <Linkedin className="mr-2 text-blue-600" /> LinkedIn KMP -
                  ADNG Industry Hub
                </h3>
                <div className="flex items-center">
                  <span
                    className={`text-sm mr-3 font-medium ${isJobSeekerActive ? "text-green-600" : "text-gray-500"}`}
                  >
                    {isJobSeekerActive
                      ? "Status: OPEN TO WORK"
                      : "Status: PRIVATE"}
                  </span>
                  <button
                    onClick={toggleJobSeeker}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${isJobSeekerActive ? "bg-green-500" : "bg-gray-300"}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${isJobSeekerActive ? "translate-x-6" : "translate-x-1"}`}
                    />
                  </button>
                </div>
              </div>

              {kycStatus !== KYCStatus.VERIFIED ? (
                <div className="bg-gray-100 dark:bg-slate-800 p-8 rounded-lg border border-gray-300 dark:border-slate-700 text-center">
                  <Lock className="mx-auto text-gray-400 mb-4" size={48} />
                  <h4 className="text-lg font-bold text-gray-700 dark:text-slate-300 mb-2">
                    Fitur Terkunci
                  </h4>
                  <p className="text-gray-500 max-w-md mx-auto mb-6">
                    Anda harus melakukan Verifikasi Identitas (KYC) terlebih
                    dahulu untuk memastikan keamanan dan validitas data bagi
                    Mitra Industri kami.
                  </p>
                  <button
                    onClick={() => setActiveTab("kyc")}
                    className="px-4 py-2 bg-blue-600 text-white rounded font-bold shadow-md hover:bg-blue-700"
                  >
                    Lakukan KYC Sekarang
                  </button>
                </div>
              ) : (
                <div
                  className={`space-y-6 transition-opacity ${!isJobSeekerActive ? "opacity-50 pointer-events-none filter grayscale" : ""}`}
                >
                  <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-300 flex items-start">
                      <Globe className="mr-2 flex-shrink-0 mt-0.5" size={16} />
                      Profil Anda akan dapat diakses oleh HRD dari 50+ Koperasi
                      Besar dan UMKM Mitra KMP - ADNG. Sertifikat kompetensi
                      Anda akan menjadi nilai jual utama.
                    </p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                        Judul Profesional (Headline)
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: React Developer | Digital Marketing Specialist"
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                        Lokasi Preferensi
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Jakarta, Remote"
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                        Keahlian (Skills)
                      </label>
                      <div className="flex flex-wrap gap-2 p-2 border rounded bg-white dark:bg-slate-800 min-h-[50px]">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                          React.js
                        </span>
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                          Digital Marketing
                        </span>
                        <span className="text-gray-400 text-xs self-center">
                          + Tambah Skill dari Sertifikat
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button className="px-6 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700">
                      Update Profil Industri
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "roles" && (
            <div>
              <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg flex items-start gap-3">
                <Shield
                  className="text-kodman-600 dark:text-kodman-400 mt-1"
                  size={20}
                />
                <div>
                  <h3 className="font-bold text-kodman-800 dark:text-kodman-300">
                    Status Role Saat Ini: {currentRole}
                  </h3>
                  <p className="text-sm text-kodman-700 dark:text-kodman-400">
                    {currentRole === "STUDENT" &&
                      "Anda saat ini terdaftar sebagai Peserta. Anda bisa meningkatkan karir dengan menjadi Mentor atau Creator."}
                    {currentRole === "MENTOR" &&
                      "Anda adalah Mentor terverifikasi. Anda dapat membuka kelas Workshop."}
                    {currentRole === "CREATOR" &&
                      "Anda adalah Content Creator. Anda dapat membuat materi pembelajaran digital."}
                  </p>
                </div>
              </div>

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
                      disabled={currentRole === "MENTOR"}
                      className={`w-full py-2 border rounded font-bold transition ${currentRole === "MENTOR" ? "bg-gray-100 dark:bg-slate-800 text-gray-400 cursor-not-allowed" : "border-purple-600 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20"}`}
                    >
                      {currentRole === "MENTOR" ? "Aktif" : "Ajukan Diri"}
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
                      disabled={currentRole === "CREATOR"}
                      className={`w-full py-2 border rounded font-bold transition ${currentRole === "CREATOR" ? "bg-gray-100 dark:bg-slate-800 text-gray-400 cursor-not-allowed" : "border-orange-600 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20"}`}
                    >
                      {currentRole === "CREATOR" ? "Aktif" : "Ajukan Diri"}
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
                    <div className="w-16 h-16 bg-kodman-900 rounded flex items-center justify-center text-white shadow-sm flex-shrink-0">
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
                          className="text-xs font-bold text-kodman-600 dark:text-kodman-400 hover:underline flex items-center"
                        >
                          <FileCheck size={12} className="mr-1" /> Lihat / Cetak
                        </button>
                        {cert.pdfUrl && (
                          <a
                            href={cert.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-bold text-kodman-600 dark:text-kodman-400 hover:underline"
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
