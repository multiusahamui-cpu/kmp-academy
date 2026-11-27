import React, { useState } from 'react';
import { apiMessage } from '../services/classes';
import { payoutsApi, type StatementRow } from '../services/payouts';
import { useI18n } from '../i18n';
import { Card, Empty, StateBox, Tile, dateId, dateTimeId, num, rupiah, useAsync } from '../components/ReportBits';

const input = 'w-full px-3 py-2 text-sm border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white';
const STATUS: Record<string, string> = { POSTED: 'help.pmPending', APPROVED: 'help.pmApproved', COMPLETED: 'help.pmDone' };

/** Bagi hasil untuk Creator (pemilik materi) dan Mentor: saldo berjalan, rekening, riwayat, dan rincian per judul. */
const PayoutMine: React.FC = () => {
  const { t } = useI18n();
  const { data, loading, error, reload } = useAsync(() => payoutsApi.mine());
  const [bank, setBank] = useState({ bankName: '', accountNumber: '', holderName: '' });
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState<{ id: string; rows: StatementRow[] } | null>(null);

  const saveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    try {
      await payoutsApi.saveBank(bank);
      setBank({ bankName: '', accountNumber: '', holderName: '' });
      setMsg(t('help.pmSaved'));
      await reload();
    } catch (e2) {
      setMsg(apiMessage(e2, t('help.pmSaveFail')));
    } finally {
      setBusy(false);
    }
  };
  const open = async (id: string) => {
    if (detail?.id === id) return setDetail(null);
    try { setDetail({ id, rows: await payoutsApi.statement(id) }); } catch (e) { setMsg(apiMessage(e, t('help.pmDetailFail'))); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('help.pmTitle')}</h2>
        <p className="text-gray-500 dark:text-slate-400">{t('help.pmSub')}</p>
      </div>
      {msg && <p role="status" className="text-sm text-gray-700 dark:text-slate-300">{msg}</p>}
      <StateBox loading={loading} error={error} onRetry={reload}>
        {data && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Tile title={t('help.pmAccrued')} value={rupiah(data.accrued.total)} hint={t('help.pmHint', { date: dateId(data.nextCutoffAt) })} />
              <Tile title={t('help.pmOwner')} value={rupiah(data.accrued.owner)} />
              <Tile title={t('help.pmMentor')} value={rupiah(data.accrued.mentor)} />
            </div>

            <Card title={t('help.pmBankTitle')}>
              <p className="text-sm mb-3 dark:text-slate-200">{data.bank ? t('help.pmBankHas', { bank: data.bank.bankName, acc: data.bank.account, holder: data.bank.holderName }) : t('help.pmBankNone')}</p>
              <form onSubmit={saveBank} className="grid md:grid-cols-4 gap-3">
                <input required value={bank.bankName} onChange={(e) => setBank({ ...bank, bankName: e.target.value })} placeholder={t('help.pmBankName')} className={input} />
                <input required value={bank.accountNumber} onChange={(e) => setBank({ ...bank, accountNumber: e.target.value })} placeholder={t('help.pmAccNo')} inputMode="numeric" className={input} />
                <input required value={bank.holderName} onChange={(e) => setBank({ ...bank, holderName: e.target.value })} placeholder={t('help.pmHolder')} className={input} />
                <button disabled={busy} type="submit" className="px-4 py-2 bg-digitalcoop-600 text-white rounded-lg text-sm font-bold disabled:opacity-50">{t('help.pmSaveBank')}</button>
              </form>
            </Card>

            <Card title={t('help.pmHistory')}>
              {data.history.length === 0 ? <Empty>{t('help.pmNoHist')}</Empty> : (
                <ul className="divide-y divide-gray-100 dark:divide-slate-800">
                  {data.history.map((h) => (
                    <li key={h.batchId} className="py-3 text-sm dark:text-slate-200">
                      <div className="flex justify-between gap-3">
                        <div>
                          <p className="font-bold">{h.period} · {rupiah(h.amount)}</p>
                          <p className="text-xs text-gray-500">{h.status === 'PAID' ? t('help.pmTransferred', { date: dateTimeId(h.paidAt), ref: h.transferRef ?? '' }) : STATUS[h.batchStatus] ? t(STATUS[h.batchStatus]) : h.batchStatus}</p>
                        </div>
                        <span className="shrink-0 flex gap-3">{h.hasProof && <button onClick={() => void payoutsApi.myProof(h.batchId).catch(() => setMsg(t('help.pmProofFail')))} className="text-digitalcoop-600 font-bold">{t('help.pmProof')}</button>}<button onClick={() => void open(h.batchId)} className="text-digitalcoop-600 font-bold">{detail?.id === h.batchId ? t('help.pmClose') : t('help.pmDetail')}</button></span>
                      </div>
                      {detail?.id === h.batchId && (
                        <table className="w-full text-xs text-left mt-2">
                          <thead className="text-gray-500"><tr><th className="py-1">{t('help.pmColTitle')}</th><th className="text-right">{t('help.pmColSales')}</th><th className="text-right">{t('help.pmColGross')}</th><th className="text-right">{t('help.pmColShare')}</th></tr></thead>
                          <tbody>{detail.rows.map((r) => <tr key={r.title}><td className="py-1">{r.title}</td><td className="text-right">{num(r.sales)}</td><td className="text-right">{rupiah(r.gross)}</td><td className="text-right">{rupiah(r.ownerShare + r.mentorShare)}</td></tr>)}</tbody>
                        </table>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </>
        )}
      </StateBox>
    </div>
  );
};

export default PayoutMine;
