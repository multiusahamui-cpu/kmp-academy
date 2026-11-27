export const inputClass = 'w-full p-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-digitalcoop-500 outline-none';
export const btnPrimary = 'rounded-lg bg-digitalcoop-600 px-4 py-2 text-sm font-bold text-white hover:bg-digitalcoop-700 disabled:opacity-60';
export const btnGhost = 'rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800';
export const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: 'Draf', cls: 'bg-gray-100 text-gray-700' },
  PENDING_REVIEW: { label: 'Menunggu review', cls: 'bg-amber-100 text-amber-700' },
  PUBLISHED: { label: 'Terbit', cls: 'bg-green-100 text-green-700' },
  REJECTED: { label: 'Ditolak', cls: 'bg-red-100 text-red-700' },
};
export const toIso = (localValue: string): string => (localValue ? new Date(localValue).toISOString() : '');
export const nowLocal = (offsetDays = 0): string => {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};
