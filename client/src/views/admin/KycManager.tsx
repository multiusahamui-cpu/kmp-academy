import React, { useState } from 'react';
import { apiMessage } from '../../services/classes';
import { kycApi, type KycRow, type KycState } from '../../services/kyc';
import { useT } from '../../i18n';
import { Card, Empty, StateBox, dateTimeId, useAsync } from '../../components/ReportBits';

const TABS: { id: KycState }[] = [{ id: 'PENDING' }, { id: 'VERIFIED' }, { id: 'REJECTED' }];

/** Admin Sistem: meninjau foto KTP/selfie. Setiap pembukaan foto atau NIK utuh dicatat di jejak akses. */
const KycManager: React.FC = () => {
  const t = useT();
  const [tab, setTab] = useState<KycState>('PENDING');
  const list = useAsync<KycRow[]>(() => kycApi.list(tab), [tab]);
  const [view, setView] = useState<{ id: string; ktp?: string; selfie?: string; nik?: string } | null>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const close = () => {
    if (view?.ktp) URL.revokeObjectURL(view.ktp);
    if (view?.selfie) URL.revokeObjectURL(view.selfie);
    setView(null);
  };
  const openRow = async (r: KycRow) => {
    close();
    setMsg('');
    try {
      const [ktp, selfie] = await Promise.all([kycApi.file(r.id, 'ktp'), kycApi.file(r.id, 'selfie')]);
      setView({ id: r.id, ktp, selfie });
    } catch (e) { setMsg(apiMessage(e, t('adm.kyOpenFail'))); }
  };
  const act = async (fn: () => Promise<void>, ok: string) => {
    setBusy(true);
    setMsg('');
    try { await fn(); setMsg(ok); close(); await list.reload(); } catch (e) { setMsg(apiMessage(e, t('adm.fail'))); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('adm.kyTitle')}</h2>
        <p className="text-gray-500 dark:text-slate-400">{t('adm.kySub')}</p>
      </div>
      <div className="flex gap-2">
        {TABS.map((tb) => <button key={tb.id} onClick={() => { close(); setTab(tb.id); }} className={`px-4 py-1.5 rounded-lg text-sm font-bold ${tab === tb.id ? 'bg-digitalcoop-600 text-white' : 'border dark:border-slate-700 dark:text-slate-200'}`}>{t(`adm.ky${tb.id}`)}</button>)}
      </div>
      {msg && <p role="status" className="text-sm text-gray-700 dark:text-slate-300">{msg}</p>}
      <StateBox loading={list.loading} error={list.error} onRetry={list.reload}>
        <Card title={t('adm.kySubmissions')}>
          {!list.data || list.data.length === 0 ? <Empty>{t('adm.kyNone')}</Empty> : (
            <ul className="divide-y divide-gray-100 dark:divide-slate-800">
              {list.data.map((r) => (
                <li key={r.id} className="py-3 text-sm dark:text-slate-200">
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="font-bold">{r.userName} <span className="text-xs font-normal text-gray-500">({r.userRole}{r.source === 'DIGITALCOOP' ? t('adm.kyFromDc') : ''})</span></p>
                      <p className="text-xs text-gray-500">{r.fullName} · NIK {r.nikMasked} · {dateTimeId(r.submittedAt)}</p>
                      {r.rejectNote && <p className="text-xs text-red-600">{t('adm.kyRejNote', { n: r.rejectNote ?? '' })}</p>}
                    </div>
                    <button onClick={() => void openRow(r)} className="text-digitalcoop-600 font-bold shrink-0">{t('adm.kyOpenPhoto')}</button>
                  </div>
                  {view?.id === r.id && (
                    <div className="mt-3 space-y-3">
                      <div className="grid md:grid-cols-2 gap-3">
                        <figure><img src={view.ktp} alt={t('adm.kyIdAlt')} className="rounded border dark:border-slate-700 max-h-80 w-full object-contain" /><figcaption className="text-xs text-gray-500">{t('adm.kyId')}</figcaption></figure>
                        <figure><img src={view.selfie} alt={t('adm.kySelfie')} className="rounded border dark:border-slate-700 max-h-80 w-full object-contain" /><figcaption className="text-xs text-gray-500">{t('adm.kySelfie')}</figcaption></figure>
                      </div>
                      <div className="flex flex-wrap gap-2 items-center">
                        <button disabled={busy} onClick={() => void kycApi.nik(r.id).then((n) => setView((v) => (v ? { ...v, nik: n } : v))).catch((e) => setMsg(apiMessage(e, t('adm.kyNikFail'))))} className="text-xs font-bold px-3 py-1.5 rounded-lg border dark:border-slate-700">{t('adm.kyShowNik')}</button>
                        {view.nik && <span className="font-mono text-sm">{view.nik}</span>}
                        {r.status === 'PENDING' && (
                          <>
                            <button disabled={busy} onClick={() => confirm(t('adm.kyApproveAsk')) && void act(() => kycApi.approve(r.id), t('adm.kyApproved'))} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-digitalcoop-600 text-white">{t('adm.approve')}</button>
                            <button disabled={busy} onClick={() => { const n = prompt(t('adm.kyReasonAsk')); if (n) void act(() => kycApi.reject(r.id, n), t('adm.kyRejected')); }} className="text-xs font-bold px-3 py-1.5 rounded-lg border dark:border-slate-700 text-red-600">{t('adm.reject')}</button>
                          </>
                        )}
                        <button onClick={close} className="text-xs ml-auto">{t('adm.close')}</button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </StateBox>
    </div>
  );
};

export default KycManager;
