import React, { useCallback, useEffect, useState } from 'react';
import { Eye, EyeOff, Globe, Lock } from 'lucide-react';
import { apiMessage } from '../services/classes';
import { talentApi, type MyTalent, type TalentForm } from '../services/talent';
import { useT } from '../i18n';

const input = 'w-full p-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded';
const EMPTY: TalentForm = { headline: '', bio: '', city: '', skills: '', linkedinUrl: '', portfolioUrl: '' };

/** Profil Industry Hub milik Student: draf boleh kapan saja, tayang publik hanya dengan KYC terverifikasi dan persetujuan. */
const TalentProfileEditor: React.FC = () => {
  const t = useT();
  const [data, setData] = useState<MyTalent | null>(null);
  const [form, setForm] = useState<TalentForm>(EMPTY);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try {
      const d = await talentApi.mine();
      setData(d);
      if (d.profile) setForm({ headline: d.profile.headline, bio: d.profile.bio, city: d.profile.city, skills: d.profile.skills.join(', '), linkedinUrl: d.profile.linkedinUrl, portfolioUrl: d.profile.portfolioUrl });
    } catch { setMsg(t('acct.tpLoadFail')); }
  }, [t]);
  useEffect(() => { void load(); }, [load]);

  const save = async (publish: boolean) => {
    setBusy(true);
    setMsg('');
    try { await talentApi.save(form, publish, consent); setMsg(publish ? t('acct.tpPublished') : t('acct.tpDraft')); await load(); } catch (e) { setMsg(apiMessage(e, t('acct.tpSaveFail'))); } finally { setBusy(false); }
  };
  const hide = async () => {
    setBusy(true);
    try { await talentApi.hide(); setMsg(t('acct.tpHidden')); await load(); } catch (e) { setMsg(apiMessage(e, t('acct.tpHideFail'))); } finally { setBusy(false); }
  };

  if (!data) return <p className="text-sm text-gray-500">{msg || t('acct.nsLoading')}</p>;
  const live = data.profile?.isPublic === true;
  const set = (k: keyof TalentForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center"><Globe className="mr-2 text-blue-600" /> Industry Hub KMP - ADNG</h3>
        <span className={`text-sm font-bold ${live ? 'text-green-600' : 'text-gray-500'}`}>{live ? t('acct.tpLive') : t('acct.tpPrivate')}</span>
      </div>
      <p className="text-sm text-gray-600 dark:text-slate-400">{t('acct.tpIntro')}</p>
      {live && data.profile && <p className="text-sm dark:text-slate-200">{t('acct.tpAddr')} <a className="text-digitalcoop-600 font-bold" href={`/talent/${data.profile.slug}`} target="_blank" rel="noopener noreferrer">/talent/{data.profile.slug}</a></p>}
      {!data.kycOk && (
        <div className="bg-gray-100 dark:bg-slate-800 p-4 rounded-lg border border-gray-300 dark:border-slate-700 text-sm flex gap-2 dark:text-slate-200"><Lock size={18} className="shrink-0" /> {t('acct.tpKyc')}</div>
      )}
      <div className="grid gap-4">
        <div><label className="block text-sm font-medium dark:text-slate-300 mb-1">{t('acct.tpHeadline')}</label><input value={form.headline} onChange={set('headline')} maxLength={120} className={input} placeholder={t('acct.tpHeadlinePh')} /></div>
        <div><label className="block text-sm font-medium dark:text-slate-300 mb-1">{t('acct.tpBio')}</label><textarea rows={4} value={form.bio} onChange={set('bio')} maxLength={1000} className={input} /></div>
        <div className="grid md:grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium dark:text-slate-300 mb-1">{t('acct.tpCity')}</label><input value={form.city} onChange={set('city')} maxLength={100} className={input} /></div>
          <div><label className="block text-sm font-medium dark:text-slate-300 mb-1">{t('acct.tpSkills')}</label><input value={form.skills} onChange={set('skills')} className={input} placeholder={t('acct.tpSkillsPh')} /></div>
          <div><label className="block text-sm font-medium dark:text-slate-300 mb-1">{t('acct.tpLinkedin')}</label><input value={form.linkedinUrl} onChange={set('linkedinUrl')} className={input} /></div>
          <div><label className="block text-sm font-medium dark:text-slate-300 mb-1">{t('acct.tpPortfolio')}</label><input value={form.portfolioUrl} onChange={set('portfolioUrl')} className={input} /></div>
        </div>
      </div>
      <label className="flex gap-2 items-start text-xs text-gray-700 dark:text-slate-300"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" /><span>{data.consentText}</span></label>
      {msg && <p role="status" className="text-sm text-gray-700 dark:text-slate-300">{msg}</p>}
      <div className="flex flex-wrap gap-3">
        <button disabled={busy} onClick={() => void save(false)} className="px-5 py-2 border rounded font-bold dark:border-slate-700 dark:text-slate-200 disabled:opacity-50">{t('acct.tpSaveDraft')}</button>
        <button disabled={busy || !data.kycOk || !consent} onClick={() => void save(true)} className="px-5 py-2 bg-digitalcoop-600 text-white rounded font-bold disabled:opacity-50 inline-flex items-center gap-1"><Eye size={16} /> {live ? t('acct.tpUpdate') : t('acct.tpPublish')}</button>
        {live && <button disabled={busy} onClick={() => void hide()} className="px-5 py-2 border rounded font-bold text-red-600 dark:border-slate-700 inline-flex items-center gap-1 disabled:opacity-50"><EyeOff size={16} /> {t('acct.tpHide')}</button>}
      </div>
    </div>
  );
};

export default TalentProfileEditor;
