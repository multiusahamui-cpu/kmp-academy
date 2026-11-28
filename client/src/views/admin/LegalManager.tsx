import React, { useState } from 'react';
import { LEGAL_KINDS, type LegalKind } from '@shared/legal';
import { useI18n } from '../../i18n';
import { apiMessage } from '../../services/classes';
import { legalApi, type LegalDetail } from '../../services/legal';
import { Card, StateBox, dateTimeId, num, useAsync } from '../../components/ReportBits';

const input = 'w-full px-3 py-2 text-sm border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white';

const LegalManager: React.FC<{ canPublish: boolean }> = ({ canPublish }) => {
  const { t } = useI18n();
  const legalLabel = (k: string): string => (LEGAL_KINDS.some((x) => x.id === k) ? t(`adm6.lk${k}`) : k);
  const audience = (a: string): string => ({ 'Semua pengguna': t('adm6.laAll'), Mentor: t('adm6.laMentor'), Creator: t('adm6.laCreator') } as Record<string, string>)[a] ?? a;
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
      setMsg(apiMessage(e, t('adm6.lgLoadFail')));
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
      setMsg(apiMessage(e, t('adm6.lgFail')));
    } finally {
      setBusy(false);
    }
  };

  const newVersion = (kind: LegalKind) =>
    run(async () => {
      const rows = (data ?? []).filter((r) => r.kind === kind);
      const latest = [...rows].sort((a, b) => b.version - a.version)[0];
      const src = latest ? await legalApi.get(latest.id) : null;
      const r = await legalApi.createDraft({ kind, title: src?.title ?? LEGAL_KINDS.find((x) => x.id === kind)?.label ?? kind, body: src?.body ?? '' });
      await show(r.id);
    }, t('adm6.lgDraftNew'));

  const save = () => open && run(() => legalApi.save(open.id, { title, body }), t('adm6.lgSaved'));
  const publish = () => {
    if (!open) return;
    if (!confirm(t('adm6.lgPubAsk', { t: open.title, v: open.version }))) return;
    void run(async () => {
      await legalApi.publish(open.id);
      setOpen(null);
    }, t('adm6.lgPubDone'));
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold dark:text-white">{t('adm6.lgTitle')}</h1>
      <p className="text-sm text-slate-500">{t('adm6.lgSub')}</p>
      {msg && <p className="text-sm text-slate-700 dark:text-slate-200">{msg}</p>}
      <StateBox loading={loading} error={error} onRetry={reload}>
        {LEGAL_KINDS.map((k) => {
          const rows = (data ?? []).filter((r) => r.kind === k.id).sort((a, b) => b.version - a.version);
          const hasDraft = rows.some((r) => r.status === 'DRAFT');
          return (
            <Card key={k.id} title={`${legalLabel(k.id)} (${audience(k.audience)})`}
              right={!hasDraft && <button disabled={busy} onClick={() => newVersion(k.id)} className="text-xs font-bold px-3 py-1 rounded-lg border dark:border-slate-700 dark:text-slate-200">{t('adm6.lgNewVer')}</button>}>
              <ul className="divide-y dark:divide-slate-700">
                {rows.map((r) => (
                  <li key={r.id} className="py-2 flex items-center justify-between text-sm dark:text-slate-200">
                    <span>{t('adm6.lgVer', { v: r.version, s: r.status === 'PUBLISHED' ? t('adm6.lgPubd', { d: dateTimeId(r.publishedAt), n: num(r.accepted) }) : t('adm6.lgDraftU') })}</span>
                    <button onClick={() => show(r.id)} className="text-digitalcoop-600 font-bold">{r.status === 'DRAFT' ? t('adm6.lgEdit') : t('adm6.lgView')}</button>
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </StateBox>
      {open && (
        <Card title={t('adm6.lgHead', { k: legalLabel(open.kind), v: open.version, s: open.status === 'DRAFT' ? t('adm6.lgDraft') : t('adm6.lgPub') })}
          right={<button onClick={() => setOpen(null)} className="text-xs dark:text-slate-200">{t('adm6.close')}</button>}>
          <div className="space-y-3">
            <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} readOnly={open.status !== 'DRAFT'} />
            <textarea className={`${input} font-mono`} rows={24} value={body} onChange={(e) => setBody(e.target.value)} readOnly={open.status !== 'DRAFT'} />
            {open.status === 'DRAFT' && (
              <div className="flex gap-2 justify-end">
                <button disabled={busy} onClick={save} className="px-4 py-2 text-sm rounded-lg border dark:border-slate-700 dark:text-slate-200">{t('adm6.lgSaveDraft')}</button>
                {canPublish && <button disabled={busy} onClick={publish} className="px-4 py-2 text-sm font-bold rounded-lg bg-digitalcoop-600 text-white">{t('adm6.lgPublish')}</button>}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

export default LegalManager;
