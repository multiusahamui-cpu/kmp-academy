import React from "react";

/** Blok skeleton tunggal. Pakai className untuk ukuran (mis. "h-4 w-32"). */
export const Skeleton: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`skeleton ${className}`} aria-hidden="true" />
);

/** Kartu kursus/skeleton grid — meniru bentuk kartu agar pergeseran layout minim. */
export const CardSkeleton: React.FC = () => (
  <div className="card-surface overflow-hidden flex flex-col">
    <Skeleton className="h-44 w-full rounded-none" />
    <div className="p-5 space-y-3">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <div className="flex justify-between pt-3">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  </div>
);

/** Baris skeleton untuk tabel/daftar. */
export const RowSkeleton: React.FC<{ cols?: number }> = ({ cols = 4 }) => (
  <div className="flex items-center gap-4 py-3">
    {Array.from({ length: cols }).map((_, i) => (
      <Skeleton key={i} className={`h-4 ${i === 0 ? "w-40" : "flex-1"}`} />
    ))}
  </div>
);

export default Skeleton;
