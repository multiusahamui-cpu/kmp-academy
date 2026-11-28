import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { useI18n } from '../../i18n';
import { apiMessage } from '../../services/classes';
import { payoutsApi, type PayoutArchive, type PayoutDetail } from '../../services/payouts';
import CourseShareTable from '../../components/CourseShareTable';
import { Card, Empty, StateBox, Tile, dateId, dateTimeId, rupiah, useAsync } from '../../components/ReportBits';

const MAX = 5 * 1024 * 1024;
const input = 'px-3 py-1.5 text-sm border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white';

/** Admin: memposting manual dan mencatat transfer. Direktur: menyetujui atau membatalkan. Keduanya melihat laporan per judul. */
const PayoutManager: React.FC<{ role: 'ADMIN_SYSTEM' | 'DIRECTOR' }> = ({ role }) => {
  const { t } = useI18n();
  const bl = (s: string) => t(`adm3.py${s}`);
  const overview = useAsync(() => payoutsApi.overview());
  const [open, setOpen] = useState<PayoutDetail | null>(null);
  const [refs, setRefs] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Record<string, File | undefined>>({});
  const [tab, setTab] = useState<'run' | 'archive'>('run');
  const archive = useAsync<PayoutArchive>(() => payoutsApi.archive());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const isAdmin = role === 'ADMIN_SYSTEM';
  const isDirector = role === 'DIRECTOR';

  const show = async (id: string) => {
    try { setOpen(await payoutsApi.detail(id)); } catch (e) { setMsg(apiMessage(e, t('adm3.pyLoadFail'))); }
  };
  const act = async (fn: () => Promise<void>, ok: string) => {
    setBusy(true);
    setMsg('');
    try {
      await fn();
      setMsg(ok);
      await overview.reload();
      await archive.reload();
      if (open) await show(open.batch.id);
    } catch (e) {
      setMsg(apiMessage(e, t('adm3.fail')));
    } finally {
      setBusy(false);
    }
  };

  const pay = (id: string, name: string, amount: number) => {
    const proof = files[id];
    if (!proof) return setMsg(t('adm3.pyNoProof'));
    if (proof.size > MAX) return setMsg(t('adm3.pyProofMax'));
    if (!confirm(t('adm3.pyPayAsk', { a: rupiah(amount), n: name }))) return;
    void act(async () => {
      const r = await payoutsApi.pay(id, refs[id] ?? '', '', proof);
      setFiles((f) => ({ ...f, [id]: undefined }));
      if (!r.emailed) setMsg(t('adm3.pyMailFail'));
    }, t('adm3.pyPaid'));
  };

  const o = overview.data;
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('adm3.pyTitle')}</h2>
        <p className="text-gray-500 dark:text-slate-400">{t('adm3.pySub')}</p>
      </div>
      <div className="flex gap-2">
        {(['run', 'archive'] as const).map((tb) => (
          <button key={tb} onClick={() => setTab(tb)} className={`px-4 py-1.5 rounded-lg text-sm font-bold ${tab === tb ? 'bg-digitalcoop-600 text-white' : 'border dark:border-slate-700 dark:text-slate-200'}`}>{tb === 'run' ? t('adm3.pyRun') : t('adm3.pyArch')}</button>
        ))}
      </div>
      {msg && <p role="status" className="text-sm text-gray-700 dark:text-slate-300">{msg}</p>}

      {tab === 'run' && <StateBox loading={overview.loading} error={overview.error} onRetry={overview.reload}>
        {o && (
          <>
            <Card title={t('adm3.pyAccr')}
              right={isAdmin && <button disabled={busy} onClick={() => confirm(t('adm3.pyPostAsk')) && void act(() => payoutsApi.postNow(), t('adm3.pyPosted'))} className="text-xs font-bold px-3 py-1 rounded-lg border dark:border-slate-700 dark:text-slate-200">{t('adm3.pyPostNow')}</button>}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <Tile title={t('adm3.pyIn')} value={rupiah(o.accrual.totals.gross)} hint={t('adm3.pyTx', { n: o.accrual.totals.sales })} />
                <Tile title={t('adm3.pyOwner')} value={rupiah(o.accrual.totals.ownerShare)} />
                <Tile title={t('adm3.pyMentor')} value={rupiah(o.accrual.totals.mentorShare)} />
                <Tile title={t('adm3.pyPlat')} value={rupiah(o.accrual.totals.platformShare)} hint={t('adm3.pyNext', { d: dateId(o.nextCutoffAt) })} />
              </div>
              <CourseShareTable rows={o.accrual.courses} totals={o.accrual.totals} />
            </Card>

            <Card title={t('adm3.pyBatches')}>
              {o.batches.length === 0 ? <Empty>{t('adm3.pyNoBatch')}</Empty> : (
                <ul className="divide-y divide-gray-100 dark:divide-slate-800">
                  {o.batches.map((b) => (
                    <li key={b.id} className="py-2 flex justify-between items-center text-sm dark:text-slate-200">
                      <span><b>{b.period}</b> · {t('adm3.pyForPayees', { a: rupiah(b.ownerTotal + b.mentorTotal) })} · {bl(b.status)}</span>
                      <button onClick={() => void show(b.id)} className="text-digitalcoop-600 font-bold">{t('adm3.pyOpen')}</button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </>
        )}
      </StateBox>}

      {tab === 'run' && open && (
        <Card title={t('adm3.pyPeriod', { p: open.batch.period, s: bl(open.batch.status) })} right={<button onClick={() => setOpen(null)} className="text-xs dark:text-slate-200">{t('adm3.close')}</button>}>
          <div className="space-y-5 dark:text-slate-200">
            <div className="flex flex-wrap gap-2 items-center">
              <button onClick={() => void payoutsApi.downloadTransactions(open.batch.id, open.batch.cutoffAt.slice(0, 10)).catch(() => setMsg(t('adm3.pyCsvFail')))} className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg border dark:border-slate-700"><Download size={14} /> {t('adm3.pyCsv')}</button>
              {isDirector && open.batch.status === 'POSTED' && (
                <>
                  <button disabled={busy} onClick={() => confirm(t('adm3.pyApproveAsk')) && void act(() => payoutsApi.approve(open.batch.id), t('adm3.pyApproved'))} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-digitalcoop-600 text-white">{t('adm3.approve')}</button>
                  <button disabled={busy} onClick={() => { const n = prompt(t('adm3.pyVoidAsk')); if (n) void act(() => payoutsApi.voidBatch(open.batch.id, n), t('adm3.pyVoided')); }} className="text-xs font-bold px-3 py-1.5 rounded-lg border dark:border-slate-700 text-red-600">{t('adm3.pyVoidBtn')}</button>
                </>
              )}
            </div>
            {open.batch.voidNote && <p className="text-xs">{t('adm3.pyVoidNote', { n: open.batch.voidNote })}</p>}

            <div>
              <h4 className="font-bold mb-2">{t('adm3.pyPerTitle')}</h4>
              <CourseShareTable rows={open.courses} />
            </div>

            <div>
              <h4 className="font-bold mb-2">{t('adm3.pyUnpaid')}</h4>
              {open.payees.every((p) => p.status === 'PAID') && <Empty>{t('adm3.pyAllPaid')}</Empty>}
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-gray-500 dark:text-slate-400"><tr><th className="py-2">{t('adm3.pyName')}</th><th className="text-right">{t('adm3.pyAmount')}</th><th>{t('adm3.pyAccount')}</th><th>{t('adm3.pyStatus')}</th><th></th></tr></thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                    {open.payees.filter((p) => p.status === 'PENDING').map((p) => (
                      <tr key={p.id}>
                        <td className="py-2">{p.userName}<p className="text-xs text-gray-500">{t('adm3.pyMat', { a: rupiah(p.ownerAmount), m: rupiah(p.mentorAmount) })}</p></td>
                        <td className="text-right font-bold">{rupiah(p.amount)}</td>
                        <td className="text-xs">{p.bank ? t('adm3.pyBank', { b: p.bank.bankName, a: p.bank.account, h: p.bank.holderName }) : <span className="text-red-600">{t('adm3.pyNoBank')}</span>}</td>
                        <td>{t('adm3.pyWaiting')}</td>
                        <td>
                          {isAdmin && open.batch.status === 'APPROVED' && p.status === 'PENDING' && (
                            <div className="flex flex-col gap-1 items-start">
                              <input value={refs[p.id] ?? ''} onChange={(e) => setRefs({ ...refs, [p.id]: e.target.value })} placeholder={t('adm3.pyRefPh')} className={`${input} w-40`} />
                              <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => setFiles({ ...files, [p.id]: e.target.files?.[0] })} className="text-xs max-w-[11rem]" aria-label={t('adm3.pyProofLbl')} />
                              <button disabled={busy || !p.bank || !files[p.id]} onClick={() => pay(p.id, p.userName, p.amount)} className="text-xs font-bold px-2 py-1 rounded-lg bg-digitalcoop-600 text-white disabled:opacity-50">{t('adm3.pyTransferred')}</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Card>
      )}
      {tab === 'archive' && (
        <StateBox loading={archive.loading} error={archive.error} onRetry={archive.reload}>
          {archive.data && (
            <>
              <Card title={t('adm3.pyDone')}>
                {archive.data.payments.length === 0 ? <Empty>{t('adm3.pyNoPay')}</Empty> : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left dark:text-slate-200">
                      <thead className="text-gray-500 dark:text-slate-400"><tr><th className="py-2">{t('adm3.pyThPeriod')}</th><th>{t('adm3.pyThPayee')}</th><th className="text-right">{t('adm3.pyAmount')}</th><th>{t('adm3.pyAccount')}</th><th>{t('adm3.pyThTransfer')}</th><th></th></tr></thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                        {archive.data.payments.map((p) => (
                          <tr key={p.id}>
                            <td className="py-2">{p.period}</td>
                            <td>{p.userName}</td>
                            <td className="text-right font-bold">{rupiah(p.amount)}</td>
                            <td className="text-xs">{p.bank ? `${p.bank.bankName} ${p.bank.account}` : '-'}</td>
                            <td className="text-xs">{dateTimeId(p.paidAt)}<br />Ref: {p.transferRef}<br />{p.proofEmailedAt ? t('adm3.pyEmailSent', { d: dateTimeId(p.proofEmailedAt) }) : <span className="text-amber-600">{t('adm3.pyEmailNot')}</span>}</td>
                            <td className="text-xs whitespace-nowrap">
                              {p.hasProof && <button onClick={() => void payoutsApi.adminProof(p.id).catch(() => setMsg(t('adm3.pyProofDl')))} className="text-digitalcoop-600 font-bold mr-2">{t('adm3.pyProofBtn')}</button>}
                              {isAdmin && p.hasProof && <button disabled={busy} onClick={() => void act(() => payoutsApi.resend(p.id), t('adm3.pyResendMail'))} className="text-digitalcoop-600 font-bold">{t('adm3.pyResend')}</button>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
              <Card title={t('adm3.pyDoneBatches')}>
                {archive.data.batches.length === 0 ? <Empty>{t('adm3.pyNone')}</Empty> : (
                  <ul className="divide-y divide-gray-100 dark:divide-slate-800">
                    {archive.data.batches.map((b) => (
                      <li key={b.id} className="py-2 flex justify-between items-center text-sm dark:text-slate-200">
                        <span><b>{b.period}</b> · {rupiah(b.ownerTotal + b.mentorTotal)} · {bl(b.status)}</span>
                        <span className="flex gap-3">
                          <button onClick={() => void payoutsApi.downloadTransactions(b.id, b.cutoffAt.slice(0, 10)).catch(() => setMsg(t('adm3.pyCsvFail')))} className="text-digitalcoop-600 font-bold">CSV</button>
                          <button onClick={() => { setTab('run'); void show(b.id); }} className="text-digitalcoop-600 font-bold">{t('adm3.pyReport')}</button>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </>
          )}
        </StateBox>
      )}
    </div>
  );
};

export default PayoutManager;
