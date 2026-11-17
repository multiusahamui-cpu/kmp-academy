import React, { useState } from 'react';
import { UserRole, User, UserStatus } from '../../types';
import { Search, Filter, Edit, Trash2, Shield, User as UserIcon, Star, GraduationCap, Plus, Save, X } from 'lucide-react';

const MOCK_USERS: User[] = [
  { id: '1', name: 'Budi Santoso', email: 'budi@example.com', role: UserRole.CREATOR, status: UserStatus.ACTIVE, memberSequence: 1 },
  { id: '2', name: 'Siti Aminah', email: 'siti@example.com', role: UserRole.MENTOR, status: UserStatus.ACTIVE, memberSequence: 2 },
  { id: '3', name: 'John Doe', email: 'john@gmail.com', role: UserRole.STUDENT, status: UserStatus.SUSPENDED, memberSequence: 105 },
  { id: '4', name: 'Jane Smith', email: 'jane@yahoo.com', role: UserRole.STUDENT, status: UserStatus.ACTIVE, memberSequence: 106 },
  { id: '5', name: 'Super Admin', email: 'root@kodman.id', role: UserRole.SUPERADMIN, status: UserStatus.ACTIVE, memberSequence: 1 },
  { id: '6', name: 'System Admin', email: 'admin@kodman.id', role: UserRole.ADMIN_SYSTEM, status: UserStatus.ACTIVE, memberSequence: 2 },
  { id: '7', name: 'Ulpermadi Ibrahim', email: 'ulpermadi@kodman.id', role: UserRole.DIRECTOR, status: UserStatus.ACTIVE, memberSequence: 1 },
];

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [activeTab, setActiveTab] = useState<'INTERNAL' | 'MENTOR' | 'CREATOR' | 'STUDENT'>('STUDENT');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Edit State
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Filtering Logic
  const getFilteredUsers = () => {
    let filtered = users;

    switch (activeTab) {
      case 'INTERNAL':
        filtered = users.filter(u => [UserRole.SUPERADMIN, UserRole.ADMIN_SYSTEM, UserRole.DIRECTOR].includes(u.role));
        break;
      case 'MENTOR':
        filtered = users.filter(u => u.role === UserRole.MENTOR);
        break;
      case 'CREATOR':
        filtered = users.filter(u => u.role === UserRole.CREATOR);
        break;
      case 'STUDENT':
        filtered = users.filter(u => u.role === UserRole.STUDENT);
        break;
    }

    if (searchTerm) {
      filtered = filtered.filter(u => 
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  };

  const filteredUsers = getFilteredUsers();

  const getPrefix = (role: UserRole) => {
     if ([UserRole.SUPERADMIN, UserRole.ADMIN_SYSTEM, UserRole.DIRECTOR].includes(role)) return 'A';
     if (role === UserRole.CREATOR) return 'C';
     if (role === UserRole.MENTOR) return 'M';
     return 'S';
  };

  const handleSaveUser = (e: React.FormEvent) => {
     e.preventDefault();
     if (!editingUser) return;
     
     setUsers(prev => prev.map(u => u.id === editingUser.id ? editingUser : u));
     setEditingUser(null);
     alert("Data pengguna berhasil diperbarui!");
  };

  const handleDeleteUser = (id: string) => {
     if(confirm("Apakah Anda yakin ingin menghapus user ini? Tindakan ini tidak dapat dibatalkan.")) {
        setUsers(prev => prev.filter(u => u.id !== id));
     }
  };

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
      <div className="grid grid-cols-4 gap-2 mb-6 p-1 bg-gray-100 dark:bg-slate-800 rounded-lg">
         <button 
            onClick={() => setActiveTab('INTERNAL')}
            className={`py-2 rounded-md text-sm font-bold flex items-center justify-center transition ${activeTab === 'INTERNAL' ? 'bg-white dark:bg-slate-700 shadow-sm text-kodman-600 dark:text-white' : 'text-gray-500 hover:text-gray-700'}`}
         >
            <Shield size={16} className="mr-2 hidden md:block" /> Internal <span className="ml-1 hidden md:inline text-[10px] bg-gray-200 dark:bg-slate-600 px-1.5 rounded-full text-gray-600 dark:text-slate-300">A</span>
         </button>
         <button 
            onClick={() => setActiveTab('MENTOR')}
            className={`py-2 rounded-md text-sm font-bold flex items-center justify-center transition ${activeTab === 'MENTOR' ? 'bg-white dark:bg-slate-700 shadow-sm text-purple-600 dark:text-white' : 'text-gray-500 hover:text-gray-700'}`}
         >
            <GraduationCap size={16} className="mr-2 hidden md:block" /> Mentor <span className="ml-1 hidden md:inline text-[10px] bg-gray-200 dark:bg-slate-600 px-1.5 rounded-full text-gray-600 dark:text-slate-300">M</span>
         </button>
         <button 
            onClick={() => setActiveTab('CREATOR')}
            className={`py-2 rounded-md text-sm font-bold flex items-center justify-center transition ${activeTab === 'CREATOR' ? 'bg-white dark:bg-slate-700 shadow-sm text-orange-600 dark:text-white' : 'text-gray-500 hover:text-gray-700'}`}
         >
            <Star size={16} className="mr-2 hidden md:block" /> Creator <span className="ml-1 hidden md:inline text-[10px] bg-gray-200 dark:bg-slate-600 px-1.5 rounded-full text-gray-600 dark:text-slate-300">C</span>
         </button>
         <button 
            onClick={() => setActiveTab('STUDENT')}
            className={`py-2 rounded-md text-sm font-bold flex items-center justify-center transition ${activeTab === 'STUDENT' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-white' : 'text-gray-500 hover:text-gray-700'}`}
         >
            <UserIcon size={16} className="mr-2 hidden md:block" /> Student <span className="ml-1 hidden md:inline text-[10px] bg-gray-200 dark:bg-slate-600 px-1.5 rounded-full text-gray-600 dark:text-slate-300">S</span>
         </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 dark:border-slate-800 flex gap-4">
           <div className="relative flex-1">
             <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
             <input 
               type="text" 
               placeholder="Cari nama atau email..." 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-md text-sm focus:ring-1 focus:ring-kodman-500" 
             />
           </div>
           <button className="flex items-center px-3 py-2 border border-gray-300 dark:border-slate-700 rounded text-sm text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800">
              <Filter size={16} className="mr-2" /> Filter
           </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
            <thead className="bg-gray-50 dark:bg-slate-950">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">ID Anggota</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Nama User</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Role Spesifik</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-800">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                  <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-gray-500 dark:text-slate-400">
                     {getPrefix(user.role)}.{new Date().getFullYear().toString().slice(-2)}.{(user.memberSequence || 0).toString().padStart(6, '0')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-slate-700 flex items-center justify-center text-gray-500 dark:text-slate-300 font-bold text-xs mr-3">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</div>
                        <div className="text-xs text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${user.role === UserRole.DIRECTOR ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' : 
                        user.role === UserRole.SUPERADMIN ? 'bg-red-100 text-red-800 border border-red-200' : 
                        'bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-300 border border-gray-200 dark:border-slate-700'}`}>
                      {user.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-bold ${user.status === UserStatus.ACTIVE ? 'text-green-600' : 'text-red-500'}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => setEditingUser(user)} className="text-kodman-600 dark:text-kodman-400 hover:text-kodman-900 mx-2"><Edit size={16} /></button>
                    {user.role !== UserRole.SUPERADMIN && (
                       <button onClick={() => handleDeleteUser(user.id)} className="text-red-600 hover:text-red-900"><Trash2 size={16} /></button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                 <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-slate-400">
                       Tidak ada data pengguna ditemukan di kategori ini.
                    </td>
                 </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingUser && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-xl shadow-2xl overflow-hidden border border-gray-200 dark:border-slate-800 animate-fade-in-up">
               <div className="flex justify-between items-center p-5 border-b border-gray-200 dark:border-slate-800">
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center">
                     <Edit className="mr-2 text-kodman-600" size={20} /> Edit User
                  </h3>
                  <button onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-red-500">
                     <X size={20} />
                  </button>
               </div>
               
               <form onSubmit={handleSaveUser} className="p-6 space-y-4">
                  <div>
                     <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Nama Lengkap</label>
                     <input 
                        type="text" 
                        value={editingUser.name}
                        onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                        className="w-full p-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded"
                     />
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Email</label>
                     <input 
                        type="email" 
                        value={editingUser.email}
                        onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                        className="w-full p-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded"
                     />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Role</label>
                        <select 
                           value={editingUser.role}
                           onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as UserRole })}
                           className="w-full p-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded"
                        >
                           {Object.values(UserRole).map(r => (
                              <option key={r} value={r}>{r}</option>
                           ))}
                        </select>
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Status</label>
                        <select 
                           value={editingUser.status}
                           onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value as UserStatus })}
                           className="w-full p-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded"
                        >
                           {Object.values(UserStatus).map(s => (
                              <option key={s} value={s}>{s}</option>
                           ))}
                        </select>
                     </div>
                  </div>
                  
                  <div className="pt-4 flex justify-end gap-2">
                     <button type="button" onClick={() => setEditingUser(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Batal</button>
                     <button type="submit" className="px-6 py-2 bg-kodman-600 text-white rounded font-bold hover:bg-kodman-700 flex items-center">
                        <Save size={16} className="mr-2" /> Simpan Perubahan
                     </button>
                  </div>
               </form>
            </div>
         </div>
      )}
    </div>
  );
};

export default UserManagement;