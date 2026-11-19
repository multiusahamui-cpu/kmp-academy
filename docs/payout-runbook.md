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
- Sertifikat: PDF dibuat server saat terbit dan disimpan di R2 PUBLIK `certificates/<nomor-huruf-kecil>.pdf`; database hanya menyimpan URL di `certificates.pdf_url`. Sertifikat lama atau yang gagal dibuat dilengkapi otomatis saat pemilik membuka daftar sertifikatnya. Bila berkas di R2 hilang, kosongkan `pdf_url` baris terkait (`update academy.certificates set pdf_url = null where ...`) agar dibuat ulang. Nama dengan huruf di luar Latin-1 tampil sebagai `?` di PDF.
- Setelah deploy: `pnpm db:migrate` sampai 0027 (termasuk Industry Hub), cek job `payout-posting` di System Cron Jobs, pastikan SMTP dan R2 privat terkonfigurasi, isi `KYC_ENCRYPTION_KEY` di .env server, buat cadangan baru.

## KYC (R2 privat)
- Foto KTP dan selfie: R2 PRIVAT, prefix `kyc/<userId>/`. Sama seperti bukti bayar, restore database tidak memulihkan berkas: sertakan prefix ini di cadangan bucket dan jangan beri lifecycle kedaluwarsa.
- NIK dienkripsi AES-256-GCM dengan `KYC_ENCRYPTION_KEY` (64 hex, buat dengan `openssl rand -hex 32`) di `.env` server. Simpan kunci di tempat TERPISAH dari cadangan database. Kunci hilang = NIK tidak dapat dibaca lagi. Tanpa kunci, fitur KYC mengembalikan 503.
- Pembukaan foto/NIK oleh Admin tercatat di `kyc_access_log`. Admin Sistem saja yang dapat membukanya.
- Tombol "Ambil data KYC dari digitalcoop.id" butuh endpoint di repo garuda-superapp: lihat `docs/SPEC-BRIDGE-KYC-DIGITALCOOP.md`.
- Industry Hub (`/talent`): hosting frontend harus mengembalikan index.html untuk path `/talent/*` (sama seperti `/verify`). Profil publik hanya tampil bila Student KYC-verified dan memberi persetujuan PDP.
