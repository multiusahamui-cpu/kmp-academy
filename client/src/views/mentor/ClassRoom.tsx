import React, { useState } from 'react';
import { MessageSquare, Calendar, Edit2, Save, X, Link, Clock, Send, Video } from 'lucide-react';

const ClassRoom: React.FC = () => {
  const [editingGradeId, setEditingGradeId] = useState<string | null>(null);
  
  // Modal States
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);

  // Form States
  const [broadcastSubject, setBroadcastSubject] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  
  const [scheduleTopic, setScheduleTopic] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduleLink, setScheduleLink] = useState('');

  // Mock Students Data
  const [students, setStudents] = useState([
     { id: 's1', name: 'Andi Pratama', progress: 90, assignmentGrade: 0, finalGrade: '-' },
     { id: 's2', name: 'Dewi Sartika', progress: 45, assignmentGrade: 0, finalGrade: '-' },
     { id: 's3', name: 'Budi Raharjo', progress: 100, assignmentGrade: 85, finalGrade: 'Lulus' }
  ]);

  const handleUpdateGrade = (id: string, newGrade: number) => {
     setStudents(prev => prev.map(s => s.id === id ? { ...s, assignmentGrade: newGrade } : s));
     setEditingGradeId(null);
  };

  const handleSendBroadcast = (e: React.FormEvent) => {
     e.preventDefault();
     if (!broadcastSubject || !broadcastMessage) return;
     
     alert(`Pesan "${broadcastSubject}" berhasil dikirim ke ${students.length} siswa!`);
     setIsBroadcastOpen(false);
     setBroadcastSubject('');
     setBroadcastMessage('');
  };

  const handleSaveSchedule = (e: React.FormEvent) => {
     e.preventDefault();
     if (!scheduleTopic || !scheduleDate) return;

     alert(`Jadwal Live Session "${scheduleTopic}" berhasil disimpan untuk tanggal ${scheduleDate} pukul ${scheduleTime}. Notifikasi telah dikirim ke siswa.`);
     setIsScheduleOpen(false);
     setScheduleTopic('');
     setScheduleLink('');
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Rombongan Belajar (Classroom)</h2>
      
      <div className="grid gap-6">
         {/* Class Card */}
         <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden">
            <div className="bg-kodman-50 dark:bg-kodman-900/30 p-4 border-b border-kodman-100 dark:border-slate-800 flex justify-between items-center">
               <div>
                  <h3 className="font-bold text-kodman-900 dark:text-kodman-300 text-lg">Batch 12: Workshop Digital Marketing</h3>
                  <p className="text-sm text-kodman-600 dark:text-kodman-400">Jadwal: Senin & Kamis, 19:00 WIB</p>
               </div>
               <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold rounded-full">Sedang Berjalan</span>
            </div>
            
            <div className="p-6">
               <div className="grid md:grid-cols-3 gap-6 mb-6">
                  <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded text-center border border-gray-100 dark:border-slate-700">
                     <div className="text-2xl font-bold text-gray-800 dark:text-white">{students.length}</div>
                     <div className="text-xs text-gray-500 dark:text-slate-400 uppercase">Total Siswa</div>
                  </div>
                   <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded text-center border border-gray-100 dark:border-slate-700">
                     <div className="text-2xl font-bold text-gray-800 dark:text-white">85%</div>
                     <div className="text-xs text-gray-500 dark:text-slate-400 uppercase">Rata-rata Progress</div>
                  </div>
                   <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded text-center border border-gray-100 dark:border-slate-700">
                     <div className="text-2xl font-bold text-gray-800 dark:text-white">5</div>
                     <div className="text-xs text-gray-500 dark:text-slate-400 uppercase">Tugas Pending Review</div>
                  </div>
               </div>

               <h4 className="font-bold text-gray-800 dark:text-white mb-3">Daftar Siswa & Penilaian</h4>
               <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
                  Pastikan menginput nilai tugas sebelum siswa mengambil Ujian Akhir. Nilai Tugas memiliki bobot 40% dari Nilai Akhir.
               </p>

               <div className="overflow-x-auto border border-gray-200 dark:border-slate-800 rounded-lg mb-6">
                  <table className="w-full text-sm text-left">
                     <thead className="bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400">
                        <tr>
                           <th className="px-4 py-2">Nama</th>
                           <th className="px-4 py-2">Progress Belajar</th>
                           <th className="px-4 py-2">Nilai Tugas (40%)</th>
                           <th className="px-4 py-2">Status Akhir</th>
                           <th className="px-4 py-2">Aksi</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                        {students.map(student => (
                           <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                              <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{student.name}</td>
                              <td className="px-4 py-3">
                                 <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2 mb-1">
                                    <div className={`h-2 rounded-full ${student.progress === 100 ? 'bg-green-500' : 'bg-blue-500'}`} style={{width: `${student.progress}%`}}></div>
                                 </div>
                                 <span className="text-xs text-gray-500 dark:text-slate-400">{student.progress}% Selesai</span>
                              </td>
                              <td className="px-4 py-3">
                                 {editingGradeId === student.id ? (
                                    <div className="flex items-center gap-2">
                                       <input 
                                          autoFocus
                                          type="number" 
                                          defaultValue={student.assignmentGrade}
                                          className="w-16 p-1 border rounded text-center dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                          onBlur={(e) => handleUpdateGrade(student.id, Number(e.target.value))}
                                          onKeyDown={(e) => {
                                             if(e.key === 'Enter') handleUpdateGrade(student.id, Number(e.currentTarget.value))
                                          }}
                                       />
                                       <span className="text-xs text-gray-400">Press Enter</span>
                                    </div>
                                 ) : (
                                    <span className={`font-bold ${student.assignmentGrade > 0 ? 'text-gray-900 dark:text-white' : 'text-red-400'}`}>
                                       {student.assignmentGrade > 0 ? student.assignmentGrade : 'Belum Dinilai'}
                                    </span>
                                 )}
                              </td>
                              <td className="px-4 py-3">
                                 <span className={`px-2 py-0.5 rounded text-xs font-bold ${student.finalGrade === 'Lulus' ? 'bg-green-100 text-green-700' : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400'}`}>
                                    {student.finalGrade}
                                 </span>
                              </td>
                              <td className="px-4 py-3">
                                 {editingGradeId === student.id ? (
                                    <button className="text-green-600 hover:text-green-800" title="Simpan">
                                       <Save size={16} />
                                    </button>
                                 ) : (
                                    <button onClick={() => setEditingGradeId(student.id)} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1 text-xs font-medium">
                                       <Edit2 size={14} /> Input Nilai
                                    </button>
                                 )}
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>

               <div className="flex flex-col sm:flex-row gap-3">
                  <button 
                     onClick={() => setIsScheduleOpen(true)}
                     className="flex items-center justify-center px-4 py-2 bg-kodman-600 text-white rounded hover:bg-kodman-700 transition shadow-sm font-medium text-sm"
                  >
                     <Video size={16} className="mr-2" /> Atur Jadwal Zoom
                  </button>
                  <button 
                     onClick={() => setIsBroadcastOpen(true)}
                     className="flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded hover:bg-gray-50 dark:hover:bg-slate-800 transition font-medium text-sm"
                  >
                     <MessageSquare size={16} className="mr-2" /> Broadcast Pesan
                  </button>
               </div>
            </div>
         </div>
      </div>

      {/* --- BROADCAST MODAL --- */}
      {isBroadcastOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-xl shadow-2xl overflow-hidden border border-gray-200 dark:border-slate-800 animate-fade-in-up">
               <div className="flex justify-between items-center p-5 border-b border-gray-200 dark:border-slate-800">
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center">
                     <MessageSquare className="mr-2 text-kodman-600" /> Broadcast Pesan Kelas
                  </h3>
                  <button onClick={() => setIsBroadcastOpen(false)} className="text-gray-400 hover:text-red-500">
                     <X size={20} />
                  </button>
               </div>
               <div className="p-6">
                  <form onSubmit={handleSendBroadcast} className="space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Subjek Pesan</label>
                        <input 
                           type="text" 
                           required
                           className="w-full p-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded focus:ring-2 focus:ring-kodman-500 outline-none"
                           placeholder="Contoh: Perubahan Jadwal Sesi 3"
                           value={broadcastSubject}
                           onChange={(e) => setBroadcastSubject(e.target.value)}
                        />
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Isi Pesan</label>
                        <textarea 
                           required
                           rows={5}
                           className="w-full p-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded focus:ring-2 focus:ring-kodman-500 outline-none"
                           placeholder="Tulis pesan Anda di sini..."
                           value={broadcastMessage}
                           onChange={(e) => setBroadcastMessage(e.target.value)}
                        ></textarea>
                     </div>
                     <div className="flex items-center justify-between pt-2">
                        <span className="text-xs text-gray-500 dark:text-slate-400">
                           Penerima: <strong>{students.length} Siswa</strong> (Semua Anggota Batch)
                        </span>
                        <button type="submit" className="px-6 py-2 bg-kodman-600 text-white rounded font-bold hover:bg-kodman-700 shadow-md flex items-center">
                           <Send size={16} className="mr-2" /> Kirim Sekarang
                        </button>
                     </div>
                  </form>
               </div>
            </div>
         </div>
      )}

      {/* --- ZOOM SCHEDULE MODAL --- */}
      {isScheduleOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-xl shadow-2xl overflow-hidden border border-gray-200 dark:border-slate-800 animate-fade-in-up">
               <div className="flex justify-between items-center p-5 border-b border-gray-200 dark:border-slate-800 bg-blue-50 dark:bg-blue-900/10">
                  <h3 className="font-bold text-lg text-blue-900 dark:text-blue-300 flex items-center">
                     <Video className="mr-2" /> Jadwalkan Live Session
                  </h3>
                  <button onClick={() => setIsScheduleOpen(false)} className="text-gray-400 hover:text-red-500">
                     <X size={20} />
                  </button>
               </div>
               <div className="p-6">
                  <form onSubmit={handleSaveSchedule} className="space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Topik Pembahasan</label>
                        <input 
                           type="text" 
                           required
                           className="w-full p-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded"
                           placeholder="Contoh: Q&A Modul Digital Marketing"
                           value={scheduleTopic}
                           onChange={(e) => setScheduleTopic(e.target.value)}
                        />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Tanggal</label>
                           <div className="relative">
                              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                              <input 
                                 type="date" 
                                 required
                                 className="w-full pl-9 pr-2 py-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded"
                                 value={scheduleDate}
                                 onChange={(e) => setScheduleDate(e.target.value)}
                              />
                           </div>
                        </div>
                        <div>
                           <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Waktu (WIB)</label>
                           <div className="relative">
                              <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                              <input 
                                 type="time" 
                                 required
                                 className="w-full pl-9 pr-2 py-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded"
                                 value={scheduleTime}
                                 onChange={(e) => setScheduleTime(e.target.value)}
                              />
                           </div>
                        </div>
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Link Meeting (Zoom/GMeet)</label>
                        <div className="relative">
                           <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                           <input 
                              type="url" 
                              className="w-full pl-9 pr-2 py-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded text-blue-600"
                              placeholder="https://zoom.us/j/..."
                              value={scheduleLink}
                              onChange={(e) => setScheduleLink(e.target.value)}
                           />
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1">Biarkan kosong jika akan di-generate otomatis oleh sistem (Premium).</p>
                     </div>
                     
                     <div className="pt-4 flex justify-end">
                        <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 shadow-md">
                           Simpan & Notifikasi Siswa
                        </button>
                     </div>
                  </form>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default ClassRoom;