import React, { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { adminApi } from '../../services/api';
import { useProfile } from '../../services/profile';
import { DELETION_STATUS_LABEL, DeletionStatus, SETTLER_ROLES, TEXT_MAX, TEXT_MIN } from '@shared/account-deletion';

interface Settlement {
  id: string;
  amount: number;
  transferDate: string;
  bankRef: string;
  note?: string | null;
  settledByName?: string | null;
}
interface Item {
  id: string;
  status: DeletionStatus;
  reason: string;
  createdAt: string;
  decidedByName?: string | null;
  decisionNote?: string | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  role: string;
  cardNumber?: string | null;
  balance: number;
  publishedCourses: number;
  settlement: Settlement | null;
}

const errText = (err: unknown, fallback: string): string =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;
const rupiah = (n: number): string => `Rp${n.toLocaleString('id-ID')}`;
const inputClass = 'w-full p-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded text-sm';

const SettleForm: React.FC<{ item: Item; onDone: (msg: string) => void }> = ({ item, onDone }) => {
  const [transferDate, setTransferDate] = useState(new Date().toISOString().slice(0, 10));
  const [bankRef, setBankRef] = useState('');
  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { setErr('Unggah bukti transfer.'); return; }
    setErr('');
    setBusy(true);
    try {
      const form = new FormData();
      form.append('amount', String(item.balance));
      form.append('transferDate', transferDate);
      form.append('bankRef', bankRef);
      form.append('note', note);
      form.append('proof', file);
      await adminApi.settleDeletion(item.id, form);
      onDone(`Saldo ${item.name} ditandai selesai.`);
    } catch (e2) {
      setErr(errText(e2, 'Gagal menandai saldo selesai.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-3 p-3 rounded border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/10 space-y-2">
      <p className="text-sm font-medium text-gray-800 dark:text-slate-200">
        Tandai saldo {rupiah(item.balance)} sudah ditransfer (penyelesaian penuh)
      </p>
      <div className="grid md:grid-cols-2 gap-2">
        <input type="date" required className={inputClass} value={transferDate} onChange={(e) => setTransferDate(e.target.value)} />
        <input type="text" required minLength={3} maxLength={100} placeholder="Referensi transfer" className={inputClass}
          value={bankRef} onChange={(e) => setBankRef(e.target.value)} />
      </div>
      <input type="text" maxLength={500} placeholder="Catatan (opsional)" className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} />
      <input type="file" required accept="image/jpeg,image/png,image/webp,application/pdf" className="text-sm"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      <p className="text-xs text-gray-500">Bukti JPG, PNG, WebP, atau PDF, maksimal 5 MB. Bukti bersifat privat.</p>
      {err && <p className="text-sm text-red-600">{err}</p>}
      <button type="submit" disabled={busy} className="px-4 py-2 bg-kodman-600 text-white rounded text-sm font-medium disabled:opacity-50">
        {busy ? 'Menyimpan...' : 'Simpan penyelesaian saldo'}
      </button>
    </form>
  );
};

// Antrean pengajuan penghapusan akun. Admin atau Direktur memutuskan; hanya Admin yang menandai saldo selesai.
const AccountDeletions: React.FC = () => {
  const { profile } = useProfile();
  const canSettle = !!profile && (SETTLER_ROLES as readonly string[]).includes(profile.role);
  const [tab, setTab] = useState<'PENDING' | 'ALL'>('PENDING');
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [deciding, setDeciding] = useState<{ id: string; decision: 'APPROVE' | 'REJECT' } | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.listDeletions(tab);
      setItems(res.data?.data ?? []);
    } catch (e) {
      setMessage(errText(e, 'Gagal memuat pengajuan.'));
    } finally {
      setLoading(false);
    }
  }, [tab]);
  useEffect(() => { load(); }, [load]);

  const decide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deciding) return;
    setBusy(true);
    try {
      await adminApi.decideDeletion(deciding.id, deciding.decision, note);
      setMessage(deciding.decision === 'APPROVE' ? 'Akun diarsipkan.' : 'Pengajuan ditolak.');
      setDeciding(null);
      setNote('');
      await load();
    } catch (e2) {
      setMessage(errText(e2, 'Gagal memproses keputusan.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="font-bold text-gray-900 dark:text-white">Penghapusan Akun</h3>
          <p className="text-xs text-gray-500 dark:text-slate-400">
            Persetujuan Admin atau Direktur (salah satu) dengan catatan. Saldo harus nol sebelum disetujui.
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          {(['PENDING', 'ALL'] as const).map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)}
              className={`px-3 py-1 rounded ${tab === t ? 'bg-kodman-600 text-white' : 'border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300'}`}>
              {t === 'PENDING' ? 'Menunggu' : 'Semua'}
            </button>
          ))}
        </div>
      </div>
      {message && <div className="px-4 py-3 text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300">{message}</div>}
      {loading ? (
        <div className="p-8 text-center text-gray-500"><Loader2 className="animate-spin inline" /></div>
      ) : items.length === 0 ? (
        <div className="p-8 text-center text-sm text-gray-500 dark:text-slate-400">Tidak ada pengajuan.</div>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-slate-800">
          {items.map((it) => (
            <li key={it.id} className="p-4 text-sm space-y-2">
              <div className="flex flex-wrap justify-between gap-2">
                <p className="font-bold text-gray-900 dark:text-white">
                  {it.name} <span className="font-normal text-gray-500">({it.role}{it.cardNumber ? `, ${it.cardNumber}` : ''})</span>
                </p>
                <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300">
                  {DELETION_STATUS_LABEL[it.status]}
                </span>
              </div>
              <p className="text-gray-500 dark:text-slate-400">{[it.email, it.phone].filter(Boolean).join(' · ')}</p>
              <p className="text-gray-800 dark:text-slate-200">Alasan: {it.reason}</p>
              <p className="text-gray-600 dark:text-slate-300">
                Saldo dompet: <strong>{rupiah(it.balance)}</strong>
                {it.publishedCourses > 0 && ` · Kursus terbit: ${it.publishedCourses} (peserta tetap punya akses)`}
              </p>
              {it.settlement && (
                <p className="text-gray-600 dark:text-slate-300">
                  Saldo diselesaikan {rupiah(it.settlement.amount)} pada {it.settlement.transferDate}, ref {it.settlement.bankRef}
                  {it.settlement.settledByName ? `, oleh ${it.settlement.settledByName}` : ''}.{' '}
                  <a className="text-kodman-600 hover:underline" href={adminApi.proofUrl(it.settlement.id)} target="_blank" rel="noreferrer">Lihat bukti</a>
                </p>
              )}
              {it.status !== 'PENDING' && (
                <p className="text-gray-600 dark:text-slate-300">
                  {it.decidedByName ? `Diputuskan ${it.decidedByName}. ` : ''}{it.decisionNote ? `Catatan: ${it.decisionNote}` : ''}
                </p>
              )}

              {it.status === 'PENDING' && (
                <>
                  {it.balance > 0 && canSettle && <SettleForm item={it} onDone={(m) => { setMessage(m); load(); }} />}
                  {it.balance > 0 && !canSettle && (
                    <p className="text-yellow-700 dark:text-yellow-400">Saldo belum nol; menunggu Admin menyelesaikannya.</p>
                  )}
                  {deciding?.id === it.id ? (
                    <form onSubmit={decide} className="space-y-2">
                      <textarea required minLength={TEXT_MIN} maxLength={TEXT_MAX} className={`${inputClass} h-20`}
                        placeholder={`Catatan keputusan (minimal ${TEXT_MIN} karakter)`} value={note} onChange={(e) => setNote(e.target.value)} />
                      <div className="flex gap-3">
                        <button type="submit" disabled={busy}
                          className={`px-4 py-2 rounded text-white text-sm font-medium disabled:opacity-50 ${deciding.decision === 'APPROVE' ? 'bg-red-600' : 'bg-gray-700'}`}>
                          {deciding.decision === 'APPROVE' ? 'Setujui dan arsipkan akun' : 'Tolak pengajuan'}
                        </button>
                        <button type="button" onClick={() => { setDeciding(null); setNote(''); }} className="text-sm text-gray-600 hover:underline">Batal</button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex gap-3">
                      <button type="button" disabled={it.balance > 0} onClick={() => setDeciding({ id: it.id, decision: 'APPROVE' })}
                        title={it.balance > 0 ? 'Saldo harus nol' : undefined}
                        className="px-4 py-2 bg-red-600 text-white rounded text-sm font-medium disabled:opacity-40">Setujui</button>
                      <button type="button" onClick={() => setDeciding({ id: it.id, decision: 'REJECT' })}
                        className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded text-sm text-gray-700 dark:text-slate-300">Tolak</button>
                    </div>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AccountDeletions;
