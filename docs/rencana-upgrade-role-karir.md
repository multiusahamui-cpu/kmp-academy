# Rencana: Upgrade Role dan Karir (Industry Hub) yang nyata

Status temuan (19 Nov 2026): tab "Upgrade Role", tab "Karir" dan toggle Job Seeker di Profil masih mock.
`handleApplyRole` hanya menampilkan `alert`; toggle Job Seeker hanya `useState`. Sisi Admin sudah ada
(`GET /admin/applications`, `POST /admin/applications/:id/decision`: menyetujui mengubah role, menerbitkan kartu, mengirim notifikasi),
dan layar Admin `views/admin/RoleApplications.tsx` sudah ada, tetapi tidak ada kode yang membuat baris `role_applications` dari sisi pemohon.

## Bagian A: Upgrade Role (dikerjakan dulu, kecil, risiko rendah)
Keputusan yang perlu dari pemilik produk (ditandai ?):
- ? Syarat KYC: Student non-SSO wajib KYC Academy berstatus VERIFIED; anggota digitalcoop.id yang KYC-nya `completed` dianggap memenuhi. Mentor/Creator dari digitalcoop.id (role content_creator di sana) sudah masuk lewat SSO dan tidak perlu mengajukan.
- Keputusan (ditetapkan pemilik): Direktur memutuskan karena menilai kompetensi; Admin hanya tugas rutin. Pengangkatan jabatan Direktur/Admin punya alur sendiri (Pengangkatan Jabatan), jangan dicampur.

Langkah:
1. Backend `POST /users/role-applications` {requestedRole: MENTOR|CREATOR, profile, experience}: hanya STUDENT aktif; tolak bila sudah ada PENDING; tolak bila KYC belum lengkap (status Academy VERIFIED atau digitalcoop `completed`); validasi panjang teks (shared/roleApplication.ts, ada uji). `GET /users/role-applications/mine` untuk status dan catatan penolakan.
2. Klien: ganti `handleApplyRole` dengan formulir (profil singkat, pengalaman, tautan portofolio opsional), tampilkan status PENDING/DITOLAK dengan catatan, kunci tombol saat PENDING.
3. Admin: layar `RoleApplications` sudah ada; cukup pastikan menampilkan status KYC pemohon dan kirim notifikasi ke Admin saat ada pengajuan baru.
4. Uji PGlite: ajukan tanpa KYC ditolak, ajukan ganda ditolak, setuju mengubah role + kartu + notifikasi, tolak menyimpan catatan.
Perkiraan: 1 sesi kerja.

## Bagian A: STATUS SELESAI (19 Nov 2026)
Pengajuan nyata (`/role-applications`), KYC wajib, Direktur memutuskan, Admin tidak. Uji PGlite 12 pemeriksaan lulus.

## Bagian B: Industry Hub (DIBANGUN, migrasi 0027)

Status: profil opt-in + direktori publik `/talent` + formulir pesan ke talenta (rate limit, tanpa akun HR terverifikasi). Akun mitra HR terverifikasi = tahap lanjutan.

Arah awal dari pemilik:
Arah: profil Student bergaya LinkedIn yang dapat dilihat publik, dibuka HR Manager. Isi: biodata, portofolio kursus dan materi, kompetensi (sertifikat terbit, nilai).
Rancangan yang akan dibangun:
- Opt-in oleh Student, hanya bila KYC terverifikasi, dengan persetujuan PDP khusus (versi baru di sistem dokumen hukum) dan dapat dicabut kapan saja (profil langsung tidak tampil).
- Tabel `talent_profiles` (userId unik, slug, headline, bio, lokasi, keahlian, tautan, visibilitas). Portofolio dan kompetensi DIHITUNG dari data sertifikat dan kursus yang sudah ada, bukan diisi ulang.
- Halaman publik `/talent/<slug>` dan direktori dengan pencarian (keahlian, kursus, nilai). Tidak pernah menampilkan NIK, foto KTP/selfie, email, atau telepon; kontak lewat pesan yang diteruskan Academy.
- HR Manager: pencarian dan lihat profil tanpa login; kirim pesan butuh akun mitra terverifikasi (alur pendaftaran mitra perlu diputuskan).
- Sertifikat pada profil memakai tautan verifikasi `/verify?no=...` yang sudah ada.
