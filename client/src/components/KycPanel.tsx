import React, { useState } from 'react';
import { CheckCircle, Clock, Fingerprint, User, XCircle } from 'lucide-react';
import { apiMessage } from '../services/classes';
import { kycApi, type MyKyc } from '../services/kyc';
import { useT } from '../i18n';

const MAX = 5 * 1024 * 1024;
const ACCEPT = 'image/jpeg,image/png,image/webp';
const input = 'w-full p-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded';

/** Verifikasi identitas: foto KTP dan selfie dikirim ke penyimpanan privat, hanya Admin Sistem yang dapat membukanya. */
const KycPanel: React.FC<{ kyc: MyKyc; onChanged: () => void }> = ({ kyc, onChanged }) => {
  const t = useT();
  const [nik, setNik] = useState('');
  const [fullName, setFullName] = useState('');
  const [ktp, setKtp] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const run = async (fn: () => Promise<void>, fail: string) => {
    setBusy(true);
    setMsg('');
    try { await fn(); onChanged(); } catch (e) { setMsg(apiMessage(e, fail)); } finally { setBusy(false); }
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ktp || !selfie) return setMsg(t('acct.kyPick'));
    if (ktp.size > MAX || selfie.size > MAX) return setMsg(t('acct.kySize'));
    void run(() => kycApi.submit({ nik, fullName, ktp, selfie }), t('acct.kySubmitFail'));
  };

  if (!kyc.ready) return <p className="text-sm text-amber-700">{t('acct.kyNA')}</p>;
  if (kyc.status === 'VERIFIED') {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-8 text-center">
        <CheckCircle size={40} className="mx-auto text-green-600 mb-3" />
        <h4 className="text-xl font-bold text-green-800 dark:text-green-300 mb-1">{t('acct.kyVerified')}</h4>
        <p className="text-green-700 dark:text-green-400 text-sm">{kyc.fullName} · NIK {kyc.nikMasked}{kyc.source === 'DIGITALCOOP' ? t('acct.kyCopied') : ''}</p>
      </div>
    );
  }
  if (kyc.status === 'PENDING') {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-8 text-center">
        <Clock size={40} className="mx-auto text-yellow-600 mb-3" />
        <h4 className="text-xl font-bold text-yellow-800 dark:text-yellow-300 mb-1">{t('acct.kyPending')}</h4>
        <p className="text-yellow-700 dark:text-yellow-400 text-sm">{t('acct.kyPendingNote')}</p>
      </div>
    );
  }
  return (
    <div className="space-y-5">
      {kyc.exempt && (
        <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm dark:text-slate-200">
          <p className="font-bold mb-1">{t('acct.kyExempt1')}</p>
          <p className="mb-3">{t('acct.kyExempt2')}</p>
          <button disabled={busy} onClick={() => void run(() => kycApi.importDigitalcoop(), t('acct.kyImportFail'))} className="px-4 py-2 bg-digitalcoop-600 text-white rounded font-bold disabled:opacity-50">{t('acct.kyImport')}</button>
        </div>
      )}
      {kyc.status === 'REJECTED' && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-sm flex gap-2 text-red-800 dark:text-red-300">
          <XCircle size={18} className="shrink-0 mt-0.5" /><p><b>{t('acct.kyRejected')}</b> {kyc.rejectNote} {t('acct.kyResend')}</p>
        </div>
      )}
      {kyc.linked && !kyc.exempt && (
        <button disabled={busy} onClick={() => void run(() => kycApi.importDigitalcoop(), t('acct.kyImportFail'))} className="text-sm font-bold text-digitalcoop-600">{t('acct.kyTryImport')}</button>
      )}
      <form onSubmit={submit} className="space-y-5">
        <div className="grid md:grid-cols-2 gap-6">
          <label className="border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-lg p-6 text-center hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer block">
            <Fingerprint className="mx-auto text-gray-400 mb-3" size={40} />
            <p className="font-bold text-gray-700 dark:text-slate-300 text-sm">{t('acct.kyIdPhoto')}</p>
            <p className="text-xs text-gray-500 mt-1">{ktp ? ktp.name : t('acct.kyFileHint')}</p>
            <input type="file" accept={ACCEPT} className="hidden" onChange={(e) => setKtp(e.target.files?.[0] ?? null)} />
          </label>
          <label className="border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-lg p-6 text-center hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer block">
            <User className="mx-auto text-gray-400 mb-3" size={40} />
            <p className="font-bold text-gray-700 dark:text-slate-300 text-sm">{t('acct.kySelfie')}</p>
            <p className="text-xs text-gray-500 mt-1">{selfie ? selfie.name : t('acct.kyFileHint')}</p>
            <input type="file" accept={ACCEPT} className="hidden" onChange={(e) => setSelfie(e.target.files?.[0] ?? null)} />
          </label>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{t('acct.kyNik')}</label>
          <input required value={nik} onChange={(e) => setNik(e.target.value)} inputMode="numeric" maxLength={19} className={`${input} font-mono`} placeholder={t('acct.kyNikPh')} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{t('acct.kyName')}</label>
          <input required value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={150} className={input} />
        </div>
        <p className="text-xs text-gray-500">{t('acct.kyPrivacy')}</p>
        <button type="submit" disabled={busy} className="px-6 py-2 bg-digitalcoop-600 text-white rounded font-bold hover:bg-digitalcoop-700 shadow-md disabled:opacity-50">{t('acct.kySubmit')}</button>
      </form>
      {msg && <p role="alert" className="text-sm text-red-600">{msg}</p>}
    </div>
  );
};

export default KycPanel;
