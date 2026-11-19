import React, { useCallback, useEffect, useState } from 'react';

export const rupiah = (n: number): string =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

export const num = (n: number): string => new Intl.NumberFormat('id-ID').format(n);

export const dateId = (iso: string | null | undefined): string =>
  iso ? new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

export const dateTimeId = (iso: string | null | undefined): string =>
  iso ? new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

export const uptimeLabel = (seconds: number): string => {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return d > 0 ? `${d} hari ${h} jam` : h > 0 ? `${h} jam ${m} menit` : `${m} menit`;
};

/** Memuat data async dengan status memuat dan galat; `reload` untuk memuat ulang. */
export function useAsync<T>(fn: () => Promise<T>, deps: React.DependencyList = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(fn, deps);
  const reload = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setData(await load());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [load]);
  useEffect(() => {
    void reload();
  }, [reload]);
  return { data, loading, error, reload };
}

export const StateBox: React.FC<{ loading: boolean; error: boolean; onRetry?: () => void; children: React.ReactNode }> = ({ loading, error, onRetry, children }) => {
  if (loading) return <p className="py-12 text-center text-sm text-gray-500 dark:text-slate-400">Memuat...</p>;
  if (error)
    return (
      <div className="py-12 text-center text-sm text-red-600">
        Gagal memuat data.{' '}
        {onRetry && (
          <button onClick={onRetry} className="underline font-bold">
            Coba lagi
          </button>
        )}
      </div>
    );
  return <>{children}</>;
};

export const Card: React.FC<{ title?: string; right?: React.ReactNode; children: React.ReactNode; className?: string }> = ({ title, right, children, className = '' }) => (
  <div className={`bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 ${className}`}>
    {(title || right) && (
      <div className="flex justify-between items-center mb-4">
        {title && <h3 className="font-bold text-gray-900 dark:text-white">{title}</h3>}
        {right}
      </div>
    )}
    {children}
  </div>
);

export const Tile: React.FC<{ title: string; value: React.ReactNode; hint?: string; icon?: React.ReactNode }> = ({ title, value, hint, icon }) => (
  <div className="bg-white dark:bg-slate-900 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800">
    <div className="flex justify-between items-start">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-500 dark:text-slate-400 mb-1">{title}</p>
        <h3 className="font-sans text-2xl font-bold text-gray-900 dark:text-white break-words">{value}</h3>
      </div>
      {icon && <div className="p-2 bg-gray-50 dark:bg-slate-800 rounded-lg shrink-0">{icon}</div>}
    </div>
    {hint && <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">{hint}</p>}
  </div>
);

export interface BarItem {
  label: string;
  value: number;
  title?: string;
}

/** Diagram batang sederhana (tanpa pustaka). Tinggi dinormalisasi ke nilai terbesar; semua nol tetap tampil sebagai garis dasar. */
export const Bars: React.FC<{ items: BarItem[]; height?: number; color?: string }> = ({ items, height = 160, color = 'bg-kodman-500' }) => {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="flex items-end gap-2" style={{ height }} role="img" aria-label="Diagram batang">
      {items.map((i) => (
        <div key={i.label} className="flex-1 flex flex-col justify-end h-full group relative min-w-0" title={i.title ?? `${i.label}: ${i.value}`}>
          <div className={`${color} rounded-t-sm w-full transition-all`} style={{ height: `${Math.max(2, (i.value / max) * 100)}%` }} />
          <p className="text-[10px] text-center text-gray-500 dark:text-slate-400 mt-1 truncate">{i.label}</p>
        </div>
      ))}
    </div>
  );
};

export const Empty: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="py-8 text-center text-sm text-gray-500 dark:text-slate-400">{children}</p>
);

export const ComingSoon: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="max-w-2xl">
    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{title}</h2>
    <div className="p-6 rounded-xl border border-dashed border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-gray-600 dark:text-slate-300 space-y-2">
      <p className="font-bold text-gray-800 dark:text-white">Fitur ini belum aktif.</p>
      {children}
    </div>
  </div>
);
