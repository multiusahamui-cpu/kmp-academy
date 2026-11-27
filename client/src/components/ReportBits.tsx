import React, { useCallback, useEffect, useState } from 'react';
import { Inbox, AlertTriangle, RotateCw } from 'lucide-react';
import { Skeleton } from './Skeleton';

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

export const StateBox: React.FC<{ loading: boolean; error: boolean; onRetry?: () => void; rows?: number; children: React.ReactNode }> = ({ loading, error, onRetry, rows = 4, children }) => {
  if (loading)
    return (
      <div className="py-4 space-y-3" aria-busy="true" aria-live="polite">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    );
  if (error)
    return (
      <div className="py-12 flex flex-col items-center gap-3 text-center">
        <span className="grid place-items-center w-12 h-12 rounded-full bg-red-50 dark:bg-red-900/30 text-red-500">
          <AlertTriangle size={22} />
        </span>
        <p className="text-sm text-gray-600 dark:text-slate-300">Gagal memuat data.</p>
        {onRetry && (
          <button onClick={onRetry} className="btn-ghost text-sm">
            <RotateCw size={15} /> Coba lagi
          </button>
        )}
      </div>
    );
  return <>{children}</>;
};

export const Card: React.FC<{ title?: string; right?: React.ReactNode; children: React.ReactNode; className?: string }> = ({ title, right, children, className = '' }) => (
  <div className={`card-surface p-6 ${className}`}>
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
  <div className="card-surface p-5 transition hover:shadow-md hover:-translate-y-0.5">
    <div className="flex justify-between items-start">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-500 dark:text-slate-400 mb-1">{title}</p>
        <h3 className="font-sans text-2xl font-bold text-gray-900 dark:text-white break-words">{value}</h3>
      </div>
      {icon && <div className="p-2 bg-digitalcoop-50 dark:bg-slate-800 text-digitalcoop-600 dark:text-digitalcoop-400 rounded-lg shrink-0">{icon}</div>}
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
export const Bars: React.FC<{ items: BarItem[]; height?: number; color?: string }> = ({ items, height = 160, color = 'bg-digitalcoop-500' }) => {
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

export const Empty: React.FC<{ children: React.ReactNode; icon?: React.ReactNode }> = ({ children, icon }) => (
  <div className="py-10 flex flex-col items-center gap-2 text-center">
    <span className="grid place-items-center w-12 h-12 rounded-full bg-digitalcoop-50 dark:bg-slate-800 text-digitalcoop-500">
      {icon ?? <Inbox size={22} />}
    </span>
    <p className="text-sm text-gray-500 dark:text-slate-400 max-w-xs">{children}</p>
  </div>
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
