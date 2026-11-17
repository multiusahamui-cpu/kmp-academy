import React, { useState } from "react";
import { VoucherBatch } from "../../types";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Download,
  CheckCircle,
  Clock,
  AlertCircle,
  Ticket,
  Plus,
} from "lucide-react";
import {
  MOCK_COURSES,
  MOCK_TRANSACTIONS,
  MOCK_SETTLEMENTS,
} from "../../constants";

// Mock Voucher Data (Local for now as it's specific to generation)
const MOCK_VOUCHERS: VoucherBatch[] = [
  {
    id: "VB-001",
    sponsorName: "Koperasi Sejahtera Bersama",
    courseId: "1",
    courseTitle: "Mastering React & Vite Ecosystem",
    totalCodes: 50,
    usedCodes: 12,
    generatedDate: "2023-10-01",
    prefix: "KOP-SJB-",
    status: "ACTIVE",
  },
];

const FinanceDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    "TRANSACTIONS" | "SETTLEMENTS" | "VOUCHERS"
  >("TRANSACTIONS");
  const [transactions] = useState(MOCK_TRANSACTIONS);
  const [settlements, setSettlements] = useState(MOCK_SETTLEMENTS);
  const [vouchers, setVouchers] = useState(MOCK_VOUCHERS);

  // Voucher Generation State
  const [isGeneratingVoucher, setIsGeneratingVoucher] = useState(false);
  const [sponsorName, setSponsorName] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [qty, setQty] = useState(10);
  const [prefix, setPrefix] = useState("KMP - ADNG-");

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(amount);

  const handleProcessSettlement = (id: string) => {
    if (confirm("Proses pencairan dana ini ke dompet user?")) {
      setSettlements((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status: "PROCESSED" } : s)),
      );
    }
  };

  const handleGenerateVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    const course = MOCK_COURSES.find((c) => c.id === selectedCourseId);
    if (!course) return;

    const newBatch: VoucherBatch = {
      id: `VB-${Date.now()}`,
      sponsorName,
      courseId: course.id,
      courseTitle: course.title,
      totalCodes: qty,
      usedCodes: 0,
      generatedDate: new Date().toLocaleDateString("id-ID"),
      prefix: prefix.toUpperCase(),
      status: "ACTIVE",
    };

    setVouchers([newBatch, ...vouchers]);
    setIsGeneratingVoucher(false);
    setSponsorName("");
    setQty(10);
    alert(
      `Berhasil generate ${qty} kode voucher untuk ${sponsorName}. Detail dikirim ke email admin.`,
    );
  };

  const totalRevenue = transactions
    .filter((t) => t.status === "PAID")
    .reduce((sum, t) => sum + t.amount, 0);
  const pendingSettlement = settlements
    .filter((s) => s.status === "PENDING")
    .reduce((sum, s) => sum + s.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Laporan Keuangan
          </h2>
          <p className="text-gray-500 dark:text-slate-400">
            Monitoring penjualan, settlement, dan voucher B2B.
          </p>
        </div>
        <button className="px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-medium text-gray-700 dark:text-slate-300 flex items-center hover:bg-gray-50 dark:hover:bg-slate-700 transition">
          <Download size={16} className="mr-2" /> Export CSV
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400">
              <ArrowUpRight size={24} />
            </div>
            <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">
              +12.5%
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-1">
            Total Pendapatan Bersih
          </p>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(totalRevenue)}
          </h3>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg text-orange-600 dark:text-orange-400">
              <ArrowDownLeft size={24} />
            </div>
            <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded">
              Pending
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-1">
            Settlement Tertunda
          </p>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(pendingSettlement)}
          </h3>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
              <Ticket size={24} />
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-1">
            Total Voucher Aktif
          </p>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
            {vouchers.reduce((acc, v) => acc + v.totalCodes, 0)}
          </h3>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden">
        <div className="flex border-b border-gray-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab("TRANSACTIONS")}
            className={`flex-1 py-4 text-sm font-bold text-center border-b-2 transition ${activeTab === "TRANSACTIONS" ? "border-kodman-600 text-kodman-600 dark:text-kodman-400" : "border-transparent text-gray-500 hover:text-gray-700"}`}
          >
            Riwayat Penjualan (Inbound)
          </button>
          <button
            onClick={() => setActiveTab("SETTLEMENTS")}
            className={`flex-1 py-4 text-sm font-bold text-center border-b-2 transition ${activeTab === "SETTLEMENTS" ? "border-kodman-600 text-kodman-600 dark:text-kodman-400" : "border-transparent text-gray-500 hover:text-gray-700"}`}
          >
            Settlement & Payout (Outbound)
          </button>
          <button
            onClick={() => setActiveTab("VOUCHERS")}
            className={`flex-1 py-4 text-sm font-bold text-center border-b-2 transition ${activeTab === "VOUCHERS" ? "border-kodman-600 text-kodman-600 dark:text-kodman-400" : "border-transparent text-gray-500 hover:text-gray-700"}`}
          >
            B2B & Voucher Generator
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === "TRANSACTIONS" && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-500 dark:text-slate-400">
                <thead className="text-xs text-gray-700 dark:text-slate-300 uppercase bg-gray-50 dark:bg-slate-800">
                  <tr>
                    <th className="px-6 py-3">ID Transaksi</th>
                    <th className="px-6 py-3">Item Pembelian</th>
                    <th className="px-6 py-3">Pembeli</th>
                    <th className="px-6 py-3">Jumlah</th>
                    <th className="px-6 py-3">Metode</th>
                    <th className="px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {transactions.map((trx) => (
                    <tr
                      key={trx.id}
                      className="bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800/50"
                    >
                      <td className="px-6 py-4 font-mono font-medium text-gray-900 dark:text-white">
                        {trx.id}
                        <div className="text-[10px] text-gray-400 font-sans mt-1">
                          {trx.date}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-800 dark:text-slate-200">
                        {trx.itemName}
                      </td>
                      <td className="px-6 py-4">{trx.buyerName}</td>
                      <td className="px-6 py-4 font-mono text-gray-900 dark:text-white">
                        {formatCurrency(trx.amount)}
                      </td>
                      <td className="px-6 py-4">{trx.paymentMethod}</td>
                      <td className="px-6 py-4">
                        {trx.status === "PAID" && (
                          <span className="text-green-600 font-bold text-xs bg-green-100 px-2 py-1 rounded-full">
                            Lunas
                          </span>
                        )}
                        {trx.status === "PENDING" && (
                          <span className="text-orange-600 font-bold text-xs bg-orange-100 px-2 py-1 rounded-full">
                            Menunggu
                          </span>
                        )}
                        {trx.status === "FAILED" && (
                          <span className="text-red-600 font-bold text-xs bg-red-100 px-2 py-1 rounded-full">
                            Gagal
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "SETTLEMENTS" && (
            <div>
              <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded-lg flex items-start gap-3">
                <AlertCircle className="flex-shrink-0 mt-0.5" size={18} />
                <p className="text-sm">
                  Dana &quot;Pending&quot; adalah akumulasi bagi hasil (Royalti
                  Creator & Fee Mentor) yang belum dicairkan ke dompet digital
                  mereka. Pastikan saldo Payment Gateway cukup sebelum memproses
                  pencairan.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500 dark:text-slate-400">
                  <thead className="text-xs text-gray-700 dark:text-slate-300 uppercase bg-gray-50 dark:bg-slate-800">
                    <tr>
                      <th className="px-6 py-3">ID Settlement</th>
                      <th className="px-6 py-3">Penerima Dana</th>
                      <th className="px-6 py-3">Keterangan</th>
                      <th className="px-6 py-3">Jumlah</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                    {settlements.map((set) => (
                      <tr
                        key={set.id}
                        className="bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800/50"
                      >
                        <td className="px-6 py-4 font-mono font-medium text-gray-900 dark:text-white">
                          {set.id}
                          <div className="text-[10px] text-gray-400 font-sans mt-1">
                            {set.date}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-gray-900 dark:text-white">
                            {set.recipientName}
                          </div>
                          <div className="text-xs uppercase tracking-wider font-bold text-kodman-600 mt-1">
                            {set.recipientRole}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-600 dark:text-slate-400">
                          {set.details}
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-gray-900 dark:text-white">
                          {formatCurrency(set.amount)}
                        </td>
                        <td className="px-6 py-4">
                          {set.status === "PROCESSED" ? (
                            <span className="flex items-center text-green-600 font-bold text-xs">
                              <CheckCircle size={14} className="mr-1" />{" "}
                              Terkirim
                            </span>
                          ) : (
                            <span className="flex items-center text-orange-600 font-bold text-xs">
                              <Clock size={14} className="mr-1" /> Menunggu
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {set.status === "PENDING" && (
                            <button
                              onClick={() => handleProcessSettlement(set.id)}
                              className="px-3 py-1.5 bg-kodman-600 hover:bg-kodman-700 text-white rounded text-xs font-bold shadow-sm transition"
                            >
                              Proses Cair
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "VOUCHERS" && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">
                    B2B Voucher Generator
                  </h3>
                  <p className="text-sm text-gray-500">
                    Buat kode aktivasi massal untuk Sponsor (Koperasi/Instansi).
                  </p>
                </div>
                <button
                  onClick={() => setIsGeneratingVoucher(!isGeneratingVoucher)}
                  className="px-4 py-2 bg-kodman-600 text-white rounded font-bold text-sm flex items-center hover:bg-kodman-700"
                >
                  <Plus size={16} className="mr-2" /> Generate Bulk Voucher
                </button>
              </div>

              {isGeneratingVoucher && (
                <div className="bg-gray-50 dark:bg-slate-800 p-6 rounded-lg border border-gray-200 dark:border-slate-700 mb-6 animate-fade-in-down">
                  <form onSubmit={handleGenerateVoucher} className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                          Nama Sponsor / Koperasi
                        </label>
                        <input
                          type="text"
                          required
                          className="w-full p-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-900 rounded"
                          placeholder="Contoh: Koperasi Makmur Jaya"
                          value={sponsorName}
                          onChange={(e) => setSponsorName(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                          Prefix Kode
                        </label>
                        <input
                          type="text"
                          required
                          className="w-full p-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-900 rounded font-mono uppercase"
                          placeholder="KOP-MAKMUR-"
                          value={prefix}
                          onChange={(e) => setPrefix(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                          Pilih Kursus
                        </label>
                        <select
                          required
                          className="w-full p-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-900 rounded"
                          value={selectedCourseId}
                          onChange={(e) => setSelectedCourseId(e.target.value)}
                        >
                          <option value="">-- Pilih Kursus --</option>
                          {MOCK_COURSES.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.title}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                          Jumlah Kode (Slot)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="500"
                          required
                          className="w-full p-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-900 rounded"
                          value={qty}
                          onChange={(e) => setQty(Number(e.target.value))}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsGeneratingVoucher(false)}
                        className="px-4 py-2 text-gray-600"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-2 bg-green-600 text-white font-bold rounded hover:bg-green-700"
                      >
                        Generate Codes
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 dark:bg-slate-800 text-gray-500 uppercase font-bold text-xs">
                    <tr>
                      <th className="px-6 py-3">Batch ID</th>
                      <th className="px-6 py-3">Sponsor</th>
                      <th className="px-6 py-3">Kursus</th>
                      <th className="px-6 py-3">Terpakai</th>
                      <th className="px-6 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                    {vouchers.map((batch) => (
                      <tr
                        key={batch.id}
                        className="hover:bg-gray-50 dark:hover:bg-slate-800/50"
                      >
                        <td className="px-6 py-4 font-mono font-medium">
                          {batch.id}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-gray-900 dark:text-white">
                            {batch.sponsorName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {batch.generatedDate}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-600 dark:text-slate-300 truncate max-w-xs">
                          {batch.courseTitle}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-purple-600 h-2 rounded-full"
                                style={{
                                  width: `${(batch.usedCodes / batch.totalCodes) * 100}%`,
                                }}
                              ></div>
                            </div>
                            <span className="text-xs font-bold">
                              {batch.usedCodes}/{batch.totalCodes}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="text-blue-600 hover:underline flex items-center justify-end w-full">
                            <Download size={14} className="mr-1" /> Unduh CSV
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FinanceDashboard;
