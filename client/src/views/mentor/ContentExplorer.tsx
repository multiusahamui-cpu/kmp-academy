import React, { useState } from "react";
import { MOCK_COURSES } from "../../constants";
import {
  BookOpen,
  Calendar,
  DollarSign,
  Users,
} from "lucide-react";

const ContentExplorer: React.FC = () => {
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [proposalStep, setProposalStep] = useState<"BROWSE" | "DRAFT">(
    "BROWSE",
  );

  const mandiriCourses = MOCK_COURSES.filter(
    (c) => c.type === "MANDIRI" && c.status === "PUBLISHED",
  );

  const handleSelect = (id: string) => {
    setSelectedCourse(id);
    setProposalStep("DRAFT");
  };

  const handleSubmitProposal = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Proposal Workshop berhasil dikirim ke Admin untuk ditinjau!");
    setProposalStep("BROWSE");
    setSelectedCourse(null);
  };

  if (proposalStep === "DRAFT" && selectedCourse) {
    const course = MOCK_COURSES.find((c) => c.id === selectedCourse);
    if (!course) return null;

    // Simulation of revenue calculation
    const basePrice = 500000;
    const adminFee = basePrice * 0.2; // 20%
    const royalty = basePrice * 0.1; // 10%
    const mentorShare = basePrice * 0.7; // 70%

    return (
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => setProposalStep("BROWSE")}
          className="text-sm text-gray-500 mb-4 hover:text-kodman-600"
        >
          &larr; Kembali ke Eksplorasi
        </button>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Ajukan Workshop Baru
        </h2>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Course Context */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sticky top-6">
              <img
                src={course.thumbnail}
                className="w-full h-32 object-cover rounded mb-4"
                alt=""
              />
              <h3 className="font-bold text-gray-800 mb-2">{course.title}</h3>
              <p className="text-xs text-gray-500 mb-4">
                Content Creator: {course.instructor}
              </p>
              <div className="bg-blue-50 p-3 rounded text-xs text-blue-800">
                <p className="font-bold mb-1">Materi Tersedia:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>{course.sessions} Modul Video</li>
                  <li>Quiz & Assignment</li>
                  <li>PDF Handout</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Proposal Form */}
          <div className="md:col-span-2">
            <form
              onSubmit={handleSubmitProposal}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Jadwal & Waktu (Live Zoom)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Setiap Sabtu & Minggu, 19.00 - 21.00 WIB (4 Pertemuan)"
                  className="w-full p-2 border border-gray-300 rounded focus:ring-kodman-500 focus:border-kodman-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Jelaskan durasi dan frekuensi pertemuan.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tanggal Mulai
                  </label>
                  <input
                    type="date"
                    required
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Maksimal Peserta
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="50"
                    defaultValue="20"
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center">
                  <DollarSign size={18} className="mr-1" /> Simulasi &
                  Monetisasi
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Harga Tiket Workshop (IDR)
                  </label>
                  <input
                    type="number"
                    defaultValue={basePrice}
                    className="w-full p-2 border border-gray-300 rounded font-mono font-bold text-lg"
                  />
                </div>

                <div className="mt-4 bg-gray-50 p-4 rounded-lg space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      Platform Fee (KMP - ADNG) - 20%
                    </span>
                    <span className="font-mono text-gray-900">
                      {new Intl.NumberFormat("id-ID", {
                        style: "currency",
                        currency: "IDR",
                      }).format(adminFee)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      Royalti Creator ({course.instructor}) - 10%
                    </span>
                    <span className="font-mono text-gray-900">
                      {new Intl.NumberFormat("id-ID", {
                        style: "currency",
                        currency: "IDR",
                      }).format(royalty)}
                    </span>
                  </div>
                  <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-200">
                    <span className="text-green-700">
                      Estimasi Pendapatan Anda (Mentor) - 70%
                    </span>
                    <span className="font-mono text-green-700">
                      {new Intl.NumberFormat("id-ID", {
                        style: "currency",
                        currency: "IDR",
                      }).format(mentorShare)}{" "}
                      / peserta
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setProposalStep("BROWSE")}
                  className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-kodman-600 text-white rounded font-bold hover:bg-kodman-700 shadow-lg"
                >
                  Ajukan Proposal
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">
          Eksplorasi Materi Creator
        </h2>
        <p className="text-gray-600">
          Pilih materi berkualitas dari Creator KMP - ADNG, lalu ajukan kelas{" "}
          <strong>Workshop</strong> dengan bimbingan Anda. Anda mengajar,
          Creator menyediakan materi.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mandiriCourses.map((course) => (
          <div
            key={course.id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col hover:border-kodman-300 transition"
          >
            <div className="h-40 overflow-hidden relative">
              <img
                src={course.thumbnail}
                alt={course.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-2 py-0.5 rounded text-xs font-bold text-gray-700">
                {course.sessions} Modul
              </div>
            </div>
            <div className="p-5 flex-1 flex flex-col">
              <h3 className="font-bold text-gray-900 mb-1">{course.title}</h3>
              <p className="text-xs text-gray-500 mb-3">
                By {course.instructor}
              </p>
              <p className="text-sm text-gray-600 mb-4 line-clamp-3 flex-1">
                {course.description}
              </p>

              <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between mb-4 text-xs text-gray-500">
                  <span className="flex items-center">
                    <Users size={14} className="mr-1" /> 100+ Alumni
                  </span>
                  <span className="flex items-center">
                    <BookOpen size={14} className="mr-1" /> Ready to Use
                  </span>
                </div>
                <button
                  onClick={() => handleSelect(course.id)}
                  className="w-full py-2 bg-kodman-50 text-kodman-700 border border-kodman-200 rounded font-bold text-sm hover:bg-kodman-100 flex items-center justify-center transition"
                >
                  <Calendar size={16} className="mr-2" /> Buka Kelas Workshop
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ContentExplorer;
