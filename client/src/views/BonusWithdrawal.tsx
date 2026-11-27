import React, { useCallback, useEffect, useState } from "react";
import { Loader2, Wallet, ArrowRight } from "lucide-react";
import { nodeProgramApi } from "../services/nodeProgram";
import { toast } from "../services/toast";
import { useT } from "../i18n";

const rupiah = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
type Claim = { id: string; amount: number; note: string | null; createdAt: string };
type Data = { balance: number; walletBalance: number; items: Claim[] };

export default function BonusWithdrawal() {
  const t = useT();
  const [data, setData] = useState<Data | null>(null);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => { const r = await nodeProgramApi.myWithdrawals(); setData(r.data.data); }, []);
  useEffect(() => { void load().catch(() => toast.error(t('wal.bwLoadFail'))); }, [load, t]);

  const submit = async () => {
    const value = Number(amount.replace(/\D/g, ""));
    if (!Number.isInteger(value) || value < 1) return toast.error(t('wal.bwBadAmt'));
    setBusy(true);
    try {
      const r = await nodeProgramApi.claimBonus(value);
      toast.success(r.data.message ?? t('wal.bwOk'));
      setAmount("");
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? t('wal.bwFail'));
    } finally { setBusy(false); }
  };

  if (!data) return <div className="p-8 text-center text-gray-500"><Loader2 className="mx-auto animate-spin" /></div>;

  return <div className="mx-auto max-w-3xl space-y-6">
    <div><h1 className="font-sans text-2xl font-bold text-gray-900 dark:text-white">{t('wal.bwTitle')}</h1><p className="text-sm text-gray-500 dark:text-slate-400">{t('wal.bwSub')}</p></div>

    <div className="grid gap-4 sm:grid-cols-2">
      <div className="card-surface p-5"><p className="text-xs text-gray-500 dark:text-slate-400">{t('wal.dbBalance')}</p><p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{rupiah(data.balance)}</p></div>
      <div className="card-surface p-5"><p className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1"><Wallet size={13} /> {t('wal.bwWallet')}</p><p className="mt-1 text-2xl font-bold text-digitalcoop-600 dark:text-digitalcoop-400">{rupiah(data.walletBalance)}</p></div>
    </div>

    <div className="card-surface p-6">
      <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">{t('wal.bwBonus')} <ArrowRight size={16} className="text-digitalcoop-500" /> {t('wal.bwWalletWord')}</h2>
      <div className="mt-4 grid gap-3">
        <input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} placeholder={t('wal.bwAmtPh')} className="rounded-xl border p-3 dark:border-slate-700 dark:bg-slate-800"/>
        <div className="flex gap-2">
          <button type="button" onClick={() => setAmount(String(data.balance))} className="btn-ghost text-sm">{t('wal.bwAll')}</button>
          <button disabled={busy || data.balance <= 0} onClick={() => void submit()} className="btn-primary flex-1">{busy ? t('wal.nuProcessing') : t('wal.bwBtn')}</button>
        </div>
      </div>
    </div>

    <div className="card-surface p-6">
      <h2 className="mb-4 font-bold text-gray-900 dark:text-white">{t('wal.bwHist')}</h2>
      {data.items.length === 0 ? <p className="text-sm text-gray-500 dark:text-slate-400">{t('wal.bwNone')}</p> : <div className="space-y-3">{data.items.map((item) => <div key={item.id} className="flex flex-wrap justify-between gap-3 rounded-xl border p-3 dark:border-slate-700"><div><p className="font-semibold">{rupiah(item.amount)}</p><p className="text-xs text-gray-500">{new Date(item.createdAt).toLocaleString("id-ID")}{item.note ? ` • ${item.note}` : ""}</p></div><span className="h-fit rounded bg-digitalcoop-100 px-2 py-1 text-xs font-bold text-digitalcoop-800 dark:bg-slate-800 dark:text-digitalcoop-200">{t('wal.bwTo')}</span></div>)}</div>}
    </div>
  </div>;
}
