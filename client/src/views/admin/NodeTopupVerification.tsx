import React, { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { nodeProgramApi } from "../../services/nodeProgram";
import { useT } from "../../i18n";

const rupiah = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
type Item = { id: string; userName: string; userEmail: string; nodeCount: number; nodePrice: number; amount: number; status: string; paymentReference: string | null; decisionNote: string | null; createdAt: string };
const tabs = ["VERIFYING", "SETTLED", "REJECTED", "ALL"];

export default function NodeTopupVerification() {
  const t = useT();
  const [tab, setTab] = useState("VERIFYING");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [reference, setReference] = useState<Record<string, string>>({});
  const [note, setNote] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await nodeProgramApi.adminListTopups(tab); setItems(r.data.data.items); }
    catch (e: any) { setNotice(e?.response?.data?.message ?? t('adm.loadQueueFail')); }
    finally { setLoading(false); }
  }, [tab, t]);
  useEffect(() => { void load(); }, [load]);

  const decide = async (item: Item, decision: "APPROVE" | "REJECT") => {
    setBusy(item.id); setNotice("");
    try {
      const payload = decision === "APPROVE"
        ? { decision, reference: reference[item.id] || "SIMULASI-STAGING", note: note[item.id] || undefined } as const
        : { decision, note: note[item.id] || "Ditolak dalam pengujian staging" } as const;
      const r = await nodeProgramApi.adminDecideTopup(item.id, payload);
      setNotice(r.data.message); await load();
    } catch (e: any) { setNotice(e?.response?.data?.message ?? t('adm.decideFail')); }
    finally { setBusy(""); }
  };

  return <div className="mx-auto max-w-5xl space-y-6">
    <div><h1 className="text-2xl font-bold dark:text-white">{t('adm.ntTitle')}</h1><p className="text-sm text-gray-500">{t('adm.ntSub')}</p></div>
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">{t('adm.ntSim')}</div>
    <div className="flex flex-wrap gap-2">{tabs.map((tb) => <button key={tb} onClick={() => setTab(tb)} className={`rounded-full px-4 py-2 text-sm ${tab === tb ? "bg-digitalcoop-700 text-white" : "bg-gray-100 dark:bg-slate-800"}`}>{tb}</button>)}</div>
    {notice && <div className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800">{notice}</div>}
    {loading ? <Loader2 className="mx-auto animate-spin" /> : items.length === 0 ? <div className="rounded-xl border border-dashed p-10 text-center text-gray-500">{t('adm.ntNone')}</div> : <div className="space-y-3">{items.map((it) => <div key={it.id} className="rounded-xl bg-white p-5 shadow-sm dark:bg-slate-900">
      <div className="flex flex-wrap justify-between gap-3"><div><p className="font-bold">{it.userName} <span className="text-xs font-normal text-gray-400">{it.userEmail}</span></p><p className="text-sm">{t('adm.ntItem', { n: it.nodeCount, p: rupiah(it.nodePrice) })}</p><p className="text-xs text-gray-500">{new Date(it.createdAt).toLocaleString("id-ID")}</p></div><div className="text-right"><p className="text-lg font-bold text-digitalcoop-700">{rupiah(it.amount)}</p><span className="text-xs font-bold">{it.status}</span></div></div>
      {it.status === "VERIFYING" && <div className="mt-4 grid gap-3 md:grid-cols-2"><input value={reference[it.id] ?? ""} onChange={(e) => setReference({ ...reference, [it.id]: e.target.value })} placeholder={t('adm.refPh')} className="rounded-lg border p-2 dark:bg-slate-800"/><input value={note[it.id] ?? ""} onChange={(e) => setNote({ ...note, [it.id]: e.target.value })} placeholder={t('adm.notePh')} className="rounded-lg border p-2 dark:bg-slate-800"/><div className="flex gap-2 md:col-span-2"><button disabled={busy === it.id} onClick={() => void decide(it, "APPROVE")} className="rounded-lg bg-green-600 px-4 py-2 font-bold text-white disabled:opacity-50">{t('adm.ntApprove')}</button><button disabled={busy === it.id} onClick={() => void decide(it, "REJECT")} className="rounded-lg bg-red-600 px-4 py-2 font-bold text-white disabled:opacity-50">{t('adm.reject')}</button></div></div>}
      {it.decisionNote && <p className="mt-2 text-xs text-gray-500">{t('adm.noteLbl', { n: it.decisionNote })}</p>}
    </div>)}</div>}
  </div>;
}
