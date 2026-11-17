
import React, { useState, useEffect, useCallback } from 'react';
import { Review } from '../types';

interface ApiReview {
  id: string;
  user?: { id: string; name?: string } | null;
  rating: number;
  comment: string;
  createdAt: string;
  reply?: string | null;
}
import { MOCK_COURSES } from '../constants';
import { ArrowLeft, PlayCircle, CheckCircle, FileText, Download, Star, Send, Loader2 } from 'lucide-react';
import { reviewApi } from '../services/api';

interface LearningRoomProps {
  courseId: string;
  onBack: () => void;
}

const LearningRoom: React.FC<LearningRoomProps> = ({ courseId, onBack }) => {
  const course = MOCK_COURSES.find(c => c.id === courseId);
  const [activeModule, setActiveModule] = useState(0);
  const [isVideoCompleted, setIsVideoCompleted] = useState(false);
  
  // Tab State
  const [activeTab, setActiveTab] = useState<'DESCRIPTION' | 'REVIEWS' | 'RESOURCES'>('DESCRIPTION');

  // Review State - Connected to Backend
  const [courseReviews, setCourseReviews] = useState<Review[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [hasReviewed, setHasReviewed] = useState(false);

  const fetchReviews = useCallback(async () => {
    setIsLoadingReviews(true);
    try {
      const res = await reviewApi.getByCourse(courseId);
      // Map API Response to UI Type
      const mappedReviews = res.data.data.map((r: ApiReview) => ({
         id: r.id,
         courseId: courseId,
         userId: r.user?.id,
         userName: r.user?.name || 'Anonymous',
         rating: r.rating,
         comment: r.comment,
         createdAt: new Date(r.createdAt).toLocaleDateString('id-ID'),
         reply: r.reply ? {
            instructorName: 'Instructor',
            comment: r.reply,
            repliedAt: ''
         } : undefined
      }));
      setCourseReviews(mappedReviews);
    } catch (err) {
      console.error("Failed to fetch reviews", err);
    } finally {
      setIsLoadingReviews(false);
    }
  }, [courseId]);

  // --- EFFECT: Load Reviews from DB ---
  useEffect(() => {
    if (activeTab === 'REVIEWS') {
      fetchReviews();
    }
  }, [activeTab, fetchReviews]);

  if (!course) return <div>Kursus tidak ditemukan</div>;

  const modules = Array.from({ length: course.sessions }, (_, i) => ({
    id: i,
    title: `Modul ${i + 1}: ${i === 0 ? 'Pendahuluan & Konsep Dasar' : i === course.sessions - 1 ? 'Kesimpulan & Project Akhir' : 'Pembahasan Mendalam Topik ' + (i)}`,
    duration: '15:30',
    type: 'VIDEO',
    isCompleted: i < 3 
  }));

  const handleSubmitReview = async (e: React.FormEvent) => {
     e.preventDefault();
     setIsSubmitting(true);
     try {
        await reviewApi.create(course.id, {
           rating: newRating,
           comment: newComment
        });
        
        setHasReviewed(true);
        alert("Terima kasih! Ulasan Anda berhasil dikirim ke server.");
        
        // Refresh reviews list
        fetchReviews();
        setNewComment('');
     } catch (error: unknown) {
        console.error(error);
        const errMsg = (error as { response?: { data?: { message?: string } } }).response?.data?.message || "Gagal mengirim ulasan.";
        alert(`Gagal: ${errMsg} (Pastikan Anda sudah Enroll course ini di Backend)`);
     } finally {
        setIsSubmitting(false);
     }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white overflow-hidden">
      {/* Header */}
      <div className="h-16 bg-gray-800 border-b border-gray-700 flex items-center px-4 justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-700 rounded-full transition text-gray-400 hover:text-white">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="font-bold text-sm md:text-base line-clamp-1">{course.title}</h1>
            <div className="flex items-center gap-2 text-xs text-gray-400">
               <span className="flex items-center"><PlayCircle size={12} className="mr-1" /> {activeModule + 1} / {modules.length}</span>
               <span>•</span>
               <span>{course.instructor}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <div className="hidden md:flex flex-col items-end mr-4">
              <span className="text-xs text-gray-400 mb-1">Progress Belajar</span>
              <div className="w-32 h-1.5 bg-gray-700 rounded-full">
                 <div className="h-1.5 bg-green-500 rounded-full" style={{ width: '35%' }}></div>
              </div>
           </div>
           <button className="px-4 py-2 bg-kodman-600 hover:bg-kodman-700 rounded text-sm font-bold">
              Tanya Mentor
           </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Main Content (Video Player) */}
        <div className="flex-1 flex flex-col bg-black relative overflow-y-auto">
           <div className="aspect-video bg-black flex items-center justify-center relative group cursor-pointer">
              {/* Fake Video Player UI */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 opacity-0 group-hover:opacity-100 transition duration-300 z-10 flex flex-col justify-between p-4">
                 <h2 className="text-lg font-bold">{modules[activeModule].title}</h2>
                 <div className="flex items-center gap-4">
                    <button onClick={() => setIsVideoCompleted(!isVideoCompleted)} className="text-white hover:text-green-400">
                       {isVideoCompleted ? <CheckCircle size={32} className="text-green-500" /> : <div className="w-8 h-8 rounded-full border-2 border-white"></div>}
                    </button>
                    <div className="flex-1 h-1 bg-white/30 rounded-full">
                       <div className="w-1/3 h-1 bg-red-600 rounded-full"></div>
                    </div>
                    <span className="text-xs font-mono">05:20 / {modules[activeModule].duration}</span>
                 </div>
              </div>
              
              <PlayCircle size={64} className="text-white/80 group-hover:scale-110 transition duration-300" />
              <img 
                src={`https://picsum.photos/seed/${course.id}-${activeModule}/800/450`} 
                className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none" 
                alt="Video Thumbnail" 
              />
           </div>

           {/* Content Tabs / Description */}
           <div className="p-6 md:p-8 bg-gray-900">
              <div className="flex gap-6 border-b border-gray-700 mb-6">
                 <button 
                    onClick={() => setActiveTab('DESCRIPTION')}
                    className={`pb-3 border-b-2 font-bold text-sm transition ${activeTab === 'DESCRIPTION' ? 'border-kodman-500 text-kodman-400' : 'border-transparent text-gray-400 hover:border-gray-600'}`}
                 >
                    Deskripsi
                 </button>
                 <button 
                    onClick={() => setActiveTab('REVIEWS')}
                    className={`pb-3 border-b-2 font-bold text-sm transition ${activeTab === 'REVIEWS' ? 'border-kodman-500 text-kodman-400' : 'border-transparent text-gray-400 hover:border-gray-600'}`}
                 >
                    Ulasan & Rating
                 </button>
                 <button 
                    onClick={() => setActiveTab('RESOURCES')}
                    className={`pb-3 border-b-2 font-bold text-sm transition ${activeTab === 'RESOURCES' ? 'border-kodman-500 text-kodman-400' : 'border-transparent text-gray-400 hover:border-gray-600'}`}
                 >
                    Resources
                 </button>
              </div>

              {activeTab === 'DESCRIPTION' && (
                 <div className="animate-fade-in-up">
                    <h2 className="text-xl font-bold mb-4">Tentang Modul Ini</h2>
                    <p className="text-gray-400 text-sm leading-relaxed mb-6">
                       Dalam modul ini, kita akan mempelajari dasar-dasar fundamental yang menjadi pondasi utama. 
                       Pastikan Anda telah mengunduh aset materi yang tersedia di tab Resources sebelum melanjutkan ke video berikutnya.
                    </p>
                 </div>
              )}

              {activeTab === 'REVIEWS' && (
                 <div className="animate-fade-in-up max-w-2xl">
                    {/* Submission Form */}
                    {!hasReviewed && (
                       <div className="bg-gray-800 p-4 rounded-lg mb-8 border border-gray-700">
                          <h3 className="font-bold text-sm mb-3">Tulis Ulasan Anda (Real API)</h3>
                          <form onSubmit={handleSubmitReview}>
                             <div className="flex items-center gap-2 mb-3">
                                {[1, 2, 3, 4, 5].map((star) => (
                                   <button 
                                      type="button" 
                                      key={star}
                                      onClick={() => setNewRating(star)}
                                      className={`transition ${star <= newRating ? 'text-yellow-400' : 'text-gray-600'}`}
                                   >
                                      <Star size={24} fill="currentColor" />
                                   </button>
                                ))}
                                <span className="ml-2 text-sm text-gray-400">
                                   {newRating === 5 ? 'Sangat Puas' : newRating === 4 ? 'Puas' : 'Cukup'}
                                </span>
                             </div>
                             <textarea 
                                className="w-full bg-gray-900 border border-gray-700 rounded p-3 text-sm text-white focus:ring-1 focus:ring-kodman-500 outline-none mb-3"
                                rows={3}
                                placeholder="Bagaimana pengalaman belajar Anda? Ceritakan di sini..."
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                required
                             ></textarea>
                             <button 
                                type="submit" 
                                disabled={isSubmitting}
                                className="px-4 py-2 bg-kodman-600 text-white rounded font-bold text-sm hover:bg-kodman-700 flex items-center disabled:opacity-50"
                             >
                                {isSubmitting ? <Loader2 size={14} className="mr-2 animate-spin" /> : <Send size={14} className="mr-2" />}
                                Kirim Ulasan
                             </button>
                          </form>
                       </div>
                    )}

                    {/* Review List */}
                    {isLoadingReviews ? (
                        <div className="text-center py-8 text-gray-500">
                            <Loader2 size={24} className="animate-spin mx-auto mb-2" />
                            Memuat ulasan dari server...
                        </div>
                    ) : (
                        <div className="space-y-6">
                        {courseReviews.length === 0 ? (
                            <p className="text-gray-500 text-sm">Belum ada ulasan untuk kursus ini. Jadilah yang pertama!</p>
                        ) : (
                            courseReviews.map(rev => (
                                <div key={rev.id} className="border-b border-gray-800 pb-6 last:border-0">
                                    <div className="flex items-start gap-3 mb-2">
                                    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center font-bold text-xs text-gray-300">
                                        {rev.userName.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-white">{rev.userName}</p>
                                        <div className="flex items-center gap-2">
                                            <div className="flex text-yellow-500">
                                                {[...Array(5)].map((_, i) => (
                                                <Star key={i} size={10} fill={i < rev.rating ? "currentColor" : "none"} />
                                                ))}
                                            </div>
                                            <span className="text-[10px] text-gray-500">{rev.createdAt}</span>
                                        </div>
                                    </div>
                                    </div>
                                    <p className="text-sm text-gray-300 leading-relaxed ml-11">
                                    {rev.comment}
                                    </p>
                                    {/* Instructor Reply */}
                                    {rev.reply && (
                                    <div className="ml-11 mt-3 bg-gray-800/50 p-3 rounded border-l-2 border-kodman-500">
                                        <p className="text-xs font-bold text-kodman-400 mb-1">
                                            Respon Instruktur
                                        </p>
                                        <p className="text-xs text-gray-400">{rev.reply.comment}</p>
                                    </div>
                                    )}
                                </div>
                            ))
                        )}
                        </div>
                    )}
                 </div>
              )}

              {activeTab === 'RESOURCES' && (
                 <div className="animate-fade-in-up">
                    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                       <h3 className="font-bold text-sm mb-3 flex items-center"><Download size={16} className="mr-2"/> Download Materi</h3>
                       <div className="space-y-2">
                          <div className="flex items-center justify-between p-2 hover:bg-gray-700 rounded transition cursor-pointer">
                             <div className="flex items-center gap-3">
                                <FileText size={18} className="text-blue-400" />
                                <span className="text-sm">Slide Presentasi (PDF)</span>
                             </div>
                             <span className="text-xs text-gray-500">2.4 MB</span>
                          </div>
                          <div className="flex items-center justify-between p-2 hover:bg-gray-700 rounded transition cursor-pointer">
                             <div className="flex items-center gap-3">
                                <FileText size={18} className="text-yellow-400" />
                                <span className="text-sm">Source Code Latihan (ZIP)</span>
                             </div>
                             <span className="text-xs text-gray-500">5.1 MB</span>
                          </div>
                       </div>
                    </div>
                 </div>
              )}
           </div>
        </div>

        {/* Sidebar (Playlist) */}
        <div className="w-full md:w-80 bg-gray-800 border-l border-gray-700 flex flex-col shrink-0 h-1/2 md:h-auto">
           <div className="p-4 border-b border-gray-700 bg-gray-800 sticky top-0 z-10">
              <h3 className="font-bold text-sm">Konten Kursus</h3>
           </div>
           <div className="flex-1 overflow-y-auto">
              {modules.map((mod, idx) => (
                 <div 
                   key={mod.id} 
                   onClick={() => setActiveModule(idx)}
                   className={`p-4 border-b border-gray-700/50 cursor-pointer hover:bg-gray-700/50 transition flex gap-3 ${activeModule === idx ? 'bg-gray-700/80' : ''}`}
                 >
                    <div className="mt-1">
                       {mod.isCompleted ? (
                          <CheckCircle size={16} className="text-green-500" />
                       ) : (
                          <div className={`w-4 h-4 rounded-full border-2 ${activeModule === idx ? 'border-kodman-400' : 'border-gray-500'}`}></div>
                       )}
                    </div>
                    <div>
                       <h4 className={`text-sm font-medium mb-1 ${activeModule === idx ? 'text-white' : 'text-gray-400'}`}>
                          {mod.title}
                       </h4>
                       <div className="flex items-center gap-2 text-xs text-gray-500">
                          <PlayCircle size={10} />
                          <span>{mod.duration}</span>
                          {mod.type === 'VIDEO' && <span className="px-1.5 py-0.5 bg-gray-700 rounded text-[10px]">VIDEO</span>}
                       </div>
                    </div>
                 </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
};

export default LearningRoom;
