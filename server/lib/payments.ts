// Saklar top-up dan penarikan saldo. Pembelian kursus dari dompet TIDAK bergantung pada saklar ini
// (debit atomik, tidak bisa minus). Top-up saat ini hanya simulasi tanpa pembayaran nyata, jadi tetap
// false sampai ada payment gateway (webhook terverifikasi) atau verifikasi bukti transfer oleh Admin.
export const PAYMENTS_ENABLED = false;

export const PAYMENTS_CLOSED_MESSAGE =
  "Pembayaran belum tersedia. Pembayaran kursus akan dilakukan lewat Virtual Account setelah payment gateway aktif.";
