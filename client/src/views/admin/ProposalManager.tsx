import React, { useState } from 'react';
import { PROPOSAL_LABEL } from '@shared/workshop';
import { apiMessage } from '../../services/classes';
import { workshopsApi } from '../../services/workshops';
import { Card, Empty, StateBox, dateId, rupiah, useAsync } from '../../components/ReportBits';

const FILTERS = [{ id: 'PENDING', label: 'Menunggu' }, { id: 'APPROVED', label: 'Disetujui' }, { id: 'REJECTED', label: 'Ditolak' }, { id: '', label: 'Semua' }];

const ProposalManager: React.FC = () => {
  const [status, setStatus] = useState('PENDING');
  const { data, loading, error, reload } = useAsync(() => workshopsApi.list(status), [status]);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const act = async (fn: () => Promise<void>, ok: string) => {
    setBusy(true);
    setMsg('');
    try { await fn(); setMsg(ok); await reload(); } catch (e) { setMsg(apiMessage(e, 'Gagal.')); } finally { setBusy(false); }
  };
  const approve = (id: string, title: string) => confirm(`Setujui "${title}"? Kursus workshop akan langsung tayang di etalase.`) && act(() => workshopsApi.approve(id), 'Proposal disetujui.');
  const reject = (id: string) => {
    const note = prompt('Alasan penolakan (minimal 10 karakter, dikirim ke Mentor):');
    if (note) void act(() => workshopsApi.reject(id, note), 'Proposal ditolak.');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Proposal Workshop</h2>
        {data && <p className="text-gray-500 dark:text-slate-400">Bagi hasil workshop berlaku: pemilik materi {data.split.owner}%, Mentor {data.split.mentor}%, Lembaga {data.split.platform}%. Diatur di Konfigurasi Sistem, grup Bagi Hasil.</p>}
      </div>
      <div className="flex gap-2">
        {FILTERS.map((f) => <button key={f.id} onClick={() => setStatus(f.id)} className={`px-3 py-1.5 text-sm rounded-lg border ${status === f.id ? 'bg-kodman-600 text-white border-kodman-600' : 'dark:border-slate-700 dark:text-slate-200'}`}>{f.label}</button>)}
      </div>
      {msg && <p role="status" className="text-sm text-gray-700 dark:text-slate-300">{msg}</p>}
      <StateBox loading={loading} error={error} onRetry={reload}>
        {(data?.rows ?? []).length === 0 ? <Empty>Tidak ada proposal.</Empty> : (data?.rows ?? []).map((p) => (
          <Card key={p.id} title={`${p.title} · ${rupiah(p.price)}`} right={<span className="text-xs font-bold">{PROPOSAL_LABEL[p.status]}</span>}>
            <div className="text-sm space-y-1 dark:text-slate-200">
              <p>Mentor: <b>{p.mentor}</b> · Pemilik materi: <b>{p.owner ?? '-'}</b></p>
              <p>Kursus sumber: {p.source} (harga mandiri {rupiah(p.sourcePrice)}) · diajukan {dateId(p.createdAt)}</p>
              {p.description && <p className="whitespace-pre-wrap text-gray-600 dark:text-slate-400">{p.description}</p>}
              {p.decisionNote && <p className="text-xs">Catatan: {p.decisionNote}</p>}
              {p.status === 'PENDING' && (
                <div className="flex gap-2 pt-2">
                  <button disabled={busy} onClick={() => approve(p.id, p.title)} className="px-3 py-1.5 bg-kodman-600 text-white rounded-lg font-bold">Setujui</button>
                  <button disabled={busy} onClick={() => reject(p.id)} className="px-3 py-1.5 border rounded-lg dark:border-slate-700">Tolak</button>
                </div>
              )}
            </div>
          </Card>
        ))}
      </StateBox>
    </div>
  );
};

export default ProposalManager;
