import React, { useEffect, useState } from 'react';
import { Download, Ticket, Wallet, TrendingUp, Search } from 'lucide-react';
import { courseApi } from '../../services/api';
import { reportsApi, type SaleRow } from '../../services/reports';
import { useI18n } from '../../i18n';
import { Card, Empty, StateBox, Tile, dateId, dateTimeId, num, rupiah, useAsync } from '../../components/ReportBits';

type Tab = 'SALES' | 'SETTLEMENTS' | 'VOUCHERS';


const SalesTab: React.FC = () => {
  const { t } = useI18n();
  const [q, setQ] = useState('');
  const [term, setTerm] = useState('');
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useAsync(() => reportsApi.sales(term, page), [term, page]);
  const [dlError, setDlError] = useState('');

  return (
    <div className="space-y-4">
      <div className="flex gap-2 justify-between flex-wrap">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setTerm(q.trim());
          }}
        >
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('adm5.fdSearchPh')} className="px-3 py-2 text-sm border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
          <button type="submit" className="px-3 py-2 bg-gray-100 dark:bg-slate-800 rounded-lg text-sm" aria-label={t('adm5.fdSearch')}><Search size={16} /></button>
        </form>
        <button
          onClick={async () => {
            setDlError('');
            try { await reportsApi.downloadSalesCsv(); } catch { setDlError(t('adm5.fdCsvFail')); }
          }}
          className="px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-medium flex items-center hover:bg-gray-50 dark:hover:bg-slate-700"
        >
          <Download size={16} className="mr-2" /> Export CSV
        </button>
      </div>
      {dlError && <p role="alert" className="text-sm text-red-600">{dlError}</p>}
      <StateBox loading={loading} error={error} onRetry={reload}>
        {data && data.rows.length === 0 ? (
          <Empty>{t('adm5.fdNoSales')}{term ? t('adm5.fdMatch') : ''}.</Empty>
        ) : (
          data && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500 dark:text-slate-400">
                  <thead className="text-xs text-gray-700 dark:text-slate-300 uppercase bg-gray-50 dark:bg-slate-800">
                    <tr><th className="px-4 py-3">{t('adm5.fdThTime')}</th><th className="px-4 py-3">{t('adm5.fdThBuyer')}</th><th className="px-4 py-3">{t('adm5.fdThCourse')}</th><th className="px-4 py-3 text-right">{t('adm5.fdThPrice')}</th><th className="px-4 py-3 text-right">{t('adm5.fdThDisc')}</th><th className="px-4 py-3 text-right">{t('adm5.fdThPaid')}</th><th className="px-4 py-3">{t('adm5.fdThChan')}</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                    {data.rows.map((r: SaleRow) => (
                      <tr key={r.id}>
                        <td className="px-4 py-3 whitespace-nowrap">{dateTimeId(r.at)}</td>
                        <td className="px-4 py-3 text-gray-900 dark:text-white">{r.buyer}</td>
                        <td className="px-4 py-3">{r.course}</td>
                        <td className="px-4 py-3 text-right font-mono">{r.base_price == null ? '-' : rupiah(r.base_price)}</td>
                        <td className="px-4 py-3 text-right font-mono">{r.discount_percent ? `${r.discount_percent}%` : '-'}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-gray-900 dark:text-white">{rupiah(r.amount_paid ?? 0)}</td>
                        <td className="px-4 py-3">{r.channel === 'DOMPET' || r.channel === 'GRATIS' ? t(`adm5.fd${r.channel}`) : r.channel}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-between items-center text-sm">
                <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1 border rounded disabled:opacity-40">{t('adm5.fdPrev')}</button>
                <span>{t('adm5.fdPage', { n: page })}</span>
                <button disabled={!data.hasMore} onClick={() => setPage(page + 1)} className="px-3 py-1 border rounded disabled:opacity-40">{t('adm5.fdNext')}</button>
              </div>
            </>
          )
        )}
      </StateBox>
    </div>
  );
};

const SettlementsTab: React.FC = () => {
  const { t } = useI18n();
  const { data, loading, error, reload } = useAsync(() => reportsApi.settlements());
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-slate-300 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        {t('adm5.fdSetInfo')}
      </p>
      <StateBox loading={loading} error={error} onRetry={reload}>
        {data && data.length === 0 ? (
          <Empty>{t('adm5.fdNoSet')}</Empty>
        ) : (
          data && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-500 dark:text-slate-400">
                <thead className="text-xs text-gray-700 dark:text-slate-300 uppercase bg-gray-50 dark:bg-slate-800">
                  <tr><th className="px-4 py-3">{t('adm5.fdThDate')}</th><th className="px-4 py-3">{t('adm5.fdThRecv')}</th><th className="px-4 py-3 text-right">{t('adm5.fdThAmt')}</th><th className="px-4 py-3">{t('adm5.fdThRef')}</th><th className="px-4 py-3">{t('adm5.fdThBy')}</th><th className="px-4 py-3">{t('adm5.fdThNote')}</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {data.map((s) => (
                    <tr key={s.id}>
                      <td className="px-4 py-3">{dateId(s.transfer_date)}</td>
                      <td className="px-4 py-3 text-gray-900 dark:text-white">{s.recipient}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold">{rupiah(s.amount)}</td>
                      <td className="px-4 py-3 font-mono">{s.bank_ref}</td>
                      <td className="px-4 py-3">{s.settled_by_name ?? '-'}</td>
                      <td className="px-4 py-3">{s.note ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </StateBox>
    </div>
  );
};

interface CourseOpt { id: string; title: string }

const VouchersTab: React.FC = () => {
  const { t } = useI18n();
  const { data, loading, error, reload } = useAsync(() => reportsApi.voucherBatches());
  const [courses, setCourses] = useState<CourseOpt[]>([]);
  const [open, setOpen] = useState(false);
  const [courseId, setCourseId] = useState('');
  const [sponsor, setSponsor] = useState('');
  const [count, setCount] = useState(10);
  const [percent, setPercent] = useState(100);
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [codes, setCodes] = useState<string[] | null>(null);

  useEffect(() => {
    courseApi.getAll().then((r) => setCourses((r.data.data as CourseOpt[]).map((c) => ({ id: c.id, title: c.title })))).catch(() => setCourses([]));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!courseId) return setFormError(t('adm5.fdPickCourse'));
    if (!startsAt || !endsAt) return setFormError(t('adm5.fdPickDates'));
    setBusy(true);
    try {
      const res = await reportsApi.createVoucherBatch(courseId, {
        count, percent, reason: sponsor.trim(),
        startsAt: new Date(startsAt).toISOString(), endsAt: new Date(endsAt).toISOString(),
      });
      setCodes(res.codes);
      setOpen(false);
      setSponsor('');
      await reload();
    } catch (err: any) {
      setFormError(err?.response?.data?.message ?? t('adm5.fdVFail'));
    } finally {
      setBusy(false);
    }
  };

  const input = 'w-full px-3 py-2 text-sm border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white';

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600 dark:text-slate-300">{t('adm5.fdVInfo')}</p>
        <button onClick={() => setOpen(!open)} className="px-4 py-2 bg-digitalcoop-600 text-white rounded-lg text-sm font-bold flex items-center"><Ticket size={16} className="mr-2" /> {t('adm5.fdMake')}</button>
      </div>

      {open && (
        <form onSubmit={submit} className="grid md:grid-cols-2 gap-3 p-4 border rounded-lg dark:border-slate-700">
          <label className="text-sm md:col-span-2">{t('adm5.fdCourse')}
            <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className={input}>
              <option value="">{t('adm5.fdPickOpt')}</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </label>
          <label className="text-sm md:col-span-2">{t('adm5.fdSponsor')}
            <input value={sponsor} onChange={(e) => setSponsor(e.target.value)} className={input} placeholder={t('adm5.fdSponsorPh')} />
          </label>
          <label className="text-sm">{t('adm5.fdCount')}
            <input type="number" min={1} max={200} value={count} onChange={(e) => setCount(Number(e.target.value))} className={input} />
          </label>
          <label className="text-sm">{t('adm5.fdPct')}
            <input type="number" min={1} max={100} value={percent} onChange={(e) => setPercent(Number(e.target.value))} className={input} />
          </label>
          <label className="text-sm">{t('adm5.fdFrom')}
            <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={input} />
          </label>
          <label className="text-sm">{t('adm5.fdTo')}
            <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className={input} />
          </label>
          {formError && <p role="alert" className="text-sm text-red-600 md:col-span-2">{formError}</p>}
          <button type="submit" disabled={busy} className="md:col-span-2 px-4 py-2 bg-digitalcoop-600 text-white rounded-lg text-sm font-bold disabled:opacity-50">{busy ? t('adm5.fdCreating') : t('adm5.fdCreate')}</button>
        </form>
      )}

      {codes && (
        <div className="p-4 border border-green-300 bg-green-50 dark:bg-green-900/20 rounded-lg space-y-2">
          <p className="text-sm font-bold text-green-800 dark:text-green-300">{t('adm5.fdCodesMade', { n: codes.length })}</p>
          <textarea readOnly rows={6} value={codes.join('\n')} className="w-full font-mono text-xs p-2 border rounded dark:bg-slate-800 dark:text-white" />
          <div className="flex gap-2">
            <button onClick={() => void navigator.clipboard?.writeText(codes.join('\n'))} className="px-3 py-1 border rounded text-sm">{t('adm5.fdCopy')}</button>
            <button onClick={() => setCodes(null)} className="px-3 py-1 border rounded text-sm">{t('adm5.fdClose')}</button>
          </div>
        </div>
      )}

      <StateBox loading={loading} error={error} onRetry={reload}>
        {data && data.length === 0 ? (
          <Empty>{t('adm5.fdNoBatch')}</Empty>
        ) : (
          data && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-500 dark:text-slate-400">
                <thead className="text-xs text-gray-700 dark:text-slate-300 uppercase bg-gray-50 dark:bg-slate-800">
                  <tr><th className="px-4 py-3">{t('adm5.fdThMade')}</th><th className="px-4 py-3">{t('adm5.fdThCourse')}</th><th className="px-4 py-3">{t('adm5.fdThSponsor')}</th><th className="px-4 py-3 text-right">{t('adm5.fdThDisc')}</th><th className="px-4 py-3 text-right">{t('adm5.fdThUsed')}</th><th className="px-4 py-3">{t('adm5.fdThValid')}</th><th className="px-4 py-3">{t('adm5.fdThStatus')}</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {data.map((b) => (
                    <tr key={b.id}>
                      <td className="px-4 py-3 whitespace-nowrap">{dateId(b.created_at)}<div className="text-xs text-gray-400">{b.created_by}</div></td>
                      <td className="px-4 py-3 text-gray-900 dark:text-white">{b.course_title}</td>
                      <td className="px-4 py-3">{b.reason ?? '-'}</td>
                      <td className="px-4 py-3 text-right font-mono">{b.percent}%</td>
                      <td className="px-4 py-3 text-right font-mono">{num(b.used_codes)}/{num(b.total_codes)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{dateId(b.starts_at)} - {dateId(b.ends_at)}</td>
                      <td className="px-4 py-3">{b.cancelled ? t('adm5.fdCancelled') : new Date(b.ends_at) < new Date() ? t('adm5.fdEnded') : t('adm5.fdActive')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </StateBox>
    </div>
  );
};

const FinanceDashboard: React.FC = () => {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>('SALES');
  const summary = useAsync(() => reportsApi.financeSummary());
  const tabs: Tab[] = ['SALES', 'SETTLEMENTS', 'VOUCHERS'];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('adm5.fdTitle')}</h2>
        <p className="text-gray-500 dark:text-slate-400">{t('adm5.fdSub')}</p>
      </div>

      <StateBox loading={summary.loading} error={summary.error} onRetry={summary.reload}>
        {summary.data && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Tile title={t('adm5.fdPlat')} value={rupiah(summary.data.platformShareTotal)} hint={t('adm5.fdPlatHint', { m: rupiah(summary.data.platformShareThisMonth), c: summary.data.creatorSharePercent, p: 100 - summary.data.creatorSharePercent })} />
            <Tile title={t('adm5.fdCrt')} value={rupiah(summary.data.creatorShareTotal)} hint={t('adm5.fdCrtHint')} />
            <Tile title={t('adm5.fdMnt')} value={rupiah(summary.data.mentorShareTotal)} hint={t('adm5.fdMntHint')} />
            <Tile title={t('adm5.fdRev')} value={rupiah(summary.data.revenueTotal)} hint={t('adm5.fdRevHint', { n: num(summary.data.salesCount) })} icon={<TrendingUp size={18} />} />
            <Tile title={t('adm5.fdRevM')} value={rupiah(summary.data.revenueThisMonth)} />
            <Tile title={t('adm5.fdDisc')} value={rupiah(summary.data.discountTotal)} hint={t('adm5.fdFree', { n: num(summary.data.freeEnrollments) })} />
            <Tile title={t('adm5.fdVer')} value={rupiah(summary.data.verifyingAmount)} hint={t('adm5.fdVerHint', { n: num(summary.data.verifyingCount), a: rupiah(summary.data.topupTotal) })} icon={<Wallet size={18} />} />
          </div>
        )}
      </StateBox>

      <Card>
        <div className="flex border-b border-gray-200 dark:border-slate-800 mb-4">
          {tabs.map((k) => (
            <button key={k} onClick={() => setTab(k)} className={`flex-1 py-3 text-sm font-bold border-b-2 transition ${tab === k ? 'border-digitalcoop-600 text-digitalcoop-600 dark:text-digitalcoop-400' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{t(`adm5.fdTab${k}`)}</button>
          ))}
        </div>
        {tab === 'SALES' && <SalesTab />}
        {tab === 'SETTLEMENTS' && <SettlementsTab />}
        {tab === 'VOUCHERS' && <VouchersTab />}
      </Card>
    </div>
  );
};

export default FinanceDashboard;
