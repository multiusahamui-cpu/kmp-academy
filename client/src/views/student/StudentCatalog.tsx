
import React, { useCallback, useEffect, useState } from 'react';
import { MOCK_CATEGORIES } from '../../constants';
import { Play, Heart, Filter, X, Award, Ticket, Key, CheckCircle, Info } from 'lucide-react';
import { CourseType, Course, WishlistItem } from '../../types';
import ExamRoom from './ExamRoom';
import CourseDetailModal from '../../components/CourseDetailModal';
import { courseApi, userApi } from '../../services/api';
import { ApiCourse, mapApiCourse } from '../../services/mappers';
import { notifyProfileChanged, useProfile } from '../../services/profile';

interface StudentCatalogProps {
  enrolledOnly?: boolean;
  addToCart?: (course: Course) => void;
  onOpenLearning?: (courseId: string) => void;
  // Wishlist
  wishlistItems?: WishlistItem[];
  onToggleWishlist?: (course: Course) => void;
}

const StudentCatalog: React.FC<StudentCatalogProps> = ({ 
   enrolledOnly = false, 
   onOpenLearning = (_: string) => {},
   wishlistItems = [],
   onToggleWishlist = (_: Course) => {}
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeExamCourseId, setActiveExamCourseId] = useState<string | null>(null);
  
  const { profile } = useProfile();
  const [courses, setCourses] = useState<Course[]>([]);
  const [progressById, setProgressById] = useState<Record<string, number>>({});
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState('');

  const loadCourses = useCallback(async () => {
    setIsLoading(true);
    try {
      const mine = await userApi.getMyCourses();
      const rows: { enrollment: { progress?: number | null }; course: ApiCourse }[] = mine.data?.data ?? [];
      setEnrolledIds(new Set(rows.map((r) => r.course.id)));
      setProgressById(Object.fromEntries(rows.map((r) => [r.course.id, r.enrollment.progress ?? 0])));
      if (enrolledOnly) {
        setCourses(rows.map((r) => mapApiCourse(r.course)));
      } else {
        const all = await courseApi.getAll();
        setCourses(((all.data?.data ?? []) as ApiCourse[]).map(mapApiCourse));
      }
    } catch {
      setCourses([]);
      setNotice('Gagal memuat kursus. Coba muat ulang halaman.');
    } finally {
      setIsLoading(false);
    }
  }, [enrolledOnly]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  // Detail Modal State
  const [selectedCourseForDetail, setSelectedCourseForDetail] = useState<Course | null>(null);

  // Redeem Code State
  const [isRedeemOpen, setIsRedeemOpen] = useState(false);
  const [redeemCode, setRedeemCode] = useState('');
  const [redeemSuccessMsg, setRedeemSuccessMsg] = useState('');

  // Filter Logic
  const filteredCourses = courses.filter(c => {
    // 1. Basic Status Filter (daftar dari server sudah hanya kursus terbit)
    if (!enrolledOnly && c.status !== 'PUBLISHED') return false;

    // 2. Category Filter
    if (selectedCategory) {
      return c.categoryIds?.includes(selectedCategory);
    }

    return true;
  });

  // Sebelum payment gateway aktif hanya kursus gratis yang bisa diikuti.
  const handleEnroll = async (e: React.MouseEvent | null, course: Course) => {
    if (e) e.stopPropagation();
    if (course.price > 0) {
       setNotice('Kursus berbayar segera hadir. Pembayaran akan dilakukan lewat Virtual Account setelah payment gateway aktif.');
       return;
    }
    try {
       const res = await userApi.enroll(course.id);
       const card: string | null = res.data?.data?.cardNumber ?? null;
       setNotice(card ? `Berhasil mengikuti kursus. Kartu Student Anda terbit: ${card}` : 'Berhasil mengikuti kursus.');
       setSelectedCourseForDetail(null);
       notifyProfileChanged();
       loadCourses();
    } catch (err: unknown) {
       const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
       setNotice(msg || 'Gagal mengikuti kursus.');
    }
  };

  const handleWishlist = (e: React.MouseEvent | null, course: Course) => {
    if (e) e.stopPropagation();
    onToggleWishlist(course);
  };

  const openDetailModal = (e: React.MouseEvent, course: Course) => {
     e.stopPropagation();
     setSelectedCourseForDetail(course);
  };
  
  const handleRedeem = (e: React.FormEvent) => {
     e.preventDefault();
     if (redeemCode.length < 5) return;
     // Simulating redeem process
     setRedeemSuccessMsg(`Kode "${redeemCode}" berhasil ditukarkan! Kursus telah ditambahkan.`);
     setTimeout(() => {
        setRedeemSuccessMsg('');
        setIsRedeemOpen(false);
        setRedeemCode('');
     }, 3000);
  };

  if (activeExamCourseId) {
     return <ExamRoom courseId={activeExamCourseId} studentName={profile?.name ?? ""} onExit={() => setActiveExamCourseId(null)} />;
  }

  return (
    <div>
      {/* Detail Modal */}
      {selectedCourseForDetail && (
         <CourseDetailModal 
            course={selectedCourseForDetail}
            isOpen={!!selectedCourseForDetail}
            onClose={() => setSelectedCourseForDetail(null)}
            onAddToCart={(c) => handleEnroll(null, c)}
            onToggleWishlist={(c) => handleWishlist(null, c)}
            isInWishlist={wishlistItems.some(item => item.courseId === selectedCourseForDetail.id)}
         />
      )}

      {notice && (
         <div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
            <span>{notice}</span>
            <button onClick={() => setNotice('')} aria-label="Tutup"><X size={16} /></button>
         </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
         <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {enrolledOnly ? 'Kursus Saya' : 'Etalase Kursus'}
         </h2>
         <div className="flex gap-3 w-full md:w-auto">
            <button 
               onClick={() => setIsRedeemOpen(!isRedeemOpen)}
               className="flex-1 md:flex-none flex items-center justify-center px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg shadow-sm text-sm font-bold transition"
            >
               <Key size={16} className="mr-2" /> Redeem Access Code
            </button>
            {!enrolledOnly && (
               <button 
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className="md:hidden flex items-center px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-sm text-sm font-medium"
               >
                  <Filter size={16} className="mr-2" /> Filter Kategori
               </button>
            )}
         </div>
      </div>
      
      {isRedeemOpen && (
         <div className="mb-8 bg-gradient-to-r from-yellow-500 to-orange-500 p-6 rounded-lg shadow-md text-white animate-fade-in-down">
            <div className="flex justify-between items-start mb-4">
               <div>
                  <h3 className="text-lg font-bold">Punya Kode Aktivasi dari Sponsor?</h3>
                  <p className="text-yellow-100 text-sm">Masukkan kode unik yang diberikan oleh Koperasi atau Instansi Anda untuk mengakses kursus secara gratis.</p>
               </div>
               <button onClick={() => setIsRedeemOpen(false)} className="text-white/80 hover:text-white"><X size={24} /></button>
            </div>
            
            {redeemSuccessMsg ? (
               <div className="bg-white/20 p-4 rounded-lg flex items-center text-white font-bold animate-pulse">
                  <CheckCircle size={24} className="mr-2" />
                  {redeemSuccessMsg}
               </div>
            ) : (
               <form onSubmit={handleRedeem} className="flex gap-2">
                  <input 
                     type="text" 
                     value={redeemCode}
                     onChange={(e) => setRedeemCode(e.target.value)}
                     placeholder="Masukkan Kode (Contoh: KOP-MAKMUR-001)" 
                     className="flex-1 p-3 rounded text-gray-900 font-mono font-bold uppercase placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-white"
                  />
                  <button type="submit" className="px-6 py-3 bg-white text-orange-600 font-bold rounded shadow-lg hover:bg-gray-100">
                     Tukarkan Kode
                  </button>
               </form>
            )}
         </div>
      )}

      <div className="flex flex-col md:flex-row gap-8">
         {/* Sidebar Categories (Desktop & Mobile Toggle) */}
         {!enrolledOnly && (
            <aside className={`w-full md:w-64 flex-shrink-0 ${isFilterOpen ? 'block' : 'hidden md:block'}`}>
               <div className="bg-white dark:bg-slate-900 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 sticky top-6">
                  <div className="flex justify-between items-center mb-4">
                     <h3 className="font-bold text-gray-900 dark:text-white">Kategori</h3>
                     {selectedCategory && (
                        <button onClick={() => setSelectedCategory(null)} className="text-xs text-red-500 hover:underline">Reset</button>
                     )}
                  </div>
                  <div className="space-y-1">
                     <button
                        onClick={() => setSelectedCategory(null)}
                        className={`w-full text-left px-3 py-2 rounded text-sm transition ${!selectedCategory ? 'bg-kodman-50 dark:bg-kodman-900/30 text-kodman-700 dark:text-kodman-300 font-bold' : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                     >
                        Semua Kategori
                     </button>
                     {MOCK_CATEGORIES.map(cat => (
                        <button
                           key={cat.id}
                           onClick={() => setSelectedCategory(cat.id)}
                           className={`w-full text-left px-3 py-2 rounded text-sm flex justify-between items-center transition ${selectedCategory === cat.id ? 'bg-kodman-50 dark:bg-kodman-900/30 text-kodman-700 dark:text-kodman-300 font-bold' : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                        >
                           {cat.name}
                           <span className="text-xs bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-gray-500">{cat.count}</span>
                        </button>
                     ))}
                  </div>
               </div>
            </aside>
         )}

         {/* Course Grid */}
         <div className="flex-1">
            {enrolledOnly && filteredCourses.length > 0 && (
               <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6 text-blue-800 dark:text-blue-300 text-sm">
                  Selamat datang kembali! Lanjutkan progres belajar Anda hari ini.
               </div>
            )}

            {isLoading ? (
               <div className="text-center py-12 text-gray-500 dark:text-slate-400">Memuat kursus...</div>
            ) : filteredCourses.length === 0 ? (
               <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-lg border border-dashed border-gray-300 dark:border-slate-700">
                  <p className="text-gray-500 dark:text-slate-400">
                     {enrolledOnly ? 'Anda belum mengikuti kursus apa pun.' : 'Tidak ada kursus ditemukan.'}
                  </p>
                  {selectedCategory && (
                     <button onClick={() => setSelectedCategory(null)} className="mt-2 text-kodman-600 font-medium hover:underline">Lihat Semua Kursus</button>
                  )}
               </div>
            ) : (
               <div className={`grid grid-cols-1 ${enrolledOnly ? 'md:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-2'} gap-6`}>
                  {filteredCourses.map(course => {
                     const isInWishlist = wishlistItems.some(item => item.courseId === course.id);

                     return (
                        <div 
                           key={course.id} 
                           className={`bg-white dark:bg-slate-900 rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition flex flex-col group cursor-pointer ${course.type === CourseType.CERTIFICATION ? 'border-amber-200 ring-1 ring-amber-100 dark:border-amber-900' : 'border-gray-200 dark:border-slate-800'}`}
                           onClick={(e) => !enrolledOnly && openDetailModal(e, course)}
                        >
                           <div className="relative h-48">
                              <img src={course.thumbnail} className="w-full h-full object-cover transition duration-500 group-hover:scale-110" alt="" />
                              {course.type === CourseType.CERTIFICATION && (
                                 <div className="absolute top-0 right-0 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg shadow-sm z-10">
                                    Partner Certification
                                 </div>
                              )}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                                 {!enrolledOnly ? (
                                    <>
                                       <button 
                                       onClick={(e) => handleWishlist(e, course)}
                                       className={`p-2 bg-white rounded-full hover:scale-110 transition ${isInWishlist ? 'text-pink-500' : 'text-gray-700 hover:text-pink-500'}`} 
                                       title="Simpan ke Wishlist"
                                       >
                                          <Heart size={20} fill={isInWishlist ? "currentColor" : "none"} />
                                       </button>
                                       {course.price === 0 && !enrolledIds.has(course.id) && (
                                          <button 
                                          onClick={(e) => handleEnroll(e, course)}
                                          className="p-2 bg-kodman-600 rounded-full text-white hover:bg-kodman-700 hover:scale-110 transition" title="Ikuti Kursus Gratis"
                                          >
                                             <Play size={20} />
                                          </button>
                                       )}
                                    </>
                                 ) : (
                                    <button 
                                       onClick={() => onOpenLearning(course.id)}
                                       className="px-4 py-2 bg-white/90 text-gray-900 rounded-full font-bold text-sm hover:bg-white flex items-center shadow-lg transform translate-y-2 group-hover:translate-y-0 transition"
                                    >
                                       <Play size={16} className="mr-1 fill-current" /> Lanjut Belajar
                                    </button>
                                 )}
                              </div>
                           </div>
                           
                           <div className="p-5 flex-1 flex flex-col">
                              <div className="flex justify-between mb-2">
                                 <span className={`text-xs font-bold uppercase tracking-wider ${course.type === CourseType.CERTIFICATION ? 'text-amber-600' : 'text-gray-500 dark:text-slate-400'}`}>{course.type}</span>
                                 {enrolledOnly && <span className="text-xs text-green-600 font-bold">Sedang Berjalan</span>}
                              </div>
                              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 leading-tight">{course.title}</h3>
                              
                              {/* Tags in Card */}
                              {!enrolledOnly && (
                                 <div className="flex flex-wrap gap-1 mb-3">
                                    {course.categoryIds?.slice(0, 2).map(catId => {
                                       const cat = MOCK_CATEGORIES.find(c => c.id === catId);
                                       return cat ? <span key={catId} className="text-[10px] bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 px-1.5 py-0.5 rounded">{cat.name}</span> : null;
                                    })}
                                    {(course.categoryIds?.length || 0) > 2 && <span className="text-[10px] text-gray-400">+{(course.categoryIds?.length || 0) - 2}</span>}
                                 </div>
                              )}

                              <p className="text-sm text-gray-500 dark:text-slate-400 mb-4 line-clamp-2 flex-1">{course.description}</p>
                              
                              {enrolledOnly ? (
                                 <div className="space-y-2">
                                    {course.type === CourseType.CERTIFICATION ? (
                                       <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded mb-2 border border-amber-100">
                                          <strong>Jadwal Ujian:</strong> {course.examConfig?.examDate}
                                       </div>
                                    ) : (
                                       <div>
                                          <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-1.5 mb-2">
                                             <div className="bg-kodman-500 h-1.5 rounded-full" style={{width: `${progressById[course.id] ?? 0}%`}}></div>
                                          </div>
                                          <div className="flex justify-between items-center text-xs text-gray-500 dark:text-slate-400">
                                             <span>{progressById[course.id] ?? 0}% Selesai</span>
                                          </div>
                                       </div>
                                    )}
                                    
                                    <div className="flex gap-2">
                                       <button 
                                          onClick={() => onOpenLearning(course.id)}
                                          className="flex-1 py-2 bg-kodman-600 text-white rounded font-medium text-xs flex items-center justify-center hover:bg-kodman-700 transition shadow-sm"
                                       >
                                          <Play size={14} className="mr-2" /> Materi
                                       </button>
                                       {course.examConfig?.isEnabled && (
                                          <button 
                                            onClick={() => setActiveExamCourseId(course.id)}
                                            className="flex-1 py-2 bg-green-600 text-white rounded font-medium text-xs flex items-center justify-center hover:bg-green-700 shadow-sm transition"
                                          >
                                             {course.type === CourseType.CERTIFICATION ? (
                                                <><Ticket size={14} className="mr-2" /> Tiket Ujian</>
                                             ) : (
                                                <><Award size={14} className="mr-2" /> Ujian Akhir</>
                                             )}
                                          </button>
                                       )}
                                    </div>
                                 </div>
                              ) : (
                                 <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-slate-800">
                                    <span className="font-bold text-gray-900 dark:text-white">
                                       {course.price === 0
                                          ? 'Gratis'
                                          : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(course.price)}
                                       {course.price > 0 && <span className="ml-2 text-[10px] font-medium text-gray-400">Segera hadir</span>}
                                    </span>
                                    <button 
                                       onClick={(e) => openDetailModal(e, course)}
                                       className="px-4 py-2 border border-kodman-600 text-kodman-600 dark:text-kodman-400 dark:border-kodman-400 rounded text-sm font-medium hover:bg-kodman-50 dark:hover:bg-kodman-900/30 transition flex items-center"
                                    >
                                       <Info size={14} className="mr-2" /> Detail Kursus
                                    </button>
                                 </div>
                              )}
                           </div>
                        </div>
                     );
                  })}
               </div>
            )}
         </div>
      </div>
    </div>
  );
};

export default StudentCatalog;
