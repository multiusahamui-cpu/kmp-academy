# Runbook Pencairan Bagi Hasil

## Jadwal
- Posting otomatis tanggal 25 tiap bulan (job `payout-posting`, cek tiap 30 menit, hanya bertindak tanggal 25 WIB).
- Periode: tanggal 25 bulan lalu 00:00 WIB sampai 24 bulan berjalan. Transaksi tanggal 25 masuk saldo baru.
- Posting pertama (25 Nov 2026) mencakup semua transaksi sejak awal. Tidak ada data lama untuk dimigrasi.
- Pembagian: kursus mandiri 70/30 (Creator/Lembaga). Workshop/rombel 60/25/15 (pemilik materi/Mentor/Lembaga).

## Alur
1. Sistem memposting batch (POSTED). Admin dapat memposting manual bila perlu.
2. Direktur menyetujui (APPROVED) atau membatalkan (VOID, transaksi masuk posting berikutnya).
3. Admin mentransfer manual ke rekening penerima (rekening terbaru di layar Dompet, bukan dompet elektronik).
4. Admin mencatat nomor referensi dan WAJIB mengunggah bukti bayar (JPG/PNG/WebP/PDF, maks 5 MB).
5. Bukti masuk inbox penerima dan dikirim ke email. Penerima hilang dari layar "Berjalan" dan tampil di tab "Arsip pembayaran".
6. Bila email gagal (SMTP belum diatur), gunakan "Kirim ulang email" di Arsip.
7. Semua penerima PAID menjadikan batch COMPLETED.

## Data permanen
- `payout_batches` dan `payout_payees` adalah catatan keuangan permanen dan dipertahankan saat restore.
- Bukti bayar disimpan di R2 bucket PRIVAT, prefix `payout-proofs/`. Restore database TIDAK memulihkan berkas.
  Jangan beri lifecycle kedaluwarsa pada prefix ini, dan sertakan dalam replikasi/cadangan bucket.
- Akses bukti: Admin/Direktur, atau penerima untuk bukti miliknya sendiri (via server, tidak ada URL publik).

## Catatan
- Sertifikat saat ini berupa baris DB yang dirender di klien, bukan berkas R2. Menyimpan PDF sertifikat di R2 adalah pekerjaan terpisah.
- Setelah deploy: `pnpm db:migrate` sampai 0024, cek job `payout-posting` di System Cron Jobs, pastikan SMTP dan R2 privat terkonfigurasi, buat cadangan baru.
