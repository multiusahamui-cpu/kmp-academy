import React, { useState } from 'react';
import { MOCK_CATEGORIES } from '../../constants';
import { Category } from '../../types';
import { Plus, Trash2, Edit, Search, Tag } from 'lucide-react';

const CategoryManager: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>(MOCK_CATEGORIES);
  const [searchTerm, setSearchTerm] = useState('');
  
  // New Category State
  const [isAdding, setIsAdding] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatSlug, setNewCatSlug] = useState('');

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName || !newCatSlug) return;

    const newCategory: Category = {
      id: `cat-${Date.now()}`,
      name: newCatName,
      slug: newCatSlug.toLowerCase().replace(/\s+/g, '-'),
      count: 0
    };

    setCategories([...categories, newCategory]);
    setNewCatName('');
    setNewCatSlug('');
    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus kategori ini?')) {
      setCategories(categories.filter(c => c.id !== id));
    }
  };

  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <div>
           <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Manajemen Kategori</h2>
           <p className="text-gray-500 dark:text-slate-400">Atur taksonomi kursus untuk memudahkan pencarian.</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center px-4 py-2 bg-kodman-600 text-white rounded-lg hover:bg-kodman-700 font-bold text-sm shadow-sm"
        >
          <Plus size={18} className="mr-2" /> Tambah Kategori
        </button>
      </div>

      {isAdding && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-sm border border-kodman-200 dark:border-kodman-800 mb-6 animate-fade-in-down">
           <h3 className="font-bold text-gray-800 dark:text-white mb-4">Input Kategori Baru</h3>
           <form onSubmit={handleAddCategory} className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 w-full">
                 <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Nama Kategori</label>
                 <input 
                    type="text" 
                    value={newCatName}
                    onChange={(e) => {
                       setNewCatName(e.target.value);
                       setNewCatSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'));
                    }}
                    className="w-full p-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded focus:ring-2 focus:ring-kodman-500" 
                    placeholder="Contoh: Digital Marketing"
                 />
              </div>
              <div className="flex-1 w-full">
                 <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Slug URL</label>
                 <input 
                    type="text" 
                    value={newCatSlug}
                    onChange={(e) => setNewCatSlug(e.target.value)}
                    className="w-full p-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-400 rounded bg-gray-50 font-mono text-sm" 
                 />
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                 <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded hover:bg-gray-50 dark:hover:bg-slate-800">Batal</button>
                 <button type="submit" className="px-4 py-2 bg-kodman-600 text-white rounded font-bold hover:bg-kodman-700">Simpan</button>
              </div>
           </form>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 dark:border-slate-800">
           <div className="relative max-w-md">
             <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
             <input 
               type="text" 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               placeholder="Cari kategori..." 
               className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-md text-sm focus:ring-1 focus:ring-kodman-500" 
             />
           </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
            <thead className="bg-gray-50 dark:bg-slate-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Nama Kategori</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Slug</th>
                <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Jumlah Kursus</th>
                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-800">
              {filteredCategories.map((cat) => (
                <tr key={cat.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                  <td className="px-6 py-4 whitespace-nowrap">
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                           <Tag size={16} />
                        </div>
                        <span className="font-bold text-gray-900 dark:text-white">{cat.name}</span>
                     </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400 font-mono">
                     /{cat.slug}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                     <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-300">
                        {cat.count} Item
                     </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-kodman-600 dark:text-kodman-400 hover:text-kodman-900 mx-2"><Edit size={16} /></button>
                    <button onClick={() => handleDelete(cat.id)} className="text-red-600 hover:text-red-900"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CategoryManager;