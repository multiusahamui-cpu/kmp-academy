import React, { useCallback, useEffect, useState } from 'react';
import { SlidersHorizontal, Save, RotateCcw, History, Loader2, AlertTriangle } from 'lucide-react';
import type { ConfigDefinition, ConfigGroupId } from '@shared/system-config';
import { configApi } from '../../services/api';
import { refreshPublicConfig } from '../../services/publicConfig';
import { useI18n } from '../../i18n';

interface ConfigItem extends ConfigDefinition {
  value: string;
  isDefault: boolean;
  updatedAt: string | null;
  updatedByName: string | null;
}

interface ConfigGroup {
  id: ConfigGroupId;
  label: string;
  description: string;
}

interface HistoryItem {
  id: string;
  key: string;
  label: string;
  oldValue: string | null;
  newValue: string;
  changedByName: string | null;
  changedAt: string;
}

const errorMessage = (err: unknown, fallback: string): string =>
  (err as { response?: { data?: { message?: string } } }).response?.data?.message || fallback;

const formatTime = (iso: string | null, lang: string): string =>
  iso ? new Date(iso).toLocaleString(lang === 'id' ? 'id-ID' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '-';

// Tampilan nilai di riwayat: on/off dibaca Aktif/Nonaktif, kosong ditandai.
type TFn = (key: string, vars?: Record<string, string | number>) => string;
const UNIT_KEYS = ['jam', 'menit', 'karakter', 'poin'];
const unitLabel = (unit: string, t: TFn): string => (UNIT_KEYS.includes(unit) ? t(`adm6.u_${unit}`) : unit);
const displayValue = (def: Pick<ConfigDefinition, 'type' | 'unit'> | undefined, value: string | null, t: TFn): string => {
  if (value === null) return '-';
  if (def?.type === 'boolean') return value === 'on' ? t('adm6.on') : t('adm6.off');
  if (value === '') return t('adm6.empty');
  return def?.unit ? `${value} ${unitLabel(def.unit, t)}` : value;
};

const inputClass =
  'w-full px-3 py-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg focus:ring-2 focus:ring-digitalcoop-500 outline-none text-sm';

const SystemConfig: React.FC = () => {
  const { t, lang } = useI18n();
  // Teks bawaan dari server dipakai bila kunci terjemahan belum ada.
  const tr = (key: string, fallback: string): string => { const v = t(key); return v === key ? fallback : v; };
  const [groups, setGroups] = useState<ConfigGroup[]>([]);
  const [items, setItems] = useState<ConfigItem[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [rowMessage, setRowMessage] = useState<{ key: string; ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoadError('');
    try {
      const [listRes, historyRes] = await Promise.all([configApi.list(), configApi.history()]);
      const loaded: ConfigItem[] = listRes.data?.data?.items ?? [];
      setGroups(listRes.data?.data?.groups ?? []);
      setItems(loaded);
      setDrafts(Object.fromEntries(loaded.map((item) => [item.key, item.value])));
      setHistory(historyRes.data?.data ?? []);
    } catch (err) {
      setLoadError(errorMessage(err, t('adm6.loadFail')));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (item: ConfigItem, value: string) => {
    if (item.key === 'maintenance_mode' && value === 'on') {
      const ok = window.confirm(t('adm6.maintAsk'));
      if (!ok) return;
    }
    setSavingKey(item.key);
    setRowMessage(null);
    try {
      const res = await configApi.update(item.key, value);
      setRowMessage({ key: item.key, ok: true, text: res.data?.message || t('adm6.saved') });
      await Promise.all([load(), refreshPublicConfig()]);
    } catch (err) {
      setRowMessage({ key: item.key, ok: false, text: errorMessage(err, t('adm6.saveFail')) });
    } finally {
      setSavingKey(null);
    }
  };

  const renderInput = (item: ConfigItem) => {
    const draft = drafts[item.key] ?? item.value;
    const setDraft = (value: string) => setDrafts((prev) => ({ ...prev, [item.key]: value }));
    const inputId = `cfg-${item.key}`;

    if (item.type === 'boolean') {
      const isOn = draft === 'on';
      return (
        <button
          id={inputId}
          type="button"
          role="switch"
          aria-checked={isOn}
          onClick={() => setDraft(isOn ? 'off' : 'on')}
          className={`relative inline-flex h-7 w-14 items-center rounded-full transition ${isOn ? 'bg-digitalcoop-600' : 'bg-gray-300 dark:bg-slate-700'}`}
        >
          <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${isOn ? 'translate-x-8' : 'translate-x-1'}`} />
          <span className="sr-only">{tr(`adm6.${item.key}`, item.label)}</span>
        </button>
      );
    }
    if (item.type === 'integer') {
      return (
        <div className="flex items-center gap-2">
          <input
            id={inputId}
            type="number"
            inputMode="numeric"
            min={item.min}
            max={item.max}
            step={1}
            className={`${inputClass} max-w-[140px]`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          {item.unit && <span className="text-sm text-gray-500 dark:text-slate-400">{unitLabel(item.unit, t)}</span>}
        </div>
      );
    }
    if (item.type === 'longtext') {
      return (
        <textarea
          id={inputId}
          rows={2}
          maxLength={item.maxLength}
          className={inputClass}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
      );
    }
    return (
      <input
        id={inputId}
        type={item.type === 'email' ? 'email' : 'text'}
        maxLength={item.maxLength}
        className={inputClass}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
      />
    );
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-gray-500 flex items-center justify-center gap-2">
        <Loader2 size={18} className="animate-spin" /> {t('adm6.loading')}
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-3xl mx-auto p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300">
        <p className="font-bold mb-2 flex items-center gap-2"><AlertTriangle size={18} /> {loadError}</p>
        <button onClick={() => { setIsLoading(true); void load(); }} className="text-sm underline">{t('adm6.retry')}</button>
      </div>
    );
  }

  const definitionByKey = new Map(items.map((item) => [item.key, item]));

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center font-sans">
          <SlidersHorizontal className="mr-3 text-digitalcoop-600" /> {t('adm6.title')}
        </h2>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
          {t('adm6.sub')}
        </p>
      </div>

      {groups.map((group) => (
        <section key={group.id} className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white font-sans">{tr(`adm6.g${group.id}`, group.label)}</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400">{tr(`adm6.g${group.id}D`, group.description)}</p>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-slate-800">
            {items.filter((item) => item.group === group.id).map((item) => {
              const draft = drafts[item.key] ?? item.value;
              const isDirty = draft !== item.value;
              const isSaving = savingKey === item.key;
              return (
                <div key={item.key} className="px-6 py-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-start">
                  <div>
                    <label htmlFor={`cfg-${item.key}`} className="block text-sm font-bold text-gray-800 dark:text-slate-200">
                      {tr(`adm6.${item.key}`, item.label)}
                    </label>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{tr(`adm6.${item.key}D`, item.description)}</p>
                    <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-2">
                      {item.isDefault
                        ? t('adm6.defVal')
                        : t('adm6.changed', { d: formatTime(item.updatedAt, lang) }) + (item.updatedByName ? t('adm6.changedBy', { n: item.updatedByName }) : '')}
                    </p>
                  </div>
                  <div>
                    {renderInput(item)}
                    {rowMessage?.key === item.key && (
                      <p role="status" className={`text-xs mt-2 ${rowMessage.ok ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {rowMessage.text}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={!isDirty || isSaving}
                      onClick={() => void save(item, draft)}
                      className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-bold text-white bg-digitalcoop-600 hover:bg-digitalcoop-700 disabled:bg-gray-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed transition"
                    >
                      {isSaving ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Save size={14} className="mr-1" />}
                      {t('adm6.save')}
                    </button>
                    <button
                      type="button"
                      title={t('adm6.resetTip', { v: displayValue(item, item.defaultValue, t) })}
                      disabled={isSaving || (item.value === item.defaultValue && !isDirty)}
                      onClick={() => setDrafts((prev) => ({ ...prev, [item.key]: item.defaultValue }))}
                      className="inline-flex items-center px-2 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      <RotateCcw size={14} />
                      <span className="sr-only">{t('adm6.resetSr')}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <section className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white font-sans flex items-center">
            <History size={18} className="mr-2 text-gray-500" /> {t('adm6.hist')}
          </h3>
          <p className="text-xs text-gray-500 dark:text-slate-400">{t('adm6.hist100')}</p>
        </div>
        {history.length === 0 ? (
          <p className="px-6 py-6 text-sm text-gray-500 dark:text-slate-400">{t('adm6.histNone')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-6 py-3">{t('adm6.thTime')}</th>
                  <th className="px-6 py-3">{t('adm6.thParam')}</th>
                  <th className="px-6 py-3">{t('adm6.thBefore')}</th>
                  <th className="px-6 py-3">{t('adm6.thAfter')}</th>
                  <th className="px-6 py-3">{t('adm6.thBy')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {history.map((row) => {
                  const def = definitionByKey.get(row.key);
                  return (
                    <tr key={row.id}>
                      <td className="px-6 py-3 whitespace-nowrap text-gray-600 dark:text-slate-300">{formatTime(row.changedAt, lang)}</td>
                      <td className="px-6 py-3 font-bold text-gray-800 dark:text-slate-200">{tr(`adm6.${row.key}`, row.label)}</td>
                      <td className="px-6 py-3 text-gray-500 dark:text-slate-400 break-words max-w-[220px]">{displayValue(def, row.oldValue, t)}</td>
                      <td className="px-6 py-3 text-gray-800 dark:text-slate-200 break-words max-w-[220px]">{displayValue(def, row.newValue, t)}</td>
                      <td className="px-6 py-3 text-gray-600 dark:text-slate-300">{row.changedByName || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default SystemConfig;
