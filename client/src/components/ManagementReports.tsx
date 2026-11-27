import React, { useState } from 'react';
import { apiMessage } from '../services/classes';
import { managementApi } from '../services/management';
import { Card, Empty, StateBox, dateId, dateTimeId, num, rupiah, useAsync } from './ReportBits';

const KIND_LABEL = { WEEKLY: 'Mingguan', MONTHLY: 'Bulanan' } as const;

const METRICS: [string, string, (v: number) => string][] = [
  ['newUsers', 'Pengguna baru', num], ['totalUsers', 'Total pengguna aktif', num], ['enrollments', 'Pendaftaran kursus', num], ['revenue', 'Pendapatan', rupiah],
  ['newCourses', 'Kursus baru diajukan', num], ['publishedCourses', 'Kursus terbit (saat dibuat)', num], ['ticketsOpened', 'Tiket bantuan dibuka', num], ['ticketsClosed', 'Tiket bantuan ditutup', num],
  ['jobErrors', 'Galat job sistem', num], ['queuePayments', 'Antrean verifikasi pembayaran (saat dibuat)', num], ['queueReviews', 'Antrean review kursus (saat dibuat)', num],
];

const Detail: React.FC<{ id: string; canMarkRead: boolean; onBack: () => void; onChanged: () => void }> = ({ id, canMarkRead, onBack, onChanged }) => {
  const { data, loading, error, reload } = useAsync(async () => {
    const d = await managementApi.report(id);
    if (canMarkRead && !d.readAt) {
      try { await managementApi.markRead(id); onChanged(); } catch { /* tidak kritis */ }
    }
    return d;
  }, [id]);
  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm text-gray-500 hover:text-digitalcoop-600">&larr; Kembali</button>
      <StateBox loading={loading} error={error} onRetry={reload}>
        {data && (
          <Card title={`Laporan ${KIND_LABEL[data.kind]}`}>
            <p className="text-xs text-gray-500 mb-4">Periode {dateTimeId(data.periodStart)} sampai {dateTimeId(data.periodEnd)}. Dibuat {dateTimeId(data.createdAt)} oleh {data.author ?? '-'}. Angka dibekukan saat laporan dibuat.</p>
            <dl className="grid md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
              {METRICS.map(([k, label, fmt]) => (
                <div key={k} className="flex justify-between border-b border-gray-100 dark:border-slate-800 py-1"><dt className="text-gray-600 dark:text-slate-300">{label}</dt><dd className="font-mono font-bold">{fmt(data.snapshot[k] ?? 0)}</dd></div>
              ))}
            </dl>
            {data.note && <p className="mt-4 text-sm whitespace-pre-wrap"><b>Catatan Admin:</b> {data.note}</p>}
          </Card>
        )}
      </StateBox>
    </div>
  );
};

/** Daftar laporan manajemen. Admin membuat; Direktur membaca (membuka = tandai dibaca). */
const ManagementReports: React.FC<{ canGenerate?: boolean; canMarkRead?: boolean }> = ({ canGenerate = false, canMarkRead = false }) => {
  const { data, loading, error, reload } = useAsync(() => managementApi.reports());
  const [openId, setOpenId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  if (openId) return <Detail id={openId} canMarkRead={canMarkRead} onBack={() => setOpenId(null)} onChanged={() => void reload()} />;

  const generate = async (kind: 'WEEKLY' | 'MONTHLY') => {
    setBusy(true);
    setMsg('');
    try {
      await managementApi.createReport(kind, note);
      setNote('');
      setMsg('Laporan dibuat dan Direktur diberi tahu.');
      await reload();
    } catch (e) {
      setMsg(apiMessage(e, 'Gagal membuat laporan.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="Laporan Manajemen">
      {canGenerate && (
        <div className="mb-4 space-y-2">
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={1000} placeholder="Catatan untuk Direktur (opsional)" className="w-full p-2 text-sm border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
          <div className="flex gap-2">
            <button disabled={busy} onClick={() => void generate('WEEKLY')} className="px-3 py-1.5 bg-digitalcoop-600 text-white rounded text-sm font-bold disabled:opacity-50">Buat laporan mingguan</button>
            <button disabled={busy} onClick={() => void generate('MONTHLY')} className="px-3 py-1.5 border rounded text-sm font-bold disabled:opacity-50">Buat laporan bulanan</button>
          </div>
          <p className="text-xs text-gray-500">Mingguan: 7 hari terakhir. Bulanan: bulan kalender sebelumnya (WIB).</p>
          {msg && <p role="status" className="text-sm">{msg}</p>}
        </div>
      )}
      <StateBox loading={loading} error={error} onRetry={reload}>
        {data && data.length === 0 ? (
          <Empty>Belum ada laporan.</Empty>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-slate-800">
            {data?.map((r) => (
              <li key={r.id}>
                <button onClick={() => setOpenId(r.id)} className="w-full text-left py-3 px-2 hover:bg-gray-50 dark:hover:bg-slate-800/50 rounded flex justify-between">
                  <span><b className="text-gray-900 dark:text-white">{KIND_LABEL[r.kind]}</b>, {dateId(r.periodStart)} - {dateId(r.periodEnd)}<span className="block text-xs text-gray-500">Dibuat {dateTimeId(r.createdAt)} oleh {r.author ?? '-'}</span></span>
                  {!r.readAt && canMarkRead && <span className="text-xs font-bold text-orange-600 self-center">Baru</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </StateBox>
    </Card>
  );
};

export default ManagementReports;
