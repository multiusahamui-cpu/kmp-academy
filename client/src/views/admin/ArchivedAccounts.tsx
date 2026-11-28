import React, { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { adminApi } from '../../services/api';
import { useI18n } from '../../i18n';

interface Row {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  role: string;
  cardNumber?: string | null;
  archivedAt?: string | null;
  reason?: string | null;
  decidedByName?: string | null;
  decidedByRole?: string | null;
  decisionNote?: string | null;
  settlement: { id: string; amount: number; transferDate: string; bankRef: string } | null;
}

const fmt = (d: string | null | undefined, lang: string): string => (d ? new Date(d).toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : '-');

// Arsip akun yang ditutup atas permintaan pemilik. Hanya baca: penutupan bersifat final.
const ArchivedAccounts: React.FC = () => {
  const { t, lang } = useI18n();
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ total: number; size: number; items: Row[] }>({ total: 0, size: 20, items: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminApi.listArchived(query, page);
      setData(res.data?.data ?? { total: 0, size: 20, items: [] });
    } catch {
      setError(t('adm6.arLoadFail'));
    } finally {
      setLoading(false);
    }
  }, [query, page, t]);
  useEffect(() => { load(); }, [load]);

  const pages = Math.max(1, Math.ceil(data.total / data.size));

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-slate-800 space-y-3">
        <div>
          <h3 className="font-bold text-gray-900 dark:text-white">{t('adm6.arTitle')}</h3>
          <p className="text-xs text-gray-500 dark:text-slate-400">{t('adm6.arSub')}</p>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); setPage(1); setQuery(q.trim()); }} className="flex gap-2">
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('adm6.arSearchPh')}
            className="flex-1 p-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded text-sm" />
          <button type="submit" className="px-4 py-2 bg-digitalcoop-600 text-white rounded text-sm">{t('adm6.arSearch')}</button>
        </form>
      </div>
      {error && <div className="px-4 py-3 text-sm text-red-600">{error}</div>}
      {loading ? (
        <div className="p-8 text-center text-gray-500"><Loader2 className="animate-spin inline" /></div>
      ) : data.items.length === 0 ? (
        <div className="p-8 text-center text-sm text-gray-500 dark:text-slate-400">{t('adm6.arNone')}</div>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-slate-800">
          {data.items.map((r) => (
            <li key={r.id} className="p-4 text-sm space-y-1">
              <p className="font-bold text-gray-900 dark:text-white">
                {r.name} <span className="font-normal text-gray-500">({r.role}{r.cardNumber ? `, ${r.cardNumber}` : ''})</span>
              </p>
              <p className="text-gray-500 dark:text-slate-400">{[r.email, r.phone].filter(Boolean).join(' · ')}</p>
              <p className="text-gray-700 dark:text-slate-300">{t('adm6.arArch', { d: fmt(r.archivedAt, lang) })}{r.decidedByName ? t('adm6.arArchBy', { n: r.decidedByName }) : ''}</p>
              {r.reason && <p className="text-gray-700 dark:text-slate-300">{t('adm6.arReason', { r: r.reason })}</p>}
              {r.decisionNote && <p className="text-gray-700 dark:text-slate-300">{t('adm6.arNote', { n: r.decisionNote })}</p>}
              {r.settlement && (
                <p className="text-gray-700 dark:text-slate-300">
                  {t('adm6.arSettled', { a: r.settlement.amount.toLocaleString('id-ID'), d: r.settlement.transferDate, r: r.settlement.bankRef })}{' '}
                  <a className="text-digitalcoop-600 hover:underline" href={adminApi.proofUrl(r.settlement.id)} target="_blank" rel="noreferrer">{t('adm6.arProof')}</a>
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
      {pages > 1 && (
        <div className="p-3 flex items-center justify-between text-sm border-t border-gray-200 dark:border-slate-800">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1 border rounded disabled:opacity-40">{t('adm6.arPrev')}</button>
          <span>{t('adm6.arPage', { p: page, n: pages })}</span>
          <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 border rounded disabled:opacity-40">{t('adm6.arNext')}</button>
        </div>
      )}
    </div>
  );
};

export default ArchivedAccounts;
