// Saklar pembayaran Academy. Selama payment gateway belum aktif:
// - hanya kursus gratis (harga 0) yang bisa diikuti,
// - top-up dan penarikan saldo ditutup.
// Ubah ke true hanya setelah payment gateway terpasang dan diuji.
export const PAYMENTS_ENABLED = false;

export const PAYMENTS_CLOSED_MESSAGE =
  "Pembayaran belum tersedia. Pembayaran kursus akan dilakukan lewat Virtual Account setelah payment gateway aktif.";
