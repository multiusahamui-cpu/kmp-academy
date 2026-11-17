import React, { useState } from "react";
import { MOCK_COURSES } from "../../constants";
import { Certificate, CourseType } from "../../types";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  ArrowRight,
  Award,
  Calendar,
  MapPin,
  Building2,
  Ticket,
} from "lucide-react";
import CertificateTemplate from "../../components/CertificateTemplate";

interface ExamRoomProps {
  courseId: string;
  studentName: string;
  onExit: () => void;
}

const ExamRoom: React.FC<ExamRoomProps> = ({
  courseId,
  studentName,
  onExit,
}) => {
  const course = MOCK_COURSES.find((c) => c.id === courseId);
  const examConfig = course?.examConfig;

  const [step, setStep] = useState<"INTRO" | "TEST" | "RESULT">("INTRO");
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]); // Store selected index for each question
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const [score, setScore] = useState(0); // Exam Score
  const [finalGrade, setFinalGrade] = useState(0); // Weighted Grade
  const [showCertificate, setShowCertificate] = useState(false);
  const [generatedCert, setGeneratedCert] = useState<Certificate | null>(null);

  if (!course || !examConfig || !examConfig.isEnabled) {
    return (
      <div className="p-8 text-center">
        Ujian tidak tersedia untuk kursus ini.
      </div>
    );
  }

  const isCertification = course.type === CourseType.CERTIFICATION;

  const handleStart = () => {
    if (attemptsLeft <= 0) {
      alert("Kesempatan ujian habis.");
      return;
    }
    setStep("TEST");
    setAnswers(new Array(examConfig.questions.length).fill(-1));
    setCurrentQIndex(0);
  };

  const handleClaimParticipation = () => {
    // For Certification, we assume user attended and we generate Participation Cert
    const newCert: Certificate = {
      id: `CERT-PART-${Date.now()}`,
      courseId: course.id,
      courseTitle: course.title,
      courseType: course.type,
      studentName: studentName,
      instructorName: examConfig.externalProvider || course.instructor,
      issueDate: new Date().toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      grade: 0, // No grade for participation
    };
    setGeneratedCert(newCert);
    setShowCertificate(true);
  };

  const handleAnswer = (optionIndex: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQIndex] = optionIndex;
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQIndex < examConfig.questions.length - 1) {
      setCurrentQIndex((prev) => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    let correctCount = 0;
    examConfig.questions.forEach((q, idx) => {
      if (answers[idx] === q.correctOptionIndex) {
        correctCount++;
      }
    });

    const examScore = Math.round(
      (correctCount / examConfig.questions.length) * 100,
    );
    setScore(examScore);

    // Calculate Final Grade
    let calculatedGrade = examScore;
    if (course.type === CourseType.WORKSHOP) {
      const mockAssignmentScore = 85;
      calculatedGrade = Math.round(examScore * 0.6 + mockAssignmentScore * 0.4);
    }
    setFinalGrade(calculatedGrade);

    setStep("RESULT");

    if (calculatedGrade >= examConfig.passingGrade) {
      // Passed
      const newCert: Certificate = {
        id: `CERT-${Date.now()}`,
        courseId: course.id,
        courseTitle: course.title,
        courseType: course.type, // Pass Type
        studentName: studentName,
        instructorName: course.instructor,
        issueDate: new Date().toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
        grade: calculatedGrade,
      };
      setGeneratedCert(newCert);
      // In real app, save to backend here
    } else {
      setAttemptsLeft((prev) => prev - 1);
    }
  };

  // --- EXTERNAL CERTIFICATION VIEW (TICKET) ---
  if (isCertification) {
    return (
      <div className="max-w-3xl mx-auto pt-10">
        {showCertificate && generatedCert && (
          <CertificateTemplate
            data={generatedCert}
            onClose={() => setShowCertificate(false)}
          />
        )}

        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-gray-200 dark:border-slate-800 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-8 text-white flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold mb-1">
                Tiket Ujian Sertifikasi
              </h2>
              <p className="text-slate-300 text-sm">Exam Admission Ticket</p>
            </div>
            <Ticket size={48} className="text-slate-500" />
          </div>

          <div className="p-8">
            <div className="mb-8 border-b border-gray-200 dark:border-slate-800 pb-8">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                {course.title}
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="flex items-start gap-3">
                  <Building2 className="text-kodman-600 mt-1" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold">
                      Lembaga Partner / Provider
                    </p>
                    <p className="font-bold text-gray-800 dark:text-white">
                      {examConfig.externalProvider}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="text-kodman-600 mt-1" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold">
                      Waktu Pelaksanaan
                    </p>
                    <p className="font-bold text-gray-800 dark:text-white">
                      {examConfig.examDate}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 md:col-span-2">
                  <MapPin className="text-kodman-600 mt-1" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold">
                      Lokasi Ujian (Venue)
                    </p>
                    <p className="font-bold text-gray-800 dark:text-white">
                      {examConfig.examLocation}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-8 flex items-start gap-3">
              <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-yellow-800 dark:text-yellow-500 text-sm">
                  Informasi Penting
                </h4>
                <ul className="text-sm text-yellow-700 dark:text-yellow-600 mt-1 list-disc pl-4 space-y-1">
                  <li>Harap hadir 30 menit sebelum jadwal ujian.</li>
                  <li>Bawa kartu identitas (KTP/SIM) asli.</li>
                  <li>
                    Sertifikat Kompetensi asli akan diterbitkan oleh Lembaga
                    Partner jika Anda dinyatakan kompeten.
                  </li>
                  <li>
                    KMP - ADNG Academy hanya menerbitkan Sertifikat
                    Keikutsertaan Pelatihan.
                  </li>
                </ul>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
              <button
                onClick={onExit}
                className="text-gray-500 hover:text-gray-900 font-medium"
              >
                &larr; Kembali ke Katalog
              </button>
              <div className="flex gap-3">
                <button
                  className="px-6 py-2 border border-gray-300 dark:border-slate-600 rounded text-gray-700 dark:text-slate-300 font-medium hover:bg-gray-50"
                  onClick={() => window.print()}
                >
                  Cetak Tiket
                </button>
                <button
                  onClick={handleClaimParticipation}
                  className="px-6 py-2 bg-kodman-600 text-white rounded font-bold shadow-lg hover:bg-kodman-700 flex items-center"
                >
                  <Award size={18} className="mr-2" /> Klaim Sertifikat
                  Partisipasi
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- STANDARD EXAM FLOW (MANDIRI / WORKSHOP) ---

  if (step === "INTRO") {
    return (
      <div className="max-w-2xl mx-auto pt-10">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-gray-200 dark:border-slate-800 p-8 text-center">
          <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-600 dark:text-blue-400">
            <Clock size={40} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Ujian Akhir: {course.title}
          </h2>
          <p className="text-gray-500 mb-8">
            Ujian ini terdiri dari{" "}
            <strong>{examConfig.questions.length} soal</strong> pilihan ganda.
            Anda harus mencapai nilai minimal{" "}
            <strong>{examConfig.passingGrade}</strong> untuk mendapatkan
            sertifikat.
          </p>

          {course.type === CourseType.WORKSHOP && (
            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4 text-left">
              <h4 className="font-bold text-blue-800 dark:text-blue-500 text-sm">
                Pembobotan Nilai Akademik
              </h4>
              <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                Nilai Akhir = (40% Nilai Tugas Harian) + (60% Nilai Ujian
                Akhir).
                <br />
                Nilai Tugas Harian Anda saat ini: <strong>85</strong> (Mock).
              </p>
            </div>
          )}

          <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-8 text-left flex items-start gap-3">
            <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-yellow-800 dark:text-yellow-500 text-sm">
                Ketentuan Ujian
              </h4>
              <ul className="text-sm text-yellow-700 dark:text-yellow-600 mt-1 list-disc pl-4">
                <li>Durasi pengerjaan: {examConfig.durationMinutes} Menit.</li>
                <li>
                  Sisa kesempatan mengulang:{" "}
                  <strong>{attemptsLeft} kali</strong>.
                </li>
                <li>Dilarang membuka tab lain (Simulasi).</li>
              </ul>
            </div>
          </div>

          <div className="flex justify-center gap-4">
            <button
              onClick={onExit}
              className="px-6 py-2 border border-gray-300 dark:border-slate-600 rounded text-gray-700 dark:text-slate-300 font-medium"
            >
              Batal
            </button>
            <button
              onClick={handleStart}
              disabled={attemptsLeft <= 0}
              className={`px-6 py-2 bg-kodman-600 text-white rounded font-bold shadow-lg hover:bg-kodman-700 ${attemptsLeft <= 0 ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              Mulai Ujian
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "TEST") {
    const question = examConfig.questions[currentQIndex];
    return (
      <div className="max-w-3xl mx-auto pt-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <span className="text-sm font-bold text-gray-500">
            Soal {currentQIndex + 1} dari {examConfig.questions.length}
          </span>
          <span className="text-sm font-mono bg-gray-100 dark:bg-slate-800 px-3 py-1 rounded text-red-500 font-bold">
            {examConfig.durationMinutes}:00
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 dark:bg-slate-700 h-2 rounded-full mb-8">
          <div
            className="bg-kodman-600 h-2 rounded-full transition-all duration-300"
            style={{
              width: `${((currentQIndex + 1) / examConfig.questions.length) * 100}%`,
            }}
          ></div>
        </div>

        {/* Question Card */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-8">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
            {question.question}
          </h3>

          <div className="space-y-3">
            {question.options.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => handleAnswer(idx)}
                className={`w-full text-left p-4 rounded-lg border transition flex items-center ${
                  answers[currentQIndex] === idx
                    ? "bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-800 dark:text-blue-300 font-medium shadow-sm"
                    : "bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full border flex items-center justify-center mr-4 text-xs ${
                    answers[currentQIndex] === idx
                      ? "bg-blue-500 border-blue-500 text-white"
                      : "border-gray-400 text-gray-400"
                  }`}
                >
                  {String.fromCharCode(65 + idx)}
                </div>
                {opt}
              </button>
            ))}
          </div>

          <div className="flex justify-end mt-8">
            <button
              onClick={handleNext}
              disabled={answers[currentQIndex] === -1}
              className={`px-6 py-3 bg-kodman-600 text-white rounded-lg font-bold flex items-center ${answers[currentQIndex] === -1 ? "opacity-50 cursor-not-allowed" : "hover:bg-kodman-700"}`}
            >
              {currentQIndex === examConfig.questions.length - 1
                ? "Selesai & Kumpulkan"
                : "Selanjutnya"}
              <ArrowRight size={18} className="ml-2" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "RESULT") {
    const isPassed = finalGrade >= examConfig.passingGrade;

    return (
      <>
        {showCertificate && generatedCert && (
          <CertificateTemplate
            data={generatedCert}
            onClose={() => setShowCertificate(false)}
          />
        )}

        <div className="max-w-xl mx-auto pt-10 text-center">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-gray-200 dark:border-slate-800 p-10">
            <div
              className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${isPassed ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}
            >
              {isPassed ? <Award size={48} /> : <XCircle size={48} />}
            </div>

            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {isPassed
                ? "Selamat! Anda Lulus"
                : "Mohon Maaf, Anda Belum Lulus"}
            </h2>
            <div className="text-gray-500 mb-6">
              <p className="text-lg">
                Nilai Akhir Anda:{" "}
                <span
                  className={`font-bold ${isPassed ? "text-green-600" : "text-red-600"}`}
                >
                  {finalGrade}
                </span>
              </p>
              <p className="text-xs mt-1">
                (Skor Ujian: {score} • Batas Lulus: {examConfig.passingGrade})
              </p>
            </div>

            {isPassed ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Selamat! Anda telah menguasai materi ini. Sertifikat
                  kompetensi kini tersedia di profil Anda.
                </p>
                <button
                  onClick={() => setShowCertificate(true)}
                  className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold shadow-md flex justify-center items-center"
                >
                  <CheckCircle size={18} className="mr-2" /> Lihat & Cetak
                  Sertifikat
                </button>
                <button
                  onClick={onExit}
                  className="w-full py-3 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
                >
                  Kembali ke Dashboard
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {attemptsLeft > 0 ? (
                  <>
                    <p className="text-sm text-gray-600">
                      Jangan menyerah! Pelajari kembali materi yang belum
                      dikuasai. Anda masih memiliki{" "}
                      <strong>{attemptsLeft} kesempatan</strong> remedial.
                    </p>
                    <button
                      onClick={() => setStep("INTRO")}
                      className="w-full py-3 bg-kodman-600 hover:bg-kodman-700 text-white rounded-lg font-bold shadow-md"
                    >
                      Coba Lagi (Remedial)
                    </button>
                  </>
                ) : (
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <p className="text-sm font-bold text-red-700">
                      Kesempatan Ujian Habis
                    </p>
                    <p className="text-xs text-red-600 mt-1">
                      Anda telah menghabiskan 3x kesempatan remedial. Silakan
                      hubungi Mentor atau Admin untuk reset akses ujian.
                    </p>
                  </div>
                )}
                <button
                  onClick={onExit}
                  className="w-full py-3 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
                >
                  Kembali Belajar
                </button>
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  return null;
};

export default ExamRoom;
