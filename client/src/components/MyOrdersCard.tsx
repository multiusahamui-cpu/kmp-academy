import React, { useCallback, useEffect, useState } from 'react';
import { Receipt } from 'lucide-react';
import { OPEN_ORDER, OrderStatus, PaymentOrder, paymentApi, rupiah } from '../services/payments';

interface MyOrdersCardProps {
  refreshKey?: number;
  onOpen: (order: PaymentOrder) => void;
}

const BADGE: Record<OrderStatus, { label: string; cls: string }> = {
  PENDING: { label: 'Menunggu pembayaran', cls: 'bg-amber-100 text-amber-700' },
  VERIFYING: { label: 'Menunggu verifikasi', cls: 'bg-blue-100 text-blue-700' },
  CONFIRMING: { label: 'Dikonfirmasi', cls: 'bg-blue-100 text-blue-700' },
  PAID: { label: 'Lunas', cls: 'bg-green-100 text-green-700' },
  EXPIRED: { label: 'Kedaluwarsa', cls: 'bg-gray-100 text-gray-600' },
  CANCELLED: { label: 'Dibatalkan', cls: 'bg-gray-100 text-gray-600' },
  REJECTED: { label: 'Ditolak', cls: 'bg-red-100 text-red-700' },
};
const METHOD: Record<string, string> = { VA: 'Virtual Account', MANUAL: 'Transfer manual', DC_WALLET: 'Dompet digitalcoop.id' };

const MyOrdersCard: React.FC<MyOrdersCardProps> = ({ refreshKey = 0, onOpen }) => {
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try { setOrders((await paymentApi.listOrders()).data.data as PaymentOrder[]); } catch { /* daftar kosong */ } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load, refreshKey]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h3 className="mb-4 flex items-center text-sm font-bold text-gray-900 dark:text-white"><Receipt size={16} className="mr-2 text-kodman-600" /> Pesanan Pembayaran</h3>
      {loading ? <p className="py-2 text-center text-xs text-gray-400">Memuat...</p> : orders.length === 0 ? (
        <p className="py-2 text-center text-xs text-gray-400">Belum ada pesanan.</p>
      ) : (
        <div className="space-y-2">
          {orders.slice(0, 8).map((o) => (
            <button key={o.id} onClick={() => onOpen(o)} className="flex w-full items-center justify-between gap-2 rounded-lg border border-gray-100 p-3 text-left hover:bg-gray-50 dark:border-slate-800 dark:hover:bg-slate-800/50">
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-gray-800 dark:text-slate-200">{o.kind === 'COURSE' ? o.courseTitle ?? 'Kursus' : 'Top-up dompet'}</span>
                <span className="block text-xs text-gray-400">{METHOD[o.method]} • {new Date(o.createdAt).toLocaleDateString('id-ID')}</span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-sm font-bold text-gray-900 dark:text-white">{rupiah(o.amount)}</span>
                <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold ${BADGE[o.status].cls}`}>{BADGE[o.status].label}{OPEN_ORDER.includes(o.status) ? '' : ''}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyOrdersCard;
