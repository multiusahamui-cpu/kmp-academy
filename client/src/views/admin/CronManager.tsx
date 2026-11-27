import React, { useState } from 'react';
import { Activity } from 'lucide-react';
import { jobsApi } from '../../services/reports';
import { Card, Empty, StateBox, dateTimeId, useAsync } from '../../components/ReportBits';

const RunHistory: React.FC<{ id: string; label: string; onBack: () => void }> = ({ id, label, onBack }) => {
  const { data, loading, error, reload } = useAsync(() => jobsApi.runs(id), [id]);
  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm text-gray-500 hover:text-digitalcoop-600">&larr; Kembali</button>
      <Card title={`Riwayat: ${label}`}>
        <p className="text-xs text-gray-500 mb-3">Hanya eksekusi yang memproses sesuatu, gagal, atau dipicu manual yang dicatat. Riwayat disimpan 30 hari.</p>
        <StateBox loading={loading} error={error} onRetry={reload}>
          {data && data.length === 0 ? (
            <Empty>Belum ada riwayat tercatat.</Empty>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-gray-500 dark:text-slate-400"><tr><th className="py-2">Mulai</th><th>Pemicu</th><th>Status</th><th className="text-right">Diproses</th><th>Galat</th></tr></thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {data?.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2 whitespace-nowrap">{dateTimeId(r.startedAt)}</td>
                    <td>{r.trigger === 'MANUAL' ? 'Manual' : 'Jadwal'}</td>
                    <td className={r.status === 'OK' ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>{r.status === 'OK' ? 'Berhasil' : 'Gagal'}</td>
                    <td className="text-right font-mono">{r.affected}</td>
                    <td className="text-xs text-red-600">{r.error ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </StateBox>
      </Card>
    </div>
  );
};

const CronManager: React.FC = () => {
  const { data, loading, error, reload } = useAsync(() => jobsApi.list());
  const [history, setHistory] = useState<{ id: string; label: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  if (history) return <RunHistory id={history.id} label={history.label} onBack={() => setHistory(null)} />;

  const trigger = async (id: string) => {
    setBusyId(id);
    setMsg('');
    try {
      const r = await jobsApi.run(id);
      setMsg(r.status === 'OK' ? `Selesai, ${r.affected} diproses.` : `Gagal: ${r.error ?? 'tidak diketahui'}`);
      await reload();
    } catch (e: any) {
      setMsg(e?.response?.data?.message ?? 'Gagal menjalankan job.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center"><Activity className="mr-3 text-digitalcoop-600" /> Job Berkala</h2>
        <p className="text-gray-500 dark:text-slate-400">Tugas otomatis di server. Status terakhir dihitung sejak server dihidupkan; riwayat disimpan di database.</p>
      </div>
      {msg && <p role="status" className="text-sm text-gray-700 dark:text-slate-300">{msg}</p>}
      <StateBox loading={loading} error={error} onRetry={reload}>
        <div className="grid gap-4">
          {data?.map((j) => (
            <Card key={j.id}>
              <div className="flex justify-between items-start gap-4 flex-wrap">
                <div className="min-w-0">
                  <h3 className="font-bold text-gray-900 dark:text-white">{j.label}</h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400">{j.description}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    Tiap {j.everyMinutes} menit. Terakhir jalan: {j.lastTickAt ? dateTimeId(j.lastTickAt) : 'belum sejak server hidup'}
                    {j.lastTickStatus === 'ERROR' && <span className="text-red-600 font-bold">, gagal: {j.lastError}</span>}
                    {j.running && ', sedang berjalan'}
                  </p>
                  {j.lastRecordedRun && <p className="text-xs text-gray-400">Catatan terakhir: {dateTimeId(j.lastRecordedRun.startedAt)}, {j.lastRecordedRun.affected} diproses</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setHistory({ id: j.id, label: j.label })} className="px-3 py-1 border rounded text-sm">Riwayat</button>
                  <button disabled={busyId === j.id || j.running} onClick={() => void trigger(j.id)} className="px-3 py-1 bg-digitalcoop-600 text-white rounded text-sm font-bold disabled:opacity-50">{busyId === j.id ? 'Menjalankan...' : 'Jalankan sekarang'}</button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </StateBox>
    </div>
  );
};

export default CronManager;
