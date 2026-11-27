import React, { useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { authApi } from '../services/api';
import { usePublicConfig } from '../services/publicConfig';
import { useT } from '../i18n';

const input = 'w-full px-3 py-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg focus:ring-2 focus:ring-digitalcoop-500 outline-none';
const errText = (e: unknown, fallback: string): string => (e as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

/** Lupa password: kode 6 digit dikirim ke email terdaftar, lalu password baru. */
const ForgotPasswordForm: React.FC<{ onBack: () => void; onDone: (msg: string) => void }> = ({ onBack, onDone }) => {
  const t = useT();
  const config = usePublicConfig();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const requestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const r = await authApi.forgotPassword({ email });
      setMsg({ ok: true, text: r.data?.message ?? t('auth.fpCodeSent') });
      setStep('code');
    } catch (err) {
      setMsg({ ok: false, text: errText(err, t('auth.fpReqFail')) });
    } finally {
      setBusy(false);
    }
  };

  const reset = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await authApi.resetPassword({ email, code, newPassword: pw, confirmPassword: pw2 });
      onDone(t('auth.fpResetOk'));
    } catch (err) {
      setMsg({ ok: false, text: errText(err, t('auth.fpResetFail')) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-8 space-y-4">
      <button type="button" onClick={onBack} className="text-sm text-gray-500 hover:text-gray-800 dark:text-slate-400 inline-flex items-center gap-1"><ArrowLeft size={14} /> {t('auth.fpBack')}</button>
      <h3 className="font-bold text-lg text-gray-900 dark:text-white">{t('auth.fpTitle')}</h3>
      {step === 'email' ? (
        <form onSubmit={requestCode} className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-slate-300">{t('auth.fpEmailHint')}</p>
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@contoh.com" className={input} />
          {msg && <p role={msg.ok ? 'status' : 'alert'} className={`text-sm ${msg.ok ? 'text-green-700' : 'text-red-700'}`}>{msg.text}</p>}
          <button disabled={busy} type="submit" className="w-full py-3 bg-digitalcoop-600 text-white rounded-lg font-bold disabled:opacity-50 inline-flex items-center justify-center">{busy ? <Loader2 size={18} className="animate-spin" /> : t('auth.fpSendCode')}</button>
        </form>
      ) : (
        <form onSubmit={reset} className="space-y-4">
          {msg && <p role={msg.ok ? 'status' : 'alert'} className={`text-sm ${msg.ok ? 'text-green-700' : 'text-red-700'}`}>{msg.text}</p>}
          <input inputMode="numeric" required pattern="\d{6}" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder={t('auth.fpCodePlaceholder')} autoComplete="one-time-code" className={input} />
          <input type="password" required minLength={config.passwordMinLength} autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder={t('auth.fpNewPw', { n: config.passwordMinLength })} className={input} />
          <input type="password" required autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder={t('auth.fpRepeatPw')} className={input} />
          <button disabled={busy} type="submit" className="w-full py-3 bg-digitalcoop-600 text-white rounded-lg font-bold disabled:opacity-50 inline-flex items-center justify-center">{busy ? <Loader2 size={18} className="animate-spin" /> : t('auth.fpChangePw')}</button>
          <button type="button" disabled={busy} onClick={() => { setStep('email'); setMsg(null); setCode(''); }} className="text-sm text-digitalcoop-600 font-bold">{t('auth.fpResend')}</button>
        </form>
      )}
      <p className="text-center text-xs text-gray-500 dark:text-slate-400">{t('auth.fpSpam', { email: config.supportEmail })}</p>
    </div>
  );
};

export default ForgotPasswordForm;
