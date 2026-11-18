import React, { useState } from 'react';
import { authApi } from '../services/api';
import { notifyProfileChanged, useProfile } from '../services/profile';

const inputClass =
  'w-full p-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded';

const errText = (err: unknown, fallback: string): string =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

/** Ganti email: password saat ini lalu kode 6 digit yang dikirim ke email baru. */
const EmailChangeForm: React.FC = () => {
  const { profile } = useProfile();
  const [step, setStep] = useState<'form' | 'code'>('form');
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  if (!profile) return null;

  if (profile.isMember) {
    return (
      <div className="max-w-md space-y-2">
        <h3 className="font-bold text-gray-900 dark:text-white">Ganti Email</h3>
        <p className="text-sm text-gray-600 dark:text-slate-300">
          Akun Anda tertaut dengan digitalcoop.id. Email diubah di digitalcoop.id.
        </p>
      </div>
    );
  }

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);
    setBusy(true);
    try {
      const res = await authApi.requestEmailChange({ newEmail, password });
      setPassword('');
      setStep('code');
      setResult({ ok: true, text: res.data?.message || 'Kode verifikasi dikirim.' });
    } catch (err) {
      setResult({ ok: false, text: errText(err, 'Gagal meminta kode.') });
    } finally {
      setBusy(false);
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);
    setBusy(true);
    try {
      await authApi.confirmEmailChange({ code });
      setResult({ ok: true, text: 'Email berhasil diganti.' });
      setStep('form');
      setNewEmail('');
      setCode('');
      notifyProfileChanged();
    } catch (err) {
      setResult({ ok: false, text: errText(err, 'Gagal memverifikasi kode.') });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md space-y-4">
      <h3 className="font-bold text-gray-900 dark:text-white">Ganti Email</h3>
      <p className="text-sm text-gray-600 dark:text-slate-300">
        Email saat ini: <strong>{profile.email || '(belum ada)'}</strong>
      </p>

      {step === 'form' ? (
        <form onSubmit={handleRequest} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Email baru</label>
            <input type="email" required autoComplete="email" className={inputClass}
              value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Password saat ini</label>
            <input type="password" required autoComplete="current-password" className={inputClass}
              value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button type="submit" disabled={busy}
            className="px-6 py-2 bg-kodman-600 text-white rounded font-medium hover:bg-kodman-700 disabled:opacity-50">
            {busy ? 'Mengirim...' : 'Kirim Kode Verifikasi'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleConfirm} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Kode 6 digit dari email baru
            </label>
            <input type="text" inputMode="numeric" pattern="\d{6}" maxLength={6} required autoComplete="one-time-code"
              className={inputClass} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={busy || code.length !== 6}
              className="px-6 py-2 bg-kodman-600 text-white rounded font-medium hover:bg-kodman-700 disabled:opacity-50">
              {busy ? 'Memeriksa...' : 'Verifikasi'}
            </button>
            <button type="button" onClick={() => { setStep('form'); setCode(''); setResult(null); }}
              className="px-4 py-2 text-sm text-gray-600 hover:underline">
              Ulangi
            </button>
          </div>
        </form>
      )}

      {result && <p className={`text-sm ${result.ok ? 'text-green-600' : 'text-red-600'}`} role="status">{result.text}</p>}
    </div>
  );
};

export default EmailChangeForm;
