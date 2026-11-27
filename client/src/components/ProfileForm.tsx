import React, { useEffect, useRef, useState } from 'react';
import { User } from 'lucide-react';
import { authApi } from '../services/api';
import { notifyProfileChanged, useProfile } from '../services/profile';
import { AVATAR_MAX_BYTES, BIO_MAX, NAME_MAX } from '@shared/profile';

const inputClass =
  'w-full p-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded';
const lockedClass =
  'w-full p-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-400 rounded bg-gray-50';

const errText = (err: unknown, fallback: string): string =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

const ProfileForm: React.FC = () => {
  const { profile, reload } = useProfile();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [busyPhoto, setBusyPhoto] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!profile) return;
    setName(profile.name ?? '');
    setPhone(profile.phone ?? '');
    setBio(profile.bio ?? '');
  }, [profile]);

  if (!profile) return <p className="text-sm text-gray-500">Memuat profil...</p>;

  const linked = profile.isMember; // akun tertaut digitalcoop.id: identitas dikelola di sana

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);
    setSaving(true);
    try {
      await authApi.updateProfile({ name, bio, phone });
      setResult({ ok: true, text: 'Perubahan tersimpan.' });
      notifyProfileChanged();
    } catch (err) {
      setResult({ ok: false, text: errText(err, 'Gagal menyimpan perubahan.') });
    } finally {
      setSaving(false);
    }
  };

  const handlePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setResult(null);
    if (file.size > AVATAR_MAX_BYTES) {
      setResult({ ok: false, text: 'Ukuran foto maksimal 2 MB.' });
      return;
    }
    setBusyPhoto(true);
    try {
      await authApi.uploadAvatar(file);
      setResult({ ok: true, text: 'Foto profil diperbarui.' });
      notifyProfileChanged();
      reload();
    } catch (err) {
      setResult({ ok: false, text: errText(err, 'Gagal mengunggah foto.') });
    } finally {
      setBusyPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    setResult(null);
    setBusyPhoto(true);
    try {
      await authApi.deleteAvatar();
      setResult({ ok: true, text: 'Foto profil dihapus.' });
      notifyProfileChanged();
      reload();
    } catch (err) {
      setResult({ ok: false, text: errText(err, 'Gagal menghapus foto.') });
    } finally {
      setBusyPhoto(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="flex items-center gap-6">
        <div className="w-24 h-24 bg-gray-200 dark:bg-slate-800 rounded-full flex items-center justify-center text-gray-400 overflow-hidden">
          {profile.avatar ? (
            <img src={profile.avatar} alt="Foto profil" className="w-full h-full object-cover" />
          ) : (
            <User size={48} />
          )}
        </div>
        <div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePick} />
          <div className="flex gap-2">
            <button type="button" disabled={busyPhoto} onClick={() => fileRef.current?.click()}
              className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50">
              {busyPhoto ? 'Memproses...' : 'Ganti Foto'}
            </button>
            {profile.avatar && (
              <button type="button" disabled={busyPhoto} onClick={handleRemovePhoto}
                className="px-4 py-2 text-sm text-red-600 hover:underline disabled:opacity-50">
                Hapus
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-slate-500 mt-2">Format JPG, PNG, atau WebP. Maksimal 2 MB.</p>
        </div>
      </div>

      {linked && (
        <p className="text-sm bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded p-3 text-gray-700 dark:text-slate-300">
          Akun Anda tertaut dengan digitalcoop.id. Nama, email, dan No HP diubah di digitalcoop.id; foto dan bio dapat diubah di sini.
        </p>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Nama Lengkap</label>
          <input type="text" value={name} maxLength={NAME_MAX} disabled={linked}
            onChange={(e) => setName(e.target.value)} className={linked ? lockedClass : inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Email</label>
          <input type="email" value={profile.email ?? ''} disabled className={lockedClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">No HP</label>
          <input type="tel" value={phone} placeholder="0812 3456 789" disabled={linked}
            onChange={(e) => setPhone(e.target.value)} className={linked ? lockedClass : inputClass} />
          <p className="text-xs text-gray-500 mt-1">Dapat dipakai untuk masuk selain email.</p>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Bio Singkat</label>
          <textarea value={bio} maxLength={BIO_MAX} onChange={(e) => setBio(e.target.value)}
            className={`${inputClass} h-24`} placeholder="Ceritakan sedikit tentang diri Anda..." />
          <p className="text-xs text-gray-500 mt-1">{bio.length}/{BIO_MAX}</p>
        </div>
      </div>

      {result && (
        <p className={`text-sm ${result.ok ? 'text-green-600' : 'text-red-600'}`} role="status">{result.text}</p>
      )}
      <button type="submit" disabled={saving}
        className="px-6 py-2 bg-digitalcoop-600 text-white rounded font-medium hover:bg-digitalcoop-700 disabled:opacity-50">
        {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
      </button>
    </form>
  );
};

export default ProfileForm;
