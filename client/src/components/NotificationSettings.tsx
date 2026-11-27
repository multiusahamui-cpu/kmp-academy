import React, { useEffect, useState } from "react";
import { Lock, Mail } from "lucide-react";
import { NOTIFICATION_CATEGORIES, STAFF_ROLES, type NotificationCategory } from "@shared/notifications";
import { NotificationSettingsDto, notificationsApi } from "../services/notifications";
import { useT } from "../i18n";

interface Props {
  role: string;
}

const Switch: React.FC<{ checked: boolean; disabled?: boolean; onChange: (v: boolean) => void; label: string }> = ({ checked, disabled, onChange, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${checked ? "bg-digitalcoop-600" : "bg-gray-300 dark:bg-slate-600"} ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
  >
    <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
  </button>
);

const NotificationSettings: React.FC<Props> = ({ role }) => {
  const t = useT();
  const [settings, setSettings] = useState<NotificationSettingsDto | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const isStaff = STAFF_ROLES.includes(role);

  useEffect(() => {
    notificationsApi.getSettings().then(setSettings).catch(() => setLoadError(true));
  }, []);

  if (loadError) return <p className="text-sm text-red-600">{t('acct.nsLoadFail')}</p>;
  if (!settings) return <p className="text-sm text-gray-500 dark:text-slate-400">{t('acct.nsLoading')}</p>;

  const persist = async (next: { mutedCategories: NotificationCategory[]; notifyEmail: boolean }) => {
    const before = settings;
    setSettings({ ...settings, ...next });
    setSaving(true);
    setMessage(null);
    try {
      setSettings(await notificationsApi.saveSettings(next));
      setMessage({ ok: true, text: t('acct.nsSaved') });
    } catch (err: any) {
      setSettings(before);
      setMessage({ ok: false, text: err?.response?.data?.message ?? t('acct.nsSaveFail') });
    } finally {
      setSaving(false);
    }
  };

  const toggleCategory = (id: NotificationCategory, on: boolean) => {
    const muted = on ? settings.mutedCategories.filter((c) => c !== id) : [...settings.mutedCategories, id];
    void persist({ mutedCategories: muted, notifyEmail: settings.notifyEmail });
  };

  return (
    <div className="max-w-2xl space-y-8">
      <section>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('acct.nsInApp')}</h3>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{t('acct.nsInAppDesc')}</p>
        <ul className="mt-4 divide-y divide-gray-100 dark:divide-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl">
          {NOTIFICATION_CATEGORIES.filter((c) => !c.staffOnly || isStaff).map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1.5">
                  {t(`acct.nc.${c.id}.label`)}
                  {c.locked && <Lock size={13} className="text-gray-400" aria-label={t('acct.nsAlways')} />}
                </p>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{t(`acct.nc.${c.id}.desc`)}</p>
              </div>
              <Switch
                label={t(`acct.nc.${c.id}.label`)}
                checked={c.locked || !settings.mutedCategories.includes(c.id)}
                disabled={c.locked || saving}
                onChange={(on) => toggleCategory(c.id, on)}
              />
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2"><Mail size={18} /> {t('acct.nsEmail')}</h3>
        <div className="mt-3 flex items-center justify-between gap-4 p-4 border border-gray-200 dark:border-slate-700 rounded-xl">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white">{t('acct.nsEmailAlso')}</p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
              {t('acct.nsEmailDesc')}
            </p>
            {!settings.emailAvailable && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">{t('acct.nsEmailOff')}</p>
            )}
          </div>
          <Switch
            label={t('acct.nsSendEmail')}
            checked={settings.notifyEmail}
            disabled={saving || (!settings.emailAvailable && !settings.notifyEmail)}
            onChange={(on) => void persist({ mutedCategories: settings.mutedCategories, notifyEmail: on })}
          />
        </div>
      </section>

      {message && <p role="status" className={`text-sm ${message.ok ? "text-green-600" : "text-red-600"}`}>{message.text}</p>}
    </div>
  );
};

export default NotificationSettings;
