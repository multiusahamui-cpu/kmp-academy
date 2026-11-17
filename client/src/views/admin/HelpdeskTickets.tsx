import React, { useState } from 'react';
import { MessageSquare, CheckCircle, Send, Clock } from 'lucide-react';

interface HelpdeskTicket {
  id: string;
  subject: string;
  user: string;
  category: string;
  date: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
  messages: {
     sender: 'USER' | 'ADMIN';
     text: string;
     time: string;
  }[];
}

const MOCK_TICKETS: HelpdeskTicket[] = [
  {
    id: 'T-101',
    subject: 'Gagal Login setelah Reset Password',
    user: 'Andi Pratama (Student)',
    category: 'Account Issue',
    date: '27 Okt 2023, 10:30',
    priority: 'HIGH',
    status: 'OPEN',
    messages: [
       { sender: 'USER', text: 'Halo Admin, saya sudah reset password tapi tetap tidak bisa login. Muncul error 403.', time: '10:30' }
    ]
  },
  {
    id: 'T-102',
    subject: 'Sertifikat belum muncul di profil',
    user: 'Dewi Sartika (Student)',
    category: 'Course & Certificate',
    date: '26 Okt 2023, 15:45',
    priority: 'MEDIUM',
    status: 'IN_PROGRESS',
    messages: [
       { sender: 'USER', text: 'Saya sudah lulus ujian course React tapi sertifikat belum ada.', time: '15:45' },
       { sender: 'ADMIN', text: 'Halo Dewi, kami sedang cek log ujian kamu. Mohon ditunggu.', time: '16:00' }
    ]
  },
  {
    id: 'T-103',
    subject: 'Request Refund Double Payment',
    user: 'Budi Santoso (Student)',
    category: 'Billing',
    date: '25 Okt 2023, 09:00',
    priority: 'HIGH',
    status: 'CLOSED',
    messages: [
       { sender: 'USER', text: 'Saya tidak sengaja bayar 2 kali untuk course yang sama.', time: '09:00' },
       { sender: 'ADMIN', text: 'Refund sudah diproses manual ke saldo dompet.', time: '10:00' }
    ]
  }
];

const HelpdeskTickets: React.FC = () => {
  const [tickets, setTickets] = useState<HelpdeskTicket[]>(MOCK_TICKETS);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL');
  const [replyText, setReplyText] = useState('');

  const selectedTicket = tickets.find(t => t.id === selectedTicketId);

  const filteredTickets = tickets.filter(t => {
     if (filterStatus === 'OPEN') return t.status !== 'CLOSED';
     if (filterStatus === 'CLOSED') return t.status === 'CLOSED';
     return true;
  });

  const handleSendReply = (e: React.FormEvent) => {
     e.preventDefault();
     if (!selectedTicket || !replyText) return;

     const newMessage = {
        sender: 'ADMIN' as const,
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
     };

     setTickets(prev => prev.map(t => 
        t.id === selectedTicketId 
        ? { ...t, status: 'IN_PROGRESS', messages: [...t.messages, newMessage] } 
        : t
     ));
     setReplyText('');
  };

  const handleCloseTicket = () => {
     if (confirm('Tandai tiket ini sebagai SELESAI (Closed)?')) {
        setTickets(prev => prev.map(t => 
           t.id === selectedTicketId ? { ...t, status: 'CLOSED' } : t
        ));
        alert('Tiket berhasil ditutup.');
     }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      <div className="flex justify-between items-center mb-6">
         <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
               <MessageSquare className="mr-3 text-kodman-600" /> Helpdesk Support
            </h2>
            <p className="text-gray-500 dark:text-slate-400">Pusat bantuan dan penanganan keluhan pengguna.</p>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full overflow-hidden">
         {/* LEFT: Ticket List */}
         <div className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 flex flex-col h-full overflow-hidden">
            {/* Filter Bar */}
            <div className="p-4 border-b border-gray-200 dark:border-slate-800 flex gap-2 overflow-x-auto">
               <button 
                  onClick={() => setFilterStatus('ALL')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-full whitespace-nowrap ${filterStatus === 'ALL' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
               >
                  Semua
               </button>
               <button 
                  onClick={() => setFilterStatus('OPEN')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-full whitespace-nowrap ${filterStatus === 'OPEN' ? 'bg-green-600 text-white' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
               >
                  Open / Progress
               </button>
               <button 
                  onClick={() => setFilterStatus('CLOSED')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-full whitespace-nowrap ${filterStatus === 'CLOSED' ? 'bg-gray-400 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
               >
                  Closed
               </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
               {filteredTickets.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 text-sm">Tidak ada tiket ditemukan.</div>
               ) : (
                  <div className="divide-y divide-gray-100 dark:divide-slate-800">
                     {filteredTickets.map(ticket => (
                        <div 
                           key={ticket.id}
                           onClick={() => setSelectedTicketId(ticket.id)}
                           className={`p-4 cursor-pointer transition hover:bg-gray-50 dark:hover:bg-slate-800/50 ${selectedTicketId === ticket.id ? 'bg-blue-50 dark:bg-slate-800 border-l-4 border-kodman-600' : 'border-l-4 border-transparent'}`}
                        >
                           <div className="flex justify-between items-start mb-1">
                              <span className={`text-[10px] font-bold px-1.5 rounded uppercase ${
                                 ticket.priority === 'HIGH' ? 'bg-red-100 text-red-600' : ticket.priority === 'MEDIUM' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'
                              }`}>
                                 {ticket.priority}
                              </span>
                              <span className="text-xs text-gray-400">{ticket.date.split(',')[0]}</span>
                           </div>
                           <h4 className="font-bold text-gray-800 dark:text-white text-sm line-clamp-1 mb-1">{ticket.subject}</h4>
                           <p className="text-xs text-gray-500 truncate">{ticket.user}</p>
                           <div className="mt-2 flex items-center justify-between">
                              <span className="text-[10px] bg-gray-100 dark:bg-slate-700 text-gray-500 px-2 py-0.5 rounded-full">{ticket.category}</span>
                              {ticket.status === 'CLOSED' ? <CheckCircle size={14} className="text-gray-400"/> : <Clock size={14} className="text-green-500"/>}
                           </div>
                        </div>
                     ))}
                  </div>
               )}
            </div>
         </div>

         {/* RIGHT: Detail & Chat */}
         <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 flex flex-col h-full overflow-hidden">
            {selectedTicket ? (
               <>
                  {/* Header */}
                  <div className="p-6 border-b border-gray-200 dark:border-slate-800 flex justify-between items-start">
                     <div>
                        <div className="flex items-center gap-3 mb-1">
                           <h3 className="font-bold text-lg text-gray-900 dark:text-white">{selectedTicket.subject}</h3>
                           <span className={`text-xs font-bold px-2 py-0.5 rounded border ${selectedTicket.status === 'OPEN' ? 'border-green-500 text-green-600' : selectedTicket.status === 'CLOSED' ? 'border-gray-400 text-gray-500' : 'border-orange-500 text-orange-600'}`}>
                              {selectedTicket.status}
                           </span>
                        </div>
                        <p className="text-sm text-gray-500">Pelapor: <span className="font-bold text-gray-800 dark:text-white">{selectedTicket.user}</span> • ID: {selectedTicket.id}</p>
                     </div>
                     {selectedTicket.status !== 'CLOSED' && (
                        <button 
                           onClick={handleCloseTicket}
                           className="px-4 py-2 border border-gray-300 text-gray-600 rounded text-sm hover:bg-gray-50 flex items-center"
                        >
                           <CheckCircle size={16} className="mr-2" /> Tutup Tiket
                        </button>
                     )}
                  </div>

                  {/* Chat Area */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50 dark:bg-slate-950">
                     {selectedTicket.messages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.sender === 'ADMIN' ? 'justify-end' : 'justify-start'}`}>
                           <div className={`max-w-[80%] rounded-lg p-3 shadow-sm ${msg.sender === 'ADMIN' ? 'bg-kodman-600 text-white rounded-br-none' : 'bg-white dark:bg-slate-800 text-gray-800 dark:text-white border border-gray-200 dark:border-slate-700 rounded-bl-none'}`}>
                              <p className="text-sm leading-relaxed">{msg.text}</p>
                              <p className={`text-[10px] mt-1 text-right ${msg.sender === 'ADMIN' ? 'text-kodman-200' : 'text-gray-400'}`}>{msg.time}</p>
                           </div>
                        </div>
                     ))}
                     {selectedTicket.status === 'CLOSED' && (
                        <div className="flex justify-center my-4">
                           <span className="px-4 py-1 bg-gray-200 dark:bg-slate-800 text-gray-500 text-xs rounded-full font-bold">TIKET DITUTUP</span>
                        </div>
                     )}
                  </div>

                  {/* Reply Box */}
                  {selectedTicket.status !== 'CLOSED' && (
                     <div className="p-4 border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                        <form onSubmit={handleSendReply} className="flex gap-3">
                           <input 
                              type="text" 
                              className="flex-1 p-3 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-kodman-500"
                              placeholder="Ketik balasan Anda..."
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                           />
                           <button type="submit" className="p-3 bg-kodman-600 text-white rounded-lg hover:bg-kodman-700 shadow-sm">
                              <Send size={20} />
                           </button>
                        </form>
                     </div>
                  )}
               </>
            ) : (
               <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
                  <MessageSquare size={48} className="mb-4 opacity-20" />
                  <p>Pilih tiket dari daftar di sebelah kiri untuk melihat detail percakapan.</p>
               </div>
            )}
         </div>
      </div>
    </div>
  );
};

export default HelpdeskTickets;