import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { nodeProgramApi, type NodeSummary } from "../services/nodeProgram";
import { useT } from "../i18n";

const rupiah = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

export default function MyDailyBonus() {
  const t = useT();
  const [data, setData] = useState<NodeSummary | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { void nodeProgramApi.me().then((r) => setData(r.data.data)).catch(() => setError(t('wal.dbLoadFail'))); }, []);
  if (!data && !error) return <div className="p-8 text-center text-gray-500"><Loader2 className="mx-auto animate-spin" /></div>;
  const today = data?.today;
  return <div className="space-y-6">
    <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('wal.dbTitle')}</h1><p className="text-sm text-gray-500">{t('wal.dbSub')}</p></div>
    {error && <div className="rounded-xl bg-red-50 p-4 text-red-700">{error}</div>}
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Tile label={t('wal.dbToday')} value={rupiah(today?.totalBonus ?? 0)} />
      <Tile label={t('wal.nuActiveNodes')} value={String(data?.activeNodes ?? 0)} />
      <Tile label={t('wal.dbCapToday')} value={t('wal.nuPoints', { n: data?.capacityPoints ?? 0 })} />
      <Tile label={t('wal.dbBalance')} value={rupiah(data?.bonusBalance ?? 0)} />
    </div>
    <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-900">
      <h2 className="mb-4 font-bold">{t('wal.dbDetail')}</h2>
      <div className="grid gap-3 sm:grid-cols-3"><Tile label={t('wal.dbReferral')} value={rupiah(today?.sponsorBonus ?? 0)} /><Tile label={t('wal.dbRank')} value={rupiah(today?.levelBonus ?? 0)} /><Tile label={t('wal.dbTeam')} value={rupiah(today?.pairingBonus ?? 0)} /></div>
      <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3"><p>{t('wal.dbPaid')} <b>{today?.paidPoints ?? 0}</b></p><p>{t('wal.dbExpired')} <b>{today?.expiredPoints ?? 0}</b></p><p>{t('wal.dbStatus')} <b>{today?.status ?? t('wal.dbNotCalc')}</b></p></div>
      <details className="mt-5 rounded-xl border p-4 dark:border-slate-700"><summary className="cursor-pointer font-semibold">{t('wal.dbTerms')}</summary><p className="mt-3 text-sm text-gray-600 dark:text-slate-300">{t('wal.dbTermsBody')}</p></details>
    </div>
    <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-900"><h2 className="mb-4 font-bold">{t('wal.dbHist')}</h2>{data?.history.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="py-2">{t('wal.dbDate')}</th><th>{t('wal.dbTotal')}</th><th>{t('wal.dbPaidCol')}</th><th>{t('wal.dbExpCol')}</th></tr></thead><tbody>{data.history.map((x) => <tr key={x.id} className="border-b dark:border-slate-800"><td className="py-3">{x.businessDate}</td><td>{rupiah(x.totalBonus)}</td><td>{x.paidPoints}</td><td>{x.expiredPoints}</td></tr>)}</tbody></table></div> : <p className="text-sm text-gray-500">{t('wal.dbNoHist')}</p>}</div>
  </div>;
}

function Tile({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-gray-50 p-4 dark:bg-slate-800"><p className="text-xs text-gray-500">{label}</p><p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">{value}</p></div>; }
