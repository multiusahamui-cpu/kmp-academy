import React, { useState } from 'react';
import { STAFF_ROLES, type StaffRole } from '@shared/appointments';
import { useI18n } from '../../i18n';
import { apiMessage } from '../../services/classes';
import { appointmentsApi } from '../../services/appointments';
import { Card, Empty, StateBox, dateTimeId, useAsync } from '../../components/ReportBits';

const input = 'w-full px-3 py-2 text-sm border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white';

/** Pengangkatan Direktur dan Admin Sistem oleh Superadmin, dengan riwayat jabatan. */
const AppSettings: React.FC = () => {
  const { t } = useI18n();
  const staffLabel = (r: string): string => (r === 'DIRECTOR' || r === 'ADMIN_SYSTEM' ? t(`adm6.r${r}`) : r);
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
    if (!confirm(t('adm6.apAsk', { e: email, r: staffLabel(role) }))) return;
    setBusy(true);
    setMsg('');
    try {
      await appointmentsApi.appoint({ email, role, note });
      setEmail(''); setNote('');
      setMsg(t('adm6.apDone'));
      await refresh();
    } catch (e2) {
      setMsg(apiMessage(e2, t('adm6.apFail')));
    } finally {
      setBusy(false);
    }
  };

  const dismiss = async (id: string, name: string) => {
    const reason = prompt(t('adm6.apDisAsk', { n: name }));
    if (!reason) return;
    try { await appointmentsApi.dismiss(id, reason); setMsg(t('adm6.apDisDone')); await refresh(); } catch (e) { setMsg(apiMessage(e, t('adm6.apDisFail'))); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('adm6.apTitle')}</h2>
        <p className="text-gray-500 dark:text-slate-400">{t('adm6.apSub')}</p>
      </div>
      {msg && <p role="status" className="text-sm text-gray-700 dark:text-slate-300">{msg}</p>}

      <Card title={t('adm6.apCard')}>
        <form onSubmit={appoint} className="grid md:grid-cols-4 gap-3">
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('adm6.apEmailPh')} className={input} />
          <select value={role} onChange={(e) => setRole(e.target.value as StaffRole)} className={input}>
            {STAFF_ROLES.map((r) => <option key={r.id} value={r.id}>{staffLabel(r.id)}</option>)}
          </select>
          <input required value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('adm6.apNotePh')} className={input} />
          <button disabled={busy} type="submit" className="px-4 py-2 bg-digitalcoop-600 text-white rounded-lg text-sm font-bold disabled:opacity-50">{t('adm6.apBtn')}</button>
        </form>
      </Card>

      <Card title={t('adm6.apCur')}>
        <StateBox loading={staff.loading} error={staff.error} onRetry={staff.reload}>
          {(staff.data ?? []).length === 0 ? <Empty>{t('adm6.apNoCur')}</Empty> : (
            <ul className="divide-y divide-gray-100 dark:divide-slate-800">
              {(staff.data ?? []).map((u) => (
                <li key={u.id} className="py-2 flex justify-between items-center text-sm dark:text-slate-200">
                  <span><b>{u.name}</b> · {u.email} · {staffLabel(u.role)}{u.status !== 'ACTIVE' ? ` (${u.status})` : ''}</span>
                  <button onClick={() => void dismiss(u.id, u.name)} className="text-red-600 font-bold text-xs">{t('adm6.apDismiss')}</button>
                </li>
              ))}
            </ul>
          )}
        </StateBox>
      </Card>

      <Card title={t('adm6.apHist')}>
        <StateBox loading={history.loading} error={history.error} onRetry={history.reload}>
          {(history.data ?? []).length === 0 ? <Empty>{t('adm6.apNoHist')}</Empty> : (
            <ul className="divide-y divide-gray-100 dark:divide-slate-800">
              {(history.data ?? []).map((h) => (
                <li key={h.id} className="py-2 text-sm dark:text-slate-200">
                  <p>{h.action === 'APPOINT' ? t('adm6.apAppointed', { n: h.userName, r: staffLabel(h.toRole) }) : t('adm6.apDismissed', { n: h.userName, r: staffLabel(h.fromRole) })}</p>
                  <p className="text-xs text-gray-500">{t('adm6.apBy', { d: dateTimeId(h.createdAt), a: h.actorName ?? '-', n: h.note ?? '' })}</p>
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
