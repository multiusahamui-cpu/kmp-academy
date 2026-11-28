import React, { useState } from 'react';
import { Activity } from 'lucide-react';
import { jobsApi } from '../../services/reports';
import { useI18n } from '../../i18n';
import { Card, Empty, StateBox, dateTimeId, useAsync } from '../../components/ReportBits';

const RunHistory: React.FC<{ id: string; label: string; onBack: () => void }> = ({ id, label, onBack }) => {
  const { t } = useI18n();
  const { data, loading, error, reload } = useAsync(() => jobsApi.runs(id), [id]);
  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm text-gray-500 hover:text-digitalcoop-600">&larr; {t('adm6.cBack')}</button>
      <Card title={t('adm6.cHist', { l: label })}>
        <p className="text-xs text-gray-500 mb-3">{t('adm6.cHistNote')}</p>
        <StateBox loading={loading} error={error} onRetry={reload}>
          {data && data.length === 0 ? (
            <Empty>{t('adm6.cNoHist')}</Empty>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-gray-500 dark:text-slate-400"><tr><th className="py-2">{t('adm6.cThStart')}</th><th>{t('adm6.cThTrig')}</th><th>{t('adm6.cThStatus')}</th><th className="text-right">{t('adm6.cThProc')}</th><th>{t('adm6.cThErr')}</th></tr></thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {data?.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2 whitespace-nowrap">{dateTimeId(r.startedAt)}</td>
                    <td>{r.trigger === 'MANUAL' ? t('adm6.cManual') : t('adm6.cSched')}</td>
                    <td className={r.status === 'OK' ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>{r.status === 'OK' ? t('adm6.cOk') : t('adm6.cFail')}</td>
                    <td className="text-right font-mono">{r.affected}</td>
                    <td className="text-xs text-red-600">{r.error ?? ''}</td>
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

const CronManager: React.FC = () => {
  const { t } = useI18n();
  const { data, loading, error, reload } = useAsync(() => jobsApi.list());
  const [history, setHistory] = useState<{ id: string; label: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  if (history) return <RunHistory id={history.id} label={history.label} onBack={() => setHistory(null)} />;

  const trigger = async (id: string) => {
    setBusyId(id);
    setMsg('');
    try {
      const r = await jobsApi.run(id);
      setMsg(r.status === 'OK' ? t('adm6.cDone', { n: r.affected }) : t('adm6.cFailed', { e: r.error ?? t('adm6.cUnknown') }));
      await reload();
    } catch (e: any) {
      setMsg(e?.response?.data?.message ?? t('adm6.cRunFail'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center"><Activity className="mr-3 text-digitalcoop-600" /> {t('adm6.cTitle')}</h2>
        <p className="text-gray-500 dark:text-slate-400">{t('adm6.cSub')}</p>
      </div>
      {msg && <p role="status" className="text-sm text-gray-700 dark:text-slate-300">{msg}</p>}
      <StateBox loading={loading} error={error} onRetry={reload}>
        <div className="grid gap-4">
          {data?.map((j) => (
            <Card key={j.id}>
              <div className="flex justify-between items-start gap-4 flex-wrap">
                <div className="min-w-0">
                  <h3 className="font-bold text-gray-900 dark:text-white">{j.label}</h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400">{j.description}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {t('adm6.cEvery', { n: j.everyMinutes, l: j.lastTickAt ? dateTimeId(j.lastTickAt) : t('adm6.cNever') })}
                    {j.lastTickStatus === 'ERROR' && <span className="text-red-600 font-bold">{t('adm6.cErrL', { e: j.lastError ?? '' })}</span>}
                    {j.running && t('adm6.cRunning')}
                  </p>
                  {j.lastRecordedRun && <p className="text-xs text-gray-400">{t('adm6.cLast', { d: dateTimeId(j.lastRecordedRun.startedAt), n: j.lastRecordedRun.affected })}</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setHistory({ id: j.id, label: j.label })} className="px-3 py-1 border rounded text-sm">{t('adm6.cHistBtn')}</button>
                  <button disabled={busyId === j.id || j.running} onClick={() => void trigger(j.id)} className="px-3 py-1 bg-digitalcoop-600 text-white rounded text-sm font-bold disabled:opacity-50">{busyId === j.id ? t('adm6.cRunning2') : t('adm6.cRunNow')}</button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </StateBox>
    </div>
  );
};

export default CronManager;
