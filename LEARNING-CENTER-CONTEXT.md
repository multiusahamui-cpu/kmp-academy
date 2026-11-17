# Learning Center (academy.digitalcoop.id) — Latar Belakang & Deskripsi

Dokumen konteks untuk pengembangan integrasi KMP-ADNG Academy dengan aplikasi induk digitalcoop.id.
Disusun 16 Nov 2026. Rencana kerja rinci: `docs/learning-center-plan.md`.

## 1. Latar belakang

- **digitalcoop.id** (repo `D:\app\garuda-superapp`) adalah super app koperasi digital KMP-ADNG: keanggotaan,
  KYC, Dompet, jurnal GL otomatis, dan role "5 Pihak" (Konsumen, Pekerja, IT Provider, Pengusaha, Investor)
  beserta role turunannya (mis. `content_creator` turunan Pihak Pekerja).
- Aplikasi induk sudah memiliki 8 domain/portal: digitalcoop.id, admin, pengurus, personalia, keuangan,
  operasional, loker, finance (semuanya `*.digitalcoop.id`, sertifikat Let's Encrypt per subdomain).
- Portal Loker dan Portal Finance memakai pola **dua arah**: login langsung di portal, atau masuk otomatis (SSO)
  dari menu di aplikasi induk dengan **tiket sekali pakai 60 detik** (`POST /api/auth/portal/sso/tiket`,
  hanya hash SHA-256 tiket yang disimpan, tiket dikirim lewat fragmen URL `#t=`). Kedua portal itu berbagi
  backend & database dengan digitalcoop.id.
- **KMP-ADNG Academy** (repo ini, `D:\app\garuda-academy`) adalah LMS **terpisah**: frontend React 18 + Vite
  (root), backend Express + Drizzle + PostgreSQL (`backend-academy`, skema DB `academy`, port bawaan 3000),
  login JWT. Status: setengah jadi, satu commit awal.

## 2. Tujuan

Menjadikan Academy sebagai **Learning Center** anggota KMP-ADNG — upskilling, pelatihan, kursus online, dan
belajar mandiri — khususnya untuk **Pihak Pekerja** dan turunannya **Content Creator**, di subdomain
`academy.digitalcoop.id`, dengan repo, backend, frontend, dan database tersendiri. Dari digitalcoop.id Academy
hanya meminjam **nama subdomain** dan **identitas anggota** (bukan database, bukan cookie sesi).

## 3. Deskripsi alur (keputusan pemilik)

1. **Pintu masuk.** Anggota dengan role Pihak Pekerja (termasuk Content Creator) melihat menu
   **"Learning Center"** di sidebar digitalcoop.id. Klik → tiket sekali pakai → `academy.digitalcoop.id/sso#t=…`.
   Backend Academy menukar tiket ke API digitalcoop.id secara **server-ke-server** (kunci antar-aplikasi di
   `.env` kedua sisi) dan menerima identitas anggota. Browser tidak membawa data pribadi.
2. **Kunjungan pertama — salin identitas dengan persetujuan.** Layar persetujuan (UU PDP) menampilkan data yang
   disalin: nama, nomor anggota/KTA, email, No HP, status KYC, wilayah, role. **Tidak** disalin: NIK utuh,
   foto KTP, saldo, hash password. Setuju → dibuat akun di `academy.users`, ditautkan lewat
   `digitalcoop_user_id`; waktu & versi persetujuan dicatat. Menolak → tidak ada data disimpan.
3. **Pilihan peran.** Sistem bertanya: **"Anda ingin Belajar atau menjadi Creator Konten?"**
   - Belajar → role `STUDENT`.
   - Creator Konten → role `CREATOR`, **hanya** bila anggota memegang role `content_creator` di digitalcoop.id
     (sumber kebenaran role); bila belum, diarahkan mengajukan role itu di digitalcoop.id.
   - MENTOR, ADMIN_SYSTEM, SUPERADMIN, DIRECTOR adalah peran internal Academy, diberikan di dalam Academy.
4. **Pilihan password** (kunjungan pertama): "Samakan dengan password digitalcoop.id" (anggota mengetik password
   digitalcoop sekali, Academy memverifikasinya ke API digitalcoop lalu menyimpan hash bcrypt **miliknya
   sendiri**) atau "Buat password baru". Setelah itu kedua password berdiri sendiri.
5. **Login langsung (opsional, kapan saja)** di academy.digitalcoop.id: email/No HP + password Academy, atau
   tombol **"Masuk dengan akun digitalcoop.id"**.
6. **ID & kartu identitas** mengikuti aturan Academy (`components/IdentityCard.tsx`):
   `PREFIX.YY.MM.NNNNNN` — prefix A (SUPERADMIN/ADMIN_SYSTEM/DIRECTOR), C (CREATOR), M (MENTOR), S (STUDENT);
   YY.MM = bulan bergabung; NNNNNN = `member_sequence` (identity, satu counter untuk semua role).
   ID Academy **berbeda** dari ID/nomor anggota digitalcoop (nomor anggota hanya disimpan sebagai rujukan).
7. **Sinkronisasi.** digitalcoop.id = sumber kebenaran identitas & role. Setiap login: profil disegarkan dan
   status dicek. Role Pekerja/`content_creator` dicabut/dibekukan, akun diblokir, atau anggota keluar → akses
   ditutup/dibekukan sesuai peran; riwayat belajar, nomor kartu, dan sertifikat tetap tersimpan.

## 4. Prinsip & batasan

- Sistem keuangan-adjacent: auditabilitas dan keamanan identitas di atas kecepatan.
- Jangan pernah menyalin hash password digitalcoop; jangan berbagi database atau cookie.
- Cookie sesi digitalcoop.id dibuat **tanpa** atribut `domain` (host-only) — jangan diubah menjadi
  `.digitalcoop.id`, agar cookie anggota tidak terkirim ke subdomain repo lain.
- Kunci antar-aplikasi dan secret hanya di `.env`, tidak pernah di repo atau chat.

## 5. Temuan di kode Academy saat ini (wajib dibereskan sebelum produksi)

1. `authController.register` menerima `role` dari body → siapa pun bisa mendaftar sebagai ADMIN/MENTOR.
2. `JWT_SECRET` jatuh ke `"default_secret"` bila `.env` kosong → token bisa dipalsukan.
3. `users.email` wajib & unik, padahal sebagian anggota tidak punya email → login juga harus bisa via No HP.
4. Format nomor kartu di `views/admin/UserManagement.tsx` (`PREFIX.YY.NNNNNN`, tahun berjalan) berbeda dari
   `IdentityCard.tsx` (`PREFIX.YY.MM.NNNNNN`, tanggal bergabung); nomor dihitung ulang setiap tampil sehingga
   berubah bila role berubah → bekukan di kolom `card_number` saat terbit.
5. Port bawaan backend 3000 — ganti ke port khusus Academy (lihat bagian 7) agar tidak bentrok di server yang sama.

## 6. Keputusan terbuka

- Apakah satu akun boleh punya lebih dari satu role (mis. Creator juga ikut kursus sebagai Student)?
- Port final backend Academy dan versi Node.js/PostgreSQL produksi (dicek di server).
- Model sesi Academy: tetap JWT atau pindah ke session + Redis seperti digitalcoop.id.

## 7. Lingkungan berjalan: berdampingan dengan digitalcoop.id

- Academy dijalankan **di server yang sama** dengan digitalcoop.id (VPS produksi), tetapi terpisah penuh:
  - **port backend sendiri** (bukan port backend digitalcoop.id maupun port dev portal 5174–5180); usul `5100`,
    final ditetapkan setelah cek `ss -ltnp` di server;
  - proses **pm2 sendiri** (`garuda-academy`), folder sendiri (mis. `/var/www/garuda-academy`), build frontend
    di `/var/www/academy-portal`;
  - **database & user PostgreSQL sendiri** pada instance PostgreSQL yang sama, skema `academy`;
  - Redis boleh instance yang sama tetapi **prefix key / nomor DB berbeda**;
  - nginx: server block `academy.digitalcoop.id` (disalin dari konfigurasi portal yang sudah stabil, lalu
    `location /api` diarahkan ke port Academy), sertifikat Let's Encrypt sendiri.
- Deploy memakai skrip sendiri (pola `deploy-production.sh` digitalcoop.id: build, health check, rollback),
  **bukan** skrip digitalcoop.id.

## 8. Standar dari digitalcoop.id yang diadopsi

### 8.1 Tech stack disamakan dengan digitalcoop.id (per 16 Nov 2026)

| Komponen | digitalcoop.id | Academy saat ini |
|---|---|---|
| Node.js | versi yang dipakai server produksi (cek `node -v`; satu runtime untuk kedua aplikasi) | belum dikunci |
| Package manager | pnpm (`--frozen-lockfile`) | npm |
| PostgreSQL | instance server produksi (cek `psql --version`); uji lokal PostgreSQL 16 | - |
| React / React DOM | ^18.3.1 | ^18.2.0 |
| Vite / @vitejs/plugin-react | ^6.4.2 / ^4.7.0 | ^5.1.4 / ^4.2.1 |
| TypeScript | 5.6.3 | ^5.2.2 |
| Express | ^4.21.2 | ^4.18.2 |
| Drizzle ORM / drizzle-kit | ^0.45.2 / ^0.31.10 | ^0.29.3 / ^0.20.14 |
| pg | ^8.23.0 | ^8.11.3 |
| Tailwind CSS | ^3.4.17 | ^3.4.1 |
| Vitest / ESLint | ^4.1.0 / ^9.39.4 | ^4.1.5 / ^9.39.4 |
| Zod | ^3.24.2 | ^3.22.4 |
| bcryptjs | ^3.0.3 | ^2.4.3 |
| multer | ^2.5.0 | ^1.4.5-lts.1 |
| Data fetching / routing | @tanstack/react-query ^5, wouter ^3 | axios + react-router-dom ^6 |
| Sesi | express-session + connect-redis ^9 + redis ^5 | JWT (jsonwebtoken) |
| Build backend | esbuild bundle ESM (`"type": "module"`) | tsc |

Catatan: upgrade drizzle 0.29 → 0.45 dan drizzle-kit 0.20 → 0.31 mengubah API (`drizzle-kit generate`,
`push`, konfigurasi `dialect`); lakukan sebagai langkah tersendiri dengan typecheck + test. Pilihan
routing/data-fetching dan model sesi (JWT vs session) diputuskan di Fase A0 — tidak wajib dipindah bila
justru menambah risiko.

### 8.2 `.env` standar (salin **nama dan pola**, isi nilai baru)

Disalin dari pola `.env.example` digitalcoop.id: `NODE_ENV`, `PORT`, `LOG_LEVEL`, `DATABASE_URL`,
`REDIS_URL`, `SESSION_SECRET` (atau `JWT_SECRET`), `ALLOWED_ORIGINS`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`,
`SMTP_PASSWORD`, `SMTP_FROM`, `SMTP_SECURE`, `BACKUP_ENCRYPTION_KEY`, kredensial penyimpanan berkas (R2), plus
khusus Academy: `DIGITALCOOP_BRIDGE_URL`, `DIGITALCOOP_BRIDGE_KEY`.
Aturan: **semua secret dibuat baru untuk Academy** (tidak memakai ulang secret digitalcoop.id), SMTP boleh
akun yang sama, `.env` tidak pernah di-commit; yang di-commit hanya `.env.example` tanpa nilai.

### 8.3 Core engine yang diadopsi dari digitalcoop.id (sudah teruji di produksi)

Disalin lalu disesuaikan (bukan di-import lintas repo), dengan tes ikut dipindahkan:
- **Keamanan akun:** atur & ganti password, lupa password, OTP email (`server/lib/email-otp.ts`), throttle login
  (`server/lib/auth-throttle.ts`), pengenalan perangkat + OTP perangkat baru / >3 bulan
  (`server/member-security.ts`, `shared/device-otp.ts`), PIN bila nanti ada transaksi.
- **Notifikasi:** notifikasi in-app realtime + email (`server/security-notify.ts`, template `server/lib/email`),
  WebSocket untuk notifikasi realtime.
- **Superadmin:** broadcast pengumuman ke pengguna, **backup & restore terenkripsi**
  (`server/backup-system-service.ts`, `server/backup-encryption.ts`, `server/routes/backup-system.ts`,
  `scripts/backup-pg-encrypted.sh`, runbook `docs/BACKUP_RESTORE_RUNBOOK.md`), konfigurasi sistem
  (`server/routes/system-config.ts`), log audit.
- **Infrastruktur:** guard rute (`server/lib/route-guards.ts`), graceful shutdown, timeout fetch default,
  pagination, sanitasi dokumen HTML (`server/lib/html-document.ts`).
