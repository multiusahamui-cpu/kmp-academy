import React, { useState } from "react";
import { Coins, CheckCircle2, Plus, ShieldCheck } from "lucide-react";
import { nodeProgramApi, type NodeRuleVersion, type NodeRuleInput } from "../../services/nodeProgram";
import { Card, StateBox, useAsync, rupiah, dateTimeId } from "../../components/ReportBits";
import { toast } from "../../services/toast";
import { useI18n } from "../../i18n";

const DEFAULTS: NodeRuleInput = {
  nodePrice: 50000,
  sponsorPercent: 20,
  levelPercent: 1,
  maxLevels: 10,
  pairingPercent: 15,
  dailyPointMultiplier: 16,
};

const FIELDS: { key: keyof NodeRuleInput; label: string; hint: string }[] = [
  { key: "nodePrice", label: "adm5.nrNodePrice", hint: "adm5.nrNodePriceH" },
  { key: "sponsorPercent", label: "adm5.nrSponsor", hint: "" },
  { key: "levelPercent", label: "adm5.nrLevel", hint: "adm5.nrLevelH" },
  { key: "maxLevels", label: "adm5.nrMax", hint: "adm5.nrMaxH" },
  { key: "pairingPercent", label: "adm5.nrPair", hint: "" },
  { key: "dailyPointMultiplier", label: "adm5.nrMult", hint: "adm5.nrMultH" },
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
  const { t } = useI18n();
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
      toast.success(r.data.message ?? t("adm5.nrCreated"));
      await reload();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? t("adm5.nrCreateFail"));
    } finally { setBusy(""); }
  };

  const activate = async (rule: NodeRuleVersion) => {
    setBusy(rule.id);
    try {
      const r = await nodeProgramApi.superActivateRule(rule.id);
      toast.success(r.data.message ?? t("adm5.nrActivated"));
      await reload();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? t("adm5.nrActFail"));
    } finally { setBusy(""); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="grid place-items-center w-11 h-11 rounded-xl bg-digitalcoop-gradient text-white shadow-digitalcoop"><Coins size={20} /></span>
        <div>
          <h1 className="font-sans text-2xl font-bold text-gray-900 dark:text-white">{t('adm5.nrTitle')}</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">{t('adm5.nrSub')}</p>
        </div>
      </div>

      <Card title={t('adm5.nrActiveCard')} right={active && <StatusBadge status="ACTIVE" />}>
        {active ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <Metric label={t('adm5.nrMPrice')} value={rupiah(active.nodePrice)} />
            <Metric label={t('adm5.nrMSponsor')} value={`${active.sponsorPercent}%`} />
            <Metric label={t('adm5.nrMPair')} value={`${active.pairingPercent}%`} />
            <Metric label={t('adm5.nrMLevel')} value={t('adm5.nrMLevelV', { p: active.levelPercent, n: active.maxLevels })} />
            <Metric label={t('adm5.nrMMult')} value={`${active.dailyPointMultiplier}`} />
            <Metric label={t('adm5.nrMVer')} value={`#${active.version} • ${dateTimeId(active.effectiveFrom)}`} />
          </div>
        ) : (
          <div className="flex items-start gap-3 rounded-xl border border-gold-300 bg-gold-50 p-4 text-sm text-gold-800 dark:border-gold-900 dark:bg-gold-900/20 dark:text-gold-200">
            <ShieldCheck size={18} className="mt-0.5 shrink-0" />
            <p>{t('adm5.nrNoActive').split(/(<b>.*?<\/b>|<code>.*?<\/code>)/).map((s, i) => s.startsWith('<b>') ? <b key={i}>{s.slice(3, -4)}</b> : s.startsWith('<code>') ? <code key={i} className="font-mono">{s.slice(6, -7)}</code> : s)}</p>
          </div>
        )}
      </Card>

      <Card title={t('adm5.nrNew')} right={<span className="text-xs text-gray-400">{t('adm5.nrDraftNote')}</span>}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FIELDS.map((f) => (
            <label key={f.key} className="block">
              <span className="text-sm font-medium text-gray-700 dark:text-slate-300">{t(f.label)}</span>
              <input
                type="number" min={0} inputMode="numeric"
                value={form[f.key]}
                onChange={(e) => setField(f.key, e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 bg-white p-2.5 text-sm focus:border-digitalcoop-400 dark:border-slate-700 dark:bg-slate-800"
              />
              <span className="mt-1 block text-xs text-gray-400">{f.hint ? t(f.hint) : '0–100'}</span>
            </label>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button onClick={() => void create()} disabled={busy === "create"} className="btn-primary text-sm">
            <Plus size={16} /> {busy === "create" ? t("adm5.nrSaving") : t("adm5.nrSaveDraft")}
          </button>
          <button onClick={() => setForm(DEFAULTS)} className="btn-ghost text-sm">{t('adm5.nrReset')}</button>
        </div>
      </Card>

      <Card title={t('adm5.nrHistory')}>
        <StateBox loading={loading} error={error} onRetry={reload} rows={3}>
          {rules.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500 dark:text-slate-400">{t('adm5.nrNone')}</p>
          ) : (
            <div className="space-y-3">
              {rules.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 p-4 dark:border-slate-800">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900 dark:text-white">{t('adm5.nrVer', { n: r.version })}</span>
                      <StatusBadge status={r.status} />
                    </div>
                    <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                      {t('adm5.nrSummary', { p: rupiah(r.nodePrice), s: r.sponsorPercent, l: r.levelPercent, m: r.maxLevels, a: r.pairingPercent, x: r.dailyPointMultiplier })}
                    </p>
                  </div>
                  {r.status === "ACTIVE" ? (
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-digitalcoop-600 dark:text-digitalcoop-400"><CheckCircle2 size={16} /> {t('adm5.nrIsActive')}</span>
                  ) : (
                    <button onClick={() => void activate(r)} disabled={busy === r.id} className="btn-gold text-sm">
                      {busy === r.id ? t("adm5.nrActivating") : t("adm5.nrActivate")}
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
