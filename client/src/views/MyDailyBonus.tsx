import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { nodeProgramApi, type NodeSummary } from "../services/nodeProgram";

const rupiah = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

export default function MyDailyBonus() {
  const [data, setData] = useState<NodeSummary | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { void nodeProgramApi.me().then((r) => setData(r.data.data)).catch(() => setError("Bonus harian belum dapat dimuat.")); }, []);
  if (!data && !error) return <div className="p-8 text-center text-gray-500"><Loader2 className="mx-auto animate-spin" /></div>;
  const today = data?.today;
  return <div className="space-y-6">
    <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bonus Harian Saya</h1><p className="text-sm text-gray-500">Ringkasan bonus Program Node yang sudah dihitung sistem.</p></div>
    {error && <div className="rounded-xl bg-red-50 p-4 text-red-700">{error}</div>}
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Tile label="Bonus hari ini" value={rupiah(today?.totalBonus ?? 0)} />
      <Tile label="Node aktif" value={String(data?.activeNodes ?? 0)} />
      <Tile label="Kapasitas hari ini" value={`${data?.capacityPoints ?? 0} poin`} />
      <Tile label="Saldo bonus" value={rupiah(data?.bonusBalance ?? 0)} />
    </div>
    <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-900">
      <h2 className="mb-4 font-bold">Rincian hari ini</h2>
      <div className="grid gap-3 sm:grid-cols-3"><Tile label="Bonus Referral" value={rupiah(today?.sponsorBonus ?? 0)} /><Tile label="Bonus Pangkat" value={rupiah(today?.levelBonus ?? 0)} /><Tile label="Bonus Teamwork" value={rupiah(today?.pairingBonus ?? 0)} /></div>
      <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3"><p>Poin dibayar: <b>{today?.paidPoints ?? 0}</b></p><p>Poin hangus: <b>{today?.expiredPoints ?? 0}</b></p><p>Status: <b>{today?.status ?? "Belum dihitung"}</b></p></div>
      <details className="mt-5 rounded-xl border p-4 dark:border-slate-700"><summary className="cursor-pointer font-semibold">Lihat ketentuan perhitungan</summary><p className="mt-3 text-sm text-gray-600 dark:text-slate-300">Bonus aktual mengikuti transaksi yang memenuhi syarat, jumlah node aktif pada cutoff, batas harian, dan versi aturan yang berlaku. Kapasitas bukan jaminan pendapatan.</p></details>
    </div>
    <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-900"><h2 className="mb-4 font-bold">Riwayat 31 hari</h2>{data?.history.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="py-2">Tanggal</th><th>Total</th><th>Poin dibayar</th><th>Poin hangus</th></tr></thead><tbody>{data.history.map((x) => <tr key={x.id} className="border-b dark:border-slate-800"><td className="py-3">{x.businessDate}</td><td>{rupiah(x.totalBonus)}</td><td>{x.paidPoints}</td><td>{x.expiredPoints}</td></tr>)}</tbody></table></div> : <p className="text-sm text-gray-500">Belum ada riwayat bonus harian.</p>}</div>
  </div>;
}

function Tile({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-gray-50 p-4 dark:bg-slate-800"><p className="text-xs text-gray-500">{label}</p><p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">{value}</p></div>; }
