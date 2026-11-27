import React, { useState } from 'react';
import { Download, PieChart, Award } from 'lucide-react';
import { reportsApi } from '../../services/reports';
import { Bars, Card, Empty, StateBox, Tile, num, rupiah, useAsync } from '../../components/ReportBits';

const TYPE_LABEL: Record<string, string> = { MANDIRI: 'Kursus Mandiri', WORKSHOP: 'Workshop & Live Class', CERTIFICATION: 'Sertifikasi' };

const StrategicReport: React.FC = () => {
  const { data, loading, error, reload } = useAsync(() => reportsApi.strategic());
  const [downloading, setDownloading] = useState(false);
  const [dlError, setDlError] = useState('');

  const download = async () => {
    setDownloading(true);
    setDlError('');
    try {
      await reportsApi.downloadSalesCsv();
    } catch {
      setDlError('Gagal mengunduh CSV.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <PieChart className="mr-3 text-digitalcoop-600" /> Laporan Strategis
          </h2>
          <p className="text-gray-500 dark:text-slate-400">Performa penjualan dan pertumbuhan 6 bulan terakhir (WIB), dihitung langsung dari data.</p>
        </div>
        <button onClick={download} disabled={downloading} className="flex items-center px-4 py-2 bg-digitalcoop-600 text-white rounded-lg hover:bg-digitalcoop-700 font-bold text-sm shadow-sm disabled:opacity-50">
          <Download size={16} className="mr-2" /> {downloading ? 'Mengunduh...' : 'Unduh CSV Penjualan'}
        </button>
      </div>
      {dlError && <p role="alert" className="text-sm text-red-600">{dlError}</p>}

      <StateBox loading={loading} error={error} onRetry={reload}>
        {data && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Tile title="Pendapatan 6 bulan" value={rupiah(data.totals.revenue)} />
              <Tile title="Pendaftaran 6 bulan" value={num(data.totals.enrollments)} />
              <Tile title="Total pengguna" value={num(data.totals.users)} />
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <Card title="Pendapatan per bulan" className="md:col-span-2">
                <Bars items={data.monthly.map((m) => ({ label: m.label, value: m.revenue, title: `${m.label}: ${rupiah(m.revenue)} (${m.enrollments} pendaftaran)` }))} />
              </Card>
              <Card title="Pengguna baru per bulan">
                <Bars color="bg-green-500" items={data.monthly.map((m) => ({ label: m.label, value: m.newUsers, title: `${m.label}: ${m.newUsers} pengguna baru` }))} />
              </Card>
            </div>

            <Card title="Komposisi pendapatan menurut jenis kursus">
              {data.revenueByType.length === 0 ? (
                <Empty>Belum ada penjualan.</Empty>
              ) : (
                <ul className="divide-y divide-gray-100 dark:divide-slate-800">
                  {data.revenueByType.map((r) => (
                    <li key={r.type} className="flex justify-between py-3 text-sm">
                      <span className="text-gray-700 dark:text-slate-300">{TYPE_LABEL[r.type] ?? r.type} <span className="text-gray-400">({num(r.enrollments)} pendaftaran)</span></span>
                      <span className="font-mono font-bold">{rupiah(r.revenue)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              <Card title="Creator dengan pendapatan tertinggi" right={<Award className="text-yellow-500" size={18} />}>
                {data.topCreators.length === 0 ? (
                  <Empty>Belum ada data.</Empty>
                ) : (
                  <table className="w-full text-sm text-left">
                    <thead className="text-gray-500 dark:text-slate-400">
                      <tr><th className="py-2">#</th><th>Nama</th><th className="text-right">Siswa</th><th className="text-right">Pendapatan</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                      {data.topCreators.map((c, i) => (
                        <tr key={c.id}>
                          <td className="py-2 font-bold">{i + 1}</td>
                          <td className="font-medium text-gray-900 dark:text-white">{c.name} <span className="text-xs text-gray-400">{c.courses} kursus</span></td>
                          <td className="text-right font-mono">{num(c.students)}</td>
                          <td className="text-right font-mono font-bold text-digitalcoop-600 dark:text-digitalcoop-400">{rupiah(c.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Card>
              <Card title="Kursus terpopuler">
                {data.topCourses.length === 0 ? (
                  <Empty>Belum ada kursus terbit.</Empty>
                ) : (
                  <table className="w-full text-sm text-left">
                    <thead className="text-gray-500 dark:text-slate-400">
                      <tr><th className="py-2">Kursus</th><th className="text-right">Siswa</th><th className="text-right">Rating</th></tr>
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
