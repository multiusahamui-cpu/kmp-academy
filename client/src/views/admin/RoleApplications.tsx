import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { adminApi } from '../../services/api';

interface Application {
  id: string;
  name: string;
  email: string;
  requestedRole: string;
  profile: string;
  experience: string;
  createdAt: string;
  kycStatus?: string | null;
  dcKycStatus?: string | null;
}

const ROLE_LABEL: Record<string, string> = { MENTOR: 'Mentor', CREATOR: 'Creator' };

// Daftar tunggu calon Mentor/Creator (diajukan Student dari Profil > Upgrade Role; diputuskan Direktur).
// Menyetujui = pengangkatan + kartu terbit langsung + notifikasi ke yang bersangkutan.
const RoleApplications: React.FC = () => {
  const [items, setItems] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await adminApi.listApplications('PENDING');
      setItems(res.data?.data ?? []);
    } catch {
      setMessage('Gagal memuat daftar tunggu.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const decide = async (item: Application, action: 'APPROVE' | 'REJECT') => {
    const note = action === 'REJECT' ? window.prompt('Alasan penolakan (opsional):') ?? undefined : undefined;
    setBusyId(item.id);
    try {
      const res = await adminApi.decideApplication(item.id, action, note);
      const card: string | null = res.data?.data?.cardNumber ?? null;
      setMessage(
        action === 'APPROVE'
          ? `${item.name} diangkat sebagai ${ROLE_LABEL[item.requestedRole] ?? item.requestedRole}.${card ? ` Kartu terbit: ${card}.` : ''}`
          : `Pengajuan ${item.name} ditolak.`,
      );
      await load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setMessage(msg || 'Gagal memproses pengajuan.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-slate-800">
        <h3 className="font-bold text-gray-900 dark:text-white">Daftar Tunggu Calon Mentor dan Creator</h3>
        <p className="text-xs text-gray-500 dark:text-slate-400">
          Diajukan Student dari Profil Academy (wajib KYC lengkap). Setelah disetujui, pelamar keluar dari daftar ini dan muncul di tab Mentor atau Creator.
        </p>
      </div>
      {message && <div className="px-4 py-3 text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300">{message}</div>}
      {isLoading ? (
        <div className="p-8 text-center text-gray-500"><Loader2 className="animate-spin inline" /></div>
      ) : items.length === 0 ? (
        <div className="p-8 text-center text-sm text-gray-500 dark:text-slate-400">Belum ada pelamar yang menunggu.</div>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-slate-800">
          {items.map((item) => (
            <li key={item.id} className="p-4 flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="space-y-1 text-sm">
                <p className="font-bold text-gray-900 dark:text-white">
                  {item.name} <span className="font-normal text-gray-500">({item.email})</span>
                  <span className={`ml-2 text-xs font-bold px-2 py-0.5 rounded ${item.kycStatus === 'VERIFIED' || item.dcKycStatus === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {item.kycStatus === 'VERIFIED' ? 'KYC Academy' : item.dcKycStatus === 'completed' ? 'KYC digitalcoop.id' : 'KYC belum lengkap'}
                  </span>
                </p>
                <p className="text-xs font-bold uppercase text-digitalcoop-600">Melamar: {ROLE_LABEL[item.requestedRole] ?? item.requestedRole}</p>
                <p className="text-gray-700 dark:text-slate-300"><strong>Profil:</strong> {item.profile}</p>
                <p className="text-gray-700 dark:text-slate-300"><strong>Pengalaman:</strong> {item.experience}</p>
                <p className="text-xs text-gray-400">{new Date(item.createdAt).toLocaleDateString('id-ID')}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  disabled={busyId === item.id}
                  onClick={() => decide(item, 'APPROVE')}
                  className="px-3 py-2 bg-green-600 text-white rounded text-xs font-bold flex items-center hover:bg-green-700 disabled:opacity-50"
                >
                  <CheckCircle size={14} className="mr-1" /> Setujui
                </button>
                <button
                  disabled={busyId === item.id}
                  onClick={() => decide(item, 'REJECT')}
                  className="px-3 py-2 bg-red-600 text-white rounded text-xs font-bold flex items-center hover:bg-red-700 disabled:opacity-50"
                >
                  <XCircle size={14} className="mr-1" /> Tolak
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default RoleApplications;
