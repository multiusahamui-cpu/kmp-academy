import React, { useState } from 'react';
import { STAFF_ROLES, staffLabel, type StaffRole } from '@shared/appointments';
import { apiMessage } from '../../services/classes';
import { appointmentsApi } from '../../services/appointments';
import { Card, Empty, StateBox, dateTimeId, useAsync } from '../../components/ReportBits';

const input = 'w-full px-3 py-2 text-sm border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white';

/** Pengangkatan Direktur dan Admin Sistem oleh Superadmin, dengan riwayat jabatan. */
const AppSettings: React.FC = () => {
  const staff = useAsync(() => appointmentsApi.staff());
  const history = useAsync(() => appointmentsApi.history());
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<StaffRole>('DIRECTOR');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const refresh = async () => { await Promise.all([staff.reload(), history.reload()]); };

  const appoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm(`Angkat ${email} sebagai ${staffLabel(role)}?`)) return;
    setBusy(true);
    setMsg('');
    try {
      await appointmentsApi.appoint({ email, role, note });
      setEmail(''); setNote('');
      setMsg('Pengangkatan dicatat.');
      await refresh();
    } catch (e2) {
      setMsg(apiMessage(e2, 'Gagal mengangkat.'));
    } finally {
      setBusy(false);
    }
  };

  const dismiss = async (id: string, name: string) => {
    const reason = prompt(`Alasan memberhentikan ${name} (minimal 5 karakter). Akun kembali menjadi Siswa.`);
    if (!reason) return;
    try { await appointmentsApi.dismiss(id, reason); setMsg('Pemberhentian dicatat.'); await refresh(); } catch (e) { setMsg(apiMessage(e, 'Gagal memberhentikan.')); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Pengangkatan Jabatan</h2>
        <p className="text-gray-500 dark:text-slate-400">Direktur dan Admin Sistem diangkat dan diberhentikan di sini. Hanya akun Siswa yang dapat diangkat. Setiap perubahan tercatat permanen.</p>
      </div>
      {msg && <p role="status" className="text-sm text-gray-700 dark:text-slate-300">{msg}</p>}

      <Card title="Angkat pejabat">
        <form onSubmit={appoint} className="grid md:grid-cols-4 gap-3">
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email pengguna" className={input} />
          <select value={role} onChange={(e) => setRole(e.target.value as StaffRole)} className={input}>
            {STAFF_ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
          <input required value={note} onChange={(e) => setNote(e.target.value)} placeholder="Dasar (mis. nomor SK)" className={input} />
          <button disabled={busy} type="submit" className="px-4 py-2 bg-digitalcoop-600 text-white rounded-lg text-sm font-bold disabled:opacity-50">Angkat</button>
        </form>
      </Card>

      <Card title="Pejabat saat ini">
        <StateBox loading={staff.loading} error={staff.error} onRetry={staff.reload}>
          {(staff.data ?? []).length === 0 ? <Empty>Belum ada Direktur atau Admin Sistem.</Empty> : (
            <ul className="divide-y divide-gray-100 dark:divide-slate-800">
              {(staff.data ?? []).map((u) => (
                <li key={u.id} className="py-2 flex justify-between items-center text-sm dark:text-slate-200">
                  <span><b>{u.name}</b> · {u.email} · {staffLabel(u.role)}{u.status !== 'ACTIVE' ? ` (${u.status})` : ''}</span>
                  <button onClick={() => void dismiss(u.id, u.name)} className="text-red-600 font-bold text-xs">Berhentikan</button>
                </li>
              ))}
            </ul>
          )}
        </StateBox>
      </Card>

      <Card title="Riwayat jabatan">
        <StateBox loading={history.loading} error={history.error} onRetry={history.reload}>
          {(history.data ?? []).length === 0 ? <Empty>Belum ada riwayat.</Empty> : (
            <ul className="divide-y divide-gray-100 dark:divide-slate-800">
              {(history.data ?? []).map((h) => (
                <li key={h.id} className="py-2 text-sm dark:text-slate-200">
                  <p><b>{h.userName}</b> {h.action === 'APPOINT' ? `diangkat sebagai ${staffLabel(h.toRole)}` : `diberhentikan dari ${staffLabel(h.fromRole)}`}</p>
                  <p className="text-xs text-gray-500">{dateTimeId(h.createdAt)} · oleh {h.actorName ?? '-'} · {h.note}</p>
                </li>
              ))}
            </ul>
          )}
        </StateBox>
      </Card>
    </div>
  );
};

export default AppSettings;
