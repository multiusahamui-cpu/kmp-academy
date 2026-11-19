import React from 'react';
import { ComingSoon } from '../../components/ReportBits';

interface AppSettingsProps {
  isPolicyMode?: boolean;
}

const AppSettings: React.FC<AppSettingsProps> = ({ isPolicyMode = false }) =>
  isPolicyMode ? (
    <ComingSoon title="Kebijakan Utama">
      <p>Penyuntingan Syarat Layanan dan perjanjian Mentor dengan riwayat revisi belum tersedia. Belum ada teks kebijakan yang disimpan di sistem ini.</p>
    </ComingSoon>
  ) : (
    <ComingSoon title="Pengaturan Aplikasi">
      <p>Pengangkatan Direktur/Admin beserta riwayat jabatan belum tersedia. Peran pengguna saat ini diatur lewat Manajemen Pengguna.</p>
    </ComingSoon>
  );

export default AppSettings;
