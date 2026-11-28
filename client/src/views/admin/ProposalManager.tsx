import React, { useState } from 'react';
import { apiMessage } from '../../services/classes';
import { workshopsApi } from '../../services/workshops';
import { useT } from '../../i18n';
import { Card, Empty, StateBox, dateId, rupiah, useAsync } from '../../components/ReportBits';

const FILTERS = [{ id: 'PENDING', key: 'adm.pmPENDING' }, { id: 'APPROVED', key: 'adm.pmAPPROVED' }, { id: 'REJECTED', key: 'adm.pmREJECTED' }, { id: '', key: 'adm.pmALL' }];

const ProposalManager: React.FC = () => {
  const t = useT();
  const [status, setStatus] = useState('PENDING');
  const { data, loading, error, reload } = useAsync(() => workshopsApi.list(status), [status]);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const act = async (fn: () => Promise<void>, ok: string) => {
    setBusy(true);
    setMsg('');
    try { await fn(); setMsg(ok); await reload(); } catch (e) { setMsg(apiMessage(e, t('adm.fail'))); } finally { setBusy(false); }
  };
  const approve = (id: string, title: string) => confirm(t('adm.pmApproveAsk', { t: title })) && act(() => workshopsApi.approve(id), t('adm.pmApproved'));
  const reject = (id: string) => {
    const note = prompt(t('adm.pmReasonAsk'));
    if (note) void act(() => workshopsApi.reject(id, note), t('adm.pmRejected'));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('adm.pmTitle')}</h2>
        {data && <p className="text-gray-500 dark:text-slate-400">{t('adm.pmSplit', { o: data.split.owner, m: data.split.mentor, p: data.split.platform })}</p>}
      </div>
      <div className="flex gap-2">
        {FILTERS.map((f) => <button key={f.id} onClick={() => setStatus(f.id)} className={`px-3 py-1.5 text-sm rounded-lg border ${status === f.id ? 'bg-digitalcoop-600 text-white border-digitalcoop-600' : 'dark:border-slate-700 dark:text-slate-200'}`}>{t(f.key)}</button>)}
      </div>
      {msg && <p role="status" className="text-sm text-gray-700 dark:text-slate-300">{msg}</p>}
      <StateBox loading={loading} error={error} onRetry={reload}>
        {(data?.rows ?? []).length === 0 ? <Empty>{t('adm.pmNone')}</Empty> : (data?.rows ?? []).map((p) => (
          <Card key={p.id} title={`${p.title} · ${rupiah(p.price)}`} right={<span className="text-xs font-bold">{t(`mentor.ws${p.status}`)}</span>}>
            <div className="text-sm space-y-1 dark:text-slate-200">
              <p>{t('adm.pmMentorL')} <b>{p.mentor}</b> · {t('adm.pmOwnerL')} <b>{p.owner ?? '-'}</b></p>
              <p>{t('adm.pmSource', { s: p.source, p: rupiah(p.sourcePrice), d: dateId(p.createdAt) })}</p>
              {p.description && <p className="whitespace-pre-wrap text-gray-600 dark:text-slate-400">{p.description}</p>}
              {p.decisionNote && <p className="text-xs">{t('adm.noteLbl', { n: p.decisionNote })}</p>}
              {p.status === 'PENDING' && (
                <div className="flex gap-2 pt-2">
                  <button disabled={busy} onClick={() => approve(p.id, p.title)} className="px-3 py-1.5 bg-digitalcoop-600 text-white rounded-lg font-bold">{t('adm.approve')}</button>
                  <button disabled={busy} onClick={() => reject(p.id)} className="px-3 py-1.5 border rounded-lg dark:border-slate-700">{t('adm.reject')}</button>
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
