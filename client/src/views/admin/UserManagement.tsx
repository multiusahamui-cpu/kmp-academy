import React, { useCallback, useEffect, useState } from 'react';
import { adminApi } from '../../services/api';
import { useProfile } from '../../services/profile';
import RoleApplications from './RoleApplications';
import { Search, Shield, User as UserIcon, Star, GraduationCap, Plus, Loader2 } from 'lucide-react';

type Tab = 'INTERNAL' | 'MENTOR' | 'CREATOR' | 'STUDENT' | 'DAFTAR_TUNGGU';

interface Row {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  status: string;
  avatar: string | null;
  cardNumber: string | null;
  linked: boolean;
  joinedAt: string | null;
  enrolledCount: number;
}

interface Page {
  total: number;
  page: number;
  size: number;
  items: Row[];
}

const STATUS_LABEL: Record<string, string> = { ACTIVE: 'Aktif', SUSPENDED: 'Ditangguhkan', BANNED: 'Diblokir', ARCHIVED: 'Archived' };
const CARD_ISSUERS = ['SUPERADMIN', 'ADMIN_SYSTEM']; // yang boleh menerbitkan kartu manual

const errText = (err: unknown, fallback: string): string =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

const UserManagement: React.FC = () => {
  const { profile } = useProfile();
  // Pengajuan naik peran diputuskan Direktur (penilai kompetensi); Admin hanya mengurus pekerjaan rutin.
  const isDirector = profile?.role === 'DIRECTOR';
  const canIssueCard = !!profile && CARD_ISSUERS.includes(profile.role);
  const [activeTab, setActiveTab] = useState<Tab>('STUDENT');
  const [searchTerm, setSearchTerm] = useState('');
  const [query, setQuery] = useState('');
  const [pageNo, setPageNo] = useState(1);
  const [data, setData] = useState<Page>({ total: 0, page: 1, size: 15, items: [] });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Pencarian ditunda 300 ms agar tidak memanggil server pada setiap ketikan.
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(searchTerm.trim());
      setPageNo(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const load = useCallback(async () => {
    if (activeTab === 'DAFTAR_TUNGGU') return;
    setLoading(true);
    try {
      const res = await adminApi.listUsers(activeTab, query, pageNo);
      setData(res.data?.data ?? { total: 0, page: 1, size: 15, items: [] });
    } catch (err) {
      setMessage({ ok: false, text: errText(err, 'Gagal memuat daftar pengguna.') });
    } finally {
      setLoading(false);
    }
  }, [activeTab, query, pageNo]);

  useEffect(() => {
    load();
  }, [load]);

  const switchTab = (tab: Tab) => {
    setActiveTab(tab);
    setPageNo(1);
    setMessage(null);
  };

  const issueCard = async (u: Row) => {
    setBusyId(u.id);
    setMessage(null);
    try {
      const res = await adminApi.issueCard(u.id);
      setMessage({ ok: true, text: `Kartu ${u.name} terbit: ${res.data?.data?.cardNumber ?? ''}` });
      await load();
    } catch (err) {
      setMessage({ ok: false, text: errText(err, 'Gagal menerbitkan kartu.') });
    } finally {
      setBusyId(null);
    }
  };

  const pages = Math.max(1, Math.ceil(data.total / data.size));
  const from = data.total === 0 ? 0 : (data.page - 1) * data.size + 1;
  const to = Math.min(data.page * data.size, data.total);

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
           <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Manajemen Pengguna</h2>
           <p className="text-gray-500 dark:text-slate-400 text-sm">Kelola data pengguna berdasarkan peran (Role) di ekosistem.</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'INTERNAL' && (
             <button className="px-4 py-2 bg-kodman-600 text-white rounded hover:bg-kodman-700 text-sm font-medium flex items-center">
                <Plus size={16} className="mr-2" /> Tambah Staff (Via Settings)
             </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="grid grid-cols-5 gap-2 mb-6 p-1 bg-gray-100 dark:bg-slate-800 rounded-lg">
         <button 
            onClick={() => switchTab('INTERNAL')}
            className={`py-2 rounded-md text-sm font-bold flex items-center justify-center transition ${activeTab === 'INTERNAL' ? 'bg-white dark:bg-slate-700 shadow-sm text-kodman-600 dark:text-white' : 'text-gray-500 hover:text-gray-700'}`}
         >
            <Shield size={16} className="mr-2 hidden md:block" /> Internal <span className="ml-1 hidden md:inline text-[10px] bg-gray-200 dark:bg-slate-600 px-1.5 rounded-full text-gray-600 dark:text-slate-300">A</span>
         </button>
         <button 
            onClick={() => switchTab('MENTOR')}
            className={`py-2 rounded-md text-sm font-bold flex items-center justify-center transition ${activeTab === 'MENTOR' ? 'bg-white dark:bg-slate-700 shadow-sm text-purple-600 dark:text-white' : 'text-gray-500 hover:text-gray-700'}`}
         >
            <GraduationCap size={16} className="mr-2 hidden md:block" /> Mentor <span className="ml-1 hidden md:inline text-[10px] bg-gray-200 dark:bg-slate-600 px-1.5 rounded-full text-gray-600 dark:text-slate-300">M</span>
         </button>
         <button 
            onClick={() => switchTab('CREATOR')}
            className={`py-2 rounded-md text-sm font-bold flex items-center justify-center transition ${activeTab === 'CREATOR' ? 'bg-white dark:bg-slate-700 shadow-sm text-orange-600 dark:text-white' : 'text-gray-500 hover:text-gray-700'}`}
         >
            <Star size={16} className="mr-2 hidden md:block" /> Creator <span className="ml-1 hidden md:inline text-[10px] bg-gray-200 dark:bg-slate-600 px-1.5 rounded-full text-gray-600 dark:text-slate-300">C</span>
         </button>
         <button 
            onClick={() => switchTab('STUDENT')}
            className={`py-2 rounded-md text-sm font-bold flex items-center justify-center transition ${activeTab === 'STUDENT' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-white' : 'text-gray-500 hover:text-gray-700'}`}
         >
            <UserIcon size={16} className="mr-2 hidden md:block" /> Student <span className="ml-1 hidden md:inline text-[10px] bg-gray-200 dark:bg-slate-600 px-1.5 rounded-full text-gray-600 dark:text-slate-300">S</span>
         </button>
         {isDirector && (         <button 
              onClick={() => switchTab('DAFTAR_TUNGGU')}
              className={`py-2 rounded-md text-sm font-bold flex items-center justify-center transition ${activeTab === 'DAFTAR_TUNGGU' ? 'bg-white dark:bg-slate-700 shadow-sm text-green-600 dark:text-white' : 'text-gray-500 hover:text-gray-700'}`}
           >
              Daftar Tunggu
           </button>)}
      </div>

      {message && (
        <div className={`mb-4 px-4 py-3 text-sm rounded ${message.ok ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300' : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300'}`}>
          {message.text}
        </div>
      )}

      {activeTab === 'DAFTAR_TUNGGU' && isDirector ? <RoleApplications /> : (
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 dark:border-slate-800 flex gap-4">
           <div className="relative flex-1">
             <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
             <input
               type="text"
               placeholder="Cari nama, email, No HP, atau nomor kartu..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-md text-sm focus:ring-1 focus:ring-kodman-500"
             />
           </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
            <thead className="bg-gray-50 dark:bg-slate-950">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Nomor Kartu</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Nama User</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Role Spesifik</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-800">
              {loading && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500"><Loader2 className="animate-spin inline" /></td>
                </tr>
              )}
              {!loading && data.items.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                  <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-gray-500 dark:text-slate-400">
                     {user.cardNumber ?? <span className="font-sans italic">Belum terbit</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.name} className="h-8 w-8 rounded-full object-cover mr-3" />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-slate-700 flex items-center justify-center text-gray-500 dark:text-slate-300 font-bold text-xs mr-3">
                          {user.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {user.name}
                          {user.linked && <span className="ml-2 text-[10px] font-normal bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">digitalcoop.id</span>}
                        </div>
                        <div className="text-xs text-gray-500">{[user.email, user.phone].filter(Boolean).join(' · ')}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                      ${user.role === 'DIRECTOR' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                        user.role === 'SUPERADMIN' ? 'bg-red-100 text-red-800 border border-red-200' :
                        'bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-300 border border-gray-200 dark:border-slate-700'}`}>
                      {user.role.replace('_', ' ')}
                    </span>
                    {user.role === 'STUDENT' && (
                      <div className="text-xs text-gray-500 mt-1">{user.enrolledCount > 0 ? `${user.enrolledCount} kursus` : 'Calon student'}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-bold ${user.status === 'ACTIVE' ? 'text-green-600' : 'text-red-500'}`}>
                      {STATUS_LABEL[user.status] ?? user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {canIssueCard && !user.cardNumber && user.role !== 'STUDENT' && user.status === 'ACTIVE' && (
                      <button
                        onClick={() => issueCard(user)}
                        disabled={busyId === user.id}
                        className="px-3 py-1 text-xs bg-kodman-600 text-white rounded hover:bg-kodman-700 disabled:opacity-50"
                      >
                        {busyId === user.id ? 'Memproses...' : 'Terbitkan Kartu'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!loading && data.items.length === 0 && (
                 <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-slate-400">
                       Tidak ada data pengguna ditemukan di kategori ini.
                    </td>
                 </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginasi: 15 data per halaman */}
        <div className="p-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm border-t border-gray-200 dark:border-slate-800 text-gray-600 dark:text-slate-300">
          <span>{data.total === 0 ? 'Tidak ada data' : `Menampilkan ${from}-${to} dari ${data.total}`}</span>
          <div className="flex items-center gap-2">
            <button type="button" disabled={pageNo <= 1 || loading} onClick={() => setPageNo((p) => p - 1)}
              className="px-3 py-1 border border-gray-300 dark:border-slate-700 rounded disabled:opacity-40">Sebelumnya</button>
            <span>Halaman {data.page} dari {pages}</span>
            <button type="button" disabled={pageNo >= pages || loading} onClick={() => setPageNo((p) => p + 1)}
              className="px-3 py-1 border border-gray-300 dark:border-slate-700 rounded disabled:opacity-40">Berikutnya</button>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};

export default UserManagement;
