# Uji Terima Fase G — KMP-ADNG Academy

Skenario dari `docs/learning-center-plan.md` (Fase G), dijalankan di lingkungan nyata (academy.digitalcoop.id
dan digitalcoop.id). Logika Academy-nya sudah diuji otomatis terhadap digitalcoop.id tiruan (30 pengecekan lulus);
uji ini memastikan **sambungan nyata** antara kedua sistem bekerja.

## Prasyarat
- Endpoint jembatan di digitalcoop.id aktif: `POST /api/bridge/academy/tukar`, `POST /api/bridge/academy/verifikasi-password`,
  `GET /api/bridge/academy/status/:id` (dan dompet: lihat `docs/SPEC-BRIDGE-DOMPET-DIGITALCOOP.md`).
- `.env` Academy: `DIGITALCOOP_BRIDGE_URL`, `DIGITALCOOP_BRIDGE_KEY` (≥ 32 karakter, sama dengan di digitalcoop.id).
- Menu "KMP-ADNG Academy" di digitalcoop.id menerbitkan tiket dan mengarahkan ke academy.digitalcoop.id.
- Nginx academy: fallback SPA (`try_files ... /index.html`) agar `/sso` dan `/verify` bisa dibuka langsung.
- Siapkan tiga akun uji di digitalcoop.id: **A** Pihak Pekerja biasa, **B** Pihak Pekerja + role Content Creator,
  **C** akun tanpa role Pekerja/Content Creator.

## Skenario
| # | Langkah | Hasil yang diharapkan |
|---|---------|-----------------------|
| 1 | Akun **A**: buka menu KMP-ADNG Academy di digitalcoop.id | Tiba di halaman persetujuan; data (nama, no. anggota, email, HP, KYC, wilayah) benar; pilihan Creator **tidak** tersedia |
| 2 | Setuju, peran Student, "pakai password digitalcoop.id yang sama" (isi password salah dulu) | Password salah ditolak; password benar → akun dibuat dan langsung masuk; kartu Student **belum** ada (tampil bayangan) |
| 3 | Daftar kursus pertama (gratis/kode 100%) | Kartu `S.YY.MM.NNNNNN` terbit; notifikasi "Kartu Student Anda terbit" muncul di lonceng |
| 4 | Keluar, masuk langsung di academy.digitalcoop.id dengan **No HP + password** lalu dengan **email + password** | Keduanya berhasil |
| 5 | Keluar, klik "Masuk dengan digitalcoop.id" dari digitalcoop.id | Langsung masuk tanpa halaman persetujuan |
| 6 | Akun **B**: menu Academy → pilih peran Creator, password baru | Kartu `C.YY.MM.NNNNNN` terbit langsung; menu Creator tampil |
| 7 | Akun **C**: buka menu Academy / coba login | Ditolak dengan pesan "khusus role Pihak Pekerja atau Content Creator" |
| 8 | Di digitalcoop.id **cabut role Content Creator** akun B, lalu B login ke Academy | Ditolak: "akun Creator dibekukan"; kursus B tetap ada dan terbit |
| 9 | Di digitalcoop.id **cabut role Pekerja** akun A, lalu A login (HP+password dan SSO) | Keduanya ditolak |
| 10 | Pulihkan role A di digitalcoop.id, A login | Berhasil lagi |
| 11 | (Opsional) matikan sementara jembatan digitalcoop.id, A login dengan password | Login tetap berhasil (Academy tidak ikut mati); SSO menampilkan pesan "tidak dapat dihubungi" |

## Verifikasi di database (VPS)
```
psql "$DATABASE_URL" -c "select name, role, status, card_number, digitalcoop_user_id, consent_at, last_synced_at from academy.users order by created_at desc limit 10;"
psql "$DATABASE_URL" -c "select user_id, card_number, event, created_at from academy.card_history order by created_at desc limit 10;"
```
Yang dicari: `consent_at` terisi, `card_number` Student kosong sebelum kursus pertama, `last_synced_at` ikut baru setiap login.

## Perilaku yang perlu diketahui
- Pencabutan role berlaku **pada login berikutnya**. Sesi yang sedang aktif tetap berjalan sampai habis
  (`login_session_hours` di Konfigurasi Sistem). Bila ingin pencabutan berlaku seketika, perlu webhook dari
  digitalcoop.id (opsional pada rencana Fase E) atau pengecekan berkala saat sesi berjalan.
- Bila jembatan tidak dapat dihubungi, login password tetap diizinkan dan peringatan dicatat di log pm2.
- Akun tertaut yang sudah tidak ditemukan di digitalcoop.id (404) ditolak.
