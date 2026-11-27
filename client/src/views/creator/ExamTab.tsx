import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Pencil, Trash2 } from 'lucide-react';
import { ExamDto, ExamQuestionDto, courseAuthoringApi } from '../../services/courses';
import { apiMessage } from '../../services/payments';
import { btnGhost, btnPrimary, inputClass } from './ui';

interface Props { courseId: string; editable: boolean; onChanged: () => void }

const ExamTab: React.FC<Props> = ({ courseId, editable, onChanged }) => {
  const [exam, setExam] = useState<ExamDto | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [passing, setPassing] = useState(70);
  const [duration, setDuration] = useState(60);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correct, setCorrect] = useState(0);
  const [editQid, setEditQid] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try {
      const d = (await courseAuthoringApi.getExam(courseId)).data.data as ExamDto;
      setExam(d); setEnabled(d.enabled); setPassing(d.passingGrade); setDuration(d.durationMinutes);
    } catch (err) { setError(apiMessage(err, 'Gagal memuat ujian.')); }
  }, [courseId]);
  useEffect(() => { void load(); }, [load]);

  const run = async (fn: () => Promise<void>, ok = '') => {
    setBusy(true); setError(''); setMsg('');
    try { await fn(); await load(); onChanged(); if (ok) setMsg(ok); } catch (err) { setError(apiMessage(err, 'Gagal memproses.')); } finally { setBusy(false); }
  };

  const resetForm = () => { setQuestion(''); setOptions(['', '', '', '']); setCorrect(0); setEditQid(null); };

  const saveQuestion = () => run(async () => {
    const data = { question, options, correctIndex: correct };
    if (editQid) await courseAuthoringApi.updateQuestion(courseId, editQid, data); else await courseAuthoringApi.addQuestion(courseId, data);
    resetForm();
  }, 'Soal tersimpan.');

  const startEdit = (q: ExamQuestionDto) => { setEditQid(q.id); setQuestion(q.question); setOptions([...q.options]); setCorrect(q.correctIndex); };

  if (!exam) return <div className="flex justify-center py-8">{error ? <p className="text-sm text-red-600">{error}</p> : <Loader2 className="animate-spin text-digitalcoop-600" />}</div>;

  return (
    <div className="space-y-6">
      <div className="space-y-3 rounded-xl border border-gray-200 p-4 dark:border-slate-700">
        <label className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
          <input type="checkbox" disabled={!editable} checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> Aktifkan ujian akhir untuk kursus ini
        </label>
        {enabled && (
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-xs text-gray-500">Nilai lulus (1-100)
              <input className={inputClass} type="number" min={1} max={100} disabled={!editable} value={passing} onChange={(e) => setPassing(Number(e.target.value))} />
            </label>
            <label className="text-xs text-gray-500">Durasi (menit, 5-240)
              <input className={inputClass} type="number" min={5} max={240} disabled={!editable} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
            </label>
          </div>
        )}
        {editable && <button disabled={busy} className={btnPrimary} onClick={() => void run(async () => { await courseAuthoringApi.saveExam(courseId, { enabled, passingGrade: passing, durationMinutes: duration }); }, 'Pengaturan ujian tersimpan.')}>Simpan Pengaturan</button>}
        <p className="text-xs text-gray-500">Ujian aktif membutuhkan minimal {exam.minQuestions} soal sebelum kursus dapat diajukan. Soal sekarang: {exam.questions.length}.</p>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-bold text-gray-900 dark:text-white">Bank Soal</h4>
        {exam.questions.length === 0 && <p className="rounded-lg border border-dashed border-gray-300 py-6 text-center text-sm text-gray-500 dark:border-slate-700">Belum ada soal.</p>}
        {exam.questions.map((q, i) => (
          <div key={q.id} className="rounded-lg border border-gray-200 p-3 dark:border-slate-700">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{i + 1}. {q.question}</p>
              {editable && (
                <span className="flex shrink-0 gap-1">
                  <button onClick={() => startEdit(q)} className="rounded p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800"><Pencil size={14} /></button>
                  <button onClick={() => { if (window.confirm('Hapus soal ini?')) void run(async () => { await courseAuthoringApi.deleteQuestion(courseId, q.id); }); }} className="rounded p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 size={14} /></button>
                </span>
              )}
            </div>
            <ul className="mt-1 space-y-0.5 text-xs text-gray-600 dark:text-slate-300">
              {q.options.map((o, oi) => <li key={oi} className={oi === q.correctIndex ? 'font-bold text-green-600' : ''}>{String.fromCharCode(65 + oi)}. {o}</li>)}
            </ul>
          </div>
        ))}
      </div>

      {editable && (
        <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-800/40">
          <h4 className="text-sm font-bold text-gray-900 dark:text-white">{editQid ? 'Ubah Soal' : 'Tambah Soal'}</h4>
          <textarea className={inputClass} rows={2} placeholder="Pertanyaan" maxLength={500} value={question} onChange={(e) => setQuestion(e.target.value)} />
          {options.map((o, i) => (
            <label key={i} className="flex items-center gap-2">
              <input type="radio" name="correct" checked={correct === i} onChange={() => setCorrect(i)} title="Jawaban benar" />
              <input className={inputClass} placeholder={`Pilihan ${String.fromCharCode(65 + i)}`} maxLength={200} value={o} onChange={(e) => setOptions(options.map((x, xi) => (xi === i ? e.target.value : x)))} />
            </label>
          ))}
          <p className="text-xs text-gray-400">Pilih bulat di sebelah kiri untuk menandai jawaban yang benar. Empat pilihan, tidak boleh ada yang sama.</p>
          <div className="flex gap-2">
            <button disabled={busy} onClick={() => void saveQuestion()} className={btnPrimary}>{editQid ? 'Simpan Perubahan' : 'Tambah Soal'}</button>
            {editQid && <button onClick={resetForm} className={btnGhost}>Batal</button>}
          </div>
        </div>
      )}
      {msg && <p className="text-sm text-green-600">{msg}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
};

export default ExamTab;
