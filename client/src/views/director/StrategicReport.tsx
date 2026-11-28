import React, { useState } from 'react';
import { Download, PieChart, Award } from 'lucide-react';
import { reportsApi } from '../../services/reports';
import { useT } from '../../i18n';
import { Bars, Card, Empty, StateBox, Tile, num, rupiah, useAsync } from '../../components/ReportBits';

const StrategicReport: React.FC = () => {
  const t = useT();
  const { data, loading, error, reload } = useAsync(() => reportsApi.strategic());
  const [downloading, setDownloading] = useState(false);
  const [dlError, setDlError] = useState('');

  const download = async () => {
    setDownloading(true);
    setDlError('');
    try {
      await reportsApi.downloadSalesCsv();
    } catch {
      setDlError(t('dir.srDlFail'));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <PieChart className="mr-3 text-digitalcoop-600" /> {t('dir.srTitle')}
          </h2>
          <p className="text-gray-500 dark:text-slate-400">{t('dir.srSub')}</p>
        </div>
        <button onClick={download} disabled={downloading} className="flex items-center px-4 py-2 bg-digitalcoop-600 text-white rounded-lg hover:bg-digitalcoop-700 font-bold text-sm shadow-sm disabled:opacity-50">
          <Download size={16} className="mr-2" /> {downloading ? t('dir.srDownloading') : t('dir.srDl')}
        </button>
      </div>
      {dlError && <p role="alert" className="text-sm text-red-600">{dlError}</p>}

      <StateBox loading={loading} error={error} onRetry={reload}>
        {data && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Tile title={t('dir.srRev6')} value={rupiah(data.totals.revenue)} />
              <Tile title={t('dir.srEnr6')} value={num(data.totals.enrollments)} />
              <Tile title={t('dir.srUsers')} value={num(data.totals.users)} />
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <Card title={t('dir.srRevMonth')} className="md:col-span-2">
                <Bars items={data.monthly.map((m) => ({ label: m.label, value: m.revenue, title: t('dir.srBarTitle', { l: m.label, r: rupiah(m.revenue), n: m.enrollments }) }))} />
              </Card>
              <Card title={t('dir.srNewUsers')}>
                <Bars color="bg-green-500" items={data.monthly.map((m) => ({ label: m.label, value: m.newUsers, title: t('dir.srNewTitle', { l: m.label, n: m.newUsers }) }))} />
              </Card>
            </div>

            <Card title={t('dir.srComp')}>
              {data.revenueByType.length === 0 ? (
                <Empty>{t('dir.srNoSales')}</Empty>
              ) : (
                <ul className="divide-y divide-gray-100 dark:divide-slate-800">
                  {data.revenueByType.map((r) => (
                    <li key={r.type} className="flex justify-between py-3 text-sm">
                      <span className="text-gray-700 dark:text-slate-300">{['MANDIRI', 'WORKSHOP', 'CERTIFICATION'].includes(r.type) ? t(`dir.st${r.type}`) : r.type} <span className="text-gray-400">{t('dir.srEnrolls', { n: num(r.enrollments) })}</span></span>
                      <span className="font-mono font-bold">{rupiah(r.revenue)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              <Card title={t('dir.srTopCreators')} right={<Award className="text-yellow-500" size={18} />}>
                {data.topCreators.length === 0 ? (
                  <Empty>{t('dir.srNoData')}</Empty>
                ) : (
                  <table className="w-full text-sm text-left">
                    <thead className="text-gray-500 dark:text-slate-400">
                      <tr><th className="py-2">#</th><th>{t('dir.srName')}</th><th className="text-right">{t('dir.qcStudents')}</th><th className="text-right">{t('dir.srRevenue')}</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                      {data.topCreators.map((c, i) => (
                        <tr key={c.id}>
                          <td className="py-2 font-bold">{i + 1}</td>
                          <td className="font-medium text-gray-900 dark:text-white">{c.name} <span className="text-xs text-gray-400">{t('dir.srCourses', { n: c.courses })}</span></td>
                          <td className="text-right font-mono">{num(c.students)}</td>
                          <td className="text-right font-mono font-bold text-digitalcoop-600 dark:text-digitalcoop-400">{rupiah(c.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Card>
              <Card title={t('dir.srTopCourses')}>
                {data.topCourses.length === 0 ? (
                  <Empty>{t('dir.srNoCourses')}</Empty>
                ) : (
                  <table className="w-full text-sm text-left">
                    <thead className="text-gray-500 dark:text-slate-400">
                      <tr><th className="py-2">{t('dir.qcCourse')}</th><th className="text-right">{t('dir.qcStudents')}</th><th className="text-right">{t('dir.qcRating')}</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                      {data.topCourses.map((c) => (
                        <tr key={c.id}>
                          <td className="py-2 font-medium text-gray-900 dark:text-white">{c.title}</td>
                          <td className="text-right font-mono">{num(c.students)}</td>
                          <td className="text-right font-mono">{c.totalReviews > 0 ? c.rating.toFixed(1) : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Card>
            </div>
          </>
        )}
      </StateBox>
    </div>
  );
};

export default StrategicReport;
