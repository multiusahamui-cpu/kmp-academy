import React, { useCallback, useEffect, useState } from 'react';
import { authApi } from '../services/api';
import { DELETION_STATUS_LABEL, DeletionStatus, TEXT_MAX, TEXT_MIN } from '@shared/account-deletion';

interface DeletionState {
  eligible: boolean;
  balance?: number;
  publishedCourses?: number;
  request?: { status: DeletionStatus; reason: string; decisionNote?: string | null; createdAt: string } | null;
}

const errText = (err: unknown, fallback: string): string =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

const inputClass = 'w-full p-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded';

/** Pengajuan penghapusan akun oleh pemilik (Student, Mentor, Creator). Diputuskan Admin atau Direktur. */
const DeleteAccountPanel: React.FC = () => {
  const [state, setState] = useState<DeletionState | null>(null);
  const [reason, setReason] = useState('');
  const [password, setPassword] = useState('');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(() => {
    authApi.getDeletion().then((res) => setState(res.data?.data ?? null)).catch(() => setState(null));
  }, []);
  useEffect(load, [load]);

  if (!state?.eligible) return null;
  const pending = state.request?.status === 'PENDING';
  const last = state.request && !pending ? state.request : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);
    setBusy(true);
    try {
      const res = await authApi.requestDeletion({ reason, password });
      setResult({ ok: true, text: res.data?.message || 'Pengajuan dikirim.' });
      setPassword('');
      setReason('');
      setOpen(false);
      load();
    } catch (err) {
      setResult({ ok: false, text: errText(err, 'Gagal mengajukan penghapusan akun.') });
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    setResult(null);
    setBusy(true);
    try {
      await authApi.cancelDeletion();
      setResult({ ok: true, text: 'Pengajuan dibatalkan.' });
      load();
    } catch (err) {
      setResult({ ok: false, text: errText(err, 'Gagal membatalkan.') });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md space-y-3 border-t border-red-200 dark:border-red-900/40 pt-6">
      <h3 className="font-bold text-red-700 dark:text-red-400">Hapus Akun</h3>
      <p className="text-sm text-gray-600 dark:text-slate-300">
        Pengajuan ditinjau Admin atau Direktur. Setelah disetujui, akun ditutup dan tidak bisa dipakai masuk lagi. Data tidak dihapus
        fisik, tetapi diarsipkan. Sebelum disetujui, saldo dompet harus nol.
      </p>
      {(state.balance ?? 0) > 0 && (
        <p className="text-sm bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-3 text-yellow-800 dark:text-yellow-300">
          Saldo dompet Anda Rp{(state.balance ?? 0).toLocaleString('id-ID')}. Admin akan menyelesaikannya lewat transfer, atau Anda dapat
          menariknya lebih dulu.
        </p>
      )}
      {(state.publishedCourses ?? 0) > 0 && (
        <p className="text-sm text-gray-600 dark:text-slate-300">
          Anda memiliki {state.publishedCourses} kursus terbit. Peserta yang sudah mendaftar tetap memiliki akses; penanganannya
          lewat Admin.
        </p>
      )}

      {pending ? (
        <div className="space-y-2">
          <p className="text-sm text-gray-800 dark:text-slate-200">
            Status: <strong>{DELETION_STATUS_LABEL.PENDING}</strong>. Akun Anda tetap aktif sampai disetujui.
          </p>
          <button type="button" onClick={cancel} disabled={busy} className="text-sm text-gray-600 hover:underline disabled:opacity-50">
            Batalkan pengajuan
          </button>
        </div>
      ) : (
        <>
          {last && (
            <p className="text-sm text-gray-600 dark:text-slate-300">
              Pengajuan terakhir: {DELETION_STATUS_LABEL[last.status]}
              {last.decisionNote ? ` — ${last.decisionNote}` : ''}
            </p>
          )}
          {!open ? (
            <button type="button" onClick={() => setOpen(true)}
              className="px-4 py-2 border border-red-300 text-red-700 rounded text-sm hover:bg-red-50 dark:hover:bg-red-900/20">
              Ajukan Penghapusan Akun
            </button>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Alasan</label>
                <textarea required minLength={TEXT_MIN} maxLength={TEXT_MAX} className={`${inputClass} h-24`}
                  value={reason} onChange={(e) => setReason(e.target.value)} />
                <p className="text-xs text-gray-500 mt-1">Minimal {TEXT_MIN} karakter.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Password saat ini</label>
                <input type="password" required autoComplete="current-password" className={inputClass}
                  value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={busy}
                  className="px-5 py-2 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                  {busy ? 'Mengirim...' : 'Kirim Pengajuan'}
                </button>
                <button type="button" onClick={() => setOpen(false)} className="text-sm text-gray-600 hover:underline">Batal</button>
              </div>
            </form>
          )}
        </>
      )}
      {result && <p className={`text-sm ${result.ok ? 'text-green-600' : 'text-red-600'}`} role="status">{result.text}</p>}
    </div>
  );
};

export default DeleteAccountPanel;
