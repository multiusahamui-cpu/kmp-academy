import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { BATCH_LABEL } from '@shared/payout';
import { apiMessage } from '../../services/classes';
import { payoutsApi, type PayoutArchive, type PayoutDetail } from '../../services/payouts';
import CourseShareTable from '../../components/CourseShareTable';
import { Card, Empty, StateBox, Tile, dateId, dateTimeId, rupiah, useAsync } from '../../components/ReportBits';

const MAX = 5 * 1024 * 1024;
const input = 'px-3 py-1.5 text-sm border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white';

/** Admin: memposting manual dan mencatat transfer. Direktur: menyetujui atau membatalkan. Keduanya melihat laporan per judul. */
const PayoutManager: React.FC<{ role: 'ADMIN_SYSTEM' | 'DIRECTOR' }> = ({ role }) => {
  const overview = useAsync(() => payoutsApi.overview());
  const [open, setOpen] = useState<PayoutDetail | null>(null);
  const [refs, setRefs] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Record<string, File | undefined>>({});
  const [tab, setTab] = useState<'run' | 'archive'>('run');
  const archive = useAsync<PayoutArchive>(() => payoutsApi.archive());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const isAdmin = role === 'ADMIN_SYSTEM';
  const isDirector = role === 'DIRECTOR';

  const show = async (id: string) => {
    try { setOpen(await payoutsApi.detail(id)); } catch (e) { setMsg(apiMessage(e, 'Gagal memuat batch.')); }
  };
  const act = async (fn: () => Promise<void>, ok: string) => {
    setBusy(true);
    setMsg('');
    try {
      await fn();
      setMsg(ok);
      await overview.reload();
      await archive.reload();
      if (open) await show(open.batch.id);
    } catch (e) {
      setMsg(apiMessage(e, 'Gagal.'));
    } finally {
      setBusy(false);
    }
  };

  const pay = (id: string, name: string, amount: number) => {
    const proof = files[id];
    if (!proof) return setMsg('Unggah bukti bayar (JPG, PNG, WebP atau PDF, maks 5 MB) lebih dulu.');
    if (proof.size > MAX) return setMsg('Bukti bayar maksimal 5 MB.');
    if (!confirm(`Catat transfer ${rupiah(amount)} ke ${name}? Bukti dikirim ke inbox dan email penerima.`)) return;
    void act(async () => {
      const r = await payoutsApi.pay(id, refs[id] ?? '', '', proof);
      setFiles((f) => ({ ...f, [id]: undefined }));
      if (!r.emailed) setMsg('Transfer dicatat dan bukti masuk inbox. Email belum terkirim (cek SMTP); gunakan Kirim ulang di Arsip.');
    }, 'Transfer dicatat, bukti dikirim ke inbox dan email penerima.');
  };

  const o = overview.data;
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Pencairan Bagi Hasil</h2>
        <p className="text-gray-500 dark:text-slate-400">Diposting otomatis tanggal 25 setiap bulan untuk transaksi sebelum tanggal itu. Direktur menyetujui, Admin mentransfer manual lalu mencatat nomor referensinya.</p>
      </div>
      <div className="flex gap-2">
        {(['run', 'archive'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 rounded-lg text-sm font-bold ${tab === t ? 'bg-kodman-600 text-white' : 'border dark:border-slate-700 dark:text-slate-200'}`}>{t === 'run' ? 'Berjalan' : 'Arsip pembayaran'}</button>
        ))}
      </div>
      {msg && <p role="status" className="text-sm text-gray-700 dark:text-slate-300">{msg}</p>}

      {tab === 'run' && <StateBox loading={overview.loading} error={overview.error} onRetry={overview.reload}>
        {o && (
          <>
            <Card title="Saldo berjalan (belum diposting)"
              right={isAdmin && <button disabled={busy} onClick={() => confirm('Posting sekarang untuk batas terbaru? Biasanya dilakukan otomatis tanggal 25.') && void act(() => payoutsApi.postNow(), 'Batch diposting.')} className="text-xs font-bold px-3 py-1 rounded-lg border dark:border-slate-700 dark:text-slate-200">Posting manual</button>}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <Tile title="Uang masuk" value={rupiah(o.accrual.totals.gross)} hint={`${o.accrual.totals.sales} transaksi`} />
                <Tile title="Hak pemilik materi" value={rupiah(o.accrual.totals.ownerShare)} />
                <Tile title="Hak Mentor" value={rupiah(o.accrual.totals.mentorShare)} />
                <Tile title="Hak Lembaga" value={rupiah(o.accrual.totals.platformShare)} hint={`Posting berikutnya ${dateId(o.nextCutoffAt)} (transaksi sebelum tanggal itu)`} />
              </div>
              <CourseShareTable rows={o.accrual.courses} totals={o.accrual.totals} />
            </Card>

            <Card title="Batch pencairan">
              {o.batches.length === 0 ? <Empty>Belum ada batch.</Empty> : (
                <ul className="divide-y divide-gray-100 dark:divide-slate-800">
                  {o.batches.map((b) => (
                    <li key={b.id} className="py-2 flex justify-between items-center text-sm dark:text-slate-200">
                      <span><b>{b.period}</b> · {rupiah(b.ownerTotal + b.mentorTotal)} untuk penerima · {BATCH_LABEL[b.status]}</span>
                      <button onClick={() => void show(b.id)} className="text-kodman-600 font-bold">Buka</button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </>
        )}
      </StateBox>}

      {tab === 'run' && open && (
        <Card title={`Periode ${open.batch.period} · ${BATCH_LABEL[open.batch.status]}`} right={<button onClick={() => setOpen(null)} className="text-xs dark:text-slate-200">Tutup</button>}>
          <div className="space-y-5 dark:text-slate-200">
            <div className="flex flex-wrap gap-2 items-center">
              <button onClick={() => void payoutsApi.downloadTransactions(open.batch.id, open.batch.cutoffAt.slice(0, 10)).catch(() => setMsg('Gagal mengunduh CSV.'))} className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg border dark:border-slate-700"><Download size={14} /> Unduh uang masuk per judul (CSV)</button>
              {isDirector && open.batch.status === 'POSTED' && (
                <>
                  <button disabled={busy} onClick={() => confirm('Setujui pencairan ini? Admin lalu mentransfer ke tiap penerima.') && void act(() => payoutsApi.approve(open.batch.id), 'Batch disetujui.')} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-kodman-600 text-white">Setujui</button>
                  <button disabled={busy} onClick={() => { const n = prompt('Alasan pembatalan (minimal 10 karakter). Transaksinya masuk posting berikutnya.'); if (n) void act(() => payoutsApi.voidBatch(open.batch.id, n), 'Batch dibatalkan.'); }} className="text-xs font-bold px-3 py-1.5 rounded-lg border dark:border-slate-700 text-red-600">Batalkan</button>
                </>
              )}
            </div>
            {open.batch.voidNote && <p className="text-xs">Dibatalkan: {open.batch.voidNote}</p>}

            <div>
              <h4 className="font-bold mb-2">Uang masuk dan bagi hasil per judul</h4>
              <CourseShareTable rows={open.courses} />
            </div>

            <div>
              <h4 className="font-bold mb-2">Penerima belum dibayar</h4>
              {open.payees.every((p) => p.status === 'PAID') && <Empty>Semua penerima sudah dibayar. Lihat di Arsip pembayaran.</Empty>}
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-gray-500 dark:text-slate-400"><tr><th className="py-2">Nama</th><th className="text-right">Jumlah</th><th>Rekening</th><th>Status</th><th></th></tr></thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                    {open.payees.filter((p) => p.status === 'PENDING').map((p) => (
                      <tr key={p.id}>
                        <td className="py-2">{p.userName}<p className="text-xs text-gray-500">Materi {rupiah(p.ownerAmount)} · Mentor {rupiah(p.mentorAmount)}</p></td>
                        <td className="text-right font-bold">{rupiah(p.amount)}</td>
                        <td className="text-xs">{p.bank ? `${p.bank.bankName} ${p.bank.account} a.n. ${p.bank.holderName}` : <span className="text-red-600">Belum ada rekening</span>}</td>
                        <td>Menunggu</td>
                        <td>
                          {isAdmin && open.batch.status === 'APPROVED' && p.status === 'PENDING' && (
                            <div className="flex flex-col gap-1 items-start">
                              <input value={refs[p.id] ?? ''} onChange={(e) => setRefs({ ...refs, [p.id]: e.target.value })} placeholder="No. referensi" className={`${input} w-40`} />
                              <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => setFiles({ ...files, [p.id]: e.target.files?.[0] })} className="text-xs max-w-[11rem]" aria-label="Bukti bayar" />
                              <button disabled={busy || !p.bank || !files[p.id]} onClick={() => pay(p.id, p.userName, p.amount)} className="text-xs font-bold px-2 py-1 rounded-lg bg-kodman-600 text-white disabled:opacity-50">Sudah transfer</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Card>
      )}
      {tab === 'archive' && (
        <StateBox loading={archive.loading} error={archive.error} onRetry={archive.reload}>
          {archive.data && (
            <>
              <Card title="Pembayaran yang sudah ditransfer">
                {archive.data.payments.length === 0 ? <Empty>Belum ada pembayaran.</Empty> : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left dark:text-slate-200">
                      <thead className="text-gray-500 dark:text-slate-400"><tr><th className="py-2">Periode</th><th>Penerima</th><th className="text-right">Jumlah</th><th>Rekening</th><th>Transfer</th><th></th></tr></thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                        {archive.data.payments.map((p) => (
                          <tr key={p.id}>
                            <td className="py-2">{p.period}</td>
                            <td>{p.userName}</td>
                            <td className="text-right font-bold">{rupiah(p.amount)}</td>
                            <td className="text-xs">{p.bank ? `${p.bank.bankName} ${p.bank.account}` : '-'}</td>
                            <td className="text-xs">{dateTimeId(p.paidAt)}<br />Ref: {p.transferRef}<br />{p.proofEmailedAt ? `Email terkirim ${dateTimeId(p.proofEmailedAt)}` : <span className="text-amber-600">Email belum terkirim</span>}</td>
                            <td className="text-xs whitespace-nowrap">
                              {p.hasProof && <button onClick={() => void payoutsApi.adminProof(p.id).catch(() => setMsg('Gagal mengunduh bukti.'))} className="text-kodman-600 font-bold mr-2">Bukti</button>}
                              {isAdmin && p.hasProof && <button disabled={busy} onClick={() => void act(() => payoutsApi.resend(p.id), 'Email bukti dikirim ulang.')} className="text-kodman-600 font-bold">Kirim ulang email</button>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
              <Card title="Batch selesai atau dibatalkan">
                {archive.data.batches.length === 0 ? <Empty>Belum ada.</Empty> : (
                  <ul className="divide-y divide-gray-100 dark:divide-slate-800">
                    {archive.data.batches.map((b) => (
                      <li key={b.id} className="py-2 flex justify-between items-center text-sm dark:text-slate-200">
                        <span><b>{b.period}</b> · {rupiah(b.ownerTotal + b.mentorTotal)} · {BATCH_LABEL[b.status]}</span>
                        <span className="flex gap-3">
                          <button onClick={() => void payoutsApi.downloadTransactions(b.id, b.cutoffAt.slice(0, 10)).catch(() => setMsg('Gagal mengunduh CSV.'))} className="text-kodman-600 font-bold">CSV</button>
                          <button onClick={() => { setTab('run'); void show(b.id); }} className="text-kodman-600 font-bold">Laporan</button>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </>
          )}
        </StateBox>
      )}
    </div>
  );
};

export default PayoutManager;
