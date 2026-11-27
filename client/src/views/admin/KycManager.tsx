import React, { useState } from 'react';
import { apiMessage } from '../../services/classes';
import { kycApi, type KycRow, type KycState } from '../../services/kyc';
import { Card, Empty, StateBox, dateTimeId, useAsync } from '../../components/ReportBits';

const TABS: { id: KycState; label: string }[] = [{ id: 'PENDING', label: 'Menunggu' }, { id: 'VERIFIED', label: 'Terverifikasi' }, { id: 'REJECTED', label: 'Ditolak' }];

/** Admin Sistem: meninjau foto KTP/selfie. Setiap pembukaan foto atau NIK utuh dicatat di jejak akses. */
const KycManager: React.FC = () => {
  const [tab, setTab] = useState<KycState>('PENDING');
  const list = useAsync<KycRow[]>(() => kycApi.list(tab), [tab]);
  const [view, setView] = useState<{ id: string; ktp?: string; selfie?: string; nik?: string } | null>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const close = () => {
    if (view?.ktp) URL.revokeObjectURL(view.ktp);
    if (view?.selfie) URL.revokeObjectURL(view.selfie);
    setView(null);
  };
  const openRow = async (r: KycRow) => {
    close();
    setMsg('');
    try {
      const [ktp, selfie] = await Promise.all([kycApi.file(r.id, 'ktp'), kycApi.file(r.id, 'selfie')]);
      setView({ id: r.id, ktp, selfie });
    } catch (e) { setMsg(apiMessage(e, 'Gagal membuka berkas.')); }
  };
  const act = async (fn: () => Promise<void>, ok: string) => {
    setBusy(true);
    setMsg('');
    try { await fn(); setMsg(ok); close(); await list.reload(); } catch (e) { setMsg(apiMessage(e, 'Gagal.')); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Verifikasi KYC</h2>
        <p className="text-gray-500 dark:text-slate-400">Foto KTP dan selfie tersimpan privat. Setiap pembukaan dicatat atas nama Anda.</p>
      </div>
      <div className="flex gap-2">
        {TABS.map((t) => <button key={t.id} onClick={() => { close(); setTab(t.id); }} className={`px-4 py-1.5 rounded-lg text-sm font-bold ${tab === t.id ? 'bg-digitalcoop-600 text-white' : 'border dark:border-slate-700 dark:text-slate-200'}`}>{t.label}</button>)}
      </div>
      {msg && <p role="status" className="text-sm text-gray-700 dark:text-slate-300">{msg}</p>}
      <StateBox loading={list.loading} error={list.error} onRetry={list.reload}>
        <Card title="Pengajuan">
          {!list.data || list.data.length === 0 ? <Empty>Tidak ada data.</Empty> : (
            <ul className="divide-y divide-gray-100 dark:divide-slate-800">
              {list.data.map((r) => (
                <li key={r.id} className="py-3 text-sm dark:text-slate-200">
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="font-bold">{r.userName} <span className="text-xs font-normal text-gray-500">({r.userRole}{r.source === 'DIGITALCOOP' ? ', dari digitalcoop.id' : ''})</span></p>
                      <p className="text-xs text-gray-500">{r.fullName} · NIK {r.nikMasked} · {dateTimeId(r.submittedAt)}</p>
                      {r.rejectNote && <p className="text-xs text-red-600">Ditolak: {r.rejectNote}</p>}
                    </div>
                    <button onClick={() => void openRow(r)} className="text-digitalcoop-600 font-bold shrink-0">Buka foto</button>
                  </div>
                  {view?.id === r.id && (
                    <div className="mt-3 space-y-3">
                      <div className="grid md:grid-cols-2 gap-3">
                        <figure><img src={view.ktp} alt="Foto KTP" className="rounded border dark:border-slate-700 max-h-80 w-full object-contain" /><figcaption className="text-xs text-gray-500">KTP</figcaption></figure>
                        <figure><img src={view.selfie} alt="Selfie dengan KTP" className="rounded border dark:border-slate-700 max-h-80 w-full object-contain" /><figcaption className="text-xs text-gray-500">Selfie dengan KTP</figcaption></figure>
                      </div>
                      <div className="flex flex-wrap gap-2 items-center">
                        <button disabled={busy} onClick={() => void kycApi.nik(r.id).then((n) => setView((v) => (v ? { ...v, nik: n } : v))).catch((e) => setMsg(apiMessage(e, 'Gagal membuka NIK.')))} className="text-xs font-bold px-3 py-1.5 rounded-lg border dark:border-slate-700">Tampilkan NIK utuh</button>
                        {view.nik && <span className="font-mono text-sm">{view.nik}</span>}
                        {r.status === 'PENDING' && (
                          <>
                            <button disabled={busy} onClick={() => confirm('Setujui KYC ini? Cocokkan wajah, foto KTP, dan NIK.') && void act(() => kycApi.approve(r.id), 'KYC disetujui.')} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-digitalcoop-600 text-white">Setujui</button>
                            <button disabled={busy} onClick={() => { const n = prompt('Alasan penolakan (10-500 karakter, akan dibaca pengguna):'); if (n) void act(() => kycApi.reject(r.id, n), 'KYC ditolak.'); }} className="text-xs font-bold px-3 py-1.5 rounded-lg border dark:border-slate-700 text-red-600">Tolak</button>
                          </>
                        )}
                        <button onClick={close} className="text-xs ml-auto">Tutup</button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </StateBox>
    </div>
  );
};

export default KycManager;
