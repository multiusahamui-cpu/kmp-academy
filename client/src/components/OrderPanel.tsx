import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle, Clock, Copy, Loader2, Upload, XCircle } from 'lucide-react';
import { useI18n, useT } from '../i18n';
import { OPEN_ORDER, PaymentOrder, apiMessage, paymentApi, rupiah } from '../services/payments';

interface OrderPanelProps {
  orderId: string;
  initial?: PaymentOrder | null;
  /** Dipanggil sekali saat order menjadi PAID. */
  onPaid?: (order: PaymentOrder) => void;
  /** Dipanggil saat order berubah ke status final selain PAID, atau dibatalkan. */
  onClosed?: (order: PaymentOrder) => void;
}

const BANK_LABEL: Record<string, string> = { bca: 'BCA', bni: 'BNI', bri: 'BRI', permata: 'Permata' };

const OrderPanel: React.FC<OrderPanelProps> = ({ orderId, initial = null, onPaid, onClosed }) => {
  const t = useT();
  const { lang } = useI18n();
  const [order, setOrder] = useState<PaymentOrder | null>(initial);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const reported = useRef<string>('');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await paymentApi.getOrder(orderId);
      setOrder(res.data.data as PaymentOrder);
    } catch (err) {
      setError(apiMessage(err, t('pay.loadFail')));
    }
  }, [orderId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  // Selama order terbuka, status diperiksa berkala (VA dibayar di luar aplikasi).
  useEffect(() => {
    if (!order || !OPEN_ORDER.includes(order.status)) return;
    const timer = setInterval(() => void load(), 8000);
    return () => clearInterval(timer);
  }, [order, load]);

  useEffect(() => {
    if (!order) return;
    const key = `${order.id}:${order.status}`;
    if (reported.current === key) return;
    if (order.status === 'PAID') { reported.current = key; onPaid?.(order); }
    else if (!OPEN_ORDER.includes(order.status)) { reported.current = key; onClosed?.(order); }
  }, [order, onPaid, onClosed]);

  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard tidak tersedia */ }
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true); setError('');
    try {
      await paymentApi.uploadProof(orderId, file);
      await load();
    } catch (err) {
      setError(apiMessage(err, t('pay.upFail')));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const cancel = async () => {
    if (!window.confirm(t('pay.cancelAsk'))) return;
    setBusy(true); setError('');
    try { await paymentApi.cancelOrder(orderId); await load(); } catch (err) { setError(apiMessage(err, t('pay.cancelFail'))); } finally { setBusy(false); }
  };

  if (!order) return <div className="flex justify-center py-8">{error ? <p className="text-sm text-red-600">{error}</p> : <Loader2 className="animate-spin text-digitalcoop-600" />}</div>;

  const expires = new Date(order.expiresAt).toLocaleString(lang === 'en' ? 'en-US' : 'id-ID', { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <div className="space-y-4 text-sm">
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-800/40">
        <p className="text-xs text-gray-500 dark:text-slate-400">{order.kind === 'COURSE' ? order.courseTitle ?? t('pay.buyCourse') : t('pay.topupAcademy')}</p>
        <p className="text-2xl font-bold text-digitalcoop-700 dark:text-digitalcoop-400">{rupiah(order.amount)}</p>
        {order.discountPercent ? <p className="text-xs text-green-600">{t('pay.inclDisc', { p: order.discountPercent })}</p> : null}
      </div>

      {order.status === 'PAID' && (
        <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300">
          <CheckCircle size={18} className="mt-0.5 shrink-0" /> <span>{t('pay.paid')} {order.kind === 'COURSE' ? t('pay.paidCourse') : t('pay.paidWallet')}</span>
        </div>
      )}

      {(order.status === 'EXPIRED' || order.status === 'CANCELLED' || order.status === 'REJECTED') && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          <XCircle size={18} className="mt-0.5 shrink-0" />
          <span>
            {order.status === 'EXPIRED' ? t('pay.exp') : order.status === 'REJECTED' ? t('pay.rej') : t('pay.canc')}
            {order.decisionNote ? ` ${order.decisionNote}` : ''} {t('pay.again')}
          </span>
        </div>
      )}

      {order.status === 'CONFIRMING' && (
        <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
          <Loader2 size={18} className="mt-0.5 shrink-0 animate-spin" /> <span>{t('pay.confirming')}</span>
        </div>
      )}

      {order.method === 'VA' && order.status === 'PENDING' && (
        <div className="space-y-3">
          <p className="text-gray-600 dark:text-slate-300">{t('pay.vaPre')} <b>{BANK_LABEL[order.bank ?? ''] ?? order.bank}</b> {t('pay.vaPost')}</p>
          <div className="flex items-center justify-between rounded-lg border border-digitalcoop-200 bg-white p-3 dark:border-digitalcoop-800 dark:bg-slate-900">
            <span className="font-mono text-lg font-bold tracking-wider text-gray-900 dark:text-white">{order.vaNumber ?? t('pay.vaPrep')}</span>
            {order.vaNumber && (
              <button onClick={() => void copy(order.vaNumber as string)} className="flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs font-bold text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-300">
                <Copy size={12} /> {copied ? t('pay.copied') : t('pay.copy')}
              </button>
            )}
          </div>
          <p className="flex items-center gap-1 text-xs text-gray-500"><Clock size={12} /> {t('pay.validUntil', { d: expires })}</p>
        </div>
      )}

      {order.method === 'MANUAL' && (order.status === 'PENDING' || order.status === 'VERIFYING') && order.transferTo && (
        <div className="space-y-3">
          <p className="text-gray-600 dark:text-slate-300">{t('pay.trPre')} <b>{rupiah(order.amount)}</b> {t('pay.trPost')}</p>
          <div className="rounded-lg border border-digitalcoop-200 bg-white p-3 dark:border-digitalcoop-800 dark:bg-slate-900">
            <p className="text-xs text-gray-500">{order.transferTo.bankName}</p>
            <div className="flex items-center justify-between">
              <span className="font-mono text-lg font-bold tracking-wider text-gray-900 dark:text-white">{order.transferTo.accountNumber}</span>
              <button onClick={() => void copy(order.transferTo!.accountNumber)} className="flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs font-bold text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-300">
                <Copy size={12} /> {copied ? t('pay.copied') : t('pay.copy')}
              </button>
            </div>
            <p className="text-xs text-gray-500">{t('pay.an')} {order.transferTo.accountName}</p>
          </div>
          {order.status === 'PENDING' ? (
            <>
              <p className="flex items-center gap-1 text-xs text-gray-500"><Clock size={12} /> {t('pay.uploadBefore', { d: expires })}</p>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" hidden onChange={(e) => void upload(e.target.files?.[0])} />
              <button disabled={busy} onClick={() => fileRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-digitalcoop-600 py-3 font-bold text-white hover:bg-digitalcoop-700 disabled:opacity-60">
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} {t('pay.uploadBtn')}
              </button>
            </>
          ) : (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
              <Clock size={18} className="mt-0.5 shrink-0" /> <span>{t('pay.uploaded')}</span>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {order.status === 'PENDING' && (
        <button disabled={busy} onClick={() => void cancel()} className="w-full rounded-xl border border-gray-300 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-60 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">
          {t('pay.cancelBtn')}
        </button>
      )}
    </div>
  );
};

export default OrderPanel;
