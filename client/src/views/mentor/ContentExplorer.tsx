import React, { useState } from 'react';
import { PROPOSAL_LABEL } from '@shared/workshop';
import { apiMessage } from '../../services/classes';
import { workshopsApi } from '../../services/workshops';
import { Card, Empty, StateBox, Tile, dateId, num, rupiah, useAsync } from '../../components/ReportBits';

const input = 'w-full px-3 py-2 text-sm border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white';

const ContentExplorer: React.FC = () => {
  const earnings = useAsync(() => workshopsApi.earnings());
  const eligible = useAsync(() => workshopsApi.eligible());
  const mine = useAsync(() => workshopsApi.mine());
  const [sourceId, setSourceId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    try {
      await workshopsApi.propose({ sourceCourseId: sourceId, title, description, price: Number(price) });
      setSourceId(''); setTitle(''); setDescription(''); setPrice('');
      setMsg('Proposal diajukan. Admin akan meninjau.');
      await mine.reload();
    } catch (e2) {
      setMsg(apiMessage(e2, 'Gagal mengajukan proposal.'));
    } finally {
      setBusy(false);
    }
  };

  const withdraw = async (id: string) => {
    if (!confirm('Tarik proposal ini?')) return;
    try { await workshopsApi.withdraw(id); await mine.reload(); } catch (e) { setMsg(apiMessage(e, 'Gagal menarik proposal.')); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Workshop</h2>
        <p className="text-gray-500 dark:text-slate-400">Ajukan workshop berbayar dari kursus mandiri yang sudah terbit. Jadwal sesi diatur di menu Kelas setelah proposal disetujui.</p>
      </div>

      <StateBox loading={earnings.loading} error={earnings.error} onRetry={earnings.reload}>
        {earnings.data && (
          <div className="grid grid-cols-3 gap-4">
            <Tile title="Pendapatan workshop" value={rupiah(earnings.data.earningsTotal)} hint={`Bagian Mentor ${earnings.data.mentorPercent}% per pendaftaran`} />
            <Tile title="Bulan ini" value={rupiah(earnings.data.earningsThisMonth)} />
            <Tile title="Peserta" value={num(earnings.data.participants)} />
          </div>
        )}
      </StateBox>

      <Card title="Ajukan workshop baru">
        <StateBox loading={eligible.loading} error={eligible.error} onRetry={eligible.reload}>
          {(eligible.data ?? []).length === 0 ? (
            <Empty>Belum ada kursus mandiri terbit dari Creator lain yang bisa dijadikan dasar workshop.</Empty>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <select required value={sourceId} onChange={(e) => setSourceId(e.target.value)} className={input}>
                <option value="">Pilih kursus sumber (materi)</option>
                {(eligible.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.title} ({c.owner ?? 'Creator'}, harga mandiri {rupiah(c.price)})</option>)}
              </select>
              <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Judul workshop" className={input} />
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Deskripsi, jadwal rencana, dan apa yang akan dipelajari" rows={3} className={input} />
              <input required type="number" min={1} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Harga per peserta (Rp)" className={input} />
              <div className="flex items-center gap-3">
                <button disabled={busy} type="submit" className="px-4 py-2 bg-kodman-600 text-white rounded-lg text-sm font-bold disabled:opacity-50">Ajukan</button>
                {msg && <span role="status" className="text-sm text-gray-700 dark:text-slate-300">{msg}</span>}
              </div>
            </form>
          )}
        </StateBox>
      </Card>

      <Card title="Proposal saya">
        <StateBox loading={mine.loading} error={mine.error} onRetry={mine.reload}>
          {(mine.data ?? []).length === 0 ? <Empty>Belum ada proposal.</Empty> : (
            <ul className="divide-y divide-gray-100 dark:divide-slate-800">
              {(mine.data ?? []).map((p) => (
                <li key={p.id} className="py-3 text-sm dark:text-slate-200">
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="font-bold">{p.title} · {rupiah(p.price)}</p>
                      <p className="text-xs text-gray-500">Dari: {p.source} · diajukan {dateId(p.createdAt)}</p>
                      {p.decisionNote && <p className="text-xs mt-1">Catatan Admin: {p.decisionNote}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold">{PROPOSAL_LABEL[p.status]}</p>
                      {p.status === 'PENDING' && <button onClick={() => void withdraw(p.id)} className="text-xs underline text-gray-500">Tarik</button>}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </StateBox>
      </Card>
    </div>
  );
};

export default ContentExplorer;
