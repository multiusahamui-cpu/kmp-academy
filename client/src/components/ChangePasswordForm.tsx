import React, { useState } from 'react';
import { authApi } from '../services/api';
import { usePublicConfig } from '../services/publicConfig';
import { useT } from '../i18n';

const ChangePasswordForm: React.FC = () => {
  const t = useT();
  const { passwordMinLength } = usePublicConfig();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);
    if (newPassword.length < passwordMinLength) {
      setResult({ ok: false, text: t('acct.cpMin', { n: passwordMinLength }) });
      return;
    }
    if (newPassword !== confirmPassword) {
      setResult({ ok: false, text: t('acct.cpMismatch') });
      return;
    }
    setIsSaving(true);
    try {
      await authApi.changePassword({ currentPassword, newPassword, confirmPassword });
      setResult({ ok: true, text: t('acct.cpOk') });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setResult({ ok: false, text: msg || t('acct.cpFail') });
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass =
    'w-full p-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded';

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4">
      <h3 className="font-bold text-gray-900 dark:text-white">{t('acct.cpTitle')}</h3>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{t('acct.cpCurrent')}</label>
        <input type="password" autoComplete="current-password" required className={inputClass}
          value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{t('acct.cpNew')}</label>
        <input type="password" autoComplete="new-password" required className={inputClass}
          value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        <p className="text-xs text-gray-500 mt-1">{t('acct.cpMinHint', { n: passwordMinLength })}</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{t('acct.cpRepeat')}</label>
        <input type="password" autoComplete="new-password" required className={inputClass}
          value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
      </div>
      {result && (
        <p className={`text-sm ${result.ok ? 'text-green-600' : 'text-red-600'}`}>{result.text}</p>
      )}
      <button type="submit" disabled={isSaving}
        className="px-4 py-2 bg-digitalcoop-600 text-white rounded font-bold text-sm hover:bg-digitalcoop-700 disabled:opacity-50">
        {isSaving ? t('acct.pfSaving') : t('acct.cpSave')}
      </button>
    </form>
  );
};

export default ChangePasswordForm;
