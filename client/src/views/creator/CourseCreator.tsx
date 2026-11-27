import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, Users } from 'lucide-react';
import { CreatorCourse, courseAuthoringApi } from '../../services/courses';
import { apiMessage, rupiah } from '../../services/payments';
import CourseEditor from './CourseEditor';
import { STATUS_LABEL } from './ui';
import { useT } from '../../i18n';

interface CourseCreatorProps {
  isCreateMode?: boolean;
}

const CourseCreator: React.FC<CourseCreatorProps> = ({ isCreateMode = false }) => {
  const t = useT();
  const [mode, setMode] = useState<'LIST' | 'EDIT'>(isCreateMode ? 'EDIT' : 'LIST');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [courses, setCourses] = useState<CreatorCourse[] | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try { setCourses((await courseAuthoringApi.mine()).data.data as CreatorCourse[]); } catch (err) { setError(apiMessage(err, t('creator.ccLoadFail'))); setCourses([]); }
  }, [t]);
  useEffect(() => { void load(); }, [load]);

  const back = () => { setMode('LIST'); setEditingId(null); void load(); };

  if (mode === 'EDIT') {
    return <CourseEditor courseId={editingId} onBack={back} onCreated={(id) => setEditingId(id)} />;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('creator.ccTitle')}</h2>
        <button onClick={() => { setEditingId(null); setMode('EDIT'); }} className="flex items-center rounded bg-digitalcoop-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-digitalcoop-700"><Plus size={18} className="mr-2" /> {t('creator.ccNew')}</button>
      </div>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {!courses ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-digitalcoop-600" /></div> : courses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center text-sm text-gray-500 dark:border-slate-700">{t('creator.ccEmpty')}</div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => {
            const st = STATUS_LABEL[c.status] ?? { label: c.status, cls: 'bg-gray-100 text-gray-700' };
            return (
              <div key={c.id} className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="h-36 bg-gray-100 dark:bg-slate-800">{c.thumbnail ? <img src={c.thumbnail} alt={c.title} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-gray-400">{t('creator.ccNoThumb')}</div>}</div>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-gray-900 dark:text-white">{c.title}</h3>
                    <span className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-bold ${st.cls}`}>{STATUS_LABEL[c.status] ? t(`creator.st${c.status}`) : st.label}</span>
                  </div>
                  <p className="text-sm font-bold text-digitalcoop-700 dark:text-digitalcoop-400">{c.price === 0 ? t('creator.ccFree') : rupiah(c.price)}</p>
                  <p className="flex items-center gap-3 text-xs text-gray-500"><span>{t('creator.ccModules', { n: c.moduleCount })}</span><span>{t('creator.ccQuestions', { n: c.questionCount })}</span><span className="flex items-center gap-1"><Users size={12} /> {c.studentsEnrolled}</span></p>
                  {c.status === 'REJECTED' && c.reviewNote && <p className="rounded bg-red-50 p-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-300">{t('creator.ccRejected')} {c.reviewNote}</p>}
                  <button onClick={() => { setEditingId(c.id); setMode('EDIT'); }} className="mt-auto rounded-lg border border-digitalcoop-600 py-2 text-sm font-bold text-digitalcoop-700 hover:bg-digitalcoop-50 dark:text-digitalcoop-300 dark:hover:bg-digitalcoop-900/20">{t('creator.ccManage')}</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CourseCreator;
