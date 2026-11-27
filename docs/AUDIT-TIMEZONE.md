# Audit Zona Waktu (timestamp) — KMP-ADNG Academy

Tanggal: 2026-11-27. Ringkasan temuan selisih zona waktu pada kolom `timestamp`.

## Akar masalah

- Koneksi DB **Academy** (`server/db/index.ts`) semula `new Pool({ connectionString })` **tanpa** mem-pin zona,
  sehingga mewarisi timezone server = **Asia/Jakarta**.
- Akibatnya `now()` / `defaultNow()` menulis **WIB** (naive), sedangkan Drizzle mengirim `new Date()`
  sebagai **UTC** (naive). Keduanya beda **7 jam** → semua perbandingan waktu yang mencampur keduanya meleset.
- **garuda-superapp TIDAK kena**: koneksinya mem-pin `SET TIME ZONE 'UTC'` tiap sesi (`server/db.ts`),
  jadi semua konsisten UTC dan helper `getWibAnchors` (bucket hari-WIB dari instant UTC) benar.
- Catatan: `SHOW timezone` = Asia/Jakarta yang terlihat di psql adalah sesi psql, BUKAN koneksi aplikasi.

## Perbaikan akar (diterapkan)

- `server/db/index.ts`: `new Pool({ connectionString, options: "-c timezone=UTC" })`.
  Satu perubahan ini membuat `now()`/`defaultNow()` Academy menulis UTC, konsisten dengan nilai aplikasi.
- `nodeProgramController.currentRule`: gerbang `effective_from <= now` dibuang (commit 7c89926) — tetap
  dipertahankan sebagai lapis aman.

## Dampak data lama (PERLU KEPUTUSAN)

Setelah pin UTC, nilai baru `defaultNow()` = UTC, tetapi baris LAMA (ditulis saat sesi Asia/Jakarta) = WIB,
jadi tampak **+7 jam** dibanding yang baru.
- Kolom yang ditulis aplikasi via `new Date()` (mis. `expires_at`, `deadline_at`) SUDAH UTC sejak awal — jangan disentuh.
- Hanya kolom yang diisi `defaultNow()`/DB `now()` (mis. `created_at`, `updated_at`) yang perlu dinormalkan.

Opsi:
1. Biarkan (glitch sementara pada tampilan/riwayat lama; pulih seiring data baru). Cocok bila data masih sedikit.
2. Normalisasi sekali: `UPDATE <tabel> SET created_at = created_at - interval '7 hours'` untuk kolom defaultNow,
   HANYA pada baris sebelum perbaikan. WAJIB uji di staging + backup dulu.

## Titik perbandingan timestamp (acuan)

AMAN (kedua sisi app-UTC): expiry order/OTP/reset, deadline/started ujian, diskon kursus startsAt/endsAt.
Setelah pin UTC, titik `created_at` (talent inquiry window, email-retry window, dsb.) ikut benar tanpa tambalan.
Laporan yang pakai `now() at time zone 'Asia/Jakarta'` (reportController/workshopController) perlu ditinjau ulang
setelah pin UTC karena asumsinya berubah.

## garuda-superapp

Konsisten UTC (sudah pin). Nit minor (bukan mismatch): beberapa titik pakai `new Date()+setHours` alih-alih
`getWibAnchors`, sehingga batas "harian" bisa jatuh di tengah-malam UTC, bukan WIB. Tidak merusak data; bila
ingin batas harian tepat WIB, pakai `getWibAnchors` di `wallet.ts` (batas transfer harian) dan `nominatif.ts`.
