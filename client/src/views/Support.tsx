import React, { useState } from 'react';
import { LifeBuoy } from 'lucide-react';
import { helpdeskApi, STATUS_LABEL, TICKET_CATEGORIES, type TicketCategory } from '../services/helpdesk';
import TicketThread from '../components/TicketThread';
import { Card, Empty, StateBox, dateTimeId, useAsync } from '../components/ReportBits';

const Support: React.FC = () => {
  const { data, loading, error, reload } = useAsync(() => helpdeskApi.mine());
  const [openId, setOpenId] = useState<string | null>(null);
  const [form, setForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<TicketCategory>('AKUN');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  if (openId) return <TicketThread id={openId} onBack={() => setOpenId(null)} onChanged={() => void reload()} />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const { id } = await helpdeskApi.create({ subject, category, body });
      setSubject('');
      setBody('');
      setForm(false);
      await reload();
      setOpenId(id);
    } catch (e2: any) {
      setErr(e2?.response?.data?.message ?? 'Gagal membuat tiket.');
    } finally {
      setBusy(false);
    }
  };
  const input = 'w-full px-3 py-2 text-sm border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white';

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center"><LifeBuoy className="mr-3 text-kodman-600" /> Bantuan</h2>
          <p className="text-gray-500 dark:text-slate-400">Kirim pertanyaan atau kendala ke tim admin. Balasan masuk ke notifikasi Anda.</p>
        </div>
        <button onClick={() => setForm(!form)} className="px-4 py-2 bg-kodman-600 text-white rounded-lg text-sm font-bold">Tiket baru</button>
      </div>

      {form && (
        <Card>
          <form onSubmit={submit} className="space-y-3">
            <label className="block text-sm">Kategori
              <select value={category} onChange={(e) => setCategory(e.target.value as TicketCategory)} className={input}>
                {TICKET_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </label>
            <label className="block text-sm">Judul
              <input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={150} className={input} />
            </label>
            <label className="block text-sm">Pesan
              <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} maxLength={4000} className={input} />
            </label>
            {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
            <button type="submit" disabled={busy} className="px-4 py-2 bg-kodman-600 text-white rounded-lg text-sm font-bold disabled:opacity-50">{busy ? 'Mengirim...' : 'Kirim'}</button>
          </form>
        </Card>
      )}

      <Card title="Tiket saya">
        <StateBox loading={loading} error={error} onRetry={reload}>
          {data && data.length === 0 ? (
            <Empty>Belum ada tiket.</Empty>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-slate-800">
              {data?.map((t) => (
                <li key={t.id}>
                  <button onClick={() => setOpenId(t.id)} className="w-full text-left py-3 hover:bg-gray-50 dark:hover:bg-slate-800/50 px-2 rounded">
                    <p className="font-bold text-gray-900 dark:text-white">{t.subject}</p>
                    <p className="text-xs text-gray-500">{STATUS_LABEL[t.status]}, diperbarui {dateTimeId(t.updatedAt)}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </StateBox>
      </Card>
    </div>
  );
};

export default Support;
