import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { adminApi } from '../../services/api';
import { useI18n } from '../../i18n';

interface Application {
  id: string;
  name: string;
  email: string;
  requestedRole: string;
  profile: string;
  experience: string;
  createdAt: string;
  kycStatus?: string | null;
  dcKycStatus?: string | null;
}


// Daftar tunggu calon Mentor/Creator (diajukan Student dari Profil > Upgrade Role; diputuskan Direktur).
// Menyetujui = pengangkatan + kartu terbit langsung + notifikasi ke yang bersangkutan.
const RoleApplications: React.FC = () => {
  const { t, lang } = useI18n();
  const roleLabel = (r: string) => ({ MENTOR: 'Mentor', CREATOR: 'Creator' } as Record<string, string>)[r] ?? r;
  const [items, setItems] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await adminApi.listApplications('PENDING');
      setItems(res.data?.data ?? []);
    } catch {
      setMessage(t('adm2.raLoadFail'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const decide = async (item: Application, action: 'APPROVE' | 'REJECT') => {
    const note = action === 'REJECT' ? window.prompt(t('adm2.raReason')) ?? undefined : undefined;
    setBusyId(item.id);
    try {
      const res = await adminApi.decideApplication(item.id, action, note);
      const card: string | null = res.data?.data?.cardNumber ?? null;
      setMessage(
        action === 'APPROVE'
          ? t('adm2.raApproved', { n: item.name, r: roleLabel(item.requestedRole) }) + (card ? t('adm2.raCard', { c: card }) : '')
          : t('adm2.raRejected', { n: item.name }),
      );
      await load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setMessage(msg || t('adm2.raFail'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-slate-800">
        <h3 className="font-bold text-gray-900 dark:text-white">{t('adm2.raTitle')}</h3>
        <p className="text-xs text-gray-500 dark:text-slate-400">
          {t('adm2.raSub')}
        </p>
      </div>
      {message && <div className="px-4 py-3 text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300">{message}</div>}
      {isLoading ? (
        <div className="p-8 text-center text-gray-500"><Loader2 className="animate-spin inline" /></div>
      ) : items.length === 0 ? (
        <div className="p-8 text-center text-sm text-gray-500 dark:text-slate-400">{t('adm2.raNone')}</div>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-slate-800">
          {items.map((item) => (
            <li key={item.id} className="p-4 flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="space-y-1 text-sm">
                <p className="font-bold text-gray-900 dark:text-white">
                  {item.name} <span className="font-normal text-gray-500">({item.email})</span>
                  <span className={`ml-2 text-xs font-bold px-2 py-0.5 rounded ${item.kycStatus === 'VERIFIED' || item.dcKycStatus === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {item.kycStatus === 'VERIFIED' ? t('adm2.raKycA') : item.dcKycStatus === 'completed' ? t('adm2.raKycD') : t('adm2.raKycN')}
                  </span>
                </p>
                <p className="text-xs font-bold uppercase text-digitalcoop-600">{t('adm2.raApplying', { r: roleLabel(item.requestedRole) })}</p>
                <p className="text-gray-700 dark:text-slate-300"><strong>{t('adm2.raProfile')}</strong> {item.profile}</p>
                <p className="text-gray-700 dark:text-slate-300"><strong>{t('adm2.raExp')}</strong> {item.experience}</p>
                <p className="text-xs text-gray-400">{new Date(item.createdAt).toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US')}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  disabled={busyId === item.id}
                  onClick={() => decide(item, 'APPROVE')}
                  className="px-3 py-2 bg-green-600 text-white rounded text-xs font-bold flex items-center hover:bg-green-700 disabled:opacity-50"
                >
                  <CheckCircle size={14} className="mr-1" /> {t('adm2.approve')}
                </button>
                <button
                  disabled={busyId === item.id}
                  onClick={() => decide(item, 'REJECT')}
                  className="px-3 py-2 bg-red-600 text-white rounded text-xs font-bold flex items-center hover:bg-red-700 disabled:opacity-50"
                >
                  <XCircle size={14} className="mr-1" /> {t('adm2.reject')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default RoleApplications;
