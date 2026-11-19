import React from 'react';
import type { CourseShareRow, ShareTotals } from '../services/payouts';
import { Empty, num, rupiah } from './ReportBits';

/** Uang masuk dan rangkuman bagi hasil per judul kursus. */
const CourseShareTable: React.FC<{ rows: CourseShareRow[]; totals?: ShareTotals }> = ({ rows, totals }) => {
  if (rows.length === 0) return <Empty>Belum ada transaksi.</Empty>;
  const t = totals ?? rows.reduce((a, c) => ({ sales: a.sales + c.sales, gross: a.gross + c.gross, ownerShare: a.ownerShare + c.ownerShare, mentorShare: a.mentorShare + c.mentorShare, platformShare: a.platformShare + c.platformShare }), { sales: 0, gross: 0, ownerShare: 0, mentorShare: 0, platformShare: 0 });
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="text-gray-500 dark:text-slate-400">
          <tr><th className="py-2">Judul kursus</th><th className="text-right">Transaksi</th><th className="text-right">Uang masuk</th><th className="text-right">Pemilik materi</th><th className="text-right">Mentor</th><th className="text-right">Lembaga</th></tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-slate-800 dark:text-slate-200">
          {rows.map((c) => (
            <tr key={c.id}>
              <td className="py-2"><p className="font-bold">{c.title}</p><p className="text-xs text-gray-500">{c.owner ?? '-'}{c.mentors ? ` · Mentor: ${c.mentors}` : ''}</p></td>
              <td className="text-right">{num(c.sales)}</td><td className="text-right">{rupiah(c.gross)}</td>
              <td className="text-right">{rupiah(c.ownerShare)}</td><td className="text-right">{rupiah(c.mentorShare)}</td><td className="text-right">{rupiah(c.platformShare)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="font-bold dark:text-white">
          <tr className="border-t-2 border-gray-200 dark:border-slate-700"><td className="py-2">Total</td><td className="text-right">{num(t.sales)}</td><td className="text-right">{rupiah(t.gross)}</td><td className="text-right">{rupiah(t.ownerShare)}</td><td className="text-right">{rupiah(t.mentorShare)}</td><td className="text-right">{rupiah(t.platformShare)}</td></tr>
        </tfoot>
      </table>
    </div>
  );
};

export default CourseShareTable;
