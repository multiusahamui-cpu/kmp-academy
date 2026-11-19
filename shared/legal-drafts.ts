// Draf awal dokumen hukum. Disimpan sebagai DRAFT versi 1 dan WAJIB ditinjau penasihat hukum
// serta disesuaikan sebelum diterbitkan. Bagian bertanda [PERLU DIKONFIRMASI] harus dilengkapi.
import type { LegalKind } from "./legal";

const NOTE = "CATATAN INTERNAL (hapus sebelum terbit): Ini draf awal, bukan nasihat hukum. Tinjau bersama penasihat hukum dan lengkapi semua bagian [PERLU DIKONFIRMASI].\n\n";

const TERMS = `${NOTE}SYARAT & KETENTUAN PENGGUNAAN
KMP - ADNG ACADEMY

Berlaku sejak tanggal diterbitkan.

1. TENTANG LAYANAN
KMP - ADNG Academy ("Academy") adalah layanan pembelajaran digital yang dikelola oleh Koperasi Multi Pihak Aset Digital Nusantara Garuda ("Lembaga"). Layanan mencakup kursus mandiri, kelas dan workshop bersama Mentor, ujian, serta sertifikat.

2. AKUN
a. Akun Academy tertaut dengan akun digitalcoop.id. Anda wajib memberikan data yang benar dan menjaga kerahasiaan kata sandi.
b. Satu orang satu akun. Anda bertanggung jawab atas semua aktivitas di akun Anda.
c. Lembaga dapat membekukan atau menutup akun yang melanggar ketentuan ini, setelah pemberitahuan bila memungkinkan.
d. Penutupan akun dapat Anda ajukan melalui menu penghapusan akun. Saldo yang tersisa diselesaikan sesuai prosedur Lembaga.

3. PEMBELIAN DAN PEMBAYARAN
a. Harga kursus ditetapkan oleh Creator pemilik materi dan ditampilkan dalam Rupiah. Harga workshop ditetapkan sesuai proposal yang disetujui Lembaga.
b. Pembayaran dapat dilakukan melalui Virtual Account, transfer manual, atau dompet digitalcoop.id. Pesanan yang tidak dibayar sampai batas waktu akan kedaluwarsa.
c. Kode promo hanya berlaku pada kursus dan periode yang tertera, dan tidak dapat digabung kecuali dinyatakan lain.
d. Pengembalian dana: [PERLU DIKONFIRMASI: kebijakan refund, tenggat, dan pengecualian].

4. HAK ATAS MATERI
a. Materi kursus dilindungi hak cipta milik Creator pemilik materi atau pihak yang memberi lisensi kepadanya.
b. Anda mendapat hak pakai pribadi, tidak eksklusif, dan tidak dapat dialihkan untuk mengakses materi yang telah Anda beli. Anda dilarang menyalin, membagikan, menjual ulang, merekam, atau mengunggah ulang materi.

5. ATURAN PERILAKU
Anda dilarang: membagikan akun; menggunakan layanan untuk melanggar hukum; mengganggu sistem; berbuat curang dalam ujian; mengunggah konten yang melanggar hak pihak lain, menyesatkan, atau bermuatan SARA, pornografi, atau kekerasan.

6. UJIAN DAN SERTIFIKAT
Sertifikat diterbitkan bila persyaratan kursus dan ujian dipenuhi. Sertifikat dapat diperiksa keasliannya melalui nomor serinya dan dapat dicabut bila diperoleh dengan cara curang.

7. KETERSEDIAAN LAYANAN
Lembaga berupaya menjaga layanan tetap tersedia, namun dapat melakukan pemeliharaan dan tidak menjamin layanan bebas gangguan. Lembaga tidak bertanggung jawab atas kerugian tidak langsung sejauh diizinkan hukum.

8. PERUBAHAN KETENTUAN
Lembaga dapat memperbarui ketentuan ini. Versi baru diberitahukan dan Anda diminta menyetujuinya kembali untuk terus memakai layanan.

9. HUKUM DAN PENYELESAIAN SENGKETA
Ketentuan ini tunduk pada hukum Republik Indonesia. Sengketa diselesaikan lebih dulu secara musyawarah; bila tidak tercapai, melalui [PERLU DIKONFIRMASI: pengadilan negeri / BANI / mekanisme koperasi].

10. KONTAK
Pertanyaan dapat disampaikan melalui menu Bantuan di aplikasi atau email bantuan yang tercantum pada situs.`;

const PRIVACY = `${NOTE}KEBIJAKAN PRIVASI
KMP - ADNG ACADEMY

Kebijakan ini menjelaskan bagaimana Lembaga mengelola data pribadi Anda, dengan mengacu pada Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi.

1. PENGENDALI DATA
Koperasi Multi Pihak Aset Digital Nusantara Garuda. Kontak pelindungan data: [PERLU DIKONFIRMASI: nama/jabatan dan email].

2. DATA YANG KAMI KUMPULKAN
a. Data akun: nama, email, nomor telepon, peran, dan identitas akun digitalcoop.id yang tertaut.
b. Data transaksi: pesanan, pembayaran, bukti transfer, saldo, dan riwayat pendaftaran kursus.
c. Data belajar: kemajuan, hasil ujian, sertifikat, nilai kelas, dan ulasan.
d. Data teknis: sesi login, alamat IP, dan log keamanan.

3. TUJUAN PENGGUNAAN
Menyediakan layanan dan dukungan; memproses pembayaran dan bagi hasil; menerbitkan sertifikat dan kartu; menjaga keamanan dan mencegah kecurangan; memenuhi kewajiban hukum; serta mengirim pemberitahuan sesuai pengaturan notifikasi Anda.

4. DASAR PEMROSESAN
Pelaksanaan perjanjian dengan Anda, kewajiban hukum, kepentingan sah Lembaga yang tidak merugikan hak Anda, dan persetujuan Anda bila diperlukan.

5. BERBAGI DATA
a. Dengan Mentor kelas yang Anda ikuti: nama, email, dan nilai di kelas tersebut.
b. Dengan digitalcoop.id untuk autentikasi dan dompet.
c. Dengan penyedia pembayaran (misalnya Midtrans) dan layanan penyimpanan/email yang kami pakai untuk menjalankan layanan.
d. Dengan pihak berwenang bila diwajibkan hukum.
Kami tidak menjual data pribadi Anda.

6. PENYIMPANAN DAN KEAMANAN
Data disimpan selama akun aktif dan selama diperlukan untuk kewajiban hukum dan pembukuan: [PERLU DIKONFIRMASI: jangka retensi]. Kami menerapkan kontrol akses berbasis peran, sesi terproteksi, dan catatan audit.

7. HAK ANDA
Anda berhak mengakses, memperbaiki, meminta salinan, membatasi, menarik persetujuan, dan meminta penghapusan data pribadi Anda sepanjang diizinkan hukum. Ajukan melalui menu Bantuan atau menu penghapusan akun.

8. ANAK
Layanan ditujukan bagi pengguna yang cakap hukum. [PERLU DIKONFIRMASI: ketentuan usia minimum dan persetujuan orang tua/wali].

9. PERUBAHAN KEBIJAKAN
Perubahan material diberitahukan dan Anda diminta menyetujui versi baru.

10. PELANGGARAN DATA
Bila terjadi kegagalan pelindungan data pribadi, Lembaga memberitahu pihak terdampak dan pihak berwenang sesuai ketentuan yang berlaku.`;

const MENTOR = `${NOTE}PERJANJIAN KEMITRAAN MENTOR
KMP - ADNG ACADEMY

Perjanjian ini antara Koperasi Multi Pihak Aset Digital Nusantara Garuda ("Lembaga") dan pengguna yang menyetujuinya melalui aplikasi ("Mentor"). Persetujuan elektronik memiliki kekuatan yang sama dengan tanda tangan.

PASAL 1 - RUANG LINGKUP
Mentor membimbing kelas dan workshop di Academy: menyelenggarakan sesi, menilai peserta, dan menjaga mutu pembelajaran. Mentor bukan karyawan Lembaga; hubungan ini adalah kemitraan.

PASAL 2 - KEWAJIBAN MENTOR
a. Menyelenggarakan sesi sesuai jadwal yang diumumkan dan memberi tahu peserta bila ada perubahan.
b. Menggunakan materi hanya dari kursus yang lisensinya diberikan pemilik materi untuk workshop, dan tidak menyalin atau menyebarkannya di luar Academy.
c. Memberi penilaian yang jujur, adil, dan tepat waktu.
d. Menjaga kerahasiaan data peserta dan hanya memakainya untuk keperluan kelas.
e. Menjaga etika, tidak melakukan diskriminasi, pelecehan, atau penipuan.

PASAL 3 - BAGI HASIL
a. Untuk workshop atau rombongan belajar berbayar, hasil penjualan dibagi: 60% pemilik materi, 25% Mentor, dan 15% Lembaga.
b. Pembagian dihitung dari jumlah yang benar-benar dibayar peserta setelah diskon, dan dicatat per pendaftaran pada saat terjadi.
c. Persentase dapat diubah Lembaga untuk penjualan berikutnya dengan pemberitahuan lebih dulu; perubahan tidak berlaku surut.
d. Direktur dan Admin Lembaga menerima honor dan tidak menerima bagi hasil.
e. Waktu dan tata cara pencairan bagian Mentor: [PERLU DIKONFIRMASI: jadwal, ambang minimum, pajak yang dipotong].

PASAL 4 - HAK ATAS KEKAYAAN INTELEKTUAL
Materi yang dibuat Mentor sendiri tetap milik Mentor, dan Mentor memberi Lembaga lisensi non-eksklusif untuk menayangkannya di Academy. Materi milik Creator tetap milik Creator.

PASAL 5 - KERAHASIAAN DAN DATA PRIBADI
Mentor wajib menjaga data pribadi peserta sesuai Kebijakan Privasi dan hukum pelindungan data pribadi, termasuk setelah perjanjian berakhir.

PASAL 6 - SANKSI
Pelanggaran dapat dikenai peringatan atau pembekuan akun oleh Direktur, disertai alasan tertulis. Pembekuan dapat dicabut dengan catatan. Pelanggaran berat dapat berujung pengakhiran perjanjian.

PASAL 7 - JANGKA WAKTU DAN PENGAKHIRAN
Perjanjian berlaku selama akun Mentor aktif. Masing-masing pihak dapat mengakhirinya dengan pemberitahuan tertulis [PERLU DIKONFIRMASI: tenggat pemberitahuan]. Hak bagi hasil atas penjualan yang sudah terjadi tetap dihormati.

PASAL 8 - PERUBAHAN
Lembaga dapat memperbarui perjanjian; versi baru berlaku setelah Mentor menyetujuinya dalam aplikasi.

PASAL 9 - HUKUM DAN PENYELESAIAN SENGKETA
Tunduk pada hukum Republik Indonesia. Sengketa diselesaikan secara musyawarah; bila tidak tercapai, melalui [PERLU DIKONFIRMASI].`;

const CREATOR = `${NOTE}PERJANJIAN KEMITRAAN CREATOR / PEMILIK MATERI
KMP - ADNG ACADEMY

Perjanjian ini antara Koperasi Multi Pihak Aset Digital Nusantara Garuda ("Lembaga") dan pengguna yang menyetujuinya melalui aplikasi ("Creator"). Persetujuan elektronik memiliki kekuatan yang sama dengan tanda tangan.

PASAL 1 - RUANG LINGKUP
Creator membuat dan menerbitkan materi kursus di Academy. Lembaga menyediakan platform, pembayaran, sertifikasi, dan dukungan. Creator bukan karyawan Lembaga.

PASAL 2 - KEWAJIBAN CREATOR
a. Materi harus karya sendiri atau Creator memiliki hak yang sah untuk menerbitkannya, dan tidak melanggar hak cipta atau hak pihak lain.
b. Materi harus akurat, tidak menyesatkan, dan tidak memuat konten yang melanggar hukum atau norma kesusilaan.
c. Creator bertanggung jawab atas isi materi dan menanggapi pertanyaan peserta dalam batas wajar.
d. Kursus terbit setelah ditinjau Admin; Admin dapat menolak atau menarik materi yang melanggar perjanjian ini.

PASAL 3 - HARGA DAN DISKON
a. Harga ditetapkan sendiri oleh Creator per kursus.
b. Creator dapat membuat diskon per kursus dengan masa berlaku mulai dan berakhir tertentu, termasuk kode promo.
c. Lembaga dapat menjalankan promo koperasi atas persetujuan internal; promo tersebut dicatat dengan alasannya.

PASAL 4 - BAGI HASIL
a. Penjualan kursus belajar mandiri: 70% untuk Creator pemilik materi dan 30% untuk Lembaga.
b. Bila materi dipakai dalam workshop atau rombongan belajar berbayar bersama Mentor: 60% pemilik materi, 25% Mentor, dan 15% Lembaga.
c. Pembagian dihitung dari jumlah yang benar-benar dibayar peserta setelah diskon dan dicatat per pendaftaran pada saat terjadi.
d. Persentase dapat diubah Lembaga untuk penjualan berikutnya dengan pemberitahuan lebih dulu; perubahan tidak berlaku surut.
e. Direktur dan Admin Lembaga menerima honor dan tidak menerima bagi hasil.
f. Waktu dan tata cara pencairan: [PERLU DIKONFIRMASI: jadwal, ambang minimum, pajak yang dipotong, penanganan refund dan chargeback].

PASAL 5 - HAK ATAS KEKAYAAN INTELEKTUAL DAN LISENSI
a. Hak cipta atas materi tetap pada Creator.
b. Creator memberi Lembaga lisensi non-eksklusif, bebas biaya tambahan selain bagi hasil, untuk menyimpan, menayangkan, memasarkan, dan mendistribusikan materi di Academy.
c. Creator memberi lisensi kepada Mentor yang ditunjuk Lembaga untuk memakai materi dalam workshop atau rombongan belajar sesuai Pasal 4 huruf b.
d. Lisensi berlanjut untuk peserta yang sudah membeli, walau materi ditarik dari penjualan.

PASAL 6 - SANKSI
Pelanggaran dapat berujung penolakan atau penarikan materi, penahanan bagi hasil yang disengketakan sampai selesai, dan bila berat pengakhiran perjanjian.

PASAL 7 - JANGKA WAKTU DAN PENGAKHIRAN
Perjanjian berlaku selama akun Creator aktif. Masing-masing pihak dapat mengakhirinya dengan pemberitahuan tertulis [PERLU DIKONFIRMASI: tenggat pemberitahuan]. Bagi hasil atas penjualan yang sudah terjadi tetap dihormati.

PASAL 8 - DATA PRIBADI
Creator hanya memakai data peserta yang diterimanya untuk keperluan pembelajaran dan sesuai Kebijakan Privasi.

PASAL 9 - PERUBAHAN
Lembaga dapat memperbarui perjanjian; versi baru berlaku setelah Creator menyetujuinya dalam aplikasi.

PASAL 10 - HUKUM DAN PENYELESAIAN SENGKETA
Tunduk pada hukum Republik Indonesia. Sengketa diselesaikan secara musyawarah; bila tidak tercapai, melalui [PERLU DIKONFIRMASI].`;

export const LEGAL_DRAFTS: Record<LegalKind, { title: string; body: string }> = {
  TERMS: { title: "Syarat & Ketentuan Penggunaan", body: TERMS },
  PRIVACY: { title: "Kebijakan Privasi", body: PRIVACY },
  MENTOR_AGREEMENT: { title: "Perjanjian Kemitraan Mentor", body: MENTOR },
  CREATOR_AGREEMENT: { title: "Perjanjian Kemitraan Creator / Pemilik Materi", body: CREATOR },
};
