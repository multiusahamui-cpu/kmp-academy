import React, { useState } from 'react';
import { Download, PieChart, Calendar, Award } from 'lucide-react';

const MOCK_TOP_PARTNERS = [
   { rank: 1, name: 'Budi Santoso', role: 'Creator', revenue: 45000000, students: 1200 },
   { rank: 2, name: 'Siti Aminah', role: 'Mentor', revenue: 32500000, students: 450 },
   { rank: 3, name: 'Dr. Rahmat', role: 'Mentor', revenue: 28000000, students: 300 },
   { rank: 4, name: 'LRQA Indonesia', role: 'Partner (B2B)', revenue: 150000000, students: 20 },
];

const StrategicReport: React.FC = () => {
  const [period, setPeriod] = useState('OCT-2023');

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
         <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
               <PieChart className="mr-3 text-kodman-600" /> Laporan Strategis
            </h2>
            <p className="text-gray-500 dark:text-slate-400">Analisis performa bisnis, pertumbuhan, dan kontribusi partner.</p>
         </div>
         <div className="flex gap-3">
            <div className="relative">
               <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
               <select 
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="pl-9 pr-8 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-sm font-bold shadow-sm focus:ring-kodman-500"
               >
                  <option value="OCT-2023">Oktober 2023</option>
                  <option value="SEP-2023">September 2023</option>
                  <option value="AUG-2023">Agustus 2023</option>
               </select>
            </div>
            <button className="flex items-center px-4 py-2 bg-kodman-600 text-white rounded-lg hover:bg-kodman-700 font-bold text-sm shadow-sm transition">
               <Download size={16} className="mr-2" /> Export PDF
            </button>
         </div>
      </div>

      {/* Financial Breakdown */}
      <div className="grid md:grid-cols-3 gap-6">
         <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 md:col-span-2">
            <h3 className="font-bold text-gray-900 dark:text-white mb-6">Komposisi Pendapatan (Revenue Stream)</h3>
            <div className="flex items-end justify-between h-48 px-4 gap-8">
               <div className="flex-1 flex flex-col justify-end group cursor-pointer">
                  <div className="bg-blue-500 h-[60%] rounded-t-lg relative w-full transition-all hover:opacity-90">
                     <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition">Rp 650jt</div>
                  </div>
                  <p className="text-center text-xs font-bold mt-2 text-gray-600 dark:text-slate-400">Retail Sales (Mandiri)</p>
               </div>
               <div className="flex-1 flex flex-col justify-end group cursor-pointer">
                  <div className="bg-purple-500 h-[40%] rounded-t-lg relative w-full transition-all hover:opacity-90">
                     <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition">Rp 420jt</div>
                  </div>
                  <p className="text-center text-xs font-bold mt-2 text-gray-600 dark:text-slate-400">Workshop & Live Class</p>
               </div>
               <div className="flex-1 flex flex-col justify-end group cursor-pointer">
                  <div className="bg-orange-500 h-[80%] rounded-t-lg relative w-full transition-all hover:opacity-90">
                     <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition">Rp 850jt</div>
                  </div>
                  <p className="text-center text-xs font-bold mt-2 text-gray-600 dark:text-slate-400">B2B & Sertifikasi</p>
               </div>
            </div>
         </div>

         <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4">Pertumbuhan User</h3>
            <div className="space-y-6">
               <div>
                  <div className="flex justify-between mb-1">
                     <span className="text-sm text-gray-600 dark:text-slate-400">Student Baru</span>
                     <span className="font-bold text-green-600">+15%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                     <div className="bg-green-500 h-2 rounded-full" style={{width: '75%'}}></div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">1,240</p>
               </div>
               <div>
                  <div className="flex justify-between mb-1">
                     <span className="text-sm text-gray-600 dark:text-slate-400">Mentor Baru</span>
                     <span className="font-bold text-blue-600">+5%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                     <div className="bg-blue-500 h-2 rounded-full" style={{width: '45%'}}></div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">12</p>
               </div>
            </div>
         </div>
      </div>

      {/* Top Partners Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden">
         <div className="p-6 border-b border-gray-200 dark:border-slate-800 bg-yellow-50 dark:bg-yellow-900/10 flex justify-between items-center">
            <h3 className="font-bold text-yellow-800 dark:text-yellow-500 flex items-center">
               <Award className="mr-2" /> Top Performing Partners (Revenue Generator)
            </h3>
            <span className="text-xs font-bold text-yellow-700 dark:text-yellow-600 uppercase tracking-wider">Periode: {period}</span>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
               <thead className="bg-white dark:bg-slate-950 text-gray-500 dark:text-slate-400">
                  <tr>
                     <th className="px-6 py-4">Rank</th>
                     <th className="px-6 py-4">Nama Partner</th>
                     <th className="px-6 py-4">Role</th>
                     <th className="px-6 py-4 text-right">Siswa Terdaftar</th>
                     <th className="px-6 py-4 text-right">Total Revenue Generated</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {MOCK_TOP_PARTNERS.map((partner) => (
                     <tr key={partner.rank} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                        <td className="px-6 py-4">
                           <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                              partner.rank === 1 ? 'bg-yellow-400' : 
                              partner.rank === 2 ? 'bg-gray-400' : 
                              partner.rank === 3 ? 'bg-orange-400' : 'bg-slate-200 text-slate-600'
                           }`}>
                              {partner.rank}
                           </div>
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{partner.name}</td>
                        <td className="px-6 py-4">
                           <span className="bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 px-2 py-1 rounded text-xs font-bold uppercase">{partner.role}</span>
                        </td>
                        <td className="px-6 py-4 text-right font-mono">{partner.students.toLocaleString()}</td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-kodman-600 dark:text-kodman-400">
                           {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(partner.revenue)}
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

export default StrategicReport;