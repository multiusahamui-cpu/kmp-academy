import React, { useState, useEffect } from "react";
import {
  Plus,
  Video,
  FileText,
  UploadCloud,
  PlayCircle,
  Check,
  BookCheck,
  Trash2,
  ArrowLeft,
  Save,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { MOCK_COURSES, MOCK_CATEGORIES } from "../../constants";
import { ExamQuestion, Course, CourseType, CourseStatus } from "../../types";

interface CourseCreatorProps {
  isCreateMode?: boolean;
}

const CourseCreator: React.FC<CourseCreatorProps> = ({
  isCreateMode = false,
}) => {
  // View State
  const [viewMode, setViewMode] = useState<"LIST" | "FORM">(
    isCreateMode ? "FORM" : "LIST",
  );
  const [courses, setCourses] = useState<Course[]>(MOCK_COURSES);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "DETAILS" | "CURRICULUM" | "EXAM" | "LICENSE"
  >("DETAILS");

  // Course Details State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState<number>(0);
  const [type, setType] = useState<CourseType>(CourseType.MANDIRI);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [thumbnail, setThumbnail] = useState(
    "https://picsum.photos/400/250?random=10",
  ); // Default mock image

  // Exam State
  const [examEnabled, setExamEnabled] = useState(false);
  const [passingGrade, setPassingGrade] = useState(70);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);

  // Licensing State
  const [licenseAccepted, setLicenseAccepted] = useState(false);

  // Temporary Question State
  const [newQuestion, setNewQuestion] = useState("");
  const [newOptions, setNewOptions] = useState(["", "", "", ""]);
  const [correctOption, setCorrectOption] = useState(0);

  // Upload Simulation State
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [hasUploadedFile, setHasUploadedFile] = useState(false);

  // Sync prop with view mode
  useEffect(() => {
    if (isCreateMode) {
      handleCreateNew();
    }
  }, [isCreateMode]);

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setPrice(0);
    setType(CourseType.MANDIRI);
    setSelectedCategories([]);
    setExamEnabled(false);
    setPassingGrade(70);
    setQuestions([]);
    setLicenseAccepted(false);
    setActiveTab("DETAILS");
    setHasUploadedFile(false);
    setUploadProgress(0);
  };

  const handleCreateNew = () => {
    resetForm();
    setViewMode("FORM");
  };

  const handleEdit = (course: Course) => {
    setEditingId(course.id);
    setTitle(course.title);
    setDescription(course.description);
    setPrice(course.price);
    setType(course.type);
    setSelectedCategories(course.categoryIds || []);
    setThumbnail(course.thumbnail);

    // Populate Exam Config
    if (course.examConfig) {
      setExamEnabled(course.examConfig.isEnabled);
      setPassingGrade(course.examConfig.passingGrade);
      setQuestions(course.examConfig.questions);
    } else {
      setExamEnabled(false);
      setPassingGrade(70);
      setQuestions([]);
    }

    // Mock License status
    setLicenseAccepted(true);
    setHasUploadedFile(true); // Assume existing courses have files

    setViewMode("FORM");
  };

  const handleSave = () => {
    if (!title) {
      alert("Judul kursus wajib diisi.");
      return;
    }

    if (!licenseAccepted) {
      alert(
        "Anda wajib menyetujui Perjanjian Lisensi Eksklusif sebelum menyimpan/mempublikasikan kursus.",
      );
      setActiveTab("LICENSE");
      return;
    }

    const courseData: Course = {
      id: editingId || `course-${Date.now()}`,
      title,
      description,
      instructor: "User Kodman", // Mock logged in user
      instructorId: "user-1",
      price: Number(price),
      type,
      status: editingId
        ? courses.find((c) => c.id === editingId)?.status || CourseStatus.DRAFT
        : CourseStatus.DRAFT,
      thumbnail,
      sessions: editingId
        ? courses.find((c) => c.id === editingId)?.sessions || 0
        : 0, // Preserve sessions or 0
      studentsEnrolled: editingId
        ? courses.find((c) => c.id === editingId)?.studentsEnrolled || 0
        : 0,
      rating: editingId
        ? courses.find((c) => c.id === editingId)?.rating || 0
        : 0,
      totalReviews: editingId
        ? courses.find((c) => c.id === editingId)?.totalReviews || 0
        : 0,
      categoryIds: selectedCategories,
      examConfig: {
        isEnabled: examEnabled,
        passingGrade: Number(passingGrade),
        durationMinutes: 60, // Default duration
        questions: questions,
      },
      licenseAgreement: {
        isExclusiveToKodman: true,
        acceptedAt: new Date().toISOString(),
        version: "1.0",
      },
    };

    if (editingId) {
      // Update existing
      setCourses((prev) =>
        prev.map((c) => (c.id === editingId ? courseData : c)),
      );
      alert("Perubahan berhasil disimpan!");
    } else {
      // Create new
      setCourses((prev) => [courseData, ...prev]);
      alert("Kursus baru berhasil dibuat dan Lisensi telah tercatat!");
    }

    setViewMode("LIST");
    resetForm();
  };

  const toggleCategory = (catId: string) => {
    if (selectedCategories.includes(catId)) {
      setSelectedCategories(selectedCategories.filter((id) => id !== catId));
    } else {
      if (selectedCategories.length < 3) {
        setSelectedCategories([...selectedCategories, catId]);
      } else {
        alert("Maksimal pilih 3 kategori.");
      }
    }
  };

  const handleSimulateUpload = () => {
    setIsUploading(true);
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUploading(false);
          setHasUploadedFile(true);
          return 100;
        }
        return prev + 10;
      });
    }, 300);
  };

  const handleAddQuestion = () => {
    if (!newQuestion || newOptions.some((opt) => !opt)) {
      alert("Harap isi pertanyaan dan semua opsi jawaban.");
      return;
    }
    const q: ExamQuestion = {
      id: `q-${Date.now()}`,
      question: newQuestion,
      options: [...newOptions],
      correctOptionIndex: correctOption,
    };
    setQuestions([...questions, q]);
    setNewQuestion("");
    setNewOptions(["", "", "", ""]);
    setCorrectOption(0);
  };

  const handleDeleteQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

  // --- RENDER FORM ---
  if (viewMode === "FORM") {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => setViewMode("LIST")}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition"
          >
            <ArrowLeft
              size={24}
              className="text-gray-600 dark:text-slate-300"
            />
          </button>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {editingId ? "Edit Kursus" : "Buat Kursus Baru"}
          </h2>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-lg shadow border border-gray-200 dark:border-slate-800 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-slate-800 overflow-x-auto">
            <button
              onClick={() => setActiveTab("DETAILS")}
              className={`flex-1 py-3 px-4 font-bold text-sm whitespace-nowrap ${activeTab === "DETAILS" ? "bg-kodman-50 dark:bg-kodman-900/20 text-kodman-700 dark:text-kodman-300 border-b-2 border-kodman-600" : "text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800"}`}
            >
              1. Detail Kursus
            </button>
            <button
              onClick={() => setActiveTab("CURRICULUM")}
              className={`flex-1 py-3 px-4 font-bold text-sm whitespace-nowrap ${activeTab === "CURRICULUM" ? "bg-kodman-50 dark:bg-kodman-900/20 text-kodman-700 dark:text-kodman-300 border-b-2 border-kodman-600" : "text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800"}`}
            >
              2. Kurikulum
            </button>
            <button
              onClick={() => setActiveTab("EXAM")}
              className={`flex-1 py-3 px-4 font-bold text-sm whitespace-nowrap ${activeTab === "EXAM" ? "bg-kodman-50 dark:bg-kodman-900/20 text-kodman-700 dark:text-kodman-300 border-b-2 border-kodman-600" : "text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800"}`}
            >
              3. Ujian
            </button>
            <button
              onClick={() => setActiveTab("LICENSE")}
              className={`flex-1 py-3 px-4 font-bold text-sm whitespace-nowrap flex items-center gap-2 ${activeTab === "LICENSE" ? "bg-kodman-50 dark:bg-kodman-900/20 text-kodman-700 dark:text-kodman-300 border-b-2 border-kodman-600" : "text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800"}`}
            >
              4. Lisensi <ShieldCheck size={14} />
            </button>
          </div>

          <div className="p-8 space-y-6">
            {activeTab === "DETAILS" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Judul Kursus
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full p-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded focus:ring-kodman-500 focus:border-kodman-500"
                    placeholder="Contoh: Digital Marketing Tingkat Lanjut"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Kategori (Maksimal 3){" "}
                    <span className="text-xs text-gray-500 font-normal">
                      {selectedCategories.length}/3 Dipilih
                    </span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {MOCK_CATEGORIES.map((cat) => {
                      const isSelected = selectedCategories.includes(cat.id);
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => toggleCategory(cat.id)}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium border transition flex items-center ${
                            isSelected
                              ? "bg-kodman-100 dark:bg-kodman-900/40 text-kodman-800 dark:text-kodman-300 border-kodman-300 dark:border-kodman-700"
                              : "bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-400 border-gray-200 dark:border-slate-700 hover:border-kodman-300"
                          }`}
                        >
                          {cat.name}
                          {isSelected && <Check size={14} className="ml-1.5" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Tipe
                    </label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value as CourseType)}
                      className="w-full p-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded"
                    >
                      <option value={CourseType.MANDIRI}>
                        Mandiri (Self-Paced)
                      </option>
                      <option value={CourseType.WORKSHOP}>
                        Workshop (Rombongan)
                      </option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Harga (IDR)
                    </label>
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(Number(e.target.value))}
                      className="w-full p-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Deskripsi & Syllabus
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full h-32 p-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded"
                    placeholder="Jelaskan apa yang akan dipelajari..."
                  ></textarea>
                </div>
              </>
            )}

            {activeTab === "CURRICULUM" && (
              <div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
                  Materi Pelajaran
                </h3>

                <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded border border-gray-200 dark:border-slate-700 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-gray-700 dark:text-slate-300">
                      Sesi 1: Pengenalan
                    </span>
                    <button className="text-xs text-red-500 hover:text-red-700">
                      Hapus
                    </button>
                  </div>

                  <div className="space-y-3">
                    {hasUploadedFile ? (
                      <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-3 rounded border border-green-200 dark:border-green-900">
                        <div className="flex items-center">
                          <Video size={18} className="text-green-500 mr-3" />
                          <div>
                            <p className="text-sm font-bold text-gray-800 dark:text-white">
                              intro_course_v1.mp4
                            </p>
                            <p className="text-xs text-green-600 dark:text-green-400 flex items-center">
                              <Check size={12} className="mr-1" /> Uploaded &
                              Ready (Transcoded)
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setHasUploadedFile(false)}
                          className="text-xs text-gray-400 hover:text-red-500"
                        >
                          Ganti File
                        </button>
                      </div>
                    ) : isUploading ? (
                      <div className="bg-white dark:bg-slate-900 p-3 rounded border border-blue-200 dark:border-blue-900">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-bold text-blue-600">
                            Uploading to CDN...
                          </span>
                          <span className="text-xs font-mono text-gray-500">
                            {uploadProgress}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          ></div>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={handleSimulateUpload}
                        className="w-full py-4 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 flex flex-col items-center justify-center transition"
                      >
                        <UploadCloud
                          size={24}
                          className="mb-2 text-kodman-500"
                        />
                        <span>Klik untuk Upload Video Materi (MP4)</span>
                        <span className="text-xs text-gray-400 mt-1">
                          Max 500MB per file
                        </span>
                      </button>
                    )}
                  </div>
                </div>

                <button className="flex items-center text-kodman-600 dark:text-kodman-400 font-medium text-sm hover:underline">
                  <Plus size={16} className="mr-1" /> Tambah Sesi
                </button>
              </div>
            )}

            {activeTab === "EXAM" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      Ujian Akhir (Final Exam)
                    </h3>
                    <p className="text-sm text-gray-500">
                      Siswa harus lulus ujian ini untuk mendapatkan Sertifikat.
                    </p>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={examEnabled}
                      onChange={(e) => setExamEnabled(e.target.checked)}
                      className="w-5 h-5 text-kodman-600 rounded focus:ring-kodman-500"
                    />
                    <label className="ml-2 text-sm font-bold text-gray-700 dark:text-slate-300">
                      Aktifkan Ujian
                    </label>
                  </div>
                </div>

                {examEnabled && (
                  <div className="space-y-6 animate-fade-in-down">
                    <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-slate-800 rounded border border-gray-200 dark:border-slate-700">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                          Passing Grade (0-100)
                        </label>
                        <input
                          type="number"
                          value={passingGrade}
                          onChange={(e) =>
                            setPassingGrade(Number(e.target.value))
                          }
                          className="w-full p-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                          Durasi (Menit)
                        </label>
                        <input
                          type="number"
                          defaultValue={60}
                          className="w-full p-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded"
                        />
                      </div>
                    </div>

                    {/* List of Questions */}
                    <div className="space-y-3">
                      {questions.map((q, idx) => (
                        <div
                          key={q.id}
                          className="p-4 border border-gray-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 relative group"
                        >
                          <button
                            onClick={() => handleDeleteQuestion(q.id)}
                            className="absolute top-2 right-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition"
                          >
                            <Trash2 size={16} />
                          </button>
                          <p className="font-bold text-gray-900 dark:text-white mb-2">
                            {idx + 1}. {q.question}
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            {q.options.map((opt, i) => (
                              <div
                                key={i}
                                className={`text-sm p-2 rounded border ${i === q.correctOptionIndex ? "bg-green-50 border-green-200 text-green-700" : "bg-gray-50 border-gray-200 text-gray-600"}`}
                              >
                                {String.fromCharCode(65 + i)}. {opt}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Add New Question Form */}
                    <div className="bg-blue-50 dark:bg-slate-800/30 p-6 rounded border border-blue-100 dark:border-slate-700">
                      <h4 className="font-bold text-gray-900 dark:text-white mb-3 text-sm uppercase">
                        Tambah Soal Baru
                      </h4>
                      <div className="space-y-3">
                        <input
                          type="text"
                          placeholder="Tulis pertanyaan di sini..."
                          value={newQuestion}
                          onChange={(e) => setNewQuestion(e.target.value)}
                          className="w-full p-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {newOptions.map((opt, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="correctOption"
                                checked={correctOption === i}
                                onChange={() => setCorrectOption(i)}
                              />
                              <input
                                type="text"
                                placeholder={`Pilihan ${String.fromCharCode(65 + i)}`}
                                value={opt}
                                onChange={(e) => {
                                  const newOpts = [...newOptions];
                                  newOpts[i] = e.target.value;
                                  setNewOptions(newOpts);
                                }}
                                className="flex-1 p-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded text-sm"
                              />
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={handleAddQuestion}
                          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded text-sm font-bold hover:bg-blue-700 flex items-center"
                        >
                          <Plus size={16} className="mr-2" /> Simpan Soal
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "LICENSE" && (
              <div className="bg-gray-50 dark:bg-slate-800/50 p-6 rounded-lg border border-gray-200 dark:border-slate-700">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                  <ShieldCheck className="mr-2 text-kodman-600" /> Perjanjian
                  Lisensi Eksklusif
                </h3>

                <div className="bg-white dark:bg-slate-900 p-4 rounded border border-gray-200 dark:border-slate-700 h-64 overflow-y-auto mb-4 text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                  <p className="mb-2 font-bold">PASAL 1: DEFINISI</p>
                  <p className="mb-4">
                    &quot;Konten&quot; merujuk pada seluruh materi video, teks,
                    kuis, dan aset digital yang diunggah. &quot;Platform&quot;
                    merujuk pada KMP - ADNG Academy.
                  </p>
                  <p className="mb-2 font-bold">
                    PASAL 2: HAK DISTRIBUSI & ASSEMBLING
                  </p>
                  <p className="mb-4">
                    1. Dengan mengunggah Konten ini, Creator memberikan Hak
                    Eksklusif kepada KMP - ADNG Academy untuk menayangkan,
                    mendistribusikan, dan menjual akses Konten kepada Student.
                    <br />
                    2. KMP - ADNG Academy bertindak sebagai Mediator dan
                    Pemegang Hak Kelola. Creator tidak diperkenankan menarik
                    konten secara sepihak tanpa persetujuan tertulis.
                    <br />
                    3. Mentor lain berhak menggunakan materi ini (Assembling)
                    untuk keperluan kelas Workshop/Live Class di dalam Platform
                    KMP - ADNG, dengan skema bagi hasil (Royalti) yang
                    ditetapkan sistem.
                  </p>
                  <p className="mb-2 font-bold">PASAL 3: KINERJA & MODERASI</p>
                  <p className="mb-4">
                    KMP - ADNG Academy berhak penuh untuk menurunkan (Unpublish)
                    konten dari etalase jika:
                    <br />
                    a. Rating rata-rata di bawah 3.0.
                    <br />
                    b. Materi terindikasi plagiat atau melanggar hukum.
                    <br />
                    c. Tidak ada aktivitas penjualan selama 6 bulan
                    berturut-turut.
                  </p>
                  <p className="font-bold text-red-600">
                    Dengan mencentang kotak di bawah, Anda mengikatkan diri
                    secara hukum terhadap perjanjian ini.
                  </p>
                </div>

                <label className="flex items-start gap-3 p-4 bg-white dark:bg-slate-900 border border-kodman-200 dark:border-kodman-800 rounded-lg cursor-pointer hover:bg-kodman-50 dark:hover:bg-kodman-900/10 transition">
                  <input
                    type="checkbox"
                    checked={licenseAccepted}
                    onChange={(e) => setLicenseAccepted(e.target.checked)}
                    className="w-5 h-5 mt-0.5 text-kodman-600 rounded focus:ring-kodman-500"
                  />
                  <div>
                    <span className="font-bold text-gray-900 dark:text-white">
                      Saya Menyetujui Syarat & Ketentuan Lisensi Eksklusif KMP -
                      ADNG Academy.
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      Saya memahami bahwa materi ini akan menjadi aset yang
                      dikelola KMP - ADNG Academy dan dapat digunakan oleh
                      Mentor lain (OEM Model) dengan pembagian royalti otomatis.
                    </p>
                  </div>
                </label>
              </div>
            )}

            <div className="pt-6 border-t border-gray-200 dark:border-slate-800 flex justify-end gap-3">
              <button
                onClick={() => setViewMode("LIST")}
                className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-kodman-600 text-white rounded hover:bg-kodman-700 font-bold flex items-center"
              >
                <Save size={16} className="mr-2" />{" "}
                {editingId ? "Simpan Perubahan" : "Publish Kursus"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER LIST ---
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Kursus Saya
        </h2>
        <button
          onClick={handleCreateNew}
          className="bg-kodman-600 text-white px-4 py-2 rounded flex items-center text-sm font-bold shadow-sm hover:bg-kodman-700"
        >
          <Plus size={18} className="mr-2" /> Buat Baru
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((course) => (
          <div
            key={course.id}
            className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col group"
          >
            <div className="relative h-40 bg-gray-200 dark:bg-slate-800 overflow-hidden">
              <img
                src={course.thumbnail}
                className="w-full h-full object-cover transition duration-300 group-hover:scale-110"
                alt=""
              />
              <div className="absolute top-2 right-2 px-2 py-1 bg-white/90 dark:bg-slate-900/90 rounded text-xs font-bold shadow-sm text-gray-800 dark:text-white">
                {course.status}
              </div>
            </div>
            <div className="p-4 flex-1 flex flex-col">
              <h3 className="font-bold text-gray-900 dark:text-white mb-1 line-clamp-1">
                {course.title}
              </h3>

              {/* Category Tags */}
              <div className="flex flex-wrap gap-1 mb-2">
                {course.categoryIds?.slice(0, 3).map((catId) => {
                  const cat = MOCK_CATEGORIES.find((c) => c.id === catId);
                  return cat ? (
                    <span
                      key={catId}
                      className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 rounded"
                    >
                      {cat.name}
                    </span>
                  ) : null;
                })}
              </div>

              <div className="flex items-center text-xs text-gray-500 dark:text-slate-400 mb-4 mt-auto">
                <PlayCircle size={14} className="mr-1" /> {course.sessions} Sesi
                <span className="mx-2">•</span>
                {course.type}
                {course.examConfig?.isEnabled && (
                  <>
                    <span className="mx-2">•</span>
                    <span
                      className="flex items-center text-green-600 dark:text-green-400 font-bold"
                      title="Sertifikat Tersedia"
                    >
                      <BookCheck size={14} className="mr-1" /> Sertifikat
                    </span>
                  </>
                )}
              </div>
              <div className="mt-auto flex gap-2">
                <button
                  onClick={() => handleEdit(course)}
                  className="flex-1 py-2 text-sm border border-gray-300 dark:border-slate-700 rounded hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300 font-medium"
                >
                  Edit
                </button>
                <button className="flex-1 py-2 text-sm bg-kodman-50 dark:bg-kodman-900/20 text-kodman-700 dark:text-kodman-300 rounded hover:bg-kodman-100 dark:hover:bg-kodman-900/30 font-medium">
                  Statistik
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CourseCreator;
