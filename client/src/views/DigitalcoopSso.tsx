// Masuk dari digitalcoop.id (menu "KMP-ADNG Academy"): academy.digitalcoop.id/sso#t=<tiket>.
// Akun tertaut → langsung masuk. Belum → persetujuan penyalinan identitas, pilihan peran, pilihan password.
import React, { useEffect, useRef, useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import api from '../services/api';
import { UserRole, toUserRole } from '../types';
import { useT } from '../i18n';

const DIGITALCOOP_ACADEMY = 'https://digitalcoop.id/member/academy';

interface Onboarding {
  data: { nama: string; nomorAnggota: string | null; email: string | null; phone: string | null; kycStatus: string; wilayah: string | null };
  perluEmail: boolean;
  bolehCreator: boolean;
  consentVersion: string;
  passwordMinLength: number;
}

const pesan = (e: unknown) =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Terjadi kesalahan. Coba lagi.';


const DigitalcoopSso: React.FC<{ onDone: (role: UserRole) => void; onCancel: () => void }> = ({ onDone, onCancel }) => {
  const t = useT();
  const [state, setState] = useState<'memuat' | 'onboarding' | 'gagal'>('memuat');
  const [error, setError] = useState('');
  const [ob, setOb] = useState<Onboarding | null>(null);
  const [setuju, setSetuju] = useState(false);
  const [peran, setPeran] = useState<'STUDENT' | 'CREATOR'>('STUDENT');
  const [modePassword, setModePassword] = useState<'SAMA' | 'BARU'>('SAMA');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const tiket = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('t') ?? '';
    // Tiket langsung dihapus dari alamat (tidak tersimpan di riwayat / tidak terkirim sebagai Referer).
    window.history.replaceState(null, '', '/sso');
    if (!tiket) {
      setError(t('sso.incompleteLink'));
      setState('gagal');
      return;
    }
    (async () => {
      try {
        const r = await api.post('/auth/digitalcoop/sso', { tiket });
        const role = toUserRole(r.data?.data?.user?.role);
        if (role) return onDone(role);
        const o = await api.get('/auth/digitalcoop/onboarding');
        setOb(o.data?.data as Onboarding);
        setState('onboarding');
      } catch (e) {
        setError(pesan(e));
        setState('gagal');
      }
    })();
  }, [onDone]);

  const kirim = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const r = await api.post('/auth/digitalcoop/onboarding', {
        setuju: true,
        peran,
        modePassword,
        password,
        email: ob?.perluEmail ? email : undefined,
      });
      const role = toUserRole(r.data?.data?.user?.role);
      if (role) onDone(role);
    } catch (err) {
      setError(pesan(err));
    } finally {
      setBusy(false);
    }
  };

  if (state === 'memuat') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-2 text-gray-500">
        <Loader2 className="animate-spin" size={20} /> {t('sso.connecting')}
      </div>
    );
  }
  if (state === 'gagal' || !ob) {
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <p className="mb-4 text-red-600">{error}</p>
        <div className="flex justify-center gap-3">
          <a href={DIGITALCOOP_ACADEMY} className="rounded-lg bg-digitalcoop-600 px-4 py-2 text-sm font-bold text-white">
            {t('sso.backToDc')}
          </a>
          <button type="button" onClick={onCancel} className="rounded-lg border px-4 py-2 text-sm">
            {t('sso.loginAtAcademy')}
          </button>
        </div>
      </div>
    );
  }

  const baris: [string, string | null][] = [
    [t('sso.rowName'), ob.data.nama],
    [t('sso.rowMember'), ob.data.nomorAnggota],
    [t('sso.rowEmail'), ob.data.email],
    [t('sso.rowPhone'), ob.data.phone],
    [t('sso.rowKyc'), ob.data.kycStatus],
    [t('sso.rowRegion'), ob.data.wilayah],
  ];

  return (
    <form onSubmit={kirim} className="mx-auto max-w-xl space-y-5 p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <ShieldCheck className="text-digitalcoop-600" /> {t('sso.welcome')}
        </h1>
        <p className="text-sm text-gray-500">{t('sso.welcomeSub')}</p>
      </div>

      <section className="rounded-xl border p-4">
        <p className="mb-2 font-semibold">{t('sso.step1Title')}</p>
        <p className="mb-2 text-sm text-gray-600">{t('sso.step1Desc')}</p>
        <table className="mb-3 w-full text-sm">
          <tbody>
            {baris.map(([k, v]) => (
              <tr key={k}>
                <td className="py-0.5 pr-3 text-gray-500">{k}</td>
                <td className="py-0.5">{v || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mb-2 text-xs text-gray-500">{t('sso.notCopied', { v: ob.consentVersion })}</p>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={setuju} onChange={(e) => setSetuju(e.target.checked)} className="mt-1" data-testid="cb-setuju" />
          {t('sso.agree')}
        </label>
      </section>

      <section className="rounded-xl border p-4">
        <p className="mb-2 font-semibold">{t('sso.step2Title')}</p>
        <label className="mb-1 flex items-center gap-2 text-sm">
          <input type="radio" checked={peran === 'STUDENT'} onChange={() => setPeran('STUDENT')} /> {t('sso.goalStudent')}
        </label>
        <label className={`flex items-center gap-2 text-sm ${ob.bolehCreator ? '' : 'text-gray-400'}`}>
          <input type="radio" disabled={!ob.bolehCreator} checked={peran === 'CREATOR'} onChange={() => setPeran('CREATOR')} /> {t('sso.goalCreator')}
        </label>
        {!ob.bolehCreator && (
          <p className="mt-1 text-xs text-gray-500">{t('sso.creatorNote')}</p>
        )}
      </section>

      <section className="rounded-xl border p-4">
        <p className="mb-2 font-semibold">{t('sso.step3Title')}</p>
        <label className="mb-1 flex items-center gap-2 text-sm">
          <input type="radio" checked={modePassword === 'SAMA'} onChange={() => setModePassword('SAMA')} /> {t('sso.pwSame')}
        </label>
        <label className="mb-2 flex items-center gap-2 text-sm">
          <input type="radio" checked={modePassword === 'BARU'} onChange={() => setModePassword('BARU')} /> {t('sso.pwNew')}
        </label>
        <input
          type="password"
          required
          autoComplete={modePassword === 'SAMA' ? 'current-password' : 'new-password'}
          minLength={modePassword === 'BARU' ? ob.passwordMinLength : undefined}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={modePassword === 'SAMA' ? t('sso.pwSamePlaceholder') : t('sso.pwNewPlaceholder', { n: ob.passwordMinLength })}
          className="w-full rounded-lg border px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-gray-500">{t('sso.pwNote')}</p>
        {ob.perluEmail && (
          <div className="mt-3">
            <label className="text-sm font-medium">{t('sso.emailReq')}</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm" />
          </div>
        )}
      </section>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={!setuju || busy || !password}
          className="flex flex-1 items-center justify-center rounded-lg bg-digitalcoop-600 py-3 font-bold text-white disabled:bg-digitalcoop-400"
          data-testid="btn-onboarding"
        >
          {busy && <Loader2 size={18} className="mr-2 animate-spin" />} {t('sso.submitCreate')}
        </button>
        <a href={DIGITALCOOP_ACADEMY} className="rounded-lg border px-4 py-3 text-sm">
          {t('common.cancel')}
        </a>
      </div>
    </form>
  );
};

export default DigitalcoopSso;
