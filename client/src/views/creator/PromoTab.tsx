import React, { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { DiscountDto, courseAuthoringApi } from '../../services/courses';
import { apiMessage } from '../../services/payments';
import { btnGhost, btnPrimary, inputClass, nowLocal, toIso } from './ui';

interface Props {
  courseId: string;
  /** Admin/Direktur wajib mengisi alasan. */
  isManager?: boolean;
}

type Mode = 'AUTO' | 'CODE' | 'BULK';

const PromoTab: React.FC<Props> = ({ courseId, isManager = false }) => {
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
    try { setItems((await courseAuthoringApi.listDiscounts(courseId)).data.data as DiscountDto[]); } catch (err) { setError(apiMessage(err, 'Gagal memuat diskon.')); }
  }, [courseId]);
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
      setError(apiMessage(err, 'Gagal membuat diskon.'));
    } finally {
      setBusy(false);
    }
  };

  const cancel = async (d: DiscountDto) => {
    if (!window.confirm('Batalkan diskon ini? Pembeli yang sudah memakainya tidak terpengaruh.')) return;
    try { await courseAuthoringApi.cancelDiscount(courseId, d.id); await load(); } catch (err) { setError(apiMessage(err, 'Gagal membatalkan.')); }
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

  const fmt = (s: string) => new Date(s).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600 dark:text-slate-300">Diskon otomatis berlaku pada periode tertentu untuk semua orang. Kode promo diketik pembeli saat checkout: satu kode bersama untuk banyak orang, atau kode sekali pakai yang dibuat massal. Diskon tidak ditumpuk; yang memberi harga terendah yang berlaku.</p>

      <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-800/40">
        <div className="flex flex-wrap gap-2">
          {([['CODE', 'Kode promo'], ['BULK', 'Kode sekali pakai (massal)'], ['AUTO', 'Diskon otomatis']] as [Mode, string][]).map(([m, l]) => (
            <button key={m} onClick={() => setMode(m)} className={`rounded-full px-3 py-1 text-sm font-medium ${mode === m ? 'bg-kodman-600 text-white' : 'bg-white text-gray-600 dark:bg-slate-800 dark:text-slate-300'}`}>{l}</button>
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-xs text-gray-500">Diskon (%)
            <input className={inputClass} type="number" min={1} max={100} value={percent} onChange={(e) => setPercent(Number(e.target.value))} />
          </label>
          <label className="text-xs text-gray-500">Mulai
            <input className={inputClass} type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          </label>
          <label className="text-xs text-gray-500">Berakhir
            <input className={inputClass} type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
          </label>
        </div>
        {mode === 'CODE' && (
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-xs text-gray-500">Kode (4-20 karakter, huruf/angka)
              <input className={`${inputClass} uppercase`} value={code} maxLength={20} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="KOPERASI50" />
            </label>
            <label className="text-xs text-gray-500">Kuota pemakaian (opsional)
              <input className={inputClass} type="number" min={1} value={quota} onChange={(e) => setQuota(e.target.value)} placeholder="Tanpa batas" />
            </label>
          </div>
        )}
        {mode === 'AUTO' && (
          <label className="block text-xs text-gray-500">Kuota pemakaian (opsional)
            <input className={inputClass} type="number" min={1} value={quota} onChange={(e) => setQuota(e.target.value)} placeholder="Tanpa batas" />
          </label>
        )}
        {mode === 'BULK' && (
          <label className="block text-xs text-gray-500">Jumlah kode (maks. 200)
            <input className={inputClass} type="number" min={1} max={200} value={count} onChange={(e) => setCount(Number(e.target.value))} />
          </label>
        )}
        <label className="block text-xs text-gray-500">Alasan {isManager ? '(wajib)' : '(opsional)'}
          <input className={inputClass} value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} placeholder={isManager ? 'Mis. promo akhir tahun koperasi' : ''} />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={busy} onClick={() => void create()} className={`${btnPrimary} flex items-center gap-2`}>{busy && <Loader2 size={14} className="animate-spin" />} {mode === 'BULK' ? 'Buat Kode' : 'Buat Diskon'}</button>
      </div>

      {bulk && (
        <div className="space-y-2 rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
          <p className="text-sm font-bold text-green-800 dark:text-green-300">{bulk.length} kode dibuat. Simpan sekarang; daftar ini juga tersedia di tabel di bawah.</p>
          <textarea readOnly rows={5} className={`${inputClass} font-mono`} value={bulk.join('\n')} />
          <button onClick={downloadCsv} className={btnGhost}>Unduh CSV</button>
        </div>
      )}

      <div className="space-y-2">
        <h4 className="text-sm font-bold text-gray-900 dark:text-white">Daftar Diskon</h4>
        {!items ? <Loader2 className="mx-auto animate-spin text-kodman-600" /> : items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-300 py-6 text-center text-sm text-gray-500 dark:border-slate-700">Belum ada diskon.</p>
        ) : items.map((d) => (
          <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 p-3 text-sm dark:border-slate-700">
            <div className="min-w-0">
              <p className="font-bold text-gray-900 dark:text-white">{d.kind === 'CODE' ? <span className="font-mono">{d.code}</span> : 'Diskon otomatis'} • {d.percent}%
                <span className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-bold ${d.cancelledAt ? 'bg-gray-100 text-gray-600' : d.active ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{d.cancelledAt ? 'Dibatalkan' : d.active ? 'Aktif' : 'Tidak aktif'}</span>
              </p>
              <p className="text-xs text-gray-500">{fmt(d.startsAt)} - {fmt(d.endsAt)} • dipakai {d.redemptionCount}{d.maxRedemptions ? `/${d.maxRedemptions}` : ''} • oleh {d.createdByRole === 'CREATOR' ? 'Creator' : 'Koperasi'}{d.reason ? ` • ${d.reason}` : ''}</p>
            </div>
            {!d.cancelledAt && d.manageable && <button onClick={() => void cancel(d)} className="rounded-lg border border-red-300 px-3 py-1 text-xs font-bold text-red-600 hover:bg-red-50">Batalkan</button>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PromoTab;
