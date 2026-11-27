import React, { useState } from 'react';
import { LifeBuoy } from 'lucide-react';
import { helpdeskApi, STATUS_LABEL, TICKET_CATEGORIES } from '../../services/helpdesk';
import TicketThread from '../../components/TicketThread';
import { Card, Empty, StateBox, dateTimeId, useAsync } from '../../components/ReportBits';

const FILTERS: [string, string][] = [['OPEN', 'Perlu dibalas'], ['ANSWERED', 'Sudah dibalas'], ['CLOSED', 'Ditutup'], ['ALL', 'Semua']];

const HelpdeskTickets: React.FC = () => {
  const [status, setStatus] = useState('OPEN');
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const { data, loading, error, reload } = useAsync(() => helpdeskApi.queue(status, page), [status, page]);

  if (openId) return <TicketThread id={openId} onBack={() => setOpenId(null)} onChanged={() => void reload()} />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center"><LifeBuoy className="mr-3 text-digitalcoop-600" /> Helpdesk</h2>
        <p className="text-gray-500 dark:text-slate-400">Tiket bantuan dari pengguna.</p>
      </div>
      <Card>
        <div className="flex gap-2 mb-4 flex-wrap">
          {FILTERS.map(([k, label]) => (
            <button key={k} onClick={() => { setStatus(k); setPage(1); }} className={`px-3 py-1 rounded-full text-sm border ${status === k ? 'bg-digitalcoop-600 text-white border-digitalcoop-600' : 'text-gray-600 dark:text-slate-300'}`}>{label}</button>
          ))}
        </div>
        <StateBox loading={loading} error={error} onRetry={reload}>
          {data && data.rows.length === 0 ? (
            <Empty>Tidak ada tiket.</Empty>
          ) : (
            data && (
              <>
                <ul className="divide-y divide-gray-100 dark:divide-slate-800">
                  {data.rows.map((t) => (
                    <li key={t.id}>
                      <button onClick={() => setOpenId(t.id)} className="w-full text-left py-3 px-2 hover:bg-gray-50 dark:hover:bg-slate-800/50 rounded">
                        <p className="font-bold text-gray-900 dark:text-white">{t.subject}</p>
                        <p className="text-xs text-gray-500">
                          {t.userName} ({t.userEmail}), {TICKET_CATEGORIES.find((c) => c.id === t.category)?.label}, {STATUS_LABEL[t.status]}, {dateTimeId(t.updatedAt)}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="flex justify-between items-center text-sm mt-4">
                  <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1 border rounded disabled:opacity-40">Sebelumnya</button>
                  <span>Halaman {page}</span>
                  <button disabled={!data.hasMore} onClick={() => setPage(page + 1)} className="px-3 py-1 border rounded disabled:opacity-40">Berikutnya</button>
                </div>
              </>
            )
          )}
        </StateBox>
      </Card>
    </div>
  );
};

export default HelpdeskTickets;
