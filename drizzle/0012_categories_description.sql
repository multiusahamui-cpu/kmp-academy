ALTER TABLE "academy"."categories" ADD COLUMN "description" text;--> statement-breakpoint
-- Data awal: tujuh kategori bawaan (idempoten: slug yang sudah ada tidak diduplikasi, nama tidak ditimpa,
-- deskripsi hanya diisi bila masih kosong sehingga suntingan admin tidak tertimpa).
INSERT INTO "academy"."categories" ("name", "slug", "description") VALUES
	('Teknologi & Coding', 'teknologi-coding', 'Pemrograman, pengembangan aplikasi, data, dan keterampilan teknologi untuk pengurus maupun anggota koperasi.'),
	('Bisnis Digital', 'bisnis-digital', 'Memulai dan mengembangkan usaha lewat internet: marketplace, toko online, dan model bisnis digital.'),
	('Manajemen Koperasi', 'manajemen-koperasi', 'Tata kelola, kepengurusan, rapat anggota, dan administrasi koperasi sesuai prinsip dan peraturan perkoperasian.'),
	('Keuangan & Akuntansi', 'keuangan-akuntansi', 'Pembukuan, laporan keuangan, simpan pinjam, dan pengelolaan keuangan usaha.'),
	('Soft Skills', 'soft-skills', 'Komunikasi, kepemimpinan, kerja tim, dan keterampilan pribadi pendukung karier dan organisasi.'),
	('Marketing', 'marketing', 'Pemasaran dan penjualan: strategi promosi, konten, media sosial, dan layanan pelanggan.'),
	('Sertifikasi Profesi', 'sertifikasi', 'Kursus persiapan uji kompetensi dan program yang berujung pada sertifikat profesi.')
ON CONFLICT ("slug") DO UPDATE SET "description" = COALESCE("academy"."categories"."description", EXCLUDED."description");
