import React, { useState } from 'react';
import { LifeBuoy } from 'lucide-react';
import { helpdeskApi, TICKET_CATEGORIES } from '../../services/helpdesk';
import TicketThread from '../../components/TicketThread';
import { useT } from '../../i18n';
import { Card, Empty, StateBox, dateTimeId, useAsync } from '../../components/ReportBits';

const FILTERS: [string, string][] = [['OPEN', 'adm.hdOPEN'], ['ANSWERED', 'adm.hdANSWERED'], ['CLOSED', 'adm.hdCLOSED'], ['ALL', 'adm.hdALL']];

const HelpdeskTickets: React.FC = () => {
  const t = useT();
  const [status, setStatus] = useState('OPEN');
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const { data, loading, error, reload } = useAsync(() => helpdeskApi.queue(status, page), [status, page]);

  if (openId) return <TicketThread id={openId} onBack={() => setOpenId(null)} onChanged={() => void reload()} />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center"><LifeBuoy className="mr-3 text-digitalcoop-600" /> Helpdesk</h2>
        <p className="text-gray-500 dark:text-slate-400">{t('adm.hdSub')}</p>
      </div>
      <Card>
        <div className="flex gap-2 mb-4 flex-wrap">
          {FILTERS.map(([k, label]) => (
            <button key={k} onClick={() => { setStatus(k); setPage(1); }} className={`px-3 py-1 rounded-full text-sm border ${status === k ? 'bg-digitalcoop-600 text-white border-digitalcoop-600' : 'text-gray-600 dark:text-slate-300'}`}>{t(label)}</button>
          ))}
        </div>
        <StateBox loading={loading} error={error} onRetry={reload}>
          {data && data.rows.length === 0 ? (
            <Empty>{t('adm.hdNone')}</Empty>
          ) : (
            data && (
              <>
                <ul className="divide-y divide-gray-100 dark:divide-slate-800">
                  {data.rows.map((tk) => (
                    <li key={tk.id}>
                      <button onClick={() => setOpenId(tk.id)} className="w-full text-left py-3 px-2 hover:bg-gray-50 dark:hover:bg-slate-800/50 rounded">
                        <p className="font-bold text-gray-900 dark:text-white">{tk.subject}</p>
                        <p className="text-xs text-gray-500">
                          {tk.userName} ({tk.userEmail}), {TICKET_CATEGORIES.some((c) => c.id === tk.category) ? t(`help.cat${tk.category}`) : tk.category}, {t(`help.st${tk.status}`)}, {dateTimeId(tk.updatedAt)}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="flex justify-between items-center text-sm mt-4">
                  <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1 border rounded disabled:opacity-40">{t('adm.hdPrev')}</button>
                  <span>{t('adm.hdPage', { n: page })}</span>
                  <button disabled={!data.hasMore} onClick={() => setPage(page + 1)} className="px-3 py-1 border rounded disabled:opacity-40">{t('adm.hdNext')}</button>
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
