import React, { useState } from 'react';
import { helpdeskApi } from '../services/helpdesk';
import { useT } from '../i18n';
import { StateBox, dateTimeId, useAsync } from './ReportBits';

/** Percakapan satu tiket: dipakai pemilik (halaman Bantuan) dan staf (antrean Helpdesk). */
const TicketThread: React.FC<{ id: string; onBack: () => void; onChanged: () => void }> = ({ id, onBack, onChanged }) => {
  const t = useT();
  const { data, loading, error, reload } = useAsync(() => helpdeskApi.get(id), [id]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const act = async (fn: () => Promise<void>, after?: () => void) => {
    setBusy(true);
    setErr('');
    try {
      await fn();
      after?.();
      onChanged();
      await reload();
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? t('help.tkFail'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm text-gray-500 hover:text-digitalcoop-600">&larr; {t('help.tkBack')}</button>
      <StateBox loading={loading} error={error} onRetry={reload}>
        {data && (
          <>
            <div className="flex justify-between items-start gap-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{data.ticket.subject}</h3>
                <p className="text-xs text-gray-500">{t(`help.st${data.ticket.status}`)}{data.ticket.userName ? t('help.tkFrom', { name: data.ticket.userName, email: data.ticket.userEmail ?? '' }) : ''}</p>
              </div>
              {data.ticket.status !== 'CLOSED' && (
                <button disabled={busy} onClick={() => confirm(t('help.tkCloseAsk')) && void act(() => helpdeskApi.close(id))} className="px-3 py-1 border rounded text-sm disabled:opacity-50">{t('help.tkClose')}</button>
              )}
            </div>
            <ul className="space-y-3">
              {data.messages.map((m) => (
                <li key={m.id} className={`p-3 rounded-lg text-sm ${m.isStaff ? 'bg-digitalcoop-50 dark:bg-digitalcoop-900/20' : 'bg-gray-50 dark:bg-slate-800'}`}>
                  <p className="text-xs text-gray-500 mb-1">{m.author}{m.isStaff ? t('help.tkStaff') : ''}, {dateTimeId(m.createdAt)}</p>
                  <p className="whitespace-pre-wrap text-gray-800 dark:text-slate-200">{m.body}</p>
                </li>
              ))}
            </ul>
            {data.ticket.status !== 'CLOSED' && (
              <form
                className="space-y-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void act(() => helpdeskApi.reply(id, text), () => setText(''));
                }}
              >
                <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} maxLength={4000} placeholder={t('help.tkReplyPh')} className="w-full p-3 text-sm border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
                <button type="submit" disabled={busy || text.trim().length < 5} className="px-4 py-2 bg-digitalcoop-600 text-white rounded-lg text-sm font-bold disabled:opacity-50">{t('help.spSend')}</button>
              </form>
            )}
          </>
        )}
      </StateBox>
    </div>
  );
};

export default TicketThread;
