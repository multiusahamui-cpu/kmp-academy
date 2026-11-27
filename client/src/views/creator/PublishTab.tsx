import React, { useState } from 'react';
import { CheckCircle, Circle, Loader2, ShieldCheck } from 'lucide-react';
import { CourseDetail, courseAuthoringApi } from '../../services/courses';
import { apiMessage } from '../../services/payments';
import { btnPrimary } from './ui';

interface Props {
  course: CourseDetail;
  editable: boolean;
  onChanged: () => void;
}

const PublishTab: React.FC<Props> = ({ course, editable, onChanged }) => {
  const [accepted, setAccepted] = useState(!!course.licenseAcceptedAt);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [problems, setProblems] = useState<string[]>([]);
  const [done, setDone] = useState('');

  const emptyModules = course.modules.filter((m) => !m.hasContent).length;
  const checks: [boolean, string][] = [
    [(course.title ?? '').trim().length >= 5, 'Judul kursus valid'],
    [(course.description ?? '').trim().length >= 30, 'Deskripsi minimal 30 karakter'],
    [course.modules.length > 0, 'Minimal satu modul'],
    [course.modules.length > 0 && emptyModules === 0, 'Semua modul sudah memiliki isi'],
    [!course.exam.enabled || course.exam.questionCount >= 3, course.exam.enabled ? `Ujian aktif memiliki minimal 3 soal (sekarang ${course.exam.questionCount})` : 'Ujian tidak diaktifkan (opsional)'],
    [accepted, 'Perjanjian lisensi disetujui'],
  ];

  const submit = async () => {
    setBusy(true); setError(''); setProblems([]);
    try {
      await courseAuthoringApi.publish(course.id, accepted);
      setDone('Kursus diajukan. Admin atau Direktur akan meninjau sebelum terbit.');
      onChanged();
    } catch (err) {
      const data = (err as { response?: { data?: { problems?: string[] } } })?.response?.data;
      if (data?.problems?.length) setProblems(data.problems);
      setError(apiMessage(err, 'Gagal mengajukan kursus.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {course.status === 'REJECTED' && course.reviewNote && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          <p className="font-bold">Kursus ditolak pada review sebelumnya</p>
          <p>{course.reviewNote}</p>
          <p className="mt-1 text-xs">Perbaiki lalu ajukan kembali.</p>
        </div>
      )}
      {course.status === 'PENDING_REVIEW' && <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">Kursus sedang menunggu review. Perubahan tidak dapat dilakukan selama review.</div>}
      {course.status === 'PUBLISHED' && <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300">Kursus sudah terbit. Harga dasar terkunci; Anda tetap dapat mengatur diskon dan kode promo di tab Diskon & Promo.</div>}

      <div className="space-y-2 rounded-xl border border-gray-200 p-4 dark:border-slate-700">
        <h4 className="text-sm font-bold text-gray-900 dark:text-white">Kesiapan</h4>
        {checks.map(([ok, label]) => (
          <p key={label} className={`flex items-center gap-2 text-sm ${ok ? 'text-green-700 dark:text-green-400' : 'text-gray-500 dark:text-slate-400'}`}>
            {ok ? <CheckCircle size={16} /> : <Circle size={16} />} {label}
          </p>
        ))}
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 dark:border-slate-700 dark:bg-slate-800/50">
        <h3 className="mb-4 flex items-center text-lg font-bold text-gray-900 dark:text-white"><ShieldCheck className="mr-2 text-digitalcoop-600" /> Perjanjian Lisensi Eksklusif</h3>
        <div className="mb-4 h-56 overflow-y-auto rounded border border-gray-200 bg-white p-4 text-sm leading-relaxed text-gray-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          <p className="mb-2 font-bold">PASAL 1: DEFINISI</p>
          <p className="mb-4">&quot;Konten&quot; merujuk pada seluruh materi video, teks, kuis, dan aset digital yang diunggah. &quot;Platform&quot; merujuk pada KMP - ADNG Academy.</p>
          <p className="mb-2 font-bold">PASAL 2: HAK DISTRIBUSI & ASSEMBLING</p>
          <p className="mb-4">
            1. Dengan mengunggah Konten ini, Creator memberikan Hak Eksklusif kepada KMP - ADNG Academy untuk menayangkan, mendistribusikan, dan menjual akses Konten kepada Student.<br />
            2. KMP - ADNG Academy bertindak sebagai Mediator dan Pemegang Hak Kelola. Creator tidak diperkenankan menarik konten secara sepihak tanpa persetujuan tertulis.<br />
            3. Mentor lain berhak menggunakan materi ini (Assembling) untuk keperluan kelas Workshop/Live Class di dalam Platform KMP - ADNG, dengan skema bagi hasil (Royalti) yang ditetapkan sistem.
          </p>
          <p className="mb-2 font-bold">PASAL 3: KINERJA & MODERASI</p>
          <p className="mb-4">KMP - ADNG Academy berhak penuh untuk menurunkan (Unpublish) konten dari etalase jika:<br />a. Rating rata-rata di bawah 3.0.<br />b. Materi terindikasi plagiat atau melanggar hukum.<br />c. Tidak ada aktivitas penjualan selama 6 bulan berturut-turut.</p>
          <p className="font-bold text-red-600">Dengan mencentang kotak di bawah, Anda mengikatkan diri secara hukum terhadap perjanjian ini.</p>
        </div>
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-digitalcoop-200 bg-white p-4 dark:border-digitalcoop-800 dark:bg-slate-900">
          <input type="checkbox" disabled={!editable} checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5 h-5 w-5" />
          <span>
            <span className="font-bold text-gray-900 dark:text-white">Saya menyetujui Syarat & Ketentuan Lisensi Eksklusif KMP - ADNG Academy.</span>
            <span className="mt-1 block text-xs text-gray-500">Persetujuan dicatat bersama versi perjanjian dan waktunya saat Anda mengajukan kursus.</span>
          </span>
        </label>
      </div>

      {problems.length > 0 && <ul className="list-disc space-y-1 pl-5 text-sm text-red-600">{problems.map((p) => <li key={p}>{p}</li>)}</ul>}
      {error && problems.length === 0 && <p className="text-sm text-red-600">{error}</p>}
      {done && <p className="text-sm text-green-600">{done}</p>}
      {editable && <button disabled={busy} onClick={() => void submit()} className={`${btnPrimary} flex items-center gap-2`}>{busy && <Loader2 size={14} className="animate-spin" />} Ajukan untuk Terbit</button>}
    </div>
  );
};

export default PublishTab;
