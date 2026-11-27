import React, { useState } from 'react';
import { apiMessage } from '../services/classes';
import { payoutsApi, type StatementRow } from '../services/payouts';
import { Card, Empty, StateBox, Tile, dateId, dateTimeId, num, rupiah, useAsync } from '../components/ReportBits';

const input = 'w-full px-3 py-2 text-sm border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white';
const STATUS: Record<string, string> = { POSTED: 'Menunggu persetujuan Direktur', APPROVED: 'Disetujui, menunggu transfer', COMPLETED: 'Selesai' };

/** Bagi hasil untuk Creator (pemilik materi) dan Mentor: saldo berjalan, rekening, riwayat, dan rincian per judul. */
const PayoutMine: React.FC = () => {
  const { data, loading, error, reload } = useAsync(() => payoutsApi.mine());
  const [bank, setBank] = useState({ bankName: '', accountNumber: '', holderName: '' });
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState<{ id: string; rows: StatementRow[] } | null>(null);

  const saveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    try {
      await payoutsApi.saveBank(bank);
      setBank({ bankName: '', accountNumber: '', holderName: '' });
      setMsg('Rekening disimpan. Transfer berikutnya memakai rekening terbaru.');
      await reload();
    } catch (e2) {
      setMsg(apiMessage(e2, 'Gagal menyimpan rekening.'));
    } finally {
      setBusy(false);
    }
  };
  const open = async (id: string) => {
    if (detail?.id === id) return setDetail(null);
    try { setDetail({ id, rows: await payoutsApi.statement(id) }); } catch (e) { setMsg(apiMessage(e, 'Gagal memuat rincian.')); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Bagi Hasil Saya</h2>
        <p className="text-gray-500 dark:text-slate-400">Bagi hasil diposting tanggal 25 setiap bulan untuk transaksi sebelum tanggal itu, lalu ditransfer manual ke rekening bank Anda setelah disetujui Direktur. Bukti bayar masuk ke inbox dan email Anda.</p>
      </div>
      {msg && <p role="status" className="text-sm text-gray-700 dark:text-slate-300">{msg}</p>}
      <StateBox loading={loading} error={error} onRetry={reload}>
        {data && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Tile title="Saldo berjalan" value={rupiah(data.accrued.total)} hint={`Diposting ${dateId(data.nextCutoffAt)} (transaksi sebelum tanggal itu)`} />
              <Tile title="Dari materi" value={rupiah(data.accrued.owner)} />
              <Tile title="Dari mengampu workshop" value={rupiah(data.accrued.mentor)} />
            </div>

            <Card title="Rekening pencairan">
              <p className="text-sm mb-3 dark:text-slate-200">{data.bank ? `Rekening terbaru di layar Dompet Anda, dipakai untuk transfer manual (bukan ke dompet elektronik): ${data.bank.bankName} ${data.bank.account} a.n. ${data.bank.holderName}` : 'Belum ada rekening. Isi sebelum tanggal posting agar transfer tidak tertunda.'}</p>
              <form onSubmit={saveBank} className="grid md:grid-cols-4 gap-3">
                <input required value={bank.bankName} onChange={(e) => setBank({ ...bank, bankName: e.target.value })} placeholder="Nama bank" className={input} />
                <input required value={bank.accountNumber} onChange={(e) => setBank({ ...bank, accountNumber: e.target.value })} placeholder="Nomor rekening" inputMode="numeric" className={input} />
                <input required value={bank.holderName} onChange={(e) => setBank({ ...bank, holderName: e.target.value })} placeholder="Nama pemilik rekening" className={input} />
                <button disabled={busy} type="submit" className="px-4 py-2 bg-digitalcoop-600 text-white rounded-lg text-sm font-bold disabled:opacity-50">Simpan rekening</button>
              </form>
            </Card>

            <Card title="Riwayat pencairan">
              {data.history.length === 0 ? <Empty>Belum ada pencairan.</Empty> : (
                <ul className="divide-y divide-gray-100 dark:divide-slate-800">
                  {data.history.map((h) => (
                    <li key={h.batchId} className="py-3 text-sm dark:text-slate-200">
                      <div className="flex justify-between gap-3">
                        <div>
                          <p className="font-bold">{h.period} · {rupiah(h.amount)}</p>
                          <p className="text-xs text-gray-500">{h.status === 'PAID' ? `Ditransfer ${dateTimeId(h.paidAt)} · Ref: ${h.transferRef}` : STATUS[h.batchStatus] ?? h.batchStatus}</p>
                        </div>
                        <span className="shrink-0 flex gap-3">{h.hasProof && <button onClick={() => void payoutsApi.myProof(h.batchId).catch(() => setMsg('Gagal mengunduh bukti.'))} className="text-digitalcoop-600 font-bold">Unduh bukti bayar</button>}<button onClick={() => void open(h.batchId)} className="text-digitalcoop-600 font-bold">{detail?.id === h.batchId ? 'Tutup' : 'Rincian'}</button></span>
                      </div>
                      {detail?.id === h.batchId && (
                        <table className="w-full text-xs text-left mt-2">
                          <thead className="text-gray-500"><tr><th className="py-1">Judul</th><th className="text-right">Transaksi</th><th className="text-right">Uang masuk</th><th className="text-right">Hak Anda</th></tr></thead>
                          <tbody>{detail.rows.map((r) => <tr key={r.title}><td className="py-1">{r.title}</td><td className="text-right">{num(r.sales)}</td><td className="text-right">{rupiah(r.gross)}</td><td className="text-right">{rupiah(r.ownerShare + r.mentorShare)}</td></tr>)}</tbody>
                        </table>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </>
        )}
      </StateBox>
    </div>
  );
};

export default PayoutMine;
