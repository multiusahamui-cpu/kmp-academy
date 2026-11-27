import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle, Landmark, Loader2, Tag, Wallet, X, CreditCard, Building2 } from 'lucide-react';
import { Course } from '../types';
import { userApi } from '../services/api';
import { PaymentMethods, PaymentOrder, apiMessage, paymentApi, rupiah } from '../services/payments';
import OrderPanel from './OrderPanel';

interface CheckoutModalProps {
  course: Course;
  onClose: () => void;
  /** Dipanggil setelah pendaftaran berhasil (gratis, dompet, atau pembayaran terkonfirmasi). */
  onEnrolled: (cardNumber: string | null) => void;
}

type MethodKey = 'WALLET' | 'DC_WALLET' | 'VA' | 'MANUAL';
const BANKS: { id: string; label: string }[] = [{ id: 'bca', label: 'BCA' }, { id: 'bni', label: 'BNI' }, { id: 'bri', label: 'BRI' }, { id: 'permata', label: 'Permata' }];

const CheckoutModal: React.FC<CheckoutModalProps> = ({ course, onClose, onEnrolled }) => {
  const [methods, setMethods] = useState<PaymentMethods | null>(null);
  const [balance, setBalance] = useState(0);
  const [dcWallet, setDcWallet] = useState<{ saldo: number; pinSet: boolean } | null>(null);
  const [method, setMethod] = useState<MethodKey>('WALLET');
  const [bank, setBank] = useState('bca');
  const [pin, setPin] = useState('');
  const [promo, setPromo] = useState('');
  const [promoApplied, setPromoApplied] = useState<{ code: string; percent: number; finalPrice: number } | null>(null);
  const [promoError, setPromoError] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [order, setOrder] = useState<PaymentOrder | null>(null);
  const [doneCard, setDoneCard] = useState<{ card: string | null } | null>(null);

  const price = promoApplied?.finalPrice ?? course.finalPrice ?? course.price;
  const base = course.price;
  const free = price === 0;

  useEffect(() => {
    void (async () => {
      try {
        const [m, w] = await Promise.all([paymentApi.methods(), userApi.getWallet()]);
        setMethods(m.data.data as PaymentMethods);
        setBalance(Number(w.data?.data?.balance ?? 0));
        if ((m.data.data as PaymentMethods).dcWallet.enabled) {
          try { const d = await paymentApi.dcWallet(); setDcWallet(d.data.data); } catch { setDcWallet(null); }
        }
      } catch { setError('Gagal memuat metode pembayaran.'); }
    })();
  }, []);

  const available = useMemo(() => {
    const list: MethodKey[] = ['WALLET'];
    if (methods?.dcWallet.enabled) list.push('DC_WALLET');
    if (methods?.va.enabled) list.push('VA');
    if (methods?.manual.enabled) list.push('MANUAL');
    return list;
  }, [methods]);

  const applyPromo = async () => {
    setPromoError('');
    const code = promo.trim();
    if (!code) return;
    try {
      const res = await paymentApi.validatePromo(course.id, code);
      const d = res.data.data as { percent: number; finalPrice: number };
      setPromoApplied({ code: code.toUpperCase(), percent: d.percent, finalPrice: d.finalPrice });
    } catch (err) {
      setPromoApplied(null);
      setPromoError(apiMessage(err, 'Kode promo tidak valid.'));
    }
  };

  const finish = (card: string | null) => { setDoneCard({ card }); onEnrolled(card); };

  const pay = async () => {
    setBusy(true); setError('');
    const common = { promoCode: promoApplied?.code, expectedPrice: price };
    try {
      if (free || method === 'WALLET') {
        const res = await userApi.enroll(course.id, common);
        finish(res.data?.data?.cardNumber ?? null);
        return;
      }
      const res = await paymentApi.createOrder({
        kind: 'COURSE', courseId: course.id, method: method as 'VA' | 'MANUAL' | 'DC_WALLET', ...common,
        ...(method === 'VA' ? { bank } : {}), ...(method === 'DC_WALLET' ? { pin } : {}),
      });
      const data = res.data.data as { enrolled?: boolean; cardNumber?: string | null; status?: string } & Partial<PaymentOrder>;
      setPin('');
      if (data.enrolled || data.status === 'PAID') finish(data.cardNumber ?? null);
      else setOrder(data as PaymentOrder);
    } catch (err) {
      setPin('');
      setError(apiMessage(err, 'Pembayaran gagal.'));
    } finally {
      setBusy(false);
    }
  };

  const row = (key: MethodKey, icon: React.ReactNode, title: string, hint: string) => (
    <label key={key} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${method === key ? 'border-digitalcoop-500 bg-digitalcoop-50 dark:bg-digitalcoop-900/20' : 'border-gray-200 hover:border-digitalcoop-300 dark:border-slate-700'}`}>
      <input type="radio" name="method" className="mt-1" checked={method === key} onChange={() => setMethod(key)} />
      <span className="mt-0.5 text-digitalcoop-600">{icon}</span>
      <span className="flex-1"><span className="block text-sm font-bold text-gray-900 dark:text-white">{title}</span><span className="block text-xs text-gray-500 dark:text-slate-400">{hint}</span></span>
    </label>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
        <button onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-red-500"><X size={22} /></button>
        <h2 className="pr-8 text-lg font-bold text-gray-900 dark:text-white">Pembayaran Kursus</h2>
        <p className="mb-4 text-sm text-gray-500 dark:text-slate-400">{course.title}</p>

        {doneCard ? (
          <div className="space-y-4 text-center">
            <CheckCircle size={48} className="mx-auto text-green-500" />
            <p className="font-bold text-gray-900 dark:text-white">Berhasil mengikuti kursus</p>
            {doneCard.card && <p className="text-sm text-gray-600 dark:text-slate-300">Kartu Student Anda terbit: <b>{doneCard.card}</b></p>}
            <button onClick={onClose} className="w-full rounded-xl bg-digitalcoop-600 py-3 font-bold text-white hover:bg-digitalcoop-700">Tutup</button>
          </div>
        ) : order ? (
          <OrderPanel orderId={order.id} initial={order} onPaid={() => finish(null)} />
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl bg-gray-50 p-4 dark:bg-slate-800/40">
              <div className="flex items-end justify-between">
                <span className="text-sm text-gray-500">Total</span>
                <span className="text-2xl font-bold text-digitalcoop-700 dark:text-digitalcoop-400">{free ? 'Gratis' : rupiah(price)}</span>
              </div>
              {price < base && <p className="text-right text-xs text-gray-400"><s>{rupiah(base)}</s> {promoApplied ? `Kode ${promoApplied.code}: ${promoApplied.percent}%` : `Diskon ${course.discountPercent}%`}</p>}
            </div>

            <div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={promo} onChange={(e) => { setPromo(e.target.value.toUpperCase()); setPromoApplied(null); }} placeholder="Kode promo (opsional)" maxLength={20}
                    className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm uppercase dark:border-slate-600 dark:bg-slate-800 dark:text-white" />
                </div>
                <button onClick={() => void applyPromo()} disabled={!promo.trim()} className="rounded-lg bg-gray-900 px-4 text-sm font-bold text-white hover:bg-gray-700 disabled:opacity-50 dark:bg-slate-700">Pakai</button>
              </div>
              {promoError && <p className="mt-1 text-xs text-red-600">{promoError}</p>}
              {promoApplied && <p className="mt-1 text-xs text-green-600">Kode berlaku: diskon {promoApplied.percent}%.</p>}
            </div>

            {!free && (
              <div className="space-y-2">
                {available.includes('WALLET') && row('WALLET', <Wallet size={18} />, 'Dompet Academy', `Saldo ${rupiah(balance)}${balance < price ? ' (kurang)' : ''}`)}
                {available.includes('DC_WALLET') && row('DC_WALLET', <Landmark size={18} />, 'Dompet digitalcoop.id', dcWallet ? `Simpanan Sukarela ${rupiah(dcWallet.saldo)} • perlu PIN Transaksi` : 'Simpanan Sukarela • perlu PIN Transaksi')}
                {available.includes('VA') && row('VA', <CreditCard size={18} />, 'Virtual Account', 'BCA, BNI, BRI, Permata • otomatis terkonfirmasi')}
                {available.includes('MANUAL') && row('MANUAL', <Building2 size={18} />, 'Transfer Manual', 'Unggah bukti • diverifikasi Admin')}

                {method === 'VA' && (
                  <div className="grid grid-cols-4 gap-2">
                    {BANKS.map((b) => (
                      <button key={b.id} onClick={() => setBank(b.id)} className={`rounded-lg border py-2 text-xs font-bold ${bank === b.id ? 'border-digitalcoop-500 bg-digitalcoop-50 text-digitalcoop-700 dark:bg-digitalcoop-900/20' : 'border-gray-200 text-gray-600 dark:border-slate-700 dark:text-slate-300'}`}>{b.label}</button>
                    ))}
                  </div>
                )}
                {method === 'DC_WALLET' && (
                  <div>
                    <input type="password" inputMode="numeric" autoComplete="off" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 12))} placeholder="PIN Transaksi digitalcoop.id"
                      className="w-full rounded-lg border border-gray-300 p-2 text-sm tracking-widest dark:border-slate-600 dark:bg-slate-800 dark:text-white" />
                    {dcWallet && !dcWallet.pinSet && <p className="mt-1 text-xs text-amber-600">PIN Transaksi belum dibuat. Buat dulu di digitalcoop.id (menu Keamanan).</p>}
                  </div>
                )}
              </div>
            )}

            {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">{error}</p>}
            <button onClick={() => void pay()} disabled={busy || !methods || (!free && method === 'DC_WALLET' && pin.length < 4)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-digitalcoop-600 py-3 font-bold text-white shadow-lg hover:bg-digitalcoop-700 disabled:opacity-60">
              {busy && <Loader2 size={16} className="animate-spin" />}
              {free ? 'Daftar Gratis' : method === 'WALLET' ? `Bayar ${rupiah(price)}` : method === 'DC_WALLET' ? `Bayar ${rupiah(price)} dari dompet digitalcoop.id` : 'Buat Pesanan'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CheckoutModal;
