import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle, Clock, Copy, Loader2, Upload, XCircle } from 'lucide-react';
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
      setError(apiMessage(err, 'Gagal memuat pesanan.'));
    }
  }, [orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Selama order terbuka, status diperiksa berkala (VA dibayar di luar aplikasi).
  useEffect(() => {
    if (!order || !OPEN_ORDER.includes(order.status)) return;
    const t = setInterval(() => void load(), 8000);
    return () => clearInterval(t);
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
      setError(apiMessage(err, 'Gagal mengunggah bukti.'));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const cancel = async () => {
    if (!window.confirm('Batalkan pesanan ini?')) return;
    setBusy(true); setError('');
    try { await paymentApi.cancelOrder(orderId); await load(); } catch (err) { setError(apiMessage(err, 'Gagal membatalkan pesanan.')); } finally { setBusy(false); }
  };

  if (!order) return <div className="flex justify-center py-8">{error ? <p className="text-sm text-red-600">{error}</p> : <Loader2 className="animate-spin text-digitalcoop-600" />}</div>;

  const expires = new Date(order.expiresAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <div className="space-y-4 text-sm">
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-800/40">
        <p className="text-xs text-gray-500 dark:text-slate-400">{order.kind === 'COURSE' ? order.courseTitle ?? 'Pembelian kursus' : 'Top-up dompet Academy'}</p>
        <p className="text-2xl font-bold text-digitalcoop-700 dark:text-digitalcoop-400">{rupiah(order.amount)}</p>
        {order.discountPercent ? <p className="text-xs text-green-600">Sudah termasuk diskon {order.discountPercent}%</p> : null}
      </div>

      {order.status === 'PAID' && (
        <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300">
          <CheckCircle size={18} className="mt-0.5 shrink-0" /> <span>Pembayaran diterima. {order.kind === 'COURSE' ? 'Kursus sudah terbuka di menu Kursus Saya.' : 'Saldo dompet Anda sudah bertambah.'}</span>
        </div>
      )}

      {(order.status === 'EXPIRED' || order.status === 'CANCELLED' || order.status === 'REJECTED') && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          <XCircle size={18} className="mt-0.5 shrink-0" />
          <span>
            {order.status === 'EXPIRED' ? 'Pesanan kedaluwarsa.' : order.status === 'REJECTED' ? 'Bukti pembayaran ditolak.' : 'Pesanan dibatalkan.'}
            {order.decisionNote ? ` ${order.decisionNote}` : ''} Silakan buat pesanan baru.
          </span>
        </div>
      )}

      {order.status === 'CONFIRMING' && (
        <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
          <Loader2 size={18} className="mt-0.5 shrink-0 animate-spin" /> <span>Pembayaran dari dompet digitalcoop.id sedang dikonfirmasi. Halaman ini diperbarui otomatis; jangan bayar ulang.</span>
        </div>
      )}

      {order.method === 'VA' && order.status === 'PENDING' && (
        <div className="space-y-3">
          <p className="text-gray-600 dark:text-slate-300">Bayar ke Virtual Account <b>{BANK_LABEL[order.bank ?? ''] ?? order.bank}</b> lewat ATM, m-banking, atau internet banking. Jumlah harus sama persis.</p>
          <div className="flex items-center justify-between rounded-lg border border-digitalcoop-200 bg-white p-3 dark:border-digitalcoop-800 dark:bg-slate-900">
            <span className="font-mono text-lg font-bold tracking-wider text-gray-900 dark:text-white">{order.vaNumber ?? 'Menyiapkan nomor...'}</span>
            {order.vaNumber && (
              <button onClick={() => void copy(order.vaNumber as string)} className="flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs font-bold text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-300">
                <Copy size={12} /> {copied ? 'Tersalin' : 'Salin'}
              </button>
            )}
          </div>
          <p className="flex items-center gap-1 text-xs text-gray-500"><Clock size={12} /> Berlaku sampai {expires}. Status diperbarui otomatis setelah pembayaran masuk.</p>
        </div>
      )}

      {order.method === 'MANUAL' && (order.status === 'PENDING' || order.status === 'VERIFYING') && order.transferTo && (
        <div className="space-y-3">
          <p className="text-gray-600 dark:text-slate-300">Transfer <b>{rupiah(order.amount)}</b> (jumlah harus sama persis) ke rekening berikut:</p>
          <div className="rounded-lg border border-digitalcoop-200 bg-white p-3 dark:border-digitalcoop-800 dark:bg-slate-900">
            <p className="text-xs text-gray-500">{order.transferTo.bankName}</p>
            <div className="flex items-center justify-between">
              <span className="font-mono text-lg font-bold tracking-wider text-gray-900 dark:text-white">{order.transferTo.accountNumber}</span>
              <button onClick={() => void copy(order.transferTo!.accountNumber)} className="flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs font-bold text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-300">
                <Copy size={12} /> {copied ? 'Tersalin' : 'Salin'}
              </button>
            </div>
            <p className="text-xs text-gray-500">a.n. {order.transferTo.accountName}</p>
          </div>
          {order.status === 'PENDING' ? (
            <>
              <p className="flex items-center gap-1 text-xs text-gray-500"><Clock size={12} /> Unggah bukti sebelum {expires}.</p>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" hidden onChange={(e) => void upload(e.target.files?.[0])} />
              <button disabled={busy} onClick={() => fileRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-digitalcoop-600 py-3 font-bold text-white hover:bg-digitalcoop-700 disabled:opacity-60">
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} Unggah Bukti Transfer (JPG, PNG, WebP, PDF, maks. 5 MB)
              </button>
            </>
          ) : (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
              <Clock size={18} className="mt-0.5 shrink-0" /> <span>Bukti sudah diunggah dan menunggu verifikasi Admin. Anda akan mendapat notifikasi setelah diverifikasi.</span>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {order.status === 'PENDING' && (
        <button disabled={busy} onClick={() => void cancel()} className="w-full rounded-xl border border-gray-300 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-60 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">
          Batalkan Pesanan
        </button>
      )}
    </div>
  );
};

export default OrderPanel;
