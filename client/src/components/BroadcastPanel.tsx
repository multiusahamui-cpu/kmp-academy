import React, { useState } from 'react';
import { apiMessage } from '../services/classes';
import { BROADCAST_AUDIENCES, managementApi } from '../services/management';
import type { BroadcastAudience } from '@shared/management';
import { Card, Empty, StateBox, dateTimeId, num, useAsync } from './ReportBits';

const input = 'w-full px-3 py-2 text-sm border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white';

const BroadcastPanel: React.FC = () => {
  const { data, loading, error, reload } = useAsync(() => managementApi.broadcasts());
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<BroadcastAudience>('ALL');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const label = BROADCAST_AUDIENCES.find((a) => a.id === audience)?.label ?? '';
    if (!confirm(`Kirim siaran ke: ${label}? Tidak bisa ditarik kembali.`)) return;
    setBusy(true);
    setMsg('');
    try {
      const r = await managementApi.sendBroadcast({ title, body, audience });
      setTitle('');
      setBody('');
      setMsg(`Terkirim ke ${num(r.recipients)} pengguna. Pengguna yang mematikan notifikasi informasi tidak ikut menerima.`);
      await reload();
    } catch (e2) {
      setMsg(apiMessage(e2, 'Gagal mengirim siaran.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="Siaran ke Pengguna">
      <form onSubmit={send} className="space-y-2 mb-4">
        <select value={audience} onChange={(e) => setAudience(e.target.value as BroadcastAudience)} className={input}>
          {BROADCAST_AUDIENCES.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
        </select>
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Judul" className={input} />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} maxLength={2000} placeholder="Isi pengumuman" className={input} />
        <button type="submit" disabled={busy || title.trim().length < 3 || body.trim().length < 5} className="px-4 py-2 bg-digitalcoop-600 text-white rounded-lg text-sm font-bold disabled:opacity-50">{busy ? 'Mengirim...' : 'Kirim siaran'}</button>
        {msg && <p role="status" className="text-sm">{msg}</p>}
      </form>
      <h4 className="font-bold text-sm mb-2">Riwayat</h4>
      <StateBox loading={loading} error={error} onRetry={reload}>
        {data && data.length === 0 ? (
          <Empty>Belum ada siaran.</Empty>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-slate-800 text-sm">
            {data?.map((b) => (
              <li key={b.id} className="py-2"><b className="text-gray-900 dark:text-white">{b.title}</b><span className="block text-xs text-gray-500">{BROADCAST_AUDIENCES.find((a) => a.id === b.audience)?.label}, {num(b.recipients)} penerima, {dateTimeId(b.createdAt)}</span></li>
            ))}
          </ul>
        )}
      </StateBox>
    </Card>
  );
};

export default BroadcastPanel;
