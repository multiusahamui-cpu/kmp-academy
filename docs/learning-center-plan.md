# Rencana Akuisisi & Pengembangan Learning Center (academy.digitalcoop.id)

Konteks: `LEARNING-CENTER-CONTEXT.md` (root). "Akuisisi" di sini = mengambil alih (onboarding) identitas
anggota digitalcoop.id ke Academy secara aman, plus menyiapkan Academy layak produksi.

## Fase A0 — Penyamaan tech stack & standar (repo academy)
1. Cek di server: `node -v`, `psql --version`, `ss -ltnp` (port terpakai); kunci versi Node di `engines` +
   `.nvmrc`, pindah ke pnpm.
2. Naikkan dependensi ke versi digitalcoop.id (tabel di CONTEXT 8.1), satu langkah per kelompok:
   React/Vite/TS → Express/zod/bcryptjs/multer → Drizzle + drizzle-kit (migrasi API) ; typecheck + test tiap langkah.
3. `.env.example` mengikuti pola digitalcoop.id (CONTEXT 8.2) + kunci bridge; secret baru.
4. Putuskan model sesi (JWT vs session+Redis) dan data-fetching (axios vs react-query).

## Fase A1 — Adopsi core engine digitalcoop.id (repo academy)
Salin + sesuaikan + pindahkan tesnya: atur/ganti/lupa password, OTP email & perangkat, throttle login,
notifikasi in-app + email + WebSocket, broadcast superadmin, backup & restore terenkripsi + runbook,
konfigurasi sistem, log audit, guard rute, graceful shutdown (daftar file sumber di CONTEXT 8.3).

## Fase A — Fondasi keamanan Academy (repo academy)
1. `register` publik selalu `STUDENT`; peran lain hanya lewat admin. Endpoint ganti role diaudit.
2. Server menolak start bila `JWT_SECRET` / secret lain kosong; hapus nilai cadangan.
3. `users.email` boleh NULL (unik bila ada); tambah login via No HP (`phone` unik bila ada).
4. Rate limit login, helmet/CORS ketat ke `academy.digitalcoop.id`.
5. Uji: unit + integrasi auth (vitest), typecheck, lint.

## Fase B — Skema identitas & kartu (repo academy, migrasi Drizzle)
1. `academy.users` tambah: `digitalcoop_user_id` (unik, nullable), `member_number` (nomor anggota digitalcoop,
   rujukan), `kyc_status`, `wilayah`, `consent_at`, `consent_version`, `linked_at`, `last_synced_at`,
   `card_number` (unik), `card_issued_at`.
2. Tabel `academy.card_history` (riwayat kartu saat role berubah).
3. Fungsi tunggal `issueCardNumber(user)` = `PREFIX.YY.MM.NNNNNN` dari tanggal bergabung + `member_sequence`;
   dipakai `IdentityCard` dan Manajemen User (perbaiki ketidakcocokan format).
4. Uji: format nomor, prefix per role, nomor tidak berubah setelah terbit, riwayat saat ganti role.

## Fase C — Jembatan identitas di digitalcoop.id (repo garuda-superapp)
1. Portal kind `ACADEMY` (host `academy.digitalcoop.id`), menu sidebar **"Learning Center"** untuk
   `pihak_pekerja` dan `content_creator`.
2. Penerbit tiket memakai `POST /api/auth/portal/sso/tiket {portal:"ACADEMY"}` (tabel `portal_sso_tiket`).
3. Endpoint server-ke-server (bukan untuk browser), dijaga kunci antar-aplikasi + allowlist IP:
   - `POST /api/bridge/academy/tukar-tiket` → profil terbatas (id, nama, nomor anggota, email, HP, status KYC,
     wilayah, role relevan, status akun). Tiket diklaim atomik, sekali pakai.
   - `POST /api/bridge/academy/verifikasi-password` → hanya ya/tidak (untuk opsi "samakan password"),
     dengan throttle; tidak pernah mengembalikan hash.
   - `GET /api/bridge/academy/status/:id` → status akun & role terkini (untuk sinkronisasi).
4. Alur "Masuk dengan akun digitalcoop.id" dari halaman login Academy: redirect ke digitalcoop.id (login biasa
   + OTP perangkat) → kembali dengan tiket.
5. Audit log setiap penukaran tiket & verifikasi. Uji: tiket kedaluwarsa/dipakai ulang, kunci salah, role tidak
   berhak, throttle.

## Fase D — Onboarding di Academy (repo academy)
1. Halaman `/sso`: baca tiket dari fragmen, hapus dari URL, kirim ke backend Academy.
2. Backend menukar tiket ke bridge; akun sudah tertaut → login (JWT) + sinkron profil; belum → sesi onboarding
   sementara.
3. Layar persetujuan (daftar data, versi teks) → pilihan **Belajar / Creator Konten** (Creator hanya bila role
   `content_creator`) → pilihan password (samakan via bridge / baru) → akun dibuat + kartu terbit.
4. Tombol "Masuk dengan akun digitalcoop.id" di halaman login.
5. Uji end-to-end dengan mock bridge.

## Fase E — Sinkronisasi & pencabutan
1. Setiap login: panggil status bridge; perbarui profil; tutup/bekukan akses sesuai aturan
   (Pekerja dicabut → akses ditutup; `content_creator` dicabut → Creator dibekukan, kursus tetap ada).
2. Opsional: webhook dari digitalcoop.id saat role dicabut / akun diblokir.
3. Uji skenario pencabutan.

## Fase F — Deploy (server yang sama dengan digitalcoop.id)
1. DNS `academy` (awan abu-abu), `certbot certonly --nginx -d academy.digitalcoop.id`.
2. Nginx: salin konfigurasi portal stabil; frontend statis `/var/www/academy-portal` + `location /api` → port
   backend Academy (bukan backend digitalcoop).
3. pm2 proses `garuda-academy`, folder `/var/www/garuda-academy`, database & user PostgreSQL sendiri di instance
   yang sama, Redis prefix/DB berbeda, `.env` sendiri; skrip deploy sendiri (build, health check, rollback).
4. Backup DB Academy terjadwal; uji `certbot renew --dry-run`.

## Fase G — Uji terima
Pekerja baru → Learning Center → setuju → Belajar → password sama → kartu S terbit setelah kursus pertama;
Content Creator → pilih Creator → kartu C; login langsung via HP+password dan via "Masuk dengan digitalcoop.id";
cabut role di digitalcoop → akses tertutup pada login berikutnya.

## Urutan & ketergantungan
A0 → A1 → A → B (academy) dan C (superapp) dapat paralel → D → E → F → G.
Setiap fase: commit terpisah per repo, typecheck + lint + test lulus sebelum commit.
