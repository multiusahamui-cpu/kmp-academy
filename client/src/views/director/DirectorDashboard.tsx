import React from 'react';
import { reportsApi } from '../../services/reports';
import ManagementReports from '../../components/ManagementReports';
import BroadcastPanel from '../../components/BroadcastPanel';
import { Bars, Card, StateBox, Tile, num, rupiah, uptimeLabel, useAsync } from '../../components/ReportBits';

const DirectorDashboard: React.FC = () => {
  const stats = useAsync(() => reportsApi.stats());
  const strat = useAsync(() => reportsApi.strategic());

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard Direktur</h2>
        <p className="text-gray-500 dark:text-slate-400">Ringkasan kinerja dari data berjalan.</p>
      </div>

      <StateBox loading={stats.loading} error={stats.error} onRetry={stats.reload}>
        {stats.data && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Tile title="Pendapatan bulan ini" value={rupiah(stats.data.sales.revenueThisMonth)} hint={`Total ${rupiah(stats.data.sales.revenueTotal)}`} />
              <Tile title="Pendaftaran bulan ini" value={num(stats.data.sales.enrollmentsThisMonth)} />
              <Tile title="Pengguna" value={num(stats.data.users.total)} hint={`${num(stats.data.users.newThisMonth)} baru bulan ini`} />
              <Tile title="Kursus terbit" value={num(stats.data.courses.published)} hint={`${num(stats.data.courses.pendingReview)} menunggu review`} />
            </div>
            <Card title="Antrean yang perlu tindakan">
              <ul className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <li>Pembayaran menunggu: <b>{num(stats.data.queue.pendingPayments)}</b></li>
                <li>Permintaan hapus akun: <b>{num(stats.data.queue.openDeletions)}</b></li>
                <li>Lamaran pengajar: <b>{num(stats.data.queue.pendingApplications)}</b></li>
                <li>Review kursus: <b>{num(stats.data.queue.pendingReviews)}</b></li>
              </ul>
              <p className="text-xs text-gray-400 mt-3">Server aktif {uptimeLabel(stats.data.uptimeSeconds)}</p>
            </Card>
          </>
        )}
      </StateBox>

      <StateBox loading={strat.loading} error={strat.error} onRetry={strat.reload}>
        {strat.data && (
          <Card title="Pendapatan 6 bulan terakhir">
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
