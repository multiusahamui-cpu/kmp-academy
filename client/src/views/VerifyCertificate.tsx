import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle, GraduationCap, Loader2, Search, XCircle } from 'lucide-react';
import { VerifiedCertificate, formatLongDate, learningApi } from '../services/learning';

interface Props {
  initialSerial?: string;
  onHome: () => void;
}

const KIND_LABEL: Record<string, string> = {
  EXAM: 'Sertifikat Kompetensi (lulus ujian)',
  COMPLETION: 'Sertifikat Penyelesaian',
  PARTICIPATION: 'Sertifikat Keikutsertaan',
};

const VerifyCertificate: React.FC<Props> = ({ initialSerial = '', onHome }) => {
  const [serial, setSerial] = useState(initialSerial);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<VerifiedCertificate | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');

  const check = useCallback(async (value: string) => {
    const v = value.trim();
    if (!v) return;
    setBusy(true); setResult(null); setNotFound(false); setError('');
    try {
      setResult((await learningApi.verify(v)).data.data as VerifiedCertificate);
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) setNotFound(true);
      else if (status === 429) setError('Terlalu banyak pemeriksaan. Coba lagi beberapa menit lagi.');
      else setError('Pemeriksaan gagal. Coba lagi.');
    } finally { setBusy(false); }
  }, []);

  useEffect(() => { if (initialSerial) void check(initialSerial); }, [initialSerial, check]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-slate-950">
      <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6 flex flex-col items-center text-center">
          <GraduationCap size={40} className="mb-2 text-kodman-700" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Verifikasi Sertifikat</h1>
          <p className="text-sm text-gray-500">KMP - ADNG Academy</p>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); void check(serial); }} className="mb-6 flex gap-2">
          <input value={serial} onChange={(e) => setSerial(e.target.value)} placeholder="KMPA-2026-XXXXXXXX" maxLength={30}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm uppercase dark:border-slate-600 dark:bg-slate-800 dark:text-white" />
          <button disabled={busy || !serial.trim()} className="flex items-center gap-2 rounded-lg bg-kodman-600 px-4 py-2 text-sm font-bold text-white hover:bg-kodman-700 disabled:opacity-50">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />} Periksa
          </button>
        </form>

        {result && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
            <p className="mb-3 flex items-center gap-2 font-bold text-green-700 dark:text-green-300"><CheckCircle size={18} /> Sertifikat asli dan terdaftar</p>
            <dl className="space-y-2 text-sm text-gray-800 dark:text-slate-200">
              <div><dt className="text-xs text-gray-500">Nomor</dt><dd className="font-mono">{result.serial}</dd></div>
              <div><dt className="text-xs text-gray-500">Atas nama</dt><dd className="font-bold">{result.studentName}</dd></div>
              <div><dt className="text-xs text-gray-500">Kursus</dt><dd>{result.courseTitle}</dd></div>
              <div><dt className="text-xs text-gray-500">Jenis</dt><dd>{KIND_LABEL[result.kind] ?? result.kind}</dd></div>
              {result.grade !== null && result.grade > 0 && <div><dt className="text-xs text-gray-500">Nilai</dt><dd>{result.grade}</dd></div>}
              <div><dt className="text-xs text-gray-500">Tanggal terbit</dt><dd>{formatLongDate(result.issuedAt)}</dd></div>
            </dl>
          </div>
        )}
        {notFound && <p className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"><XCircle size={18} /> Nomor sertifikat tidak ditemukan.</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        <button onClick={onHome} className="mt-6 w-full text-center text-sm text-kodman-700 hover:underline dark:text-kodman-300">Ke beranda Academy</button>
      </div>
    </div>
  );
};

export default VerifyCertificate;
