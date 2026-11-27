// Masuk dari digitalcoop.id (menu "KMP-ADNG Academy"): academy.digitalcoop.id/sso#t=<tiket>.
// Akun tertaut → langsung masuk. Belum → persetujuan penyalinan identitas, pilihan peran, pilihan password.
import React, { useEffect, useRef, useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import api from '../services/api';
import { UserRole, toUserRole } from '../types';

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
      setError('Tautan masuk tidak lengkap. Buka lagi dari menu KMP-ADNG Academy di digitalcoop.id.');
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
        <Loader2 className="animate-spin" size={20} /> Menghubungkan akun digitalcoop.id...
      </div>
    );
  }
  if (state === 'gagal' || !ob) {
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <p className="mb-4 text-red-600">{error}</p>
        <div className="flex justify-center gap-3">
          <a href={DIGITALCOOP_ACADEMY} className="rounded-lg bg-digitalcoop-600 px-4 py-2 text-sm font-bold text-white">
            Kembali ke digitalcoop.id
          </a>
          <button type="button" onClick={onCancel} className="rounded-lg border px-4 py-2 text-sm">
            Login di Academy
          </button>
        </div>
      </div>
    );
  }

  const baris: [string, string | null][] = [
    ['Nama', ob.data.nama],
    ['Nomor anggota', ob.data.nomorAnggota],
    ['Email', ob.data.email],
    ['No HP', ob.data.phone],
    ['Status KYC', ob.data.kycStatus],
    ['Wilayah', ob.data.wilayah],
  ];

  return (
    <form onSubmit={kirim} className="mx-auto max-w-xl space-y-5 p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <ShieldCheck className="text-digitalcoop-600" /> Selamat datang di KMP-ADNG Academy
        </h1>
        <p className="text-sm text-gray-500">Akun Academy Anda akan dibuat dan ditautkan ke akun digitalcoop.id.</p>
      </div>

      <section className="rounded-xl border p-4">
        <p className="mb-2 font-semibold">1. Persetujuan penyalinan data</p>
        <p className="mb-2 text-sm text-gray-600">Data berikut disalin dari digitalcoop.id dan dipakai untuk profil, kartu identitas, dan sertifikat Anda:</p>
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
        <p className="mb-2 text-xs text-gray-500">NIK, foto KTP, saldo, dan password digitalcoop.id tidak disalin. Versi persetujuan {ob.consentVersion}.</p>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={setuju} onChange={(e) => setSetuju(e.target.checked)} className="mt-1" data-testid="cb-setuju" />
          Saya menyetujui penyalinan data di atas ke KMP-ADNG Academy.
        </label>
      </section>

      <section className="rounded-xl border p-4">
        <p className="mb-2 font-semibold">2. Apa tujuan Anda?</p>
        <label className="mb-1 flex items-center gap-2 text-sm">
          <input type="radio" checked={peran === 'STUDENT'} onChange={() => setPeran('STUDENT')} /> Belajar (mengikuti kursus)
        </label>
        <label className={`flex items-center gap-2 text-sm ${ob.bolehCreator ? '' : 'text-gray-400'}`}>
          <input type="radio" disabled={!ob.bolehCreator} checked={peran === 'CREATOR'} onChange={() => setPeran('CREATOR')} /> Menjadi Creator
          Konten (membuat & menjual kursus)
        </label>
        {!ob.bolehCreator && (
          <p className="mt-1 text-xs text-gray-500">Peran Creator khusus pemegang role Content Creator. Ajukan role itu di digitalcoop.id terlebih dahulu.</p>
        )}
      </section>

      <section className="rounded-xl border p-4">
        <p className="mb-2 font-semibold">3. Password Academy</p>
        <label className="mb-1 flex items-center gap-2 text-sm">
          <input type="radio" checked={modePassword === 'SAMA'} onChange={() => setModePassword('SAMA')} /> Samakan dengan password digitalcoop.id
        </label>
        <label className="mb-2 flex items-center gap-2 text-sm">
          <input type="radio" checked={modePassword === 'BARU'} onChange={() => setModePassword('BARU')} /> Buat password baru
        </label>
        <input
          type="password"
          required
          autoComplete={modePassword === 'SAMA' ? 'current-password' : 'new-password'}
          minLength={modePassword === 'BARU' ? ob.passwordMinLength : undefined}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={modePassword === 'SAMA' ? 'Ketik password digitalcoop.id Anda' : `Password baru (min. ${ob.passwordMinLength} karakter)`}
          className="w-full rounded-lg border px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-gray-500">Setelah ini password Academy berdiri sendiri; mengganti salah satu tidak mengubah yang lain.</p>
        {ob.perluEmail && (
          <div className="mt-3">
            <label className="text-sm font-medium">Email (wajib, untuk OTP lupa password)</label>
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
          {busy && <Loader2 size={18} className="mr-2 animate-spin" />} Setuju & buat akun Academy
        </button>
        <a href={DIGITALCOOP_ACADEMY} className="rounded-lg border px-4 py-3 text-sm">
          Batal
        </a>
      </div>
    </form>
  );
};

export default DigitalcoopSso;
