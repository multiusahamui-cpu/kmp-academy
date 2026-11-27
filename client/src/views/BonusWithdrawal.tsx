import React, { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { nodeProgramApi, type NodeBonusWithdrawal } from "../services/nodeProgram";
import { userApi } from "../services/api";

const rupiah = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
type Bank = { id: string; bankName: string; accountNumber: string; holderName: string };
type Data = { balance: number; pendingAmount: number; availableAmount: number; items: NodeBonusWithdrawal[]; banks: Bank[]; simulationMode: boolean };

export default function BonusWithdrawal() {
  const [data, setData] = useState<Data | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [bankForm, setBankForm] = useState({ bankName: "", accountNumber: "", holderName: "" });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const load = useCallback(async () => { const r = await nodeProgramApi.myWithdrawals(); setData(r.data.data); }, []);
  useEffect(() => { void load().catch(() => setMessage("Pencairan bonus belum dapat dimuat.")); }, [load]);
  const submit = async () => {
    const value = Number(amount.replace(/\D/g, ""));
    if (!Number.isInteger(value) || value < 1) return setMessage("Masukkan nominal pencairan yang benar.");
    setBusy(true); setMessage("");
    if (!bankAccountId) return setMessage("Simpan dan pilih rekening bank terlebih dahulu.");
    try { const r = await nodeProgramApi.requestWithdrawal(value, bankAccountId, note || undefined); setMessage(r.data.message); setAmount(""); setNote(""); await load(); }
    catch (e: any) { setMessage(e?.response?.data?.message ?? "Permintaan pencairan gagal dibuat."); }
    finally { setBusy(false); }
  };
  if (!data) return <div className="p-8 text-center text-gray-500"><Loader2 className="mx-auto animate-spin" /></div>;
  const saveBank = async () => {
    if (!bankForm.bankName || !bankForm.accountNumber || !bankForm.holderName) return setMessage("Lengkapi nama bank, nomor rekening, dan nama pemilik.");
    setBusy(true); setMessage("");
    try { await userApi.addBankAccount(bankForm); setBankForm({ bankName: "", accountNumber: "", holderName: "" }); await load(); setMessage("Rekening berhasil disimpan. Pilih rekening tersebut untuk pencairan."); }
    catch (e: any) { setMessage(e?.response?.data?.message ?? "Rekening gagal disimpan."); }
    finally { setBusy(false); }
  };
  return <div className="mx-auto max-w-4xl space-y-6">
    <div><h1 className="text-2xl font-bold dark:text-white">Cairkan Bonus</h1><p className="text-sm text-gray-500">Ajukan pencairan dari saldo Bonus Node. Saldo berkurang setelah admin menyetujui.</p></div>
    {data.simulationMode && <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">Mode staging: persetujuan dicatat sebagai simulasi dan belum mengirim uang sungguhan.</div>}
    {message && <div className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800">{message}</div>}
    <div className="grid gap-4 sm:grid-cols-3"><Card label="Saldo bonus" value={rupiah(data.balance)} /><Card label="Sedang diproses" value={rupiah(data.pendingAmount)} /><Card label="Dapat diajukan" value={rupiah(data.availableAmount)} /></div>
    <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-900"><h2 className="font-bold">Rekening tujuan pencairan</h2><p className="mt-1 text-sm text-gray-500">Pencairan hanya dapat diajukan ke rekening bank milik anggota yang tersimpan di bawah ini.</p>{data.banks.length > 0 && <select value={bankAccountId} onChange={(e) => setBankAccountId(e.target.value)} className="mt-4 w-full rounded-xl border p-3 dark:border-slate-700 dark:bg-slate-800"><option value="">Pilih rekening tujuan</option>{data.banks.map((bank) => <option key={bank.id} value={bank.id}>{bank.bankName} — {bank.accountNumber} a.n. {bank.holderName}</option>)}</select>}<div className="mt-4 grid gap-3 rounded-xl border border-dashed p-4 dark:border-slate-700"><p className="text-sm font-bold">Tambah rekening baru</p><input value={bankForm.bankName} onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })} placeholder="Nama bank" className="rounded-xl border p-3 dark:border-slate-700 dark:bg-slate-800"/><input inputMode="numeric" value={bankForm.accountNumber} onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value.replace(/\D/g, "") })} placeholder="Nomor rekening" className="rounded-xl border p-3 dark:border-slate-700 dark:bg-slate-800"/><input value={bankForm.holderName} onChange={(e) => setBankForm({ ...bankForm, holderName: e.target.value })} placeholder="Nama pemilik rekening" className="rounded-xl border p-3 dark:border-slate-700 dark:bg-slate-800"/><button disabled={busy} onClick={() => void saveBank()} className="rounded-xl border border-digitalcoop-700 py-2 font-bold text-digitalcoop-700">Simpan Rekening</button></div></div>
    <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-900"><h2 className="font-bold">Ajukan pencairan</h2><div className="mt-4 grid gap-3"><input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} placeholder="Nominal rupiah" className="rounded-xl border p-3 dark:border-slate-700 dark:bg-slate-800"/><textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Catatan (opsional)" className="rounded-xl border p-3 dark:border-slate-700 dark:bg-slate-800"/><button disabled={busy || data.availableAmount <= 0 || !bankAccountId} onClick={() => void submit()} className="rounded-xl bg-digitalcoop-700 py-3 font-bold text-white disabled:opacity-50">{busy ? "Mengirim..." : "Ajukan Pencairan Bonus"}</button></div></div>
    <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-900"><h2 className="mb-4 font-bold">Riwayat pencairan</h2>{data.items.length === 0 ? <p className="text-sm text-gray-500">Belum ada permintaan pencairan.</p> : <div className="space-y-3">{data.items.map((item) => <div key={item.id} className="flex flex-wrap justify-between gap-3 rounded-xl border p-3 dark:border-slate-700"><div><p className="font-semibold">{rupiah(item.requestedAmount)}</p><p className="text-xs text-gray-500">{new Date(item.createdAt).toLocaleString("id-ID")}{item.decisionNote ? ` • ${item.decisionNote}` : ""}</p></div><span className="h-fit rounded bg-gray-100 px-2 py-1 text-xs font-bold dark:bg-slate-800">{item.status}</span></div>)}</div>}</div>
  </div>;
}
function Card({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-white p-5 shadow-sm dark:bg-slate-900"><p className="text-xs text-gray-500">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>; }
