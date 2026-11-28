import React, { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Loader2 } from 'lucide-react';
import { useI18n } from '../../i18n';
import { apiMessage, paymentAdminApi, rupiah } from '../../services/payments';

interface Item {
  id: string;
  kind: 'COURSE' | 'TOPUP';
  method: 'VA' | 'MANUAL' | 'DC_WALLET';
  status: string;
  amount: number;
  discountPercent: number | null;
  bank: string | null;
  vaNumber: string | null;
  hasProof: boolean;
  proofUploadedAt: string | null;
  paidReference: string | null;
  paidDate: string | null;
  decisionNote: string | null;
  createdAt: string;
  expiresAt: string;
  userName: string;
  userEmail: string | null;
  courseTitle: string | null;
}

const TABS = ['VERIFYING', 'PENDING', 'CONFIRMING', 'PAID', 'REJECTED', 'ALL'];
const inputClass = 'w-full p-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded text-sm';

const DecisionForm: React.FC<{ item: Item; onDone: (msg: string) => void }> = ({ item, onDone }) => {
  const { t } = useI18n();
  const [paidAmount, setPaidAmount] = useState(String(item.amount));
  const [paidDate, setPaidDate] = useState(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const send = async (decision: 'APPROVE' | 'REJECT') => {
    setBusy(true); setError('');
    try {
      const res = await paymentAdminApi.decide(item.id, decision === 'APPROVE'
        ? { decision, paidAmount: Number(paidAmount), paidDate, reference, note }
        : { decision, note });
      onDone(res.data?.message ?? t('adm2.pvSaved'));
    } catch (err) {
      setError(apiMessage(err, t('adm2.pvDecFail')));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-800/40">
      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-xs text-gray-500">{t('adm2.pvAmt')}
          <input className={inputClass} inputMode="numeric" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value.replace(/\D/g, ''))} />
        </label>
        <label className="text-xs text-gray-500">{t('adm2.pvDate')}
          <input className={inputClass} type="date" value={paidDate} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setPaidDate(e.target.value)} />
        </label>
        <label className="text-xs text-gray-500">{t('adm2.pvRef')}
          <input className={inputClass} maxLength={100} value={reference} onChange={(e) => setReference(e.target.value)} placeholder={t('adm2.pvRefPh')} />
        </label>
      </div>
      <label className="block text-xs text-gray-500">{t('adm2.pvNote')}
        <textarea className={inputClass} rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button disabled={busy} onClick={() => void send('APPROVE')} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-60">{t('adm2.pvConfirm')}</button>
        <button disabled={busy} onClick={() => void send('REJECT')} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60">{t('adm2.reject')}</button>
      </div>
      <p className="text-xs text-gray-400">{t('adm2.pvWarn', { a: rupiah(item.amount) })}</p>
    </div>
  );
};

const PaymentVerification: React.FC = () => {
  const { t, lang } = useI18n();
  const loc = lang === 'id' ? 'id-ID' : 'en-US';
  const [tab, setTab] = useState('VERIFYING');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(15);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await paymentAdminApi.list(tab, page);
      const d = res.data.data as { items: Item[]; total: number; pageSize: number };
      setItems(d.items); setTotal(d.total); setPageSize(d.pageSize);
    } catch (err) {
      setNotice(apiMessage(err, t('adm2.pvLoadFail')));
    } finally {
      setLoading(false);
    }
  }, [tab, page, t]);
  useEffect(() => { void load(); }, [load]);

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('adm2.pvTitle')}</h2>
        <p className="text-gray-500 dark:text-slate-400">{t('adm2.pvSub')}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((tb) => (
          <button key={tb} onClick={() => { setTab(tb); setPage(1); setOpenId(null); }}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${tab === tb ? 'bg-digitalcoop-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-300'}`}>{t(`adm2.pv${tb}`)}</button>
        ))}
      </div>

      {notice && <div className="flex justify-between rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300"><span>{notice}</span><button onClick={() => setNotice('')}>{t('adm2.pvClose')}</button></div>}

      {loading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-digitalcoop-600" /></div> : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-12 text-center text-sm text-gray-500 dark:border-slate-700">{t('adm2.pvNone')}</div>
      ) : (
        <div className="space-y-3">
          {items.map((it) => (
            <div key={it.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 dark:text-white">{it.userName} <span className="text-xs font-normal text-gray-400">{it.userEmail}</span></p>
                  <p className="text-sm text-gray-600 dark:text-slate-300">{it.kind === 'COURSE' ? it.courseTitle ?? t('adm2.pvCourse') : t('adm2.pvTopup')} • {t(`adm2.pvm${it.method}`)}{it.bank ? ` ${it.bank.toUpperCase()}` : ''}</p>
                  <p className="text-xs text-gray-400">{t('adm2.pvCreated', { d: new Date(it.createdAt).toLocaleString(loc) })}{it.proofUploadedAt ? t('adm2.pvProof', { d: new Date(it.proofUploadedAt).toLocaleString(loc) }) : ''}</p>
                  {it.decisionNote && <p className="text-xs text-gray-500">{t('adm2.pvNoteL', { n: it.decisionNote })}</p>}
                  {it.paidReference && <p className="text-xs text-gray-500">{t('adm2.pvRefL', { r: it.paidReference, d: it.paidDate ?? '-' })}</p>}
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-digitalcoop-700 dark:text-digitalcoop-400">{rupiah(it.amount)}</p>
                  <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600 dark:bg-slate-800 dark:text-slate-300">{it.status}</span>
                </div>
              </div>
              {it.method === 'MANUAL' && it.status === 'VERIFYING' && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {it.hasProof && <a href={paymentAdminApi.proofUrl(it.id)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-200"><ExternalLink size={14} /> {t('adm2.pvViewProof')}</a>}
                  <button onClick={() => setOpenId(openId === it.id ? null : it.id)} className="rounded-lg bg-digitalcoop-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-digitalcoop-700">{openId === it.id ? t('adm2.pvClose') : t('adm2.pvProcess')}</button>
                </div>
              )}
              {openId === it.id && <DecisionForm item={it} onDone={(m) => { setNotice(m); setOpenId(null); void load(); }} />}
            </div>
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded border px-3 py-1 disabled:opacity-40 dark:border-slate-600 dark:text-slate-200">{t('adm2.pvPrev')}</button>
          <span className="text-gray-500">{t('adm2.pvPage', { p: page, n: pages })}</span>
          <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="rounded border px-3 py-1 disabled:opacity-40 dark:border-slate-600 dark:text-slate-200">{t('adm2.pvNext')}</button>
        </div>
      )}
    </div>
  );
};

export default PaymentVerification;
