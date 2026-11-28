import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle, ExternalLink, Loader2, XCircle } from 'lucide-react';
import { CourseDetail, courseAuthoringApi, courseReviewApi } from '../../services/courses';
import { apiMessage, rupiah } from '../../services/payments';
import PromoTab from '../creator/PromoTab';
import { STATUS_LABEL, btnPrimary, inputClass } from '../creator/ui';
import { useI18n } from '../../i18n';

interface ReviewRow {
  id: string; title: string; status: string; price: number; type: string; instructorName: string | null;
  submittedAt: string | null; reviewedAt: string | null; reviewNote: string | null; description: string | null;
  moduleCount: number; questionCount: number; examEnabled: boolean;
}

const FILTERS = ['PENDING_REVIEW', 'PUBLISHED', 'REJECTED'];

const CourseReviews: React.FC = () => {
  const { t, lang } = useI18n();
  const fmt = (v: string | null) => (v ? new Date(v).toLocaleString(lang === 'id' ? 'id-ID' : 'en-US') : '-');
  const [filter, setFilter] = useState('PENDING_REVIEW');
  const [rows, setRows] = useState<ReviewRow[] | null>(null);
  const [selected, setSelected] = useState<ReviewRow | null>(null);
  const [detail, setDetail] = useState<CourseDetail | null>(null);
  const [preview, setPreview] = useState<{ title: string; text?: string; url?: string } | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setRows(null);
    try { setRows((await courseReviewApi.list(filter)).data.data as ReviewRow[]); } catch (err) { setError(apiMessage(err, t('adm2.crLoadFail'))); setRows([]); }
  }, [filter, t]);
  useEffect(() => { void load(); }, [load]);

  const open = async (r: ReviewRow) => {
    setSelected(r); setDetail(null); setPreview(null); setNote(''); setError('');
    try { setDetail((await courseAuthoringApi.detail(r.id)).data.data as CourseDetail); } catch (err) { setError(apiMessage(err, t('adm2.crDetailFail'))); }
  };

  const view = async (mid: string, title: string) => {
    if (!selected) return;
    setError('');
    try {
      const d = (await courseAuthoringApi.moduleContent(selected.id, mid)).data.data as { type: string; text?: string; url?: string };
      setPreview({ title, text: d.type === 'TEXT' ? d.text ?? '' : undefined, url: d.type === 'TEXT' ? undefined : d.url });
    } catch (err) { setError(apiMessage(err, t('adm2.crModFail'))); }
  };

  const decide = async (decision: 'APPROVE' | 'REJECT') => {
    if (!selected) return;
    if (decision === 'REJECT' && note.trim().length < 10) { setError(t('adm2.crNoteReq')); return; }
    setBusy(true); setError('');
    try {
      await courseReviewApi.decide(selected.id, decision, note.trim());
      setSelected(null); setDetail(null);
      await load();
    } catch (err) { setError(apiMessage(err, t('adm2.crSaveFail'))); } finally { setBusy(false); }
  };

  if (selected) {
    const pending = selected.status === 'PENDING_REVIEW';
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <button onClick={() => { setSelected(null); setError(''); }} className="text-sm font-medium text-digitalcoop-700 hover:underline dark:text-digitalcoop-300">&larr; {t('adm2.crBack')}</button>
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selected.title}</h2>
          <p className="mt-1 text-sm text-gray-500">{t('adm2.crMeta', { c: selected.instructorName ?? '-', p: selected.price === 0 ? t('adm2.crFree') : rupiah(selected.price), d: fmt(selected.submittedAt) })}</p>
          <p className="mt-4 whitespace-pre-line text-sm text-gray-700 dark:text-slate-300">{selected.description}</p>
          {detail?.licenseAcceptedAt && <p className="mt-3 text-xs text-green-600">{t('adm2.crLicense', { d: fmt(detail.licenseAcceptedAt) })}</p>}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-3 font-bold text-gray-900 dark:text-white">{t('adm2.crModules', { n: selected.moduleCount, q: selected.examEnabled ? selected.questionCount : t('adm2.crExamOff') })}</h3>
          {!detail ? <Loader2 className="animate-spin text-digitalcoop-600" /> : (
            <ul className="divide-y divide-gray-100 dark:divide-slate-800">
              {detail.modules.map((m, i) => (
                <li key={m.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="text-gray-800 dark:text-slate-200">{i + 1}. {m.title} <span className="text-xs text-gray-400">({m.type}{m.isFreePreview ? t('adm2.crFreePrev') : ''})</span></span>
                  <button onClick={() => void view(m.id, m.title)} className="text-xs font-bold text-digitalcoop-700 hover:underline dark:text-digitalcoop-300">{t('adm2.crView')}</button>
                </li>
              ))}
            </ul>
          )}
          {preview && (
            <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-800/50">
              <p className="mb-2 font-bold">{preview.title}</p>
              {preview.text !== undefined ? <p className="whitespace-pre-line">{preview.text}</p> : (
                <a href={preview.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-digitalcoop-700 hover:underline dark:text-digitalcoop-300"><ExternalLink size={14} /> {t('adm2.crOpenFile')}</a>
              )}
            </div>
          )}
        </div>

        {pending ? (
          <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="font-bold text-gray-900 dark:text-white">{t('adm2.crDecision')}</h3>
            <textarea className={inputClass} rows={3} maxLength={500} placeholder={t('adm2.crNotePh')} value={note} onChange={(e) => setNote(e.target.value)} />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-3">
              <button disabled={busy} onClick={() => void decide('APPROVE')} className={`${btnPrimary} flex items-center gap-2`}><CheckCircle size={16} /> {t('adm2.crApprove')}</button>
              <button disabled={busy} onClick={() => void decide('REJECT')} className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"><XCircle size={16} /> {t('adm2.reject')}</button>
            </div>
          </div>
        ) : (
          <>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {selected.reviewNote && <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700 dark:bg-slate-800 dark:text-slate-300">{t('adm2.crReviewNote', { n: selected.reviewNote })}</p>}
          </>
        )}

        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-1 font-bold text-gray-900 dark:text-white">{t('adm2.crPromo')}</h3>
          <p className="mb-4 text-xs text-gray-500">{t('adm2.crPromoSub')}</p>
          <PromoTab courseId={selected.id} isManager />
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">{t('adm2.crTitle')}</h2>
      <div className="mb-4 flex gap-2">
        {FILTERS.map((id) => <button key={id} onClick={() => setFilter(id)} className={`rounded-full border px-4 py-1.5 text-sm font-medium ${filter === id ? 'border-digitalcoop-600 bg-digitalcoop-50 text-digitalcoop-700 dark:bg-digitalcoop-900/20' : 'border-gray-300 text-gray-600 dark:border-slate-600 dark:text-slate-300'}`}>{t(`adm2.cr${id}`)}</button>)}
      </div>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      {!rows ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-digitalcoop-600" /></div> : rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 py-12 text-center text-sm text-gray-500 dark:border-slate-700">{t('adm2.crNone')}</p>
      ) : (
        <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
          {rows.map((r) => {
            const st = STATUS_LABEL[r.status] ?? { label: r.status, cls: 'bg-gray-100 text-gray-700' };
            return (
              <button key={r.id} onClick={() => void open(r)} className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-gray-50 dark:hover:bg-slate-800">
                <span>
                  <span className="block font-bold text-gray-900 dark:text-white">{r.title}</span>
                  <span className="text-xs text-gray-500">{r.instructorName ?? '-'} · {t('adm2.crModCount', { n: r.moduleCount })} · {r.price === 0 ? t('adm2.crFree') : rupiah(r.price)} · {fmt(r.submittedAt)}</span>
                </span>
                <span className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-bold ${st.cls}`}>{STATUS_LABEL[r.status] ? t(`creator.st${r.status}`) : st.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CourseReviews;
