import React, { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { DiscountDto, courseAuthoringApi } from '../../services/courses';
import { apiMessage } from '../../services/payments';
import { useI18n, useT } from '../../i18n';
import { btnGhost, btnPrimary, inputClass, nowLocal, toIso } from './ui';

interface Props {
  courseId: string;
  /** Admin/Direktur wajib mengisi alasan. */
  isManager?: boolean;
}

type Mode = 'AUTO' | 'CODE' | 'BULK';

const PromoTab: React.FC<Props> = ({ courseId, isManager = false }) => {
  const t = useT();
  const { lang } = useI18n();
  const [items, setItems] = useState<DiscountDto[] | null>(null);
  const [mode, setMode] = useState<Mode>('CODE');
  const [percent, setPercent] = useState(20);
  const [code, setCode] = useState('');
  const [quota, setQuota] = useState('');
  const [count, setCount] = useState(10);
  const [startsAt, setStartsAt] = useState(nowLocal());
  const [endsAt, setEndsAt] = useState(nowLocal(30));
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [bulk, setBulk] = useState<string[] | null>(null);

  const load = useCallback(async () => {
    try { setItems((await courseAuthoringApi.listDiscounts(courseId)).data.data as DiscountDto[]); } catch (err) { setError(apiMessage(err, t('creator.prLoadFail'))); }
  }, [courseId, t]);
  useEffect(() => { void load(); }, [load]);

  const create = async () => {
    setBusy(true); setError(''); setBulk(null);
    const base = { percent, startsAt: toIso(startsAt), endsAt: toIso(endsAt), reason };
    try {
      if (mode === 'BULK') {
        const res = await courseAuthoringApi.createBulkCodes(courseId, { ...base, count });
        setBulk((res.data.data as { codes: string[] }).codes);
      } else if (mode === 'CODE') {
        await courseAuthoringApi.createDiscount(courseId, { ...base, kind: 'CODE', code, maxRedemptions: quota || undefined });
        setCode('');
      } else {
        await courseAuthoringApi.createDiscount(courseId, { ...base, kind: 'AUTO', maxRedemptions: quota || undefined });
      }
      await load();
    } catch (err) {
      setError(apiMessage(err, t('creator.prCreateFail')));
    } finally {
      setBusy(false);
    }
  };

  const cancel = async (d: DiscountDto) => {
    if (!window.confirm(t('creator.prCancelAsk'))) return;
    try { await courseAuthoringApi.cancelDiscount(courseId, d.id); await load(); } catch (err) { setError(apiMessage(err, t('creator.prCancelFail'))); }
  };

  const downloadCsv = () => {
    if (!bulk) return;
    const blob = new Blob([`kode\n${bulk.join('\n')}\n`], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `kode-promo-${courseId.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const fmt = (s: string) => new Date(s).toLocaleString(lang === 'en' ? 'en-US' : 'id-ID', { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600 dark:text-slate-300">{t('creator.prIntro')}</p>

      <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-800/40">
        <div className="flex flex-wrap gap-2">
          {([['CODE', t('creator.prCode')], ['BULK', t('creator.prBulk')], ['AUTO', t('creator.prAuto')]] as [Mode, string][]).map(([m, l]) => (
            <button key={m} onClick={() => setMode(m)} className={`rounded-full px-3 py-1 text-sm font-medium ${mode === m ? 'bg-digitalcoop-600 text-white' : 'bg-white text-gray-600 dark:bg-slate-800 dark:text-slate-300'}`}>{l}</button>
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-xs text-gray-500">{t('creator.prPercent')}
            <input className={inputClass} type="number" min={1} max={100} value={percent} onChange={(e) => setPercent(Number(e.target.value))} />
          </label>
          <label className="text-xs text-gray-500">{t('creator.prStart')}
            <input className={inputClass} type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          </label>
          <label className="text-xs text-gray-500">{t('creator.prEnd')}
            <input className={inputClass} type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
          </label>
        </div>
        {mode === 'CODE' && (
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-xs text-gray-500">{t('creator.prCodeLbl')}
              <input className={`${inputClass} uppercase`} value={code} maxLength={20} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="KOPERASI50" />
            </label>
            <label className="text-xs text-gray-500">{t('creator.prQuota')}
              <input className={inputClass} type="number" min={1} value={quota} onChange={(e) => setQuota(e.target.value)} placeholder={t('creator.prNoLimit')} />
            </label>
          </div>
        )}
        {mode === 'AUTO' && (
          <label className="block text-xs text-gray-500">{t('creator.prQuota')}
            <input className={inputClass} type="number" min={1} value={quota} onChange={(e) => setQuota(e.target.value)} placeholder={t('creator.prNoLimit')} />
          </label>
        )}
        {mode === 'BULK' && (
          <label className="block text-xs text-gray-500">{t('creator.prCount')}
            <input className={inputClass} type="number" min={1} max={200} value={count} onChange={(e) => setCount(Number(e.target.value))} />
          </label>
        )}
        <label className="block text-xs text-gray-500">{t('creator.prReason')} {isManager ? t('creator.prRequired') : t('creator.prOptional')}
          <input className={inputClass} value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} placeholder={isManager ? t('creator.prReasonPh') : ''} />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={busy} onClick={() => void create()} className={`${btnPrimary} flex items-center gap-2`}>{busy && <Loader2 size={14} className="animate-spin" />} {mode === 'BULK' ? t('creator.prMakeCodes') : t('creator.prMakeDisc')}</button>
      </div>

      {bulk && (
        <div className="space-y-2 rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
          <p className="text-sm font-bold text-green-800 dark:text-green-300">{t('creator.prCreated', { n: bulk.length })}</p>
          <textarea readOnly rows={5} className={`${inputClass} font-mono`} value={bulk.join('\n')} />
          <button onClick={downloadCsv} className={btnGhost}>{t('creator.prCsv')}</button>
        </div>
      )}

      <div className="space-y-2">
        <h4 className="text-sm font-bold text-gray-900 dark:text-white">{t('creator.prList')}</h4>
        {!items ? <Loader2 className="mx-auto animate-spin text-digitalcoop-600" /> : items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-300 py-6 text-center text-sm text-gray-500 dark:border-slate-700">{t('creator.prNoItems')}</p>
        ) : items.map((d) => (
          <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 p-3 text-sm dark:border-slate-700">
            <div className="min-w-0">
              <p className="font-bold text-gray-900 dark:text-white">{d.kind === 'CODE' ? <span className="font-mono">{d.code}</span> : t('creator.prAuto')} • {d.percent}%
                <span className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-bold ${d.cancelledAt ? 'bg-gray-100 text-gray-600' : d.active ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{d.cancelledAt ? t('creator.prCancelled') : d.active ? t('creator.prActive') : t('creator.prInactive')}</span>
              </p>
              <p className="text-xs text-gray-500">{fmt(d.startsAt)} - {fmt(d.endsAt)} • {t('creator.prUsed')} {d.redemptionCount}{d.maxRedemptions ? `/${d.maxRedemptions}` : ''} • {t('creator.prBy')} {d.createdByRole === 'CREATOR' ? t('creator.prCreator') : t('creator.prCoop')}{d.reason ? ` • ${d.reason}` : ''}</p>
            </div>
            {!d.cancelledAt && d.manageable && <button onClick={() => void cancel(d)} className="rounded-lg border border-red-300 px-3 py-1 text-xs font-bold text-red-600 hover:bg-red-50">{t('creator.prCancelBtn')}</button>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PromoTab;
