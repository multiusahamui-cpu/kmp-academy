import React from 'react';
import { CheckCircle, Star } from 'lucide-react';
import { reportsApi } from '../../services/reports';
import { Card, Empty, StateBox, Tile, dateId, num, useAsync } from '../../components/ReportBits';

const QualityControl: React.FC = () => {
  const { data, loading, error, reload } = useAsync(() => reportsApi.quality());

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
          <CheckCircle className="mr-3 text-kodman-600" /> Penjaminan Mutu
        </h2>
        <p className="text-gray-500 dark:text-slate-400">Kursus dan ulasan yang perlu perhatian, berdasarkan rating siswa.</p>
      </div>

      <StateBox loading={loading} error={error} onRetry={reload}>
        {data && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Tile title="Rata-rata rating" value={data.totalReviews > 0 ? data.averageRating.toFixed(2) : '-'} hint={`${num(data.totalReviews)} ulasan`} icon={<Star size={18} />} />
              <Tile title="Kursus rating rendah" value={num(data.lowRatedCourses.length)} hint={`Rating di bawah ${data.threshold} dengan minimal ${data.minReviews} ulasan`} />
              <Tile title="Ulasan bintang rendah" value={num(data.lowReviews.length)} hint="Ulasan terbaru bintang 1-2" />
            </div>

            <Card title="Kursus rating rendah">
              {data.lowRatedCourses.length === 0 ? (
                <Empty>Tidak ada kursus di bawah ambang rating.</Empty>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className="text-gray-500 dark:text-slate-400">
                    <tr><th className="py-2">Kursus</th><th>Instruktur</th><th className="text-right">Rating</th><th className="text-right">Ulasan</th><th className="text-right">Siswa</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                    {data.lowRatedCourses.map((c) => (
                      <tr key={c.id}>
                        <td className="py-2 font-medium text-gray-900 dark:text-white">{c.title}</td>
                        <td>{c.instructor ?? '-'}</td>
                        <td className="text-right font-mono text-red-600 font-bold">{c.rating.toFixed(1)}</td>
                        <td className="text-right font-mono">{num(c.totalReviews)}</td>
                        <td className="text-right font-mono">{num(c.students)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>

            <Card title="Ulasan bintang rendah terbaru">
              {data.lowReviews.length === 0 ? (
                <Empty>Belum ada ulasan bintang rendah.</Empty>
              ) : (
                <ul className="divide-y divide-gray-100 dark:divide-slate-800">
                  {data.lowReviews.map((r) => (
                    <li key={r.id} className="py-3 text-sm">
                      <div className="flex justify-between">
                        <span className="font-bold text-gray-900 dark:text-white">{r.course}</span>
                        <span className="text-xs text-gray-500">{r.rating} bintang, {r.author}, {dateId(r.createdAt)}</span>
                      </div>
                      <p className="text-gray-600 dark:text-slate-300 mt-1">{r.comment || '(tanpa komentar)'}</p>
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

export default QualityControl;
