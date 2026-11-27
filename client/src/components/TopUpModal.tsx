import React, { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { PaymentMethods, PaymentOrder, apiMessage, paymentApi, rupiah } from '../services/payments';
import OrderPanel from './OrderPanel';

interface TopUpModalProps {
  onClose: () => void;
  /** Dipanggil saat saldo sudah bertambah (order PAID). */
  onPaid: () => void;
  /** Membuka order yang sudah ada (mis. dari daftar pesanan). */
  existingOrderId?: string | null;
}

const PRESETS = [50000, 100000, 250000, 500000, 1000000];
const BANKS = [{ id: 'bca', label: 'BCA' }, { id: 'bni', label: 'BNI' }, { id: 'bri', label: 'BRI' }, { id: 'permata', label: 'Permata' }];

const TopUpModal: React.FC<TopUpModalProps> = ({ onClose, onPaid, existingOrderId = null }) => {
  const [methods, setMethods] = useState<PaymentMethods | null>(null);
  const [amount, setAmount] = useState(100000);
  const [method, setMethod] = useState<'VA' | 'MANUAL'>('VA');
  const [bank, setBank] = useState('bca');
  const [order, setOrder] = useState<PaymentOrder | null>(null);
  const [orderId, setOrderId] = useState<string | null>(existingOrderId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (existingOrderId) return;
    void (async () => {
      try {
        const m = (await paymentApi.methods()).data.data as PaymentMethods;
        setMethods(m);
        setMethod(m.va.enabled ? 'VA' : 'MANUAL');
      } catch { setError('Gagal memuat metode pembayaran.'); }
    })();
  }, [existingOrderId]);

  const create = async () => {
    setBusy(true); setError('');
    try {
      const res = await paymentApi.createOrder({ kind: 'TOPUP', method, amount, ...(method === 'VA' ? { bank } : {}) });
      const o = res.data.data as PaymentOrder;
      setOrder(o);
      setOrderId(o.id);
    } catch (err) {
      setError(apiMessage(err, 'Gagal membuat pesanan top-up.'));
    } finally {
      setBusy(false);
    }
  };

  const none = methods && !methods.va.enabled && !methods.manual.enabled;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <button onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-red-500"><X size={22} /></button>
        <h3 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">Top Up Saldo</h3>

        {orderId ? (
          <OrderPanel orderId={orderId} initial={order} onPaid={onPaid} />
        ) : none ? (
          <p className="text-sm text-gray-600 dark:text-slate-300">Top-up belum tersedia. Hubungi Admin.</p>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-sm text-gray-500">Nominal</p>
              <div className="mb-3 grid grid-cols-3 gap-2">
                {PRESETS.map((a) => (
                  <button key={a} onClick={() => setAmount(a)} className={`rounded border px-1 py-2 text-sm font-medium transition ${amount === a ? 'border-digitalcoop-500 bg-digitalcoop-50 text-digitalcoop-700 dark:bg-digitalcoop-900/30 dark:text-digitalcoop-400' : 'border-gray-200 text-gray-600 hover:border-digitalcoop-300 dark:border-slate-700 dark:text-slate-400'}`}>{a / 1000}k</button>
                ))}
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-500">Rp</span>
                <input type="number" min={10000} step={1000} value={amount} onChange={(e) => setAmount(Math.floor(Number(e.target.value)))}
                  className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-4 text-lg font-bold outline-none focus:ring-2 focus:ring-digitalcoop-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              </div>
              <p className="mt-1 text-xs text-gray-400">Minimal {rupiah(10000)}, maksimal {rupiah(20000000)}.</p>
            </div>

            <div className="space-y-2">
              {methods?.va.enabled && (
                <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${method === 'VA' ? 'border-digitalcoop-500 bg-digitalcoop-50 dark:bg-digitalcoop-900/20' : 'border-gray-200 dark:border-slate-700'}`}>
                  <input type="radio" checked={method === 'VA'} onChange={() => setMethod('VA')} />
                  <span className="text-sm font-bold text-gray-900 dark:text-white">Virtual Account <span className="font-normal text-gray-500">(otomatis)</span></span>
                </label>
              )}
              {methods?.manual.enabled && (
                <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${method === 'MANUAL' ? 'border-digitalcoop-500 bg-digitalcoop-50 dark:bg-digitalcoop-900/20' : 'border-gray-200 dark:border-slate-700'}`}>
                  <input type="radio" checked={method === 'MANUAL'} onChange={() => setMethod('MANUAL')} />
                  <span className="text-sm font-bold text-gray-900 dark:text-white">Transfer Manual <span className="font-normal text-gray-500">(diverifikasi Admin)</span></span>
                </label>
              )}
              {method === 'VA' && methods?.va.enabled && (
                <div className="grid grid-cols-4 gap-2">
                  {BANKS.map((b) => (
                    <button key={b.id} onClick={() => setBank(b.id)} className={`rounded-lg border py-2 text-xs font-bold ${bank === b.id ? 'border-digitalcoop-500 bg-digitalcoop-50 text-digitalcoop-700 dark:bg-digitalcoop-900/20' : 'border-gray-200 text-gray-600 dark:border-slate-700 dark:text-slate-300'}`}>{b.label}</button>
                  ))}
                </div>
              )}
            </div>

            {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">{error}</p>}
            <button onClick={() => void create()} disabled={busy || !methods} className="flex w-full items-center justify-center gap-2 rounded-lg bg-digitalcoop-600 py-3 font-bold text-white shadow-lg hover:bg-digitalcoop-700 disabled:opacity-60">
              {busy && <Loader2 size={16} className="animate-spin" />} Lanjut Pembayaran
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TopUpModal;
