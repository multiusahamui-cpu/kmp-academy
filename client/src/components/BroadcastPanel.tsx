import React, { useState } from 'react';
import { apiMessage } from '../services/classes';
import { BROADCAST_AUDIENCES, managementApi } from '../services/management';
import type { BroadcastAudience } from '@shared/management';
import { useT } from '../i18n';
import { Card, Empty, StateBox, dateTimeId, num, useAsync } from './ReportBits';

const input = 'w-full px-3 py-2 text-sm border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white';

const BroadcastPanel: React.FC = () => {
  const t = useT();
  const { data, loading, error, reload } = useAsync(() => managementApi.broadcasts());
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<BroadcastAudience>('ALL');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm(t('dir.bcConfirm', { a: t(`dir.ba${audience}`) }))) return;
    setBusy(true);
    setMsg('');
    try {
      const r = await managementApi.sendBroadcast({ title, body, audience });
      setTitle('');
      setBody('');
      setMsg(t('dir.bcSent', { n: num(r.recipients) }));
      await reload();
    } catch (e2) {
      setMsg(apiMessage(e2, t('dir.bcFail')));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title={t('dir.bcTitle')}>
      <form onSubmit={send} className="space-y-2 mb-4">
        <select value={audience} onChange={(e) => setAudience(e.target.value as BroadcastAudience)} className={input}>
          {BROADCAST_AUDIENCES.map((a) => <option key={a.id} value={a.id}>{t(`dir.ba${a.id}`)}</option>)}
        </select>
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder={t('dir.bcSubjectPh')} className={input} />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} maxLength={2000} placeholder={t('dir.bcBodyPh')} className={input} />
        <button type="submit" disabled={busy || title.trim().length < 3 || body.trim().length < 5} className="px-4 py-2 bg-digitalcoop-600 text-white rounded-lg text-sm font-bold disabled:opacity-50">{busy ? t('dir.bcSending') : t('dir.bcSend')}</button>
        {msg && <p role="status" className="text-sm">{msg}</p>}
      </form>
      <h4 className="font-bold text-sm mb-2">{t('dir.bcHistory')}</h4>
      <StateBox loading={loading} error={error} onRetry={reload}>
        {data && data.length === 0 ? (
          <Empty>{t('dir.bcNone')}</Empty>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-slate-800 text-sm">
            {data?.map((b) => (
              <li key={b.id} className="py-2"><b className="text-gray-900 dark:text-white">{b.title}</b><span className="block text-xs text-gray-500">{t('dir.bcRow', { a: t(`dir.ba${b.audience}`), n: num(b.recipients), d: dateTimeId(b.createdAt) })}</span></li>
            ))}
          </ul>
        )}
      </StateBox>
    </Card>
  );
};

export default BroadcastPanel;
