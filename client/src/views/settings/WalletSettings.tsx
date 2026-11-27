
import { toast } from "../../services/toast";
import React, { useState, useEffect } from 'react';
import { UserRole } from '../../types';
import { Plus, Trash2, RefreshCw, Eye, EyeOff, Landmark, History, ArrowDownLeft, ArrowUpRight, Search, Loader2 } from 'lucide-react';
import { userApi } from '../../services/api';
import TopUpModal from '../../components/TopUpModal';
import MyOrdersCard from '../../components/MyOrdersCard';

interface WalletSettingsProps {
  role: UserRole;
}

interface WalletHistoryItem {
   id: string;
   createdAt: string;
   type: string;
   amount: number;
   description?: string | null;
   referenceId?: string | null;
   status?: string | null;
}

interface WalletBank {
   id: string;
   bankName: string;
   accountNumber: string;
   holderName: string;
}

// Interface for API Data
interface WalletData {
   balance: number;
   isMember: boolean;
   mode: 'SIMPANAN_SUKARELA' | 'VA_INFO';
   paymentsEnabled: boolean;
   history: WalletHistoryItem[]; // Raw DB transaction objects
   banks: WalletBank[];
}

const WalletSettings: React.FC<WalletSettingsProps> = ({ role }) => {
  const [walletData, setWalletData] = useState<WalletData>({ balance: 0, isMember: false, mode: 'VA_INFO', paymentsEnabled: false, history: [], banks: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [showBalance, setShowBalance] = useState(false);
  
  // UI States
  const [isAddingBank, setIsAddingBank] = useState(false);
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Forms
  const [newBankName, setNewBankName] = useState('BCA');
  const [newBankNumber, setNewBankNumber] = useState('');
  const [newHolderName, setNewHolderName] = useState('');
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  const [ordersKey, setOrdersKey] = useState(0);

  // --- Fetch Real Wallet Data ---
  useEffect(() => {
     fetchWalletData();
  }, []);

  const fetchWalletData = async () => {
     try {
        setIsLoading(true);
        const res = await userApi.getWallet(); // Returns { data: { balance, history, banks } }
        setWalletData(res.data.data);
     } catch (err) {
        console.error("Failed to load wallet", err);
     } finally {
        setIsLoading(false);
     }
  };

  // --- Handlers (Real API) ---

  const handleAddBank = async (e: React.FormEvent) => {
     e.preventDefault();
     setIsProcessing(true);
     try {
        await userApi.addBankAccount({
           bankName: newBankName,
           accountNumber: newBankNumber,
           holderName: newHolderName
        });
        toast.success("Rekening berhasil ditambahkan.");
        setIsAddingBank(false);
        setNewBankNumber('');
        setNewHolderName('');
        fetchWalletData(); // Refresh list
     } catch {
        toast.error("Gagal menambah rekening.");
     } finally {
        setIsProcessing(false);
     }
  };

  const handleWithdraw = async () => {
     const amountStr = prompt("Masukkan jumlah penarikan:");
     if(!amountStr) return;
     const amount = parseInt(amountStr);
     
     if (amount > walletData.balance) {
        toast.error("Saldo tidak mencukupi.");
        return;
     }

     setIsProcessing(true);
     try {
        await userApi.withdrawWallet({ amount, bankId: walletData.banks[0]?.id || 'default' });
        toast.success("Permintaan penarikan dibuat. Menunggu persetujuan Admin.");
        fetchWalletData();
     } catch {
        toast.error("Gagal melakukan withdraw.");
     } finally {
        setIsProcessing(false);
     }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Dompet & Pembayaran (Live Database)</h2>
           <p className="text-gray-500 dark:text-slate-400">
             {role === UserRole.STUDENT ? 'Kelola saldo, metode pembayaran, dan riwayat transaksi.' : 'Kelola pencairan dana (revenue) Anda.'}
           </p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
         {/* LEFT COLUMN: Balance & Methods */}
         <div className="md:col-span-1 space-y-6">
            
            {/* Balance Card */}
            <div className="bg-gradient-to-br from-digitalcoop-900 to-digitalcoop-700 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden group">
               <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition duration-700"></div>
               
               <div className="relative z-10">
                  <p className="text-digitalcoop-100 text-xs font-bold uppercase tracking-wider mb-2">
                     {walletData.mode === 'SIMPANAN_SUKARELA' ? 'Simpanan Sukarela' : 'Saldo Efektif'}
                  </p>
                  <div className="flex items-center justify-between mb-4">
                     <h3 className="text-3xl font-bold tracking-tight font-mono">
                        {isLoading ? (
                           <Loader2 className="animate-spin" />
                        ) : showBalance ? (
                           new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(walletData.balance)
                        ) : (
                           'Rp ••••••••'
                        )}
                     </h3>
                     <button 
                        onClick={() => setShowBalance(!showBalance)}
                        className="text-digitalcoop-200 hover:text-white transition p-2 rounded-full hover:bg-white/10"
                     >
                        {showBalance ? <EyeOff size={20} /> : <Eye size={20} />}
                     </button>
                  </div>

                  <p className="mb-4 text-xs text-digitalcoop-100 leading-relaxed">
                     {walletData.mode === 'SIMPANAN_SUKARELA'
                        ? 'Dompet Academy Anda adalah Simpanan Sukarela di digitalcoop.id dan disinkronkan dari saldo asli Anda di sana.'
                        : 'Pembayaran kursus dilakukan langsung lewat Virtual Account setelah payment gateway aktif.'}
                     {!walletData.paymentsEnabled && ' Penarikan belum tersedia.'}
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                     {role === UserRole.STUDENT ? (
                        <button 
                           onClick={() => setIsTopUpOpen(true)}
                           disabled={isProcessing}
                           className="py-2.5 bg-white text-digitalcoop-900 rounded-xl text-sm font-bold flex items-center justify-center hover:bg-gray-100 transition shadow-lg"
                        >
                           <Plus size={16} className="mr-2" /> Top Up
                        </button>
                     ) : (
                        <button 
                           onClick={handleWithdraw}
                           disabled={isProcessing || !walletData.paymentsEnabled}
                           className="py-2.5 bg-white text-digitalcoop-900 rounded-xl text-sm font-bold flex items-center justify-center hover:bg-gray-100 transition shadow-lg"
                        >
                           <RefreshCw size={16} className="mr-2" /> Withdraw
                        </button>
                     )}
                     <button className="py-2.5 bg-digitalcoop-800/50 text-white border border-white/20 rounded-xl text-sm font-medium flex items-center justify-center hover:bg-digitalcoop-800 transition">
                        <History size={16} className="mr-2" /> History
                     </button>
                  </div>
               </div>
            </div>

            <MyOrdersCard refreshKey={ordersKey} onOpen={(o) => setOpenOrderId(o.id)} />

            {/* Bank Accounts (Outbound) */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-5 shadow-sm">
               <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-900 dark:text-white text-sm flex items-center">
                     <Landmark size={16} className="mr-2 text-digitalcoop-600" /> Rekening Bank
                  </h3>
                  <button 
                     onClick={() => setIsAddingBank(!isAddingBank)}
                     className="text-xs bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 px-2 py-1 rounded text-gray-600 dark:text-slate-300 transition"
                  >
                     {isAddingBank ? 'Batal' : '+ Tambah'}
                  </button>
               </div>

               {isAddingBank && (
                  <form onSubmit={handleAddBank} className="mb-4 bg-gray-50 dark:bg-slate-800 p-3 rounded-lg border border-gray-200 dark:border-slate-700 animate-fade-in-down">
                     <div className="space-y-2">
                        <select 
                           className="w-full p-2 text-xs border rounded dark:bg-slate-900 dark:border-slate-600 dark:text-white"
                           value={newBankName}
                           onChange={(e) => setNewBankName(e.target.value)}
                        >
                           <option value="BCA">BCA</option>
                           <option value="MANDIRI">MANDIRI</option>
                           <option value="BNI">BNI</option>
                           <option value="BRI">BRI</option>
                        </select>
                        <input 
                           type="text" 
                           placeholder="Atas Nama (Sesuai KTP)" 
                           className="w-full p-2 text-xs border rounded dark:bg-slate-900 dark:border-slate-600 dark:text-white"
                           value={newHolderName}
                           onChange={(e) => setNewHolderName(e.target.value)}
                           required
                        />
                        <input 
                           type="number" 
                           placeholder="Nomor Rekening" 
                           className="w-full p-2 text-xs border rounded dark:bg-slate-900 dark:border-slate-600 dark:text-white"
                           value={newBankNumber}
                           onChange={(e) => setNewBankNumber(e.target.value)}
                           required
                        />
                        <button type="submit" disabled={isProcessing} className="w-full py-1.5 bg-digitalcoop-600 text-white text-xs font-bold rounded hover:bg-digitalcoop-700">
                           {isProcessing ? 'Menyimpan...' : 'Simpan Rekening'}
                        </button>
                     </div>
                  </form>
               )}

               <div className="space-y-3">
                  {walletData.banks.length === 0 ? (
                     <p className="text-xs text-gray-400 text-center py-2">Belum ada rekening terdaftar di database.</p>
                  ) : (
                     walletData.banks.map((bank) => (
                        <div key={bank.id} className="p-3 rounded-lg border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/30 flex justify-between items-center group">
                           <div>
                              <p className="text-xs font-bold text-gray-800 dark:text-slate-200">{bank.bankName} - {bank.accountNumber}</p>
                              <p className="text-[10px] text-gray-500 uppercase">A.N {bank.holderName}</p>
                           </div>
                           <button className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition">
                              <Trash2 size={14} />
                           </button>
                        </div>
                     ))
                  )}
               </div>
            </div>
         </div>

         {/* RIGHT COLUMN: Transaction History */}
         <div className="md:col-span-2">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden h-full flex flex-col">
               <div className="p-5 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-950">
                  <h3 className="font-bold text-gray-900 dark:text-white flex items-center">
                     <History size={18} className="mr-2 text-digitalcoop-600" /> Riwayat Transaksi (Realtime)
                  </h3>
                  <div className="relative">
                     <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                     <input type="text" placeholder="Cari transaksi..." className="pl-7 pr-3 py-1 text-xs border rounded-full bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-white focus:outline-none focus:border-digitalcoop-500" />
                  </div>
               </div>
               
               <div className="overflow-y-auto flex-1 p-0 h-[500px]">
                  {walletData.history.length === 0 ? (
                     <div className="p-8 text-center text-gray-500 dark:text-slate-400 text-sm">
                        Belum ada riwayat transaksi.
                     </div>
                  ) : (
                     <table className="w-full text-sm text-left">
                        <thead className="bg-white dark:bg-slate-900 text-gray-500 border-b dark:border-slate-800 sticky top-0">
                           <tr>
                              <th className="px-6 py-3 font-medium text-xs uppercase">Tanggal</th>
                              <th className="px-6 py-3 font-medium text-xs uppercase">Keterangan</th>
                              <th className="px-6 py-3 font-medium text-xs uppercase text-right">Jumlah</th>
                              <th className="px-6 py-3 font-medium text-xs uppercase text-center">Status</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                           {walletData.history.map((trx) => (
                              <tr key={trx.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition">
                                 <td className="px-6 py-4">
                                    <p className="font-bold text-gray-900 dark:text-white text-xs">
                                       {new Date(trx.createdAt).toLocaleDateString('id-ID')}
                                    </p>
                                    <p className="text-[10px] text-gray-400 font-mono mt-0.5">{trx.id.substring(0,8)}...</p>
                                 </td>
                                 <td className="px-6 py-4">
                                    <div className="flex items-start gap-2">
                                       <div className={`p-1.5 rounded-full mt-0.5 ${trx.type === 'CREDIT' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                          {trx.type === 'CREDIT' ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
                                       </div>
                                       <div>
                                          <span className="text-gray-700 dark:text-slate-300 text-sm block">{trx.description}</span>
                                          {trx.referenceId && <span className="text-[10px] text-gray-400">Ref: {trx.referenceId}</span>}
                                       </div>
                                    </div>
                                 </td>
                                 <td className={`px-6 py-4 text-right font-mono font-bold ${trx.type === 'CREDIT' ? 'text-green-600' : 'text-gray-900 dark:text-white'}`}>
                                    {trx.type === 'CREDIT' ? '+' : '-'} {new Intl.NumberFormat('id-ID').format(trx.amount)}
                                 </td>
                                 <td className="px-6 py-4 text-center">
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                                       trx.status === 'SUCCESS' ? 'bg-green-100 text-green-700' : 
                                       trx.status === 'PENDING' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'
                                    }`}>
                                       {trx.status}
                                    </span>
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  )}
               </div>
            </div>
         </div>
      </div>

      {/* Top Up (order pembayaran: Virtual Account atau transfer manual) */}
      {(isTopUpOpen || openOrderId) && (
         <TopUpModal
            existingOrderId={openOrderId}
            onClose={() => { setIsTopUpOpen(false); setOpenOrderId(null); setOrdersKey((k) => k + 1); fetchWalletData(); }}
            onPaid={() => { setOrdersKey((k) => k + 1); fetchWalletData(); }}
         />
      )}

    </div>
  );
};

export default WalletSettings;
