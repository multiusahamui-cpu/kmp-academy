import React, { useEffect, useState } from "react";
import { Coins, Loader2, Wallet } from "lucide-react";
import { nodeProgramApi, type NodeSummary, type NodeTopupOrder } from "../services/nodeProgram";
import { toast } from "../services/toast";

const rupiah = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

export default function NodeTopUp() {
  const [summary, setSummary] = useState<NodeSummary | null>(null);
  const [count, setCount] = useState(1);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(true);
  const [ordering, setOrdering] = useState(false);
  const [pin, setPin] = useState("");
  const [orders, setOrders] = useState<NodeTopupOrder[]>([]);
  const referralLink = summary?.referral ? `${window.location.origin}/?ref=${summary.referral.code}` : "";

  const reload = async () => {
    const [s, o] = await Promise.all([nodeProgramApi.me(), nodeProgramApi.listTopups()]);
    setSummary(s.data.data); setOrders(o.data.data);
  };

  useEffect(() => {
    void reload().catch(() => toast.error("Program Node belum dapat dimuat.")).finally(() => setBusy(false));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (count < 1) return;
      void nodeProgramApi.previewTopup(count).then((r) => setTotal(r.data.data.total)).catch(() => undefined);
    }, 250);
    return () => clearTimeout(t);
  }, [count]);

  const active = summary?.programStatus === "ACTIVE";
  const balance = summary?.walletBalance ?? 0;
  const enough = total > 0 && balance >= total;

  const buy = async () => {
    if (pin.length < 4) { toast.error("Masukkan PIN transaksi digitalcoop.id Anda."); return; }
    setOrdering(true);
    try {
      const r = await nodeProgramApi.createTopup(count, pin);
      toast.success(r.data.message ?? "Node berhasil dibeli.");
      setPin("");
      await reload();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Pembelian node gagal.");
    } finally { setOrdering(false); }
  };

  if (busy) return <div className="p-8 text-center text-gray-500"><Loader2 className="mx-auto animate-spin" /></div>;

  return <div className="mx-auto max-w-3xl space-y-6">
    <div><h1 className="font-sans text-2xl font-bold text-gray-900 dark:text-white">Beli / Top Up Node</h1><p className="text-sm text-gray-500 dark:text-slate-400">Tambah node untuk mengikuti Program Node. Dibayar dari dompet Academy Anda.</p></div>

    {!active && <div className="rounded-xl border border-gold-300 bg-gold-50 p-4 text-sm text-gold-800 dark:border-gold-900 dark:bg-gold-900/20 dark:text-gold-200">Program Node belum diaktifkan oleh admin. Pembelian sementara ditutup.</div>}

    {/* Ringkasan */}
    <div className="grid gap-4 sm:grid-cols-4">
      <div className="card-surface p-5 sm:col-span-1"><p className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1"><Wallet size={13} /> Simpanan Sukarela</p><p className="mt-1 text-xl font-bold text-digitalcoop-600 dark:text-digitalcoop-400">{rupiah(balance)}</p></div>
      <div className="card-surface p-5"><p className="text-xs text-gray-500 dark:text-slate-400">Node aktif</p><p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">{summary?.activeNodes ?? 0}</p></div>
      <div className="card-surface p-5"><p className="text-xs text-gray-500 dark:text-slate-400">Tingkatan</p><p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{summary?.tier ?? "NONE"}</p></div>
      <div className="card-surface p-5"><p className="text-xs text-gray-500 dark:text-slate-400">Kapasitas harian</p><p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{summary?.capacityPoints ?? 0} poin</p></div>
    </div>

    {summary?.referral && <div className="card-surface p-5"><p className="font-bold text-digitalcoop-800 dark:text-digitalcoop-200">Link Referral Saya</p><p className="mt-1 text-xs text-gray-500 dark:text-slate-400">Bagikan link ini; sponsor tercatat otomatis saat pendaftar baru membuat akun.</p><div className="mt-3 flex gap-2"><input readOnly value={referralLink} className="min-w-0 flex-1 rounded-lg border bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-800"/><button onClick={() => { void navigator.clipboard.writeText(referralLink); toast.success("Link disalin."); }} className="btn-primary text-sm">Salin</button></div></div>}

    {/* Form beli */}
    <div className="card-surface p-6">
      <div className="mb-5 flex items-center gap-3"><div className="rounded-xl bg-gold-100 p-3 text-gold-700 dark:bg-gold-900/30 dark:text-gold-300"><Coins /></div><div><p className="font-bold text-gray-900 dark:text-white">Jumlah node</p><p className="text-xs text-gray-500 dark:text-slate-400">Harga mengikuti versi aturan yang berlaku.</p></div></div>
      <input type="number" min={1} max={100000} value={count} onChange={(e) => setCount(Math.max(1, Math.floor(Number(e.target.value) || 1)))} className="w-full rounded-xl border p-3 dark:border-slate-700 dark:bg-slate-800" />
      <div className="mt-4 flex items-center justify-between rounded-xl bg-digitalcoop-50/60 p-4 dark:bg-slate-800"><span>Total</span><strong className="text-xl text-digitalcoop-700 dark:text-digitalcoop-400">{rupiah(total)}</strong></div>
      {active && !enough && total > 0 && <p className="mt-2 text-sm text-red-600">Saldo Simpanan Sukarela tidak cukup. Top up di aplikasi digitalcoop.id dulu.</p>}
      {summary?.isMember === false && <p className="mt-2 text-sm text-red-600">Pembelian node memakai Simpanan Sukarela digitalcoop.id — khusus anggota tertaut (SSO).</p>}
      {summary?.pinSet === false && <p className="mt-2 text-sm text-gold-700 dark:text-gold-300">PIN transaksi belum dibuat. Buat PIN dulu di aplikasi digitalcoop.id.</p>}
      <div className="mt-4">
        <label className="text-sm font-medium text-gray-700 dark:text-slate-300">PIN transaksi digitalcoop.id</label>
        <input type="password" inputMode="numeric" autoComplete="off" maxLength={12} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} placeholder="••••••" className="mt-1 w-full rounded-xl border p-3 tracking-widest dark:border-slate-700 dark:bg-slate-800" />
      </div>
      <button disabled={!active || !enough || ordering || pin.length < 4} onClick={() => void buy()} className="btn-primary mt-4 w-full">{ordering ? "Memproses..." : `Beli Node — bayar dari Simpanan Sukarela`}</button>
      <p className="mt-2 text-center text-xs text-gray-500 dark:text-slate-400">Dibayar dari Simpanan Sukarela digitalcoop.id (butuh PIN transaksi). Node langsung aktif saat pembayaran sukses.</p>
    </div>

    {/* Riwayat */}
    <div className="card-surface p-6">
      <h2 className="mb-4 font-bold text-gray-900 dark:text-white">Riwayat Pembelian Node</h2>
      {orders.length === 0 ? <p className="text-sm text-gray-500 dark:text-slate-400">Belum ada pembelian.</p> : <div className="space-y-3">{orders.map((o) => <div key={o.id} className="flex flex-wrap justify-between gap-3 rounded-xl border p-3 dark:border-slate-700"><div><p className="font-semibold">{o.nodeCount} node • {rupiah(o.amount)}</p><p className="text-xs text-gray-500">{new Date(o.createdAt).toLocaleString("id-ID")}</p></div><span className="h-fit rounded bg-digitalcoop-100 px-2 py-1 text-xs font-bold text-digitalcoop-800 dark:bg-slate-800 dark:text-digitalcoop-200">{o.status}</span></div>)}</div>}
    </div>
  </div>;
}
