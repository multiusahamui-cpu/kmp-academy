import { useSyncExternalStore } from 'react';
import { DEFAULT_PUBLIC_CONFIG, type PublicConfig } from '@shared/system-config';
import { configApi } from './api';

// Konfigurasi publik dari server (GET /api/config/public). Sebelum termuat —
// atau bila server tak terjangkau — dipakai nilai bawaan dari shared/system-config.ts.
let current: PublicConfig = DEFAULT_PUBLIC_CONFIG;
let started = false;
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Memuat ulang konfigurasi publik dari server (dipanggil juga setelah Superadmin menyimpan). */
export const refreshPublicConfig = async (): Promise<void> => {
  try {
    const res = await configApi.getPublic();
    const data = res.data?.data;
    if (data && typeof data === 'object') {
      current = { ...DEFAULT_PUBLIC_CONFIG, ...(data as Partial<PublicConfig>) };
      listeners.forEach((listener) => listener());
    }
  } catch {
    // Biarkan nilai terakhir; aplikasi tetap jalan dengan nilai bawaan.
  }
};

export const usePublicConfig = (): PublicConfig => {
  if (!started) {
    started = true;
    void refreshPublicConfig();
  }
  return useSyncExternalStore(subscribe, () => current);
};
