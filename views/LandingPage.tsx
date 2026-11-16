import React from "react";
import { MOCK_COURSES, MOCK_CATEGORIES } from "../constants";
import {
  Users,
  Clock,
  Award,
  CheckCircle,
  TrendingUp,
  Target,
  Shield,
  Zap,
} from "lucide-react";

interface LandingPageProps {
  onRegister: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onRegister }) => {
  // Logic for Top 10 Best Sellers
  const topCourses = [...MOCK_COURSES]
    .filter((c) => c.status === "PUBLISHED")
    .sort((a, b) => b.studentsEnrolled - a.studentsEnrolled)
    .slice(0, 10);

  const scrollToCourses = (e: React.MouseEvent) => {
    e.preventDefault();
    const element = document.getElementById("courses");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900">
      {/* 1. Hero Section (ID: home) */}
      <div
        id="home"
        className="bg-kodman-900 dark:bg-slate-950 text-white relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-1.2.1&auto=format&fit=crop&w=1951&q=80')] bg-cover bg-center opacity-10 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-kodman-900 dark:from-slate-950 to-transparent"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32 relative z-10">
          <div className="max-w-3xl">
            <span className="inline-block px-4 py-1.5 rounded-full bg-kodman-500/20 border border-kodman-400/30 text-kodman-200 text-xs font-bold uppercase tracking-wider mb-6">
              The Future of Digital Coop
            </span>
            <h1 className="font-sans text-4xl md:text-6xl font-extrabold mb-6 leading-tight tracking-tight">
              Tingkatkan Kompetensi{" "}
              <span className="text-kodman-400">Digital</span> Koperasi & UMKM
              Anda
            </h1>
            <p className="text-xl text-gray-300 mb-8 leading-relaxed font-light">
              Bergabunglah dengan{" "}
              <strong className="text-white font-bold">
                KMP - ADNG ACADEMY
              </strong>{" "}
              untuk akses materi eksklusif, workshop interaktif, dan sertifikasi
              profesional. Belajar mandiri atau dalam rombongan bimbingan mentor
              ahli.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={onRegister}
                className="bg-kodman-500 hover:bg-kodman-400 text-white font-sans font-bold py-3.5 px-8 rounded-full transition shadow-xl shadow-kodman-500/20 text-lg"
              >
                Mulai Belajar Sekarang
              </button>
              <a
                href="#courses"
                onClick={scrollToCourses}
                className="bg-white/5 hover:bg-white/10 text-white font-sans font-semibold py-3.5 px-8 rounded-full transition border border-white/20 backdrop-blur-sm flex items-center justify-center cursor-pointer"
              >
                Lihat Katalog Kursus
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-kodman-50 dark:bg-slate-900 border-b border-kodman-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x divide-gray-200 dark:divide-slate-800/50">
            <div>
              <div className="font-sans text-4xl font-extrabold text-kodman-600 dark:text-kodman-400 mb-1">
                50+
              </div>
              <div className="text-sm text-gray-600 dark:text-slate-400 font-medium uppercase tracking-wide">
                Instruktur Ahli
              </div>
            </div>
            <div>
              <div className="font-sans text-4xl font-extrabold text-kodman-600 dark:text-kodman-400 mb-1">
                120+
              </div>
              <div className="text-sm text-gray-600 dark:text-slate-400 font-medium uppercase tracking-wide">
                Kursus Tersedia
              </div>
            </div>
            <div>
              <div className="font-sans text-4xl font-extrabold text-kodman-600 dark:text-kodman-400 mb-1">
                5k+
              </div>
              <div className="text-sm text-gray-600 dark:text-slate-400 font-medium uppercase tracking-wide">
                Siswa Aktif
              </div>
            </div>
            <div>
              <div className="font-sans text-4xl font-extrabold text-kodman-600 dark:text-kodman-400 mb-1">
                98%
              </div>
              <div className="text-sm text-gray-600 dark:text-slate-400 font-medium uppercase tracking-wide">
                Kepuasan Alumni
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Popular Courses (ID: courses) */}
      <div id="courses" className="py-20 bg-gray-50 dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
            <div className="text-center md:text-left">
              <h2 className="font-sans text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2 flex items-center justify-center md:justify-start gap-3">
                <TrendingUp className="text-red-500" /> Top 10 Paling Laris
              </h2>
              <p className="text-gray-500 dark:text-slate-400">
                Kursus dengan peminat terbanyak bulan ini.
              </p>
            </div>
            <button
              onClick={onRegister}
              className="text-kodman-600 dark:text-kodman-400 font-bold hover:underline"
            >
              Lihat Semua &rarr;
            </button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {topCourses.map((course, index) => (
              <div
                key={course.id}
                className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition duration-300 border border-gray-100 dark:border-slate-800 group flex flex-col relative"
              >
                {/* Ranking Badge */}
                <div className="absolute top-0 left-0 bg-yellow-400 text-yellow-900 font-bold text-xs px-3 py-1 rounded-br-lg z-20 shadow-sm">
                  #{index + 1} Best Seller
                </div>

                <div className="h-48 overflow-hidden relative">
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="w-full h-full object-cover transform group-hover:scale-110 transition duration-700"
                  />
                  <div className="absolute top-4 right-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-gray-800 dark:text-white uppercase tracking-wide shadow-sm">
                    {course.type}
                  </div>
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  {/* Categories */}
                  <div className="flex flex-wrap gap-1 mb-2">
                    {course.categoryIds?.slice(0, 2).map((catId) => {
                      const cat = MOCK_CATEGORIES.find((c) => c.id === catId);
                      return cat ? (
                        <span
                          key={catId}
                          className="text-[10px] bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 px-1.5 py-0.5 rounded"
                        >
                          {cat.name}
                        </span>
                      ) : null;
                    })}
                  </div>

                  <h3 className="font-sans font-bold text-base mb-2 text-gray-900 dark:text-white line-clamp-2 leading-snug group-hover:text-kodman-600 dark:group-hover:text-kodman-400 transition flex-1">
                    {course.title}
                  </h3>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 dark:border-slate-800">
                    <div className="flex items-center text-xs text-gray-600 dark:text-slate-400 font-medium">
                      <Users size={14} className="mr-1.5 text-kodman-500" />
                      {course.studentsEnrolled} Siswa
                    </div>
                    <span className="font-sans font-bold text-kodman-600 dark:text-kodman-400 text-base">
                      {new Intl.NumberFormat("id-ID", {
                        style: "currency",
                        currency: "IDR",
                        maximumFractionDigits: 0,
                      }).format(course.price)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. About Us Section (ID: about) */}
      <div id="about" className="py-24 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1">
              <div className="inline-block p-2 bg-kodman-50 dark:bg-slate-800 rounded-lg mb-4">
                <Award
                  className="text-kodman-600 dark:text-kodman-400"
                  size={32}
                />
              </div>
              <h2 className="font-sans text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6">
                Tentang KMP - ADNG Academy
              </h2>
              <p className="text-lg text-gray-600 dark:text-slate-300 mb-6 leading-relaxed">
                KMP - ADNG Academy adalah ekosistem pembelajaran digital yang
                dirancang khusus untuk mengakselerasi transformasi digital
                Koperasi dan UMKM di Indonesia.
              </p>
              <p className="text-gray-600 dark:text-slate-400 mb-8 leading-relaxed">
                Kami menggabungkan kurikulum berbasis industri, platform
                teknologi modern, dan komunitas praktisi untuk mencetak talenta
                digital yang siap pakai dan kompeten.
              </p>

              <div className="space-y-4">
                <div className="flex items-start">
                  <Target className="text-red-500 mt-1 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white">
                      Misi Kami
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      Mendigitalisasi 1.000 Koperasi di tahun 2025 melalui
                      pendidikan vokasi.
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Shield className="text-blue-500 mt-1 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white">
                      Sertifikasi Resmi
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      Bekerjasama dengan lembaga sertifikasi profesi nasional
                      dan internasional.
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Zap className="text-yellow-500 mt-1 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white">
                      Teknologi Terkini
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      Platform LMS berbasis React & Node.js yang cepat, aman,
                      dan mudah digunakan.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 md:order-2 relative">
              <div className="absolute inset-0 bg-kodman-600 rounded-2xl rotate-6 transform opacity-20"></div>
              <img
                src="https://images.unsplash.com/photo-1531482615713-2afd69097998?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80"
                alt="Tentang Kami"
                className="relative rounded-2xl shadow-2xl w-full object-cover h-[500px]"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
