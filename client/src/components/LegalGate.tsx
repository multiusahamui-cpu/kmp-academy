import React, { useCallback, useEffect, useState } from 'react';
import { apiMessage } from '../services/classes';
import { legalApi, type PendingDoc } from '../services/legal';

/** Menghalangi pemakaian sampai pengguna menyetujui versi berlaku dokumen yang wajib bagi perannya. */
const LegalGate: React.FC<{ role: string; onLogout: () => void }> = ({ role, onLogout }) => {
  const [docs, setDocs] = useState<PendingDoc[]>([]);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    try {
      setDocs(await legalApi.pending());
    } catch {
      setDocs([]); // gagal memuat tidak boleh mengunci aplikasi; server tetap menegakkan di aksi terkait
    }
  }, []);

  useEffect(() => {
    setDocs([]);
    setAgree(false);
    if (role !== 'PUBLIC') void load();
  }, [role, load]);

  const doc = docs[0];
  if (!doc) return null;

  const accept = async () => {
    setBusy(true);
    setErr('');
    try {
      await legalApi.accept(doc.id);
      setAgree(false);
      await load();
    } catch (e) {
      setErr(apiMessage(e, 'Gagal mencatat persetujuan.'));
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-5 border-b dark:border-slate-700">
          <p className="text-xs text-slate-500">Persetujuan diperlukan ({docs.length} dokumen) · versi {doc.version}</p>
          <h2 className="text-lg font-bold dark:text-white">{doc.title}</h2>
        </div>
        <div className="p-5 overflow-y-auto whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200 flex-1">{doc.body}</div>
        <div className="p-5 border-t dark:border-slate-700 space-y-3">
          <label className="flex items-start gap-2 text-sm dark:text-slate-200">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1" />
            <span>Saya telah membaca dan menyetujui dokumen ini.</span>
          </label>
          {err && <p className="text-sm text-red-600">{err}</p>}
          <div className="flex justify-between gap-2">
            <button type="button" onClick={onLogout} className="px-4 py-2 text-sm rounded-lg border dark:border-slate-700 dark:text-slate-200">Keluar</button>
            <button type="button" disabled={!agree || busy} onClick={accept} className="px-4 py-2 text-sm font-bold rounded-lg bg-kodman-600 text-white disabled:opacity-50">
              {busy ? 'Menyimpan...' : 'Setuju dan lanjutkan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LegalGate;
