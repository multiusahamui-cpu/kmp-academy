import React, { useState } from 'react';
import { Gavel } from 'lucide-react';
import { apiMessage } from '../../services/classes';
import { SANCTION_KINDS, partnersApi, type PartnerRow } from '../../services/partners';
import type { SanctionKind } from '@shared/sanctions';
import { useT } from '../../i18n';
import { Card, Empty, StateBox, dateTimeId, useAsync } from '../../components/ReportBits';

const STATUS_KEYS = ['ACTIVE', 'SUSPENDED', 'ARCHIVED'];
const input = 'w-full px-3 py-2 text-sm border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white';

const PartnerDetail: React.FC<{ partner: PartnerRow; onBack: () => void; onChanged: () => void }> = ({ partner, onBack, onChanged }) => {
  const t = useT();
  const statusLabel = (s: string) => (STATUS_KEYS.includes(s) ? t(`dir.pg${s}`) : s);
  const sk = (id: string) => t(`dir.sk${id}`);
  const { data, loading, error, reload } = useAsync(() => partnersApi.sanctions(partner.id), [partner.id]);
  const [kind, setKind] = useState<SanctionKind>('WARNING');
  const [reason, setReason] = useState('');
  const [liftId, setLiftId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const act = async (fn: () => Promise<void>, after: () => void) => {
    setBusy(true);
    setMsg('');
    try {
      await fn();
      after();
      onChanged();
      await reload();
    } catch (e) {
      setMsg(apiMessage(e, t('dir.pgFail')));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="text-sm text-gray-500 hover:text-digitalcoop-600">&larr; {t('dir.pgBack')}</button>
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{partner.name}</h2>
        <p className="text-sm text-gray-500">{t('dir.pgStatusOpen', { email: partner.email, s: statusLabel(partner.status) })}</p>
      </div>
      <Card title={t('dir.pgImpose')}>
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!confirm(t('dir.pgConfirm', { k: sk(kind), n: partner.name }))) return;
            void act(() => partnersApi.sanction(partner.id, { kind, reason }), () => setReason(''));
          }}
        >
          <select value={kind} onChange={(e) => setKind(e.target.value as SanctionKind)} className={input}>
            {SANCTION_KINDS.map((k) => <option key={k.id} value={k.id}>{sk(k.id)}</option>)}
          </select>
          <p className="text-xs text-gray-500">{t(`dir.sk${kind}d`)}</p>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={1000} placeholder={t('dir.pgReasonPh')} className={input} />
          {msg && <p role="alert" className="text-sm text-red-600">{msg}</p>}
          <button type="submit" disabled={busy || reason.trim().length < 10} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold disabled:opacity-50">{t('dir.pgImposeBtn')}</button>
        </form>
      </Card>
      <Card title={t('dir.pgHistory')}>
        <StateBox loading={loading} error={error} onRetry={reload}>
          {data && data.length === 0 ? (
            <Empty>{t('dir.pgNone')}</Empty>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-slate-800 text-sm">
              {data?.map((s) => (
                <li key={s.id} className="py-3">
                  <p><b className="text-gray-900 dark:text-white">{sk(s.kind)}</b>, {dateTimeId(s.createdAt)}{s.kind === 'SUSPEND' && (s.liftedAt ? <span className="text-green-600">{t('dir.pgLifted', { d: dateTimeId(s.liftedAt) })}</span> : <span className="text-red-600 font-bold">{t('dir.pgActive')}</span>)}</p>
                  <p className="text-gray-600 dark:text-slate-300 whitespace-pre-wrap">{s.reason}</p>
                  {s.liftNote && <p className="text-xs text-gray-500">{t('dir.pgLiftNote', { n: s.liftNote })}</p>}
                  {s.kind === 'SUSPEND' && !s.liftedAt && (
                    liftId === s.id ? (
                      <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); void act(() => partnersApi.lift(s.id, note), () => { setLiftId(null); setNote(''); }); }}>
                        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('dir.pgLiftPh')} maxLength={1000} className={input} />
                        <button type="submit" disabled={busy || note.trim().length < 10} className="px-3 py-1 bg-digitalcoop-600 text-white rounded text-sm disabled:opacity-50">{t('dir.pgLift')}</button>
                      </form>
                    ) : (
                      <button onClick={() => setLiftId(s.id)} className="mt-1 text-xs underline">{t('dir.pgLiftBtn')}</button>
                    )
                  )}
                </li>
              ))}
            </ul>
          )}
        </StateBox>
      </Card>
    </div>
  );
};

const PartnerGovernance: React.FC = () => {
  const t = useT();
  const statusLabel = (s: string) => (STATUS_KEYS.includes(s) ? t(`dir.pg${s}`) : s);
  const { data, loading, error, reload } = useAsync(() => partnersApi.list());
  const [open, setOpen] = useState<PartnerRow | null>(null);

  if (open) return <PartnerDetail partner={open} onBack={() => setOpen(null)} onChanged={() => void reload()} />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center"><Gavel className="mr-3 text-digitalcoop-600" /> {t('dir.pgTitle')}</h2>
        <p className="text-gray-500 dark:text-slate-400">{t('dir.pgSub')}</p>
      </div>
      <Card>
        <StateBox loading={loading} error={error} onRetry={reload}>
          {data && data.length === 0 ? (
            <Empty>{t('dir.pgNoPartners')}</Empty>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-gray-500 dark:text-slate-400"><tr><th className="py-2">{t('dir.pgPartner')}</th><th>{t('dir.pgStatus')}</th><th className="text-right">{t('dir.pgWarnings')}</th><th className="text-right">{t('dir.pgSusp')}</th><th></th></tr></thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {data?.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2"><p className="font-medium text-gray-900 dark:text-white">{p.name}</p><p className="text-xs text-gray-500">{p.email}</p></td>
                    <td>{statusLabel(p.status)}</td>
                    <td className="text-right font-mono">{p.warnings}</td>
                    <td className="text-right font-mono">{p.activeSuspensions}</td>
                    <td className="text-right"><button onClick={() => setOpen(p)} className="text-xs underline">{t('dir.pgManage')}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </StateBox>
      </Card>
    </div>
  );
};

export default PartnerGovernance;
