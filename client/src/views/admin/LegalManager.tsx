import React, { useState } from 'react';
import { LEGAL_KINDS, legalLabel, type LegalKind } from '@shared/legal';
import { apiMessage } from '../../services/classes';
import { legalApi, type LegalDetail } from '../../services/legal';
import { Card, StateBox, dateTimeId, num, useAsync } from '../../components/ReportBits';

const input = 'w-full px-3 py-2 text-sm border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white';

const LegalManager: React.FC<{ canPublish: boolean }> = ({ canPublish }) => {
  const { data, loading, error, reload } = useAsync(() => legalApi.list());
  const [open, setOpen] = useState<LegalDetail | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const show = async (id: string) => {
    setMsg('');
    try {
      const d = await legalApi.get(id);
      setOpen(d);
      setTitle(d.title);
      setBody(d.body);
    } catch (e) {
      setMsg(apiMessage(e, 'Gagal memuat dokumen.'));
    }
  };

  const run = async (fn: () => Promise<void>, ok: string) => {
    setBusy(true);
    setMsg('');
    try {
      await fn();
      setMsg(ok);
      await reload();
    } catch (e) {
      setMsg(apiMessage(e, 'Gagal.'));
    } finally {
      setBusy(false);
    }
  };

  const newVersion = (kind: LegalKind) =>
    run(async () => {
      const rows = (data ?? []).filter((r) => r.kind === kind);
      const latest = [...rows].sort((a, b) => b.version - a.version)[0];
      const src = latest ? await legalApi.get(latest.id) : null;
      const r = await legalApi.createDraft({ kind, title: src?.title ?? legalLabel(kind), body: src?.body ?? '' });
      await show(r.id);
    }, 'Draf versi baru dibuat.');

  const save = () => open && run(() => legalApi.save(open.id, { title, body }), 'Draf disimpan.');
  const publish = () => {
    if (!open) return;
    if (!confirm(`Terbitkan "${open.title}" versi ${open.version}? Semua pengguna terkait wajib menyetujui ulang dan dokumen tidak bisa diubah lagi.`)) return;
    void run(async () => {
      await legalApi.publish(open.id);
      setOpen(null);
    }, 'Dokumen diterbitkan.');
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold dark:text-white">Dokumen Hukum</h1>
      <p className="text-sm text-slate-500">Draf awal disusun sebagai titik mulai dan wajib ditinjau penasihat hukum sebelum diterbitkan. Hanya Direktur yang dapat menerbitkan.</p>
      {msg && <p className="text-sm text-slate-700 dark:text-slate-200">{msg}</p>}
      <StateBox loading={loading} error={error} onRetry={reload}>
        {LEGAL_KINDS.map((k) => {
          const rows = (data ?? []).filter((r) => r.kind === k.id).sort((a, b) => b.version - a.version);
          const hasDraft = rows.some((r) => r.status === 'DRAFT');
          return (
            <Card key={k.id} title={`${k.label} (${k.audience})`}
              right={!hasDraft && <button disabled={busy} onClick={() => newVersion(k.id)} className="text-xs font-bold px-3 py-1 rounded-lg border dark:border-slate-700 dark:text-slate-200">Buat versi baru</button>}>
              <ul className="divide-y dark:divide-slate-700">
                {rows.map((r) => (
                  <li key={r.id} className="py-2 flex items-center justify-between text-sm dark:text-slate-200">
                    <span>Versi {r.version} · {r.status === 'PUBLISHED' ? `terbit ${dateTimeId(r.publishedAt)} · ${num(r.accepted)} persetujuan` : 'DRAF'}</span>
                    <button onClick={() => show(r.id)} className="text-kodman-600 font-bold">{r.status === 'DRAFT' ? 'Edit' : 'Lihat'}</button>
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </StateBox>
      {open && (
        <Card title={`${legalLabel(open.kind)} · versi ${open.version} · ${open.status === 'DRAFT' ? 'Draf' : 'Terbit'}`}
          right={<button onClick={() => setOpen(null)} className="text-xs dark:text-slate-200">Tutup</button>}>
          <div className="space-y-3">
            <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} readOnly={open.status !== 'DRAFT'} />
            <textarea className={`${input} font-mono`} rows={24} value={body} onChange={(e) => setBody(e.target.value)} readOnly={open.status !== 'DRAFT'} />
            {open.status === 'DRAFT' && (
              <div className="flex gap-2 justify-end">
                <button disabled={busy} onClick={save} className="px-4 py-2 text-sm rounded-lg border dark:border-slate-700 dark:text-slate-200">Simpan draf</button>
                {canPublish && <button disabled={busy} onClick={publish} className="px-4 py-2 text-sm font-bold rounded-lg bg-kodman-600 text-white">Terbitkan</button>}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

export default LegalManager;
