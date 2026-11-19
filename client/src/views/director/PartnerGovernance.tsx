import React, { useState } from 'react';
import { Gavel } from 'lucide-react';
import { apiMessage } from '../../services/classes';
import { SANCTION_KINDS, partnersApi, type PartnerRow } from '../../services/partners';
import type { SanctionKind } from '@shared/sanctions';
import { Card, Empty, StateBox, dateTimeId, useAsync } from '../../components/ReportBits';

const STATUS_LABEL: Record<string, string> = { ACTIVE: 'Aktif', SUSPENDED: 'Dibekukan', ARCHIVED: 'Ditutup' };
const input = 'w-full px-3 py-2 text-sm border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white';

const PartnerDetail: React.FC<{ partner: PartnerRow; onBack: () => void; onChanged: () => void }> = ({ partner, onBack, onChanged }) => {
  const { data, loading, error, reload } = useAsync(() => partnersApi.sanctions(partner.id), [partner.id]);
  const [kind, setKind] = useState<SanctionKind>('WARNING');
  const [reason, setReason] = useState('');
  const [liftId, setLiftId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const act = async (fn: () => Promise<void>, after: () => void) => {
    setBusy(true);
    setMsg('');
    try {
      await fn();
      after();
      onChanged();
      await reload();
    } catch (e) {
      setMsg(apiMessage(e, 'Gagal.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="text-sm text-gray-500 hover:text-kodman-600">&larr; Kembali</button>
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{partner.name}</h2>
        <p className="text-sm text-gray-500">{partner.email}, status akun saat dibuka: {STATUS_LABEL[partner.status] ?? partner.status}</p>
      </div>
      <Card title="Jatuhkan sanksi">
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            const label = SANCTION_KINDS.find((k) => k.id === kind)?.label;
            if (!confirm(`Jatuhkan ${label} kepada ${partner.name}?`)) return;
            void act(() => partnersApi.sanction(partner.id, { kind, reason }), () => setReason(''));
          }}
        >
          <select value={kind} onChange={(e) => setKind(e.target.value as SanctionKind)} className={input}>
            {SANCTION_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
          </select>
          <p className="text-xs text-gray-500">{SANCTION_KINDS.find((k) => k.id === kind)?.description}</p>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={1000} placeholder="Alasan (dikirim ke mitra, minimal 10 karakter)" className={input} />
          {msg && <p role="alert" className="text-sm text-red-600">{msg}</p>}
          <button type="submit" disabled={busy || reason.trim().length < 10} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold disabled:opacity-50">Jatuhkan sanksi</button>
        </form>
      </Card>
      <Card title="Riwayat sanksi">
        <StateBox loading={loading} error={error} onRetry={reload}>
          {data && data.length === 0 ? (
            <Empty>Belum ada sanksi.</Empty>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-slate-800 text-sm">
              {data?.map((s) => (
                <li key={s.id} className="py-3">
                  <p><b className="text-gray-900 dark:text-white">{SANCTION_KINDS.find((k) => k.id === s.kind)?.label}</b>, {dateTimeId(s.createdAt)}{s.kind === 'SUSPEND' && (s.liftedAt ? <span className="text-green-600">, dicabut {dateTimeId(s.liftedAt)}</span> : <span className="text-red-600 font-bold">, berlaku</span>)}</p>
                  <p className="text-gray-600 dark:text-slate-300 whitespace-pre-wrap">{s.reason}</p>
                  {s.liftNote && <p className="text-xs text-gray-500">Pencabutan: {s.liftNote}</p>}
                  {s.kind === 'SUSPEND' && !s.liftedAt && (
                    liftId === s.id ? (
                      <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); void act(() => partnersApi.lift(s.id, note), () => { setLiftId(null); setNote(''); }); }}>
                        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Catatan pencabutan (min. 10 karakter)" maxLength={1000} className={input} />
                        <button type="submit" disabled={busy || note.trim().length < 10} className="px-3 py-1 bg-kodman-600 text-white rounded text-sm disabled:opacity-50">Cabut</button>
                      </form>
                    ) : (
                      <button onClick={() => setLiftId(s.id)} className="mt-1 text-xs underline">Cabut pembekuan</button>
                    )
                  )}
                </li>
              ))}
            </ul>
          )}
        </StateBox>
      </Card>
    </div>
  );
};

const PartnerGovernance: React.FC = () => {
  const { data, loading, error, reload } = useAsync(() => partnersApi.list());
  const [open, setOpen] = useState<PartnerRow | null>(null);

  if (open) return <PartnerDetail partner={open} onBack={() => setOpen(null)} onChanged={() => void reload()} />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center"><Gavel className="mr-3 text-kodman-600" /> Tata Kelola Mitra</h2>
        <p className="text-gray-500 dark:text-slate-400">Peringatan dan pembekuan akun mitra B2B. Hanya Direktur yang dapat menjatuhkan atau mencabut sanksi.</p>
      </div>
      <Card>
        <StateBox loading={loading} error={error} onRetry={reload}>
          {data && data.length === 0 ? (
            <Empty>Belum ada akun mitra.</Empty>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-gray-500 dark:text-slate-400"><tr><th className="py-2">Mitra</th><th>Status</th><th className="text-right">Peringatan</th><th className="text-right">Pembekuan berlaku</th><th></th></tr></thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {data?.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2"><p className="font-medium text-gray-900 dark:text-white">{p.name}</p><p className="text-xs text-gray-500">{p.email}</p></td>
                    <td>{STATUS_LABEL[p.status] ?? p.status}</td>
                    <td className="text-right font-mono">{p.warnings}</td>
                    <td className="text-right font-mono">{p.activeSuspensions}</td>
                    <td className="text-right"><button onClick={() => setOpen(p)} className="text-xs underline">Kelola</button></td>
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

export default PartnerGovernance;
