import React, { useState, useEffect, useCallback } from 'react';
import { Review, Certificate } from '../types';
import { ArrowLeft, PlayCircle, CheckCircle, FileText, Star, Send, Loader2, Award, AlignLeft, ExternalLink } from 'lucide-react';
import { reviewApi } from '../services/api';
import { courseAuthoringApi } from '../services/courses';
import { LearningDetail, LearningModule, findCertificateForCourse, learningApi } from '../services/learning';
import { apiMessage } from '../services/payments';
import CertificateTemplate from './CertificateTemplate';
import ExamRoom from '../views/student/ExamRoom';

interface ApiReview {
  id: string;
  user?: { id: string; name?: string } | null;
  rating: number;
  comment: string;
  createdAt: string;
  reply?: string | null;
}

interface LearningRoomProps {
  courseId: string;
  onBack: () => void;
}

interface ModuleContent { type: 'VIDEO' | 'PDF' | 'TEXT'; text?: string; url?: string }

const MODULE_LABEL: Record<string, string> = { VIDEO: 'VIDEO', PDF: 'PDF', TEXT: 'TEKS' };

const LearningRoom: React.FC<LearningRoomProps> = ({ courseId, onBack }) => {
  const [detail, setDetail] = useState<LearningDetail | null>(null);
  const [loadError, setLoadError] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [content, setContent] = useState<ModuleContent | null>(null);
  const [contentError, setContentError] = useState('');
  const [contentLoading, setContentLoading] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [notice, setNotice] = useState('');
  const [showExam, setShowExam] = useState(false);
  const [certView, setCertView] = useState<Certificate | null>(null);

  const [activeTab, setActiveTab] = useState<'DESCRIPTION' | 'REVIEWS'>('DESCRIPTION');
  const [courseReviews, setCourseReviews] = useState<Review[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviewMessage, setReviewMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [hasReviewed, setHasReviewed] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = (await learningApi.detail(courseId)).data.data as LearningDetail;
      setDetail(d);
      setLoadError('');
      setActiveId((cur) => cur ?? (d.modules.find((m) => !m.isCompleted) ?? d.modules[0])?.id ?? null);
    } catch (err) {
      setLoadError(apiMessage(err, 'Gagal memuat ruang belajar.'));
    }
  }, [courseId]);

  useEffect(() => { void load(); }, [load]);

  // Isi modul yang sedang dibuka.
  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    setContent(null); setContentError(''); setContentLoading(true);
    courseAuthoringApi.moduleContent(courseId, activeId)
      .then((res) => { if (!cancelled) setContent(res.data.data as ModuleContent); })
      .catch((err) => { if (!cancelled) setContentError(apiMessage(err, 'Gagal membuka materi.')); })
      .finally(() => { if (!cancelled) setContentLoading(false); });
    return () => { cancelled = true; };
  }, [courseId, activeId]);

  const fetchReviews = useCallback(async () => {
    setIsLoadingReviews(true);
    try {
      const res = await reviewApi.getByCourse(courseId);
      setCourseReviews(res.data.data.map((r: ApiReview) => ({
        id: r.id,
        courseId,
        userId: r.user?.id,
        userName: r.user?.name || 'Anonymous',
        rating: r.rating,
        comment: r.comment,
        createdAt: new Date(r.createdAt).toLocaleDateString('id-ID'),
        reply: r.reply ? { instructorName: 'Instructor', comment: r.reply, repliedAt: '' } : undefined,
      })));
    } catch (err) {
      console.error('Failed to fetch reviews', err);
    } finally {
      setIsLoadingReviews(false);
    }
  }, [courseId]);

  useEffect(() => { if (activeTab === 'REVIEWS') void fetchReviews(); }, [activeTab, fetchReviews]);

  const openCertificate = async () => {
    try {
      const cert = await findCertificateForCourse(courseId);
      if (cert) setCertView(cert); else setNotice('Sertifikat belum tersedia.');
    } catch (err) { setNotice(apiMessage(err, 'Gagal memuat sertifikat.')); }
  };

  const markComplete = async (mod: LearningModule) => {
    if (mod.isCompleted || completing) return;
    setCompleting(true); setNotice('');
    try {
      const r = (await learningApi.completeModule(courseId, mod.id)).data.data as { progress: number; completedModules: number; certificate: { created: boolean } | null };
      setDetail((d) => d && {
        ...d,
        progress: r.progress,
        completedModules: r.completedModules,
        modules: d.modules.map((m) => (m.id === mod.id ? { ...m, isCompleted: true } : m)),
      });
      if (r.certificate?.created) setNotice('Selamat! Semua materi selesai dan sertifikat Anda sudah terbit.');
      else if (r.progress === 100) setNotice('Semua materi selesai.');
      await load();
    } catch (err) {
      setNotice(apiMessage(err, 'Gagal menyimpan progres.'));
    } finally {
      setCompleting(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true); setReviewMessage(null);
    try {
      await reviewApi.create(courseId, { rating: newRating, comment: newComment });
      setHasReviewed(true);
      setReviewMessage({ ok: true, text: 'Terima kasih! Ulasan Anda berhasil dikirim.' });
      void fetchReviews();
      setNewComment('');
    } catch (err) {
      setReviewMessage({ ok: false, text: apiMessage(err, 'Gagal mengirim ulasan.') });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showExam) return <ExamRoom courseId={courseId} onExit={() => { setShowExam(false); void load(); }} />;

  if (loadError) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-gray-900 text-white">
        <p>{loadError}</p>
        <button onClick={onBack} className="rounded bg-kodman-600 px-4 py-2 text-sm font-bold">Kembali</button>
      </div>
    );
  }
  if (!detail) return <div className="flex h-screen items-center justify-center bg-gray-900 text-white"><Loader2 className="animate-spin" /></div>;

  const modules = detail.modules;
  const activeIdx = Math.max(0, modules.findIndex((m) => m.id === activeId));
  const active = modules[activeIdx];
  const next = modules[activeIdx + 1];
  const { exam, certificate } = detail;

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white overflow-hidden">
      {certView && <CertificateTemplate data={certView} onClose={() => setCertView(null)} />}

      <div className="h-16 bg-gray-800 border-b border-gray-700 flex items-center px-4 justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-700 rounded-full transition text-gray-400 hover:text-white"><ArrowLeft size={20} /></button>
          <div>
            <h1 className="font-bold text-sm md:text-base line-clamp-1">{detail.course.title}</h1>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span className="flex items-center"><PlayCircle size={12} className="mr-1" /> {modules.length ? activeIdx + 1 : 0} / {modules.length}</span>
              <span>•</span>
              <span>{detail.course.instructorName}</span>
            </div>
          </div>
        </div>
        <div className="hidden md:flex flex-col items-end">
          <span className="text-xs text-gray-400 mb-1">Progress Belajar: {detail.progress}%</span>
          <div className="w-40 h-1.5 bg-gray-700 rounded-full"><div className="h-1.5 bg-green-500 rounded-full transition-all" style={{ width: `${detail.progress}%` }} /></div>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <div className="flex-1 flex flex-col bg-black relative overflow-y-auto">
          {!active ? (
            <div className="p-12 text-center text-gray-400">Kursus ini belum memiliki materi.</div>
          ) : (
            <div className="bg-black">
              {contentLoading && <div className="aspect-video flex items-center justify-center"><Loader2 className="animate-spin text-gray-400" /></div>}
              {contentError && <div className="aspect-video flex items-center justify-center p-6 text-center text-sm text-red-400">{contentError}</div>}
              {content?.type === 'VIDEO' && content.url && (
                <video key={active.id} src={content.url} controls controlsList="nodownload" className="w-full aspect-video bg-black" onEnded={() => void markComplete(active)} />
              )}
              {content?.type === 'PDF' && content.url && (
                <div>
                  <iframe key={active.id} src={content.url} title={active.title} className="w-full h-[70vh] bg-white" />
                  <a href={content.url} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1 bg-gray-800 py-2 text-xs text-kodman-400 hover:underline"><ExternalLink size={12} /> Buka di tab baru</a>
                </div>
              )}
              {content?.type === 'TEXT' && (
                <div className="min-h-[40vh] bg-gray-900 p-6 md:p-8"><p className="max-w-3xl whitespace-pre-line text-sm leading-relaxed text-gray-200">{content.text}</p></div>
              )}
            </div>
          )}

          <div className="p-6 md:p-8 bg-gray-900 flex-1">
            {active && (
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-gray-800 pb-4">
                <h2 className="text-lg font-bold">{active.title}</h2>
                <div className="flex gap-2">
                  {!active.isCompleted ? (
                    <button disabled={completing} onClick={() => void markComplete(active)} className="flex items-center gap-2 rounded bg-green-600 px-4 py-2 text-sm font-bold hover:bg-green-700 disabled:opacity-50">
                      {completing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />} Tandai Selesai
                    </button>
                  ) : (
                    <span className="flex items-center gap-1 text-sm font-bold text-green-400"><CheckCircle size={16} /> Selesai</span>
                  )}
                  {next && <button onClick={() => setActiveId(next.id)} className="rounded border border-gray-600 px-4 py-2 text-sm font-medium hover:bg-gray-800">Modul Berikutnya</button>}
                </div>
              </div>
            )}
            {notice && (
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-green-700 bg-green-900/30 p-3 text-sm text-green-200">
                <span>{notice}</span>
                {certificate && <button onClick={() => void openCertificate()} className="font-bold text-green-300 underline">Lihat Sertifikat</button>}
              </div>
            )}

            <div className="flex gap-6 border-b border-gray-700 mb-6">
              {([['DESCRIPTION', 'Deskripsi'], ['REVIEWS', 'Ulasan & Rating']] as const).map(([id, label]) => (
                <button key={id} onClick={() => setActiveTab(id)} className={`pb-3 border-b-2 font-bold text-sm transition ${activeTab === id ? 'border-kodman-500 text-kodman-400' : 'border-transparent text-gray-400 hover:border-gray-600'}`}>{label}</button>
              ))}
            </div>

            {activeTab === 'DESCRIPTION' && (
              <div className="max-w-3xl space-y-6">
                {active?.description && <div><h3 className="mb-2 font-bold">Tentang Modul Ini</h3><p className="whitespace-pre-line text-sm leading-relaxed text-gray-400">{active.description}</p></div>}
                {detail.course.description && <div><h3 className="mb-2 font-bold">Tentang Kursus</h3><p className="whitespace-pre-line text-sm leading-relaxed text-gray-400">{detail.course.description}</p></div>}
              </div>
            )}

            {activeTab === 'REVIEWS' && (
              <div className="max-w-2xl">
                {!hasReviewed && (
                  <div className="bg-gray-800 p-4 rounded-lg mb-8 border border-gray-700">
                    <h3 className="font-bold text-sm mb-3">Tulis Ulasan Anda</h3>
                    <form onSubmit={handleSubmitReview}>
                      <div className="flex items-center gap-2 mb-3">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button type="button" key={star} onClick={() => setNewRating(star)} className={`transition ${star <= newRating ? 'text-yellow-400' : 'text-gray-600'}`}><Star size={24} fill="currentColor" /></button>
                        ))}
                        <span className="ml-2 text-sm text-gray-400">{newRating === 5 ? 'Sangat Puas' : newRating === 4 ? 'Puas' : 'Cukup'}</span>
                      </div>
                      <textarea className="w-full bg-gray-900 border border-gray-700 rounded p-3 text-sm text-white focus:ring-1 focus:ring-kodman-500 outline-none mb-3" rows={3}
                        placeholder="Bagaimana pengalaman belajar Anda? Ceritakan di sini..." value={newComment} onChange={(e) => setNewComment(e.target.value)} required />
                      <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-kodman-600 text-white rounded font-bold text-sm hover:bg-kodman-700 flex items-center disabled:opacity-50">
                        {isSubmitting ? <Loader2 size={14} className="mr-2 animate-spin" /> : <Send size={14} className="mr-2" />} Kirim Ulasan
                      </button>
                    </form>
                  </div>
                )}
                {reviewMessage && <p className={`mb-4 text-sm ${reviewMessage.ok ? 'text-green-400' : 'text-red-400'}`}>{reviewMessage.text}</p>}
                {isLoadingReviews ? (
                  <div className="text-center py-8 text-gray-500"><Loader2 size={24} className="animate-spin mx-auto mb-2" /> Memuat ulasan...</div>
                ) : (
                  <div className="space-y-6">
                    {courseReviews.length === 0 ? <p className="text-gray-500 text-sm">Belum ada ulasan untuk kursus ini. Jadilah yang pertama!</p> : courseReviews.map((rev) => (
                      <div key={rev.id} className="border-b border-gray-800 pb-6 last:border-0">
                        <div className="flex items-start gap-3 mb-2">
                          <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center font-bold text-xs text-gray-300">{rev.userName.charAt(0)}</div>
                          <div>
                            <p className="font-bold text-sm text-white">{rev.userName}</p>
                            <div className="flex items-center gap-2">
                              <div className="flex text-yellow-500">{[...Array(5)].map((_, i) => <Star key={i} size={10} fill={i < rev.rating ? 'currentColor' : 'none'} />)}</div>
                              <span className="text-[10px] text-gray-500">{rev.createdAt}</span>
                            </div>
                          </div>
                        </div>
                        <p className="text-sm text-gray-300 leading-relaxed ml-11">{rev.comment}</p>
                        {rev.reply && (
                          <div className="ml-11 mt-3 bg-gray-800/50 p-3 rounded border-l-2 border-kodman-500">
                            <p className="text-xs font-bold text-kodman-400 mb-1">Respon Instruktur</p>
                            <p className="text-xs text-gray-400">{rev.reply.comment}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="w-full md:w-80 bg-gray-800 border-l border-gray-700 flex flex-col shrink-0 h-1/2 md:h-auto">
          <div className="p-4 border-b border-gray-700 bg-gray-800 sticky top-0 z-10">
            <h3 className="font-bold text-sm">Konten Kursus</h3>
            <p className="text-xs text-gray-400">{detail.completedModules} dari {detail.totalModules} modul selesai</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {modules.map((mod, idx) => (
              <div key={mod.id} onClick={() => setActiveId(mod.id)} className={`p-4 border-b border-gray-700/50 cursor-pointer hover:bg-gray-700/50 transition flex gap-3 ${activeIdx === idx ? 'bg-gray-700/80' : ''}`}>
                <div className="mt-1">
                  {mod.isCompleted ? <CheckCircle size={16} className="text-green-500" /> : <div className={`w-4 h-4 rounded-full border-2 ${activeIdx === idx ? 'border-kodman-400' : 'border-gray-500'}`} />}
                </div>
                <div>
                  <h4 className={`text-sm font-medium mb-1 ${activeIdx === idx ? 'text-white' : 'text-gray-400'}`}>{idx + 1}. {mod.title}</h4>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    {mod.type === 'VIDEO' ? <PlayCircle size={10} /> : mod.type === 'PDF' ? <FileText size={10} /> : <AlignLeft size={10} />}
                    <span className="px-1.5 py-0.5 bg-gray-700 rounded text-[10px]">{MODULE_LABEL[mod.type]}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {(exam.enabled || certificate) && (
            <div className="border-t border-gray-700 bg-gray-800 p-4 space-y-3">
              {exam.enabled && (
                <div>
                  <h4 className="flex items-center gap-2 text-sm font-bold"><Award size={16} className="text-yellow-400" /> Ujian Akhir</h4>
                  <p className="mt-1 text-xs text-gray-400">
                    {exam.questionCount} soal · {exam.durationMinutes} menit · nilai lulus {exam.passingGrade} · kesempatan {exam.attemptsUsed}/{exam.maxAttempts}
                  </p>
                  {exam.passed ? (
                    <p className="mt-2 text-xs font-bold text-green-400">Lulus{exam.bestScore !== null ? ` (skor terbaik ${exam.bestScore})` : ''}</p>
                  ) : exam.eligible ? (
                    <button onClick={() => setShowExam(true)} className="mt-2 w-full rounded bg-green-600 py-2 text-sm font-bold hover:bg-green-700">{exam.hasOpenAttempt ? 'Lanjutkan Ujian' : 'Mulai Ujian'}</button>
                  ) : (
                    <p className="mt-2 text-xs text-amber-300">{exam.reason}</p>
                  )}
                </div>
              )}
              {certificate && <button onClick={() => void openCertificate()} className="w-full rounded border border-kodman-500 py-2 text-sm font-bold text-kodman-300 hover:bg-kodman-900/30">Lihat Sertifikat</button>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LearningRoom;
