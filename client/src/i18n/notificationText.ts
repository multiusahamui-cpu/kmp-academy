// Notifikasi disimpan server dalam bahasa Indonesia. Untuk pengguna berbahasa Inggris, teks yang dikenal
// diterjemahkan di klien dengan mencocokkan pola; teks yang tidak dikenal ditampilkan apa adanya.
// Tambahkan aturan di sini bila server menambah jenis notifikasi baru.

type Rule = [RegExp, string | ((...m: string[]) => string)];

const TITLES: Record<string, string> = {
  "Pengajuan penghapusan akun": "Account deletion request",
  "Pengajuan penghapusan akun ditolak": "Account deletion request rejected",
  "Saldo diselesaikan": "Balance settled",
  "Pengajuan ditolak": "Request rejected",
  "Pengajuan disetujui": "Request approved",
  "Kartu Anda terbit": "Your card has been issued",
  "Bukti pembayaran ditolak": "Payment proof rejected",
  "Anda diangkat": "You have been appointed",
  "Jabatan berakhir": "Appointment ended",
  "Kursus menunggu review": "Course awaiting review",
  "Kursus Anda terbit": "Your course is published",
  "Kursus Anda ditolak": "Your course was rejected",
  "Selamat datang di KMP-ADNG Academy": "Welcome to KMP-ADNG Academy",
  "Email akun diganti": "Account email changed",
  "Tiket bantuan dibalas": "Help ticket answered",
  "Tiket bantuan ditutup": "Help ticket closed",
  "Balasan tiket bantuan": "Help ticket reply",
  "Identitas terverifikasi": "Identity verified",
  "Pengajuan KYC diterima": "KYC submission received",
  "KYC ditolak": "KYC rejected",
  "Sertifikat terbit": "Certificate issued",
  "Laporan manajemen baru": "New management report",
  "Anda ditambahkan ke kelas": "You were added to a class",
  "Nilai kelas diperbarui": "Class grade updated",
  "Jadwal sesi baru": "New session schedule",
  "Akun Anda dibekukan": "Your account has been suspended",
  "Peringatan dari Direktur": "Warning from the Director",
  "Akun Anda diaktifkan kembali": "Your account has been reactivated",
  "Sanksi dicabut": "Sanction lifted",
  "Password diganti": "Password changed",
  "Bukti pembayaran menunggu verifikasi": "Payment proof awaiting verification",
  "Pengajuan role baru": "New role application",
  "Proposal workshop disetujui": "Workshop proposal approved",
  "Materi Anda dipakai untuk workshop": "Your material is used for a workshop",
  "Proposal workshop ditolak": "Workshop proposal rejected",
  "Anda masuk kelas workshop": "You joined a workshop class",
  "Kartu Student Anda terbit": "Your Student card has been issued",
  "Pembayaran diterima": "Payment received",
  "Pembayaran dikembalikan ke dompet": "Payment refunded to wallet",
  "Top-up berhasil": "Top-up successful",
  "Pembayaran dibatalkan": "Payment cancelled",
  "Pencairan bagi hasil menunggu persetujuan": "Revenue-share payout awaiting approval",
  "Bagi hasil disetujui": "Revenue share approved",
  "Pencairan bagi hasil disetujui": "Revenue-share payout approved",
  "Bukti pembayaran bagi hasil": "Revenue-share payment proof",
};

const METHOD: Record<string, string> = { "Virtual Account": "Virtual Account", "transfer manual": "manual transfer", "dompet digitalcoop.id": "digitalcoop.id wallet" };

const BODIES: Rule[] = [
  [/^(.+) mengajukan penghapusan akun\. Tinjau di menu Penghapusan Akun\.$/s, "$1 requested account deletion. Review it in the Account Deletions menu."],
  [/^Catatan: (.+)$/s, "Note: $1"],
  [/^Saldo Rp([\d.,]+) telah ditransfer kepada Anda \(ref (.+)\)\.$/s, "A balance of Rp$1 has been transferred to you (ref $2)."],
  [/^Pengajuan Anda ditolak\. Catatan: (.+)$/s, "Your request was rejected. Note: $1"],
  [/^Pengajuan Anda ditolak\.$/, "Your request was rejected."],
  [/^Anda diangkat sebagai (.+)\. Masuk ulang untuk memakai menu jabatan Anda\.$/s, "You have been appointed as $1. Log in again to use your position menu."],
  [/^Anda diangkat sebagai (.+?)\.(?: Nomor kartu Anda (.+)\.)?$/s, (_m, role, card) => `You have been appointed as ${role}.${card ? ` Your card number is ${card}.` : ""}`],
  [/^Nomor kartu Anda (.+)\.$/s, "Your card number is $1."],
  [/^Bukti transfer ditolak\. Catatan: (.+) Silakan buat pesanan baru dan unggah bukti yang benar\.$/s, "Transfer proof rejected. Note: $1 Please create a new order and upload the correct proof."],
  [/^Jabatan Anda sebagai (.+) telah berakhir\. Alasan: (.+)$/s, "Your position as $1 has ended. Reason: $2"],
  [/^"(.+)" diajukan untuk terbit\. Tinjau di menu Review Kursus\.$/s, "\"$1\" was submitted for publication. Review it in the Course Reviews menu."],
  [/^"(.+)" kini tampil di katalog\.(?: Catatan: (.+))?$/s, (_m, title, note) => `"${title}" is now shown in the catalog.${note ? ` Note: ${note}` : ""}`],
  [/^"(.+)" ditolak\. Catatan: (.+)$/s, "\"$1\" was rejected. Note: $2"],
  [/^Akun Anda tertaut dengan digitalcoop\.id\. Anda juga dapat masuk langsung di academy\.digitalcoop\.id\.$/, "Your account is linked to digitalcoop.id. You can also sign in directly at academy.digitalcoop.id."],
  [/^Email akun Academy Anda kini (.+)\.$/s, "Your Academy account email is now $1."],
  [/^Balasan untuk: (.+)$/s, "Reply to: $1"],
  [/^Tiket ditutup: (.+)$/s, "Ticket closed: $1"],
  [/^Data KYC Anda dari digitalcoop\.id sudah disalin dan terverifikasi\.$/, "Your KYC data from digitalcoop.id has been copied and verified."],
  [/^Admin akan meninjau foto KTP dan selfie Anda\.$/, "An Admin will review your ID card photo and selfie."],
  [/^Verifikasi identitas Anda disetujui\.$/, "Your identity verification was approved."],
  [/^Pengajuan KYC ditolak: (.+)\. Silakan kirim ulang\.$/s, "KYC submission rejected: $1. Please submit again."],
  [/^Selamat! Sertifikat kursus "(.+)" telah terbit dengan nomor (.+)\. Lihat di Pengaturan Profil > Sertifikat\.$/s, "Congratulations! The certificate for the course \"$1\" has been issued with number $2. See it in Profile Settings > Certificates."],
  [/^Laporan mingguan siap dibaca\.$/, "The weekly report is ready to read."],
  [/^Laporan bulanan siap dibaca\.$/, "The monthly report is ready to read."],
  [/^Anda ditambahkan ke kelas (.+)\.$/s, "You were added to the class $1."],
  [/^Nilai Anda di kelas (.+) telah diperbarui\.$/s, "Your grade in the class $1 has been updated."],
  [/^Password akun Academy Anda diganti lewat lupa password\. Jika bukan Anda, segera hubungi admin\.$/, "Your Academy account password was changed through forgot password. If this was not you, contact an admin immediately."],
  [/^Pesanan Rp ([\d.,]+) menunggu verifikasi di menu Verifikasi Pembayaran\.$/s, "An order of Rp $1 is awaiting verification in the Payment Verification menu."],
  [/^(.+) mengajukan menjadi (Mentor|Creator)\. Tinjau di Manajemen User > Daftar Tunggu\.$/s, "$1 applied to become a $2. Review it in User Management > Waiting List."],
  [/^Workshop "(.+)" disetujui dan sudah tayang di etalase\. Atur jadwal sesi di menu Kelas\.$/s, "The workshop \"$1\" was approved and is now on display. Set the session schedule in the Classes menu."],
  [/^Kursus "(.+)" dijadikan dasar workshop "(.+)"\. Bagian Anda mengikuti ketentuan bagi hasil workshop\.$/s, "The course \"$1\" was used as the basis for the workshop \"$2\". Your share follows the workshop revenue-sharing terms."],
  [/^Proposal "(.+)" ditolak\. Alasan: (.+)$/s, "The proposal \"$1\" was rejected. Reason: $2"],
  [/^Anda terdaftar di kelas (.+)\. Jadwal sesi ada di menu Kelas\.$/s, "You are enrolled in the class $1. The session schedule is in the Classes menu."],
  [/^Pembayaran Rp ([\d.,]+) lewat (.+) diterima\. Kursus sudah terbuka\.$/s, (_m, amt, method) => `Payment of Rp ${amt} via ${METHOD[method] ?? method} received. The course is now open.`],
  [/^Anda sudah terdaftar di kursus ini\. Rp ([\d.,]+) dikreditkan ke dompet Academy\.$/s, "You are already enrolled in this course. Rp $1 was credited to your Academy wallet."],
  [/^Saldo dompet Academy bertambah Rp ([\d.,]+)\.$/s, "Your Academy wallet balance increased by Rp $1."],
  [/^Pembayaran dari dompet digitalcoop\.id tidak terkonfirmasi dan saldo Anda tidak dipotong\. Silakan ulangi\.$/, "The payment from your digitalcoop.id wallet was not confirmed and your balance was not deducted. Please try again."],
  [/^Periode (.+): (\d+) penerima, total (.+)\. Mohon tinjau dan setujui\.$/s, "Period $1: $2 recipients, total $3. Please review and approve."],
  [/^Bagi hasil Anda sebesar (.+) telah disetujui dan akan ditransfer ke rekening Anda\. Pastikan rekening pencairan sudah terisi\.$/s, "Your revenue share of $1 has been approved and will be transferred to your account. Make sure your payout account is filled in."],
  [/^(\d+) penerima menunggu transfer manual\. Catat nomor referensi setelah transfer\.$/, "$1 recipients are awaiting manual transfer. Record the reference number after transferring."],
  [/^Bagi hasil sebesar (.+) telah ditransfer ke (.+) atas nama (.+)\. Referensi: (.+)\. Unduh bukti bayar di menu Bagi Hasil Saya\.$/s, "A revenue share of $1 was transferred to $2 in the name of $3. Reference: $4. Download the payment proof in the My Revenue Share menu."],
  [/^(.+) \((.+), (.+)\) menulis: (.+)$/s, "$1 ($2, $3) wrote: $4"],
];

export const translateNotification = (n: { title: string; body: string }, lang: string): { title: string; body: string } => {
  if (lang !== "en") return n;
  let title = TITLES[n.title];
  if (!title) {
    const m = /^Pesan dari (.+)$/s.exec(n.title);
    title = m ? `Message from ${m[1]}` : n.title;
  }
  let body = n.body;
  for (const [re, out] of BODIES) {
    if (re.test(n.body)) {
      body = typeof out === "string" ? n.body.replace(re, out) : n.body.replace(re, out as never);
      break;
    }
  }
  return { title, body };
};
