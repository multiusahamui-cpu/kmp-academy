import React, { useState } from "react";
import { Coins, CheckCircle2, Plus, ShieldCheck } from "lucide-react";
import { nodeProgramApi, type NodeRuleVersion, type NodeRuleInput } from "../../services/nodeProgram";
import { Card, StateBox, useAsync, rupiah, dateTimeId } from "../../components/ReportBits";
import { toast } from "../../services/toast";

const DEFAULTS: NodeRuleInput = {
  nodePrice: 50000,
  sponsorPercent: 20,
  levelPercent: 1,
  maxLevels: 10,
  pairingPercent: 15,
  dailyPointMultiplier: 16,
};

const FIELDS: { key: keyof NodeRuleInput; label: string; hint: string }[] = [
  { key: "nodePrice", label: "Harga per Node (Rp)", hint: "Harga satu node saat top up." },
  { key: "sponsorPercent", label: "Bonus Sponsor (%)", hint: "0–100" },
  { key: "levelPercent", label: "Bonus Level (%)", hint: "0–100 per level" },
  { key: "maxLevels", label: "Maks. Level", hint: "Kedalaman jenjang level" },
  { key: "pairingPercent", label: "Bonus Pairing (%)", hint: "0–100" },
  { key: "dailyPointMultiplier", label: "Pengali Poin Harian", hint: "Kapasitas poin per node/hari" },
];

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, string> = {
    ACTIVE: "bg-digitalcoop-100 text-digitalcoop-800 dark:bg-digitalcoop-900/40 dark:text-digitalcoop-200",
    DRAFT: "bg-gold-100 text-gold-800 dark:bg-gold-900/30 dark:text-gold-200",
    ARCHIVED: "bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400",
  };
  return <span className={`chip ${map[status] ?? map.ARCHIVED}`}>{status}</span>;
};

export default function NodeRuleManager() {
  const { data, loading, error, reload } = useAsync<NodeRuleVersion[]>(async () => (await nodeProgramApi.superListRules()).data.data, []);
  const [form, setForm] = useState<NodeRuleInput>(DEFAULTS);
  const [busy, setBusy] = useState<string>("");

  const rules = data ?? [];
  const active = rules.find((r) => r.status === "ACTIVE") ?? null;

  const setField = (k: keyof NodeRuleInput, v: string) =>
    setForm((f) => ({ ...f, [k]: Math.max(0, Math.floor(Number(v) || 0)) }));

  const create = async () => {
    setBusy("create");
    try {
      const r = await nodeProgramApi.superCreateRule(form);
      toast.success(r.data.message ?? "Versi aturan dibuat.");
      await reload();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Gagal membuat versi aturan.");
    } finally { setBusy(""); }
  };

  const activate = async (rule: NodeRuleVersion) => {
    setBusy(rule.id);
    try {
      const r = await nodeProgramApi.superActivateRule(rule.id);
      toast.success(r.data.message ?? "Aturan diaktifkan.");
      await reload();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Gagal mengaktifkan aturan.");
    } finally { setBusy(""); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="grid place-items-center w-11 h-11 rounded-xl bg-digitalcoop-gradient text-white shadow-digitalcoop"><Coins size={20} /></span>
        <div>
          <h1 className="font-sans text-2xl font-bold text-gray-900 dark:text-white">Aturan Program Node</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">Harga node dan persentase bonus. Hanya satu versi yang aktif pada satu waktu.</p>
        </div>
      </div>

      <Card title="Aturan aktif saat ini" right={active && <StatusBadge status="ACTIVE" />}>
        {active ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <Metric label="Harga per Node" value={rupiah(active.nodePrice)} />
            <Metric label="Bonus Sponsor" value={`${active.sponsorPercent}%`} />
            <Metric label="Bonus Pairing" value={`${active.pairingPercent}%`} />
            <Metric label="Bonus Level" value={`${active.levelPercent}% × ${active.maxLevels} level`} />
            <Metric label="Pengali Poin Harian" value={`${active.dailyPointMultiplier}`} />
            <Metric label="Versi / Berlaku" value={`#${active.version} • ${dateTimeId(active.effectiveFrom)}`} />
          </div>
        ) : (
          <div className="flex items-start gap-3 rounded-xl border border-gold-300 bg-gold-50 p-4 text-sm text-gold-800 dark:border-gold-900 dark:bg-gold-900/20 dark:text-gold-200">
            <ShieldCheck size={18} className="mt-0.5 shrink-0" />
            <p>Belum ada aturan aktif. Buat versi baru di bawah lalu <b>Aktifkan</b>, atau jalankan <code className="font-mono">pnpm db:seed-node</code> untuk aturan default. Tanpa aturan aktif, top up node belum bisa dihitung.</p>
          </div>
        )}
      </Card>

      <Card title="Buat versi aturan baru" right={<span className="text-xs text-gray-400">disimpan sebagai DRAFT</span>}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FIELDS.map((f) => (
            <label key={f.key} className="block">
              <span className="text-sm font-medium text-gray-700 dark:text-slate-300">{f.label}</span>
              <input
                type="number" min={0} inputMode="numeric"
                value={form[f.key]}
                onChange={(e) => setField(f.key, e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 bg-white p-2.5 text-sm focus:border-digitalcoop-400 dark:border-slate-700 dark:bg-slate-800"
              />
              <span className="mt-1 block text-xs text-gray-400">{f.hint}</span>
            </label>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button onClick={() => void create()} disabled={busy === "create"} className="btn-primary text-sm">
            <Plus size={16} /> {busy === "create" ? "Menyimpan..." : "Simpan sebagai DRAFT"}
          </button>
          <button onClick={() => setForm(DEFAULTS)} className="btn-ghost text-sm">Reset ke default</button>
        </div>
      </Card>

      <Card title="Riwayat versi aturan">
        <StateBox loading={loading} error={error} onRetry={reload} rows={3}>
          {rules.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500 dark:text-slate-400">Belum ada versi aturan.</p>
          ) : (
            <div className="space-y-3">
              {rules.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 p-4 dark:border-slate-800">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900 dark:text-white">Versi #{r.version}</span>
                      <StatusBadge status={r.status} />
                    </div>
                    <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                      {rupiah(r.nodePrice)}/node • sponsor {r.sponsorPercent}% • level {r.levelPercent}%×{r.maxLevels} • pairing {r.pairingPercent}% • ×{r.dailyPointMultiplier} poin
                    </p>
                  </div>
                  {r.status === "ACTIVE" ? (
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-digitalcoop-600 dark:text-digitalcoop-400"><CheckCircle2 size={16} /> Aktif</span>
                  ) : (
                    <button onClick={() => void activate(r)} disabled={busy === r.id} className="btn-gold text-sm">
                      {busy === r.id ? "Mengaktifkan..." : "Aktifkan"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </StateBox>
      </Card>
    </div>
  );
}

const Metric: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-xl bg-digitalcoop-50/60 p-4 dark:bg-slate-800/60">
    <p className="text-xs text-gray-500 dark:text-slate-400">{label}</p>
    <p className="mt-1 font-sans text-lg font-bold text-gray-900 dark:text-white">{value}</p>
  </div>
);
