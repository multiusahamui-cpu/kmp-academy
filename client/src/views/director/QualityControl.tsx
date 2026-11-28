import React from 'react';
import { CheckCircle, Star } from 'lucide-react';
import { reportsApi } from '../../services/reports';
import { useT } from '../../i18n';
import { Card, Empty, StateBox, Tile, dateId, num, useAsync } from '../../components/ReportBits';

const QualityControl: React.FC = () => {
  const t = useT();
  const { data, loading, error, reload } = useAsync(() => reportsApi.quality());

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
          <CheckCircle className="mr-3 text-digitalcoop-600" /> {t('dir.qcTitle')}
        </h2>
        <p className="text-gray-500 dark:text-slate-400">{t('dir.qcSub')}</p>
      </div>

      <StateBox loading={loading} error={error} onRetry={reload}>
        {data && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Tile title={t('dir.qcAvg')} value={data.totalReviews > 0 ? data.averageRating.toFixed(2) : '-'} hint={t('dir.qcReviews', { n: num(data.totalReviews) })} icon={<Star size={18} />} />
              <Tile title={t('dir.qcLowCourses')} value={num(data.lowRatedCourses.length)} hint={t('dir.qcLowHint', { t: data.threshold, m: data.minReviews })} />
              <Tile title={t('dir.qcLowRev')} value={num(data.lowReviews.length)} hint={t('dir.qcLowRevHint')} />
            </div>

            <Card title={t('dir.qcLowCourses')}>
              {data.lowRatedCourses.length === 0 ? (
                <Empty>{t('dir.qcNoLow')}</Empty>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className="text-gray-500 dark:text-slate-400">
                    <tr><th className="py-2">{t('dir.qcCourse')}</th><th>{t('dir.qcInstructor')}</th><th className="text-right">{t('dir.qcRating')}</th><th className="text-right">{t('dir.qcReviewsCol')}</th><th className="text-right">{t('dir.qcStudents')}</th></tr>
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

            <Card title={t('dir.qcLatest')}>
              {data.lowReviews.length === 0 ? (
                <Empty>{t('dir.qcNoRev')}</Empty>
              ) : (
                <ul className="divide-y divide-gray-100 dark:divide-slate-800">
                  {data.lowReviews.map((r) => (
                    <li key={r.id} className="py-3 text-sm">
                      <div className="flex justify-between">
                        <span className="font-bold text-gray-900 dark:text-white">{r.course}</span>
                        <span className="text-xs text-gray-500">{t('dir.qcStars', { r: r.rating, a: r.author, d: dateId(r.createdAt) })}</span>
                      </div>
                      <p className="text-gray-600 dark:text-slate-300 mt-1">{r.comment || t('dir.qcNoComment')}</p>
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
