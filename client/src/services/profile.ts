import { useCallback, useEffect, useState } from 'react';
import { authApi } from './api';

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string | null;
  joinedAt?: string | null;
  cardNumber?: string | null;
  cardIssuedAt?: string | null;
  isMember: boolean;
  phone?: string | null;
  bio?: string | null;
}

export const PROFILE_CHANGED_EVENT = 'academy:profile-changed';

/** Dipanggil setelah sesuatu yang mengubah profil/kartu (mis. enroll kursus pertama). */
export const notifyProfileChanged = (): void => {
  window.dispatchEvent(new Event(PROFILE_CHANGED_EVENT));
};

/** Profil pengguna yang sedang login (nama, tanggal bergabung, kartu), selalu dari server. */
export const useProfile = (): { profile: Profile | null; reload: () => void } => {
  const [profile, setProfile] = useState<Profile | null>(null);

  const reload = useCallback(() => {
    authApi
      .getProfile()
      .then((res) => setProfile(res.data?.data ?? null))
      .catch(() => setProfile(null));
  }, []);

  useEffect(() => {
    reload();
    window.addEventListener(PROFILE_CHANGED_EVENT, reload);
    return () => window.removeEventListener(PROFILE_CHANGED_EVENT, reload);
  }, [reload]);

  return { profile, reload };
};
