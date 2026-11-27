
import React from 'react';
import { Course, CourseType } from '../types';
import { X, PlayCircle, Clock, User, Star, ShoppingBag, Heart } from 'lucide-react';

interface CourseDetailModalProps {
  course: Course;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (course: Course) => void;
  onToggleWishlist: (course: Course) => void;
  isInWishlist: boolean;
}

const CourseDetailModal: React.FC<CourseDetailModalProps> = ({ 
  course, 
  isOpen, 
  onClose, 
  onAddToCart,
  onToggleWishlist,
  isInWishlist
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row relative">
        
        {/* Close Button Mobile */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 bg-black/50 text-white rounded-full md:hidden"
        >
          <X size={20} />
        </button>

        {/* Left Side: Visual & Quick Actions */}
        <div className="w-full md:w-2/5 bg-gray-100 dark:bg-slate-800 relative flex flex-col">
           <div className="h-56 md:h-64 relative">
              <img 
                src={course.thumbnail} 
                alt={course.title} 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-6">
                 <span className={`self-start px-2 py-1 rounded text-[10px] font-bold uppercase mb-2 ${course.type === CourseType.CERTIFICATION ? 'bg-amber-500 text-white' : 'bg-digitalcoop-600 text-white'}`}>
                    {course.type}
                 </span>
              </div>
           </div>
           
           <div className="p-6 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                 <div>
                    <p className="text-sm text-gray-500 dark:text-slate-400">Harga Kursus</p>
                    <h3 className="text-2xl font-bold text-digitalcoop-600 dark:text-digitalcoop-400">
                       {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(course.finalPrice ?? course.price)}
                    </h3>
                    {(course.finalPrice ?? course.price) < course.price && (
                       <p className="text-xs text-gray-400"><s>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(course.price)}</s> diskon {course.discountPercent}%{course.discountEndsAt ? ` sampai ${new Date(course.discountEndsAt).toLocaleDateString('id-ID')}` : ''}</p>
                    )}
                 </div>
                 <div className="flex items-center gap-1 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-1 rounded text-yellow-700 dark:text-yellow-500 font-bold text-sm">
                    <Star size={14} fill="currentColor" /> {course.rating}
                 </div>
              </div>

              <div className="space-y-3 mt-auto">
                 <button 
                    onClick={() => {
                       onAddToCart(course);
                       onClose();
                    }}
                    className="w-full py-3 bg-digitalcoop-600 hover:bg-digitalcoop-700 text-white rounded-xl font-bold shadow-lg flex items-center justify-center transition"
                 >
                    <ShoppingBag size={18} className="mr-2" /> {(course.finalPrice ?? course.price) === 0 ? 'Daftar Gratis' : 'Beli Kursus'}
                 </button>
                 <button 
                    onClick={() => onToggleWishlist(course)}
                    className={`w-full py-3 border rounded-xl font-bold flex items-center justify-center transition ${isInWishlist ? 'border-pink-500 text-pink-500 bg-pink-50 dark:bg-pink-900/20' : 'border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'}`}
                 >
                    <Heart size={18} className="mr-2" fill={isInWishlist ? "currentColor" : "none"} /> 
                    {isInWishlist ? 'Tersimpan di Wishlist' : 'Simpan ke Wishlist'}
                 </button>
              </div>
           </div>
        </div>

        {/* Right Side: Details & Syllabus */}
        <div className="w-full md:w-3/5 bg-white dark:bg-slate-900 flex flex-col max-h-[50vh] md:max-h-[90vh]">
           {/* Header Desktop */}
           <div className="hidden md:flex justify-between items-start p-6 border-b border-gray-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-tight pr-8">{course.title}</h2>
              <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition"><X size={24} /></button>
           </div>

           <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
              <div className="mb-8">
                 <h3 className="font-bold text-gray-900 dark:text-white mb-2">Tentang Kursus</h3>
                 <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                    {course.description}
                 </p>
                 <div className="flex items-center gap-4 mt-4 text-xs text-gray-500 dark:text-slate-400">
                    <span className="flex items-center"><User size={14} className="mr-1"/> {course.instructor}</span>
                    <span className="flex items-center"><PlayCircle size={14} className="mr-1"/> {course.sessions} Sesi Pembelajaran</span>
                    <span className="flex items-center"><Clock size={14} className="mr-1"/> Akses Selamanya</span>
                 </div>
              </div>

              <div>
                 <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center justify-between">
                    <span>Kurikulum & Materi</span>
                    <span className="text-xs font-normal text-gray-500 bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded">{course.modules?.length || 0} Modul</span>
                 </h3>
                 
                 <div className="space-y-3">
                    {course.modules && course.modules.length > 0 ? (
                       course.modules.map((mod, idx) => (
                          <div key={mod.id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition">
                             <div className="mt-0.5 text-digitalcoop-500">
                                {mod.isFreePreview ? <PlayCircle size={18} fill="currentColor" className="text-white" /> : <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-slate-600 flex items-center justify-center text-[10px] font-bold text-gray-400">{idx + 1}</div>}
                             </div>
                             <div className="flex-1">
                                <div className="flex justify-between items-start">
                                   <h4 className="text-sm font-bold text-gray-800 dark:text-slate-200">{mod.title}</h4>
                                   <span className="text-[10px] text-gray-400 font-mono ml-2">{mod.duration}</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{mod.description}</p>
                             </div>
                          </div>
                       ))
                    ) : (
                       <div className="text-center py-8 border border-dashed border-gray-200 dark:border-slate-700 rounded-lg">
                          <p className="text-sm text-gray-500">Preview kurikulum belum tersedia.</p>
                       </div>
                    )}
                 </div>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
};

export default CourseDetailModal;
