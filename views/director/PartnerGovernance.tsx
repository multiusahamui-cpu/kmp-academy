import React, { useState } from 'react';
import { User, UserRole, UserStatus, ViolationRecord } from '../../types';
import { ShieldAlert, Gavel, Search, AlertTriangle, UserX, UserCheck, History } from 'lucide-react';

// Mock Users for Governance
const MOCK_PARTNERS: User[] = [
  { id: '1', name: 'Budi Santoso', email: 'budi@example.com', role: UserRole.CREATOR, status: UserStatus.ACTIVE, violationHistory: [] },
  { id: '2', name: 'Siti Aminah', email: 'siti@example.com', role: UserRole.MENTOR, status: UserStatus.ACTIVE, violationHistory: [] },
  { 
      id: '3', 
      name: 'Bad Partner', 
      email: 'bad@example.com', 
      role: UserRole.MENTOR, 
      status: UserStatus.SUSPENDED, 
      violationHistory: [{ id: 'v1', date: '2023-10-01', reason: 'Tidak hadir kelas 3x berturut-turut', type: 'TEMPORARY', adminNotes: 'Suspensi 1 bulan' }] 
  },
];

const PartnerGovernance: React.FC = () => {
  const [partners, setPartners] = useState<User[]>(MOCK_PARTNERS);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionType, setActionType] = useState<'BLOCK' | 'RESTORE' | 'HISTORY'>('BLOCK');
  
  // Form State for Blocking
  const [violationReason, setViolationReason] = useState('');
  const [violationType, setViolationType] = useState<'TEMPORARY' | 'PERMANENT'>('TEMPORARY');
  const [adminNotes, setAdminNotes] = useState('');

  const handleOpenAction = (user: User, type: 'BLOCK' | 'RESTORE' | 'HISTORY') => {
     setSelectedUser(user);
     setActionType(type);
     setViolationReason('');
     setAdminNotes('');
  };

  const executeBlock = () => {
     if (!selectedUser || !violationReason) return;

     const newRecord: ViolationRecord = {
        id: `v-${Date.now()}`,
        date: new Date().toLocaleDateString('id-ID'),
        reason: violationReason,
        type: violationType,
        adminNotes: adminNotes
     };

     setPartners(prev => prev.map(u => {
        if (u.id === selectedUser.id) {
           return {
              ...u,
              status: violationType === 'PERMANENT' ? UserStatus.BANNED : UserStatus.SUSPENDED,
              violationHistory: [newRecord, ...(u.violationHistory || [])]
           };
        }
        return u;
     }));

     alert(`Partner ${selectedUser.name} berhasil diblokir (${violationType}).`);
     setSelectedUser(null);
  };

  const executeRestore = () => {
     if (!selectedUser) return;
     setPartners(prev => prev.map(u => u.id === selectedUser.id ? { ...u, status: UserStatus.ACTIVE } : u));
     alert(`Status Partner ${selectedUser.name} dipulihkan menjadi ACTIVE.`);
     setSelectedUser(null);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
         <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
               <Gavel className="mr-3 text-red-600" /> Tata Kelola Partner (Governance)
            </h2>
            <p className="text-gray-500 dark:text-slate-400">
               Panel khusus Direktur untuk penegakan disiplin dan etika profesi Mentor & Creator.
            </p>
         </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden">
         {/* Filter Toolbar */}
         <div className="p-4 border-b border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800 flex justify-between">
            <div className="relative w-64">
               <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
               <input type="text" placeholder="Cari Partner..." className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded" />
            </div>
            <div className="flex gap-2">
               <span className="px-3 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider self-center">Filter Status:</span>
               <button className="px-3 py-1 bg-white dark:bg-slate-700 border rounded text-xs font-medium hover:bg-gray-50">Active</button>
               <button className="px-3 py-1 bg-white dark:bg-slate-700 border rounded text-xs font-medium text-red-600 hover:bg-red-50">Suspended</button>
            </div>
         </div>

         {/* List */}
         <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
               <thead className="bg-gray-50 dark:bg-slate-950">
                  <tr>
                     <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Nama Partner</th>
                     <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Role</th>
                     <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status Akun</th>
                     <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Riwayat Pelanggaran</th>
                     <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Tindakan</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
                  {partners.map(p => (
                     <tr key={p.id} className="bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800/50">
                        <td className="px-6 py-4">
                           <div className="font-bold text-gray-900 dark:text-white">{p.name}</div>
                           <div className="text-xs text-gray-500">{p.email}</div>
                        </td>
                        <td className="px-6 py-4">
                           <span className={`px-2 py-1 rounded text-xs font-bold ${p.role === UserRole.MENTOR ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                              {p.role}
                           </span>
                        </td>
                        <td className="px-6 py-4">
                           {p.status === UserStatus.ACTIVE && <span className="text-green-600 font-bold text-xs flex items-center"><UserCheck size={14} className="mr-1"/> Active</span>}
                           {p.status === UserStatus.SUSPENDED && <span className="text-orange-600 font-bold text-xs flex items-center"><AlertTriangle size={14} className="mr-1"/> Suspended</span>}
                           {p.status === UserStatus.BANNED && <span className="text-red-600 font-bold text-xs flex items-center"><UserX size={14} className="mr-1"/> Banned</span>}
                        </td>
                        <td className="px-6 py-4">
                           <button onClick={() => handleOpenAction(p, 'HISTORY')} className="text-gray-500 hover:text-kodman-600 text-xs font-medium flex items-center underline">
                              <History size={14} className="mr-1" /> {p.violationHistory?.length || 0} Catatan
                           </button>
                        </td>
                        <td className="px-6 py-4 text-right">
                           {p.status === UserStatus.ACTIVE ? (
                              <button 
                                onClick={() => handleOpenAction(p, 'BLOCK')}
                                className="px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 rounded text-xs font-bold flex items-center ml-auto"
                              >
                                 <ShieldAlert size={14} className="mr-1" /> Sanksi / Blokir
                              </button>
                           ) : (
                              <button 
                                onClick={() => handleOpenAction(p, 'RESTORE')}
                                className="px-3 py-1.5 border border-green-200 text-green-600 hover:bg-green-50 rounded text-xs font-bold flex items-center ml-auto"
                              >
                                 <UserCheck size={14} className="mr-1" /> Pulihkan Akun
                              </button>
                           )}
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>

      {/* Modal / Action Panel */}
      {selectedUser && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-lg shadow-2xl overflow-hidden border border-gray-200 dark:border-slate-800">
               
               {actionType === 'BLOCK' && (
                  <div className="p-6">
                     <div className="flex items-center gap-3 mb-4 text-red-600">
                        <Gavel size={32} />
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Berikan Sanksi Pelanggaran</h3>
                     </div>
                     <p className="text-sm text-gray-600 dark:text-slate-400 mb-6">
                        Anda akan memberikan sanksi kepada <strong>{selectedUser.name}</strong>. Tindakan ini akan dicatat dalam portofolio partner.
                     </p>

                     <div className="space-y-4">
                        <div>
                           <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">Jenis Pelanggaran & Sanksi</label>
                           <div className="grid grid-cols-2 gap-4">
                              <label className={`border p-3 rounded cursor-pointer ${violationType === 'TEMPORARY' ? 'bg-orange-50 border-orange-500 ring-1 ring-orange-500' : 'border-gray-200'}`}>
                                 <input type="radio" name="vType" className="hidden" checked={violationType === 'TEMPORARY'} onChange={() => setViolationType('TEMPORARY')} />
                                 <div className="font-bold text-sm text-gray-900">Suspensi Sementara</div>
                                 <div className="text-xs text-gray-500">Blokir akses sementara waktu.</div>
                              </label>
                              <label className={`border p-3 rounded cursor-pointer ${violationType === 'PERMANENT' ? 'bg-red-50 border-red-500 ring-1 ring-red-500' : 'border-gray-200'}`}>
                                 <input type="radio" name="vType" className="hidden" checked={violationType === 'PERMANENT'} onChange={() => setViolationType('PERMANENT')} />
                                 <div className="font-bold text-sm text-gray-900">Banned Permanen</div>
                                 <div className="text-xs text-gray-500">Blokir akses selamanya.</div>
                              </label>
                           </div>
                        </div>

                        <div>
                           <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">Alasan Pelanggaran (Wajib)</label>
                           <input 
                              type="text" 
                              className="w-full p-2 border border-gray-300 dark:border-slate-700 rounded text-sm" 
                              placeholder="Contoh: Melanggar kode etik pengajar..."
                              value={violationReason}
                              onChange={(e) => setViolationReason(e.target.value)}
                           />
                        </div>

                        <div>
                           <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">Catatan Tambahan Direktur</label>
                           <textarea 
                              className="w-full p-2 border border-gray-300 dark:border-slate-700 rounded text-sm h-20"
                              placeholder="Detail kejadian atau instruksi khusus..."
                              value={adminNotes}
                              onChange={(e) => setAdminNotes(e.target.value)}
                           ></textarea>
                        </div>
                     </div>

                     <div className="flex justify-end gap-3 mt-8">
                        <button onClick={() => setSelectedUser(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Batal</button>
                        <button onClick={executeBlock} className="px-4 py-2 bg-red-600 text-white font-bold rounded hover:bg-red-700">Konfirmasi Sanksi</button>
                     </div>
                  </div>
               )}

               {actionType === 'HISTORY' && (
                  <div className="p-6">
                     <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Riwayat Pelanggaran: {selectedUser.name}</h3>
                     <div className="space-y-4 max-h-[400px] overflow-y-auto">
                        {(selectedUser.violationHistory?.length || 0) === 0 ? (
                           <p className="text-gray-500 italic text-center py-4">Tidak ada catatan pelanggaran.</p>
                        ) : (
                           selectedUser.violationHistory?.map(v => (
                              <div key={v.id} className="border-l-4 border-red-500 bg-gray-50 dark:bg-slate-800 p-3 pl-4">
                                 <div className="flex justify-between text-xs text-gray-500 mb-1">
                                    <span>{v.date}</span>
                                    <span className="font-bold">{v.type}</span>
                                 </div>
                                 <p className="font-bold text-gray-800 dark:text-white text-sm">{v.reason}</p>
                                 <p className="text-xs text-gray-600 dark:text-slate-400 mt-1">Note: {v.adminNotes}</p>
                              </div>
                           ))
                        )}
                     </div>
                     <div className="mt-6 text-right">
                        <button onClick={() => setSelectedUser(null)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded text-sm">Tutup</button>
                     </div>
                  </div>
               )}

               {actionType === 'RESTORE' && (
                  <div className="p-6 text-center">
                     <UserCheck size={48} className="mx-auto text-green-500 mb-4" />
                     <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Pulihkan Akun?</h3>
                     <p className="text-sm text-gray-600 mb-6">
                        Status akun <strong>{selectedUser.name}</strong> akan dikembalikan menjadi <strong>ACTIVE</strong>. User dapat login kembali.
                     </p>
                     <div className="flex justify-center gap-3">
                        <button onClick={() => setSelectedUser(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Batal</button>
                        <button onClick={executeRestore} className="px-4 py-2 bg-green-600 text-white font-bold rounded hover:bg-green-700">Ya, Pulihkan</button>
                     </div>
                  </div>
               )}

            </div>
         </div>
      )}
    </div>
  );
};

export default PartnerGovernance;