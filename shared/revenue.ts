// Pembagian hasil penjualan kursus. Murni (tanpa database), dipakai server dan klien.

export interface RevenueSplit {
  /** Persentase Creator yang dipakai (0-100). */
  percent: number;
  creator: number;
  platform: number;
}

/**
 * Bagian Creator dibulatkan ke bawah (rupiah utuh); sisanya untuk Lembaga, sehingga creator + platform = jumlah dibayar.
 * Persentase di luar 0-100 atau bukan bilangan bulat dijepit ke rentang itu.
 */
export const splitRevenue = (amountPaid: number, creatorPercent: number): RevenueSplit => {
  const amount = Number.isFinite(amountPaid) && amountPaid > 0 ? Math.floor(amountPaid) : 0;
  const percent = Number.isFinite(creatorPercent) ? Math.min(100, Math.max(0, Math.round(creatorPercent))) : 0;
  const creator = Math.floor((amount * percent) / 100);
  return { percent, creator, platform: amount - creator };
};
