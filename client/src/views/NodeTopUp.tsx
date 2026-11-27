import React, { useEffect, useState } from "react";
import { Coins, Loader2 } from "lucide-react";
import { nodeProgramApi, type NodeSummary, type NodeTopupOrder } from "../services/nodeProgram";

const rupiah = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

export default function NodeTopUp() {
  const [summary, setSummary] = useState<NodeSummary | null>(null);
  const [count, setCount] = useState(1);
  const [total, setTotal] = useState(50_000);
  const [busy, setBusy] = useState(true);
  const [ordering, setOrdering] = useState(false);
  const [orders, setOrders] = useState<NodeTopupOrder[]>([]);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const referralLink = summary?.referral ? `${window.location.origin}/?ref=${summary.referral.code}` : "";

  useEffect(() => {
    void Promise.all([nodeProgramApi.me(), nodeProgramApi.listTopups()]).then(([s, o]) => {
      setSummary(s.data.data); setOrders(o.data.data);
    }).catch(() => setError("Program Node belum dapat dimuat.")).finally(() => setBusy(false));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (count < 1) return;
      void nodeProgramApi.previewTopup(count).then((r) => setTotal(r.data.data.total)).catch(() => undefined);
    }, 250);
    return () => clearTimeout(t);
  }, [count]);

  const createOrder = async () => {
    setOrdering(true); setError(""); setNotice("");
    try {
      const result = await nodeProgramApi.createTopup(count);
      setNotice(result.data.message ?? "Pesanan uji berhasil dibuat.");
      const refreshed = await nodeProgramApi.listTopups();
      setOrders(refreshed.data.data);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Pesanan uji gagal dibuat.");
    } finally { setOrdering(false); }
  };

  if (busy) return <div className="p-8 text-center text-gray-500"><Loader2 className="mx-auto animate-spin" /></div>;
  return <div className="mx-auto max-w-3xl space-y-6">
    <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Beli / Top Up Node</h1><p className="text-sm text-gray-500">Tambah node sesuai kebutuhan untuk akses Program Node Academy.</p></div>
    {summary?.programStatus !== "ACTIVE" && <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">Program masih dalam tahap persiapan. Simulasi sudah dapat digunakan, tetapi pembayaran belum diaktifkan.</div>}
    {error && <div className="rounded-xl bg-red-50 p-4 text-red-700">{error}</div>}
    {notice && <div className="rounded-xl bg-green-50 p-4 text-green-700">{notice}</div>}
    <div className="grid gap-4 sm:grid-cols-3">
      <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900"><p className="text-xs text-gray-500">Node aktif</p><p className="mt-1 text-3xl font-bold">{summary?.activeNodes ?? 0}</p></div>
      <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900"><p className="text-xs text-gray-500">Tingkatan</p><p className="mt-1 text-2xl font-bold">{summary?.tier ?? "NONE"}</p></div>
      <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900"><p className="text-xs text-gray-500">Kapasitas harian</p><p className="mt-1 text-2xl font-bold">{summary?.capacityPoints ?? 0} poin</p></div>
    </div>
    {summary?.referral && <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-900 dark:bg-slate-900"><p className="font-bold text-blue-900 dark:text-blue-200">Link Referral Saya</p><p className="mt-1 text-xs text-blue-700 dark:text-blue-300">Bagikan link ini. Saat pendaftar baru membuat akun, sponsor tercatat otomatis; node baru aktif setelah top up disetujui admin.</p><div className="mt-3 flex gap-2"><input readOnly value={referralLink} className="min-w-0 flex-1 rounded-lg border bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-800"/><button onClick={() => void navigator.clipboard.writeText(referralLink)} className="rounded-lg bg-digitalcoop-700 px-4 text-sm font-bold text-white">Salin</button></div></div>}
    <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-900">
      <div className="mb-5 flex items-center gap-3"><div className="rounded-xl bg-amber-100 p-3 text-amber-700"><Coins /></div><div><p className="font-bold">Jumlah node</p><p className="text-xs text-gray-500">Harga mengikuti versi aturan yang berlaku.</p></div></div>
      <input type="number" min={1} max={100000} value={count} onChange={(e) => setCount(Math.max(1, Math.floor(Number(e.target.value) || 1)))} className="w-full rounded-xl border p-3 dark:border-slate-700 dark:bg-slate-800" />
      <div className="mt-4 flex items-center justify-between rounded-xl bg-gray-50 p-4 dark:bg-slate-800"><span>Total</span><strong className="text-xl text-digitalcoop-700 dark:text-digitalcoop-400">{rupiah(total)}</strong></div>
      <button disabled={!summary?.simulationMode || ordering} onClick={() => void createOrder()} className="mt-4 w-full rounded-xl bg-digitalcoop-700 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{ordering ? "Membuat pesanan..." : "Buat Pesanan Uji"}</button>
      {summary?.simulationMode && <p className="mt-2 text-center text-xs text-amber-700">Mode staging: tidak ada uang sungguhan. Node aktif setelah admin menyetujui.</p>}
    </div>
    <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-900">
      <h2 className="mb-4 font-bold">Riwayat Pesanan Node</h2>
      {orders.length === 0 ? <p className="text-sm text-gray-500">Belum ada pesanan.</p> : <div className="space-y-3">{orders.map((o) => <div key={o.id} className="flex flex-wrap justify-between gap-3 rounded-xl border p-3 dark:border-slate-700"><div><p className="font-semibold">{o.nodeCount} node • {rupiah(o.amount)}</p><p className="text-xs text-gray-500">{new Date(o.createdAt).toLocaleString("id-ID")}{o.decisionNote ? ` • ${o.decisionNote}` : ""}</p></div><span className="h-fit rounded bg-gray-100 px-2 py-1 text-xs font-bold dark:bg-slate-800">{o.status}</span></div>)}</div>}
    </div>
  </div>;
}
