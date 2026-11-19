import React, { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, Award, CheckCircle, Clock, Loader2, XCircle } from "lucide-react";
import { Certificate } from "../../types";
import CertificateTemplate from "../../components/CertificateTemplate";
import { ExamResult, ExamSession, ExamSummary, findCertificateForCourse, learningApi } from "../../services/learning";
import { apiMessage } from "../../services/payments";

interface ExamRoomProps {
  courseId: string;
  onExit: () => void;
}

const draftKey = (attemptId: string) => `exam-draft:${attemptId}`;
const loadDraft = (attemptId: string, total: number): number[] | null => {
  try {
    const raw = sessionStorage.getItem(draftKey(attemptId));
    const arr = raw ? (JSON.parse(raw) as unknown) : null;
    return Array.isArray(arr) && arr.length === total && arr.every((n) => Number.isInteger(n)) ? (arr as number[]) : null;
  } catch { return null; }
};
const saveDraft = (attemptId: string, answers: number[]) => {
  try { sessionStorage.setItem(draftKey(attemptId), JSON.stringify(answers)); } catch { /* penyimpanan penuh/dilarang: abaikan */ }
};
const clearDraft = (attemptId: string) => { try { sessionStorage.removeItem(draftKey(attemptId)); } catch { /* abaikan */ } };

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

const ExamRoom: React.FC<ExamRoomProps> = ({ courseId, onExit }) => {
  const [step, setStep] = useState<"INTRO" | "TEST" | "RESULT">("INTRO");
  const [summary, setSummary] = useState<ExamSummary | null>(null);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [session, setSession] = useState<ExamSession | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [idx, setIdx] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [certView, setCertView] = useState<Certificate | null>(null);
  const offsetRef = useRef(0); // selisih jam server terhadap jam perangkat
  const submittedRef = useRef(false);

  const loadSummary = useCallback(async () => {
    try {
      const d = (await learningApi.detail(courseId)).data.data;
      setSummary(d.exam as ExamSummary);
      setTitle(d.course.title as string);
      setError("");
    } catch (err) { setError(apiMessage(err, "Gagal memuat informasi ujian.")); }
  }, [courseId]);

  useEffect(() => { void loadSummary(); }, [loadSummary]);

  const start = async () => {
    setBusy(true); setError("");
    try {
      const s = (await learningApi.startExam(courseId)).data.data as ExamSession;
      offsetRef.current = new Date(s.serverNow).getTime() - Date.now();
      submittedRef.current = false;
      setSession(s);
      setAnswers(loadDraft(s.attemptId, s.questions.length) ?? new Array(s.questions.length).fill(-1));
      setIdx(0); setConfirming(false);
      setStep("TEST");
    } catch (err) { setError(apiMessage(err, "Gagal memulai ujian.")); } finally { setBusy(false); }
  };

  const submit = useCallback(async (finalAnswers: number[]) => {
    if (!session || submittedRef.current) return;
    submittedRef.current = true;
    setBusy(true); setError("");
    try {
      const r = (await learningApi.submitExam(courseId, session.attemptId, finalAnswers)).data.data as ExamResult;
      clearDraft(session.attemptId);
      setResult(r); setStep("RESULT");
    } catch (err) {
      submittedRef.current = false;
      setError(apiMessage(err, "Gagal mengirim jawaban."));
    } finally { setBusy(false); }
  }, [courseId, session]);

  // Hitung mundur dari batas waktu server; kirim otomatis saat habis.
  useEffect(() => {
    if (step !== "TEST" || !session) return;
    const tick = () => {
      const left = Math.max(0, Math.ceil((new Date(session.deadlineAt).getTime() - (Date.now() + offsetRef.current)) / 1000));
      setRemaining(left);
      if (left === 0) void submit(answers);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [step, session, answers, submit]);

  const choose = (opt: number) => {
    if (!session) return;
    const next = [...answers];
    next[idx] = opt;
    setAnswers(next);
    saveDraft(session.attemptId, next);
  };

  const openCertificate = async () => {
    try {
      const c = await findCertificateForCourse(courseId);
      if (c) setCertView(c);
    } catch (err) { setError(apiMessage(err, "Gagal memuat sertifikat.")); }
  };

  const retry = async () => { setResult(null); setSession(null); await loadSummary(); setStep("INTRO"); };

  if (!summary && !error) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-kodman-600" /></div>;

  // ---------------- INTRO ----------------
  if (step === "INTRO") {
    return (
      <div className="mx-auto max-w-2xl p-4 md:p-8">
        {certView && <CertificateTemplate data={certView} onClose={() => setCertView(null)} />}
        <button onClick={onExit} className="mb-4 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 dark:hover:text-white"><ArrowLeft size={16} /> Kembali</button>
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-kodman-100 text-kodman-700"><Award size={32} /></div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Ujian Akhir</h2>
            <p className="text-sm text-gray-500">{title}</p>
          </div>
          {summary && (
            <>
              <div className="mb-6 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-gray-50 p-3 dark:bg-slate-800"><p className="text-xs text-gray-500">Jumlah soal</p><p className="font-bold">{summary.questionCount}</p></div>
                <div className="rounded-lg bg-gray-50 p-3 dark:bg-slate-800"><p className="text-xs text-gray-500">Durasi</p><p className="font-bold">{summary.durationMinutes} menit</p></div>
                <div className="rounded-lg bg-gray-50 p-3 dark:bg-slate-800"><p className="text-xs text-gray-500">Nilai lulus</p><p className="font-bold">{summary.passingGrade}</p></div>
                <div className="rounded-lg bg-gray-50 p-3 dark:bg-slate-800"><p className="text-xs text-gray-500">Kesempatan terpakai</p><p className="font-bold">{summary.attemptsUsed} / {summary.maxAttempts}</p></div>
              </div>
              <ul className="mb-6 list-disc space-y-1 pl-5 text-xs text-gray-500">
                <li>Waktu berjalan sejak ujian dimulai dan tidak berhenti walau halaman ditutup.</li>
                <li>Jawaban yang dikirim setelah waktu habis tidak diterima dan percobaan tetap dihitung.</li>
                <li>Setiap percobaan, urutan soal diacak. Nilai dihitung oleh server.</li>
              </ul>
              {summary.passed ? (
                <div className="space-y-3 text-center">
                  <p className="font-bold text-green-600">Anda sudah lulus{summary.bestScore !== null ? ` (skor terbaik ${summary.bestScore})` : ""}.</p>
                  <button onClick={() => void openCertificate()} className="rounded-lg bg-kodman-600 px-6 py-2 text-sm font-bold text-white hover:bg-kodman-700">Lihat Sertifikat</button>
                </div>
              ) : summary.eligible ? (
                <button disabled={busy} onClick={() => void start()} className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 py-3 font-bold text-white hover:bg-green-700 disabled:opacity-50">
                  {busy && <Loader2 size={16} className="animate-spin" />} {summary.hasOpenAttempt ? "Lanjutkan Ujian" : "Mulai Ujian"}
                </button>
              ) : (
                <p className="flex items-center justify-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300"><AlertCircle size={16} /> {summary.reason}</p>
              )}
            </>
          )}
          {error && <p className="mt-4 text-center text-sm text-red-600">{error}</p>}
        </div>
      </div>
    );
  }

  // ---------------- TEST ----------------
  if (step === "TEST" && session) {
    const q = session.questions[idx];
    const unanswered = answers.filter((a) => a === -1).length;
    const last = idx === session.questions.length - 1;
    return (
      <div className="mx-auto max-w-3xl p-4 md:p-8">
        <div className="mb-4 flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div><p className="text-xs text-gray-500">{title}</p><p className="font-bold text-gray-900 dark:text-white">Soal {idx + 1} dari {session.questions.length}</p></div>
          <div className={`flex items-center gap-2 rounded-lg px-3 py-2 font-mono text-lg font-bold ${remaining <= 60 ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-800 dark:bg-slate-800 dark:text-white"}`}><Clock size={18} /> {fmt(remaining)}</div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="mb-6 whitespace-pre-line text-lg font-medium text-gray-900 dark:text-white">{q.question}</p>
          <div className="space-y-3">
            {q.options.map((opt, i) => (
              <button key={i} onClick={() => choose(i)} className={`flex w-full items-start gap-3 rounded-lg border-2 p-4 text-left text-sm transition ${answers[idx] === i ? "border-kodman-600 bg-kodman-50 dark:bg-kodman-900/20" : "border-gray-200 hover:border-gray-300 dark:border-slate-700"}`}>
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${answers[idx] === i ? "bg-kodman-600 text-white" : "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300"}`}>{String.fromCharCode(65 + i)}</span>
                <span className="text-gray-800 dark:text-slate-200">{opt}</span>
              </button>
            ))}
          </div>
          <div className="mt-6 flex items-center justify-between">
            <button disabled={idx === 0} onClick={() => setIdx(idx - 1)} className="flex items-center gap-1 rounded-lg border border-gray-300 px-4 py-2 text-sm disabled:opacity-40 dark:border-slate-600"><ArrowLeft size={14} /> Sebelumnya</button>
            {last ? (
              <button onClick={() => setConfirming(true)} className="rounded-lg bg-green-600 px-6 py-2 text-sm font-bold text-white hover:bg-green-700">Selesai & Kirim</button>
            ) : (
              <button onClick={() => setIdx(idx + 1)} className="flex items-center gap-1 rounded-lg bg-kodman-600 px-4 py-2 text-sm font-bold text-white hover:bg-kodman-700">Berikutnya <ArrowRight size={14} /></button>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {session.questions.map((_, i) => (
            <button key={i} onClick={() => setIdx(i)} className={`h-8 w-8 rounded text-xs font-bold ${i === idx ? "bg-kodman-600 text-white" : answers[i] !== -1 ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300"}`}>{i + 1}</button>
          ))}
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        {confirming && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-sm rounded-xl bg-white p-6 dark:bg-slate-900">
              <h3 className="mb-2 text-lg font-bold text-gray-900 dark:text-white">Kirim jawaban?</h3>
              <p className="mb-4 text-sm text-gray-600 dark:text-slate-300">{unanswered > 0 ? `${unanswered} soal belum dijawab. ` : ""}Setelah dikirim, jawaban tidak dapat diubah dan percobaan ini dihitung.</p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setConfirming(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-slate-600">Periksa Lagi</button>
                <button disabled={busy} onClick={() => { setConfirming(false); void submit(answers); }} className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{busy && <Loader2 size={14} className="animate-spin" />} Kirim</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---------------- RESULT ----------------
  if (step === "RESULT" && result) {
    return (
      <div className="mx-auto max-w-xl p-4 md:p-8">
        {certView && <CertificateTemplate data={certView} onClose={() => setCertView(null)} />}
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {result.passed ? <CheckCircle size={64} className="mx-auto mb-3 text-green-500" /> : <XCircle size={64} className="mx-auto mb-3 text-red-500" />}
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{result.passed ? "Selamat, Anda lulus!" : "Belum lulus"}</h2>
          <p className="mt-4 text-5xl font-extrabold text-kodman-700 dark:text-kodman-300">{result.score}</p>
          <p className="mt-1 text-sm text-gray-500">{result.correct} dari {result.total} soal benar · nilai lulus {result.passingGrade}</p>
          {!result.passed && <p className="mt-3 text-sm text-gray-600 dark:text-slate-300">{result.attemptsLeft > 0 ? `Sisa kesempatan: ${result.attemptsLeft}. Pelajari materi lagi lalu coba kembali.` : "Kesempatan ujian sudah habis."}</p>}
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {result.passed && result.certificate && <button onClick={() => void openCertificate()} className="rounded-lg bg-kodman-600 px-5 py-2 text-sm font-bold text-white hover:bg-kodman-700">Lihat Sertifikat</button>}
            {!result.passed && result.attemptsLeft > 0 && <button onClick={() => void retry()} className="rounded-lg bg-green-600 px-5 py-2 text-sm font-bold text-white hover:bg-green-700">Coba Lagi</button>}
            <button onClick={onExit} className="rounded-lg border border-gray-300 px-5 py-2 text-sm dark:border-slate-600">Selesai</button>
          </div>
        </div>
      </div>
    );
  }

  return <div className="p-8 text-center text-sm text-red-600">{error || "Ujian tidak tersedia."}</div>;
};

export default ExamRoom;
