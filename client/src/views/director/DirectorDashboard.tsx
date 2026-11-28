import React from 'react';
import { reportsApi } from '../../services/reports';
import ManagementReports from '../../components/ManagementReports';
import BroadcastPanel from '../../components/BroadcastPanel';
import { useT } from '../../i18n';
import { Bars, Card, StateBox, Tile, num, rupiah, uptimeLabel, useAsync } from '../../components/ReportBits';

const DirectorDashboard: React.FC = () => {
  const t = useT();
  const stats = useAsync(() => reportsApi.stats());
  const strat = useAsync(() => reportsApi.strategic());

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('dir.dbTitle')}</h2>
        <p className="text-gray-500 dark:text-slate-400">{t('dir.dbSub')}</p>
      </div>

      <StateBox loading={stats.loading} error={stats.error} onRetry={stats.reload}>
        {stats.data && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Tile title={t('dir.dbRevMonth')} value={rupiah(stats.data.sales.revenueThisMonth)} hint={t('dir.dbTotal', { v: rupiah(stats.data.sales.revenueTotal) })} />
              <Tile title={t('dir.dbEnrollMonth')} value={num(stats.data.sales.enrollmentsThisMonth)} />
              <Tile title={t('dir.dbUsers')} value={num(stats.data.users.total)} hint={t('dir.dbNewMonth', { n: num(stats.data.users.newThisMonth) })} />
              <Tile title={t('dir.dbPublished')} value={num(stats.data.courses.published)} hint={t('dir.dbPendingRev', { n: num(stats.data.courses.pendingReview) })} />
            </div>
            <Card title={t('dir.dbQueue')}>
              <ul className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <li>{t('dir.dbQPay')} <b>{num(stats.data.queue.pendingPayments)}</b></li>
                <li>{t('dir.dbQDel')} <b>{num(stats.data.queue.openDeletions)}</b></li>
                <li>{t('dir.dbQApp')} <b>{num(stats.data.queue.pendingApplications)}</b></li>
                <li>{t('dir.dbQRev')} <b>{num(stats.data.queue.pendingReviews)}</b></li>
              </ul>
              <p className="text-xs text-gray-400 mt-3">{t('dir.dbUptime', { v: uptimeLabel(stats.data.uptimeSeconds, t) })}</p>
            </Card>
          </>
        )}
      </StateBox>

      <StateBox loading={strat.loading} error={strat.error} onRetry={strat.reload}>
        {strat.data && (
          <Card title={t('dir.dbRev6')}>
            <Bars items={strat.data.monthly.map((m) => ({ label: m.label, value: m.revenue, title: `${m.label}: ${rupiah(m.revenue)}` }))} />
          </Card>
        )}
      </StateBox>

      <ManagementReports canMarkRead />
      <BroadcastPanel />
    </div>
  );
};

export default DirectorDashboard;
