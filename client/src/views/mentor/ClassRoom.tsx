import React, { useState } from 'react';
import { Users } from 'lucide-react';
import { apiMessage, classesApi } from '../../services/classes';
import { useT } from '../../i18n';
import { Card, Empty, StateBox, dateTimeId, num, useAsync } from '../../components/ReportBits';

const input = 'w-full px-3 py-2 text-sm border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white';

const ClassDetailView: React.FC<{ id: string; onBack: () => void; onChanged: () => void }> = ({ id, onBack, onChanged }) => {
  const t = useT();
  const { data, loading, error, reload } = useAsync(() => classesApi.get(id), [id]);
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [url, setUrl] = useState('');
  const [msg, setMsg] = useState('');
  const [grading, setGrading] = useState<{ userId: string; grade: string; note: string } | null>(null);

  const act = async (fn: () => Promise<unknown>, okMsg = '') => {
    setMsg('');
    try {
      await fn();
      setMsg(okMsg);
      onChanged();
      await reload();
    } catch (e) {
      setMsg(apiMessage(e, t('mentor.fail')));
    }
  };

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="text-sm text-gray-500 hover:text-digitalcoop-600">&larr; {t('mentor.back')}</button>
      <StateBox loading={loading} error={error} onRetry={reload}>
        {data && (
          <>
            <div className="flex justify-between items-start flex-wrap gap-3">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{data.class.name}</h2>
                {data.class.description && <p className="text-gray-500 dark:text-slate-400">{data.class.description}</p>}
                {data.class.archived && <p className="text-xs text-red-600 font-bold mt-1">{t('mentor.archived')}</p>}
              </div>
              <div className="text-right text-sm">
                {data.class.courseId ? (
                  <p className="text-xs text-gray-500 max-w-[14rem]">{t('mentor.paidWs')}</p>
                ) : (
                  <>
                    <p className="text-gray-500">{t('mentor.joinCode')}</p>
                    <p className="font-mono text-lg font-bold tracking-widest">{data.class.joinCode}</p>
                    <button onClick={() => confirm(t('mentor.codeAsk')) && void act(() => classesApi.newCode(id), t('mentor.codeDone'))} className="text-xs underline text-gray-500">{t('mentor.codeBtn')}</button>
                  </>
                )}
                <button onClick={() => void act(() => classesApi.update(id, { name: data.class.name, description: data.class.description ?? '', archived: !data.class.archived }))} className="text-xs underline text-gray-500 ml-3">{data.class.archived ? t('mentor.activate') : t('mentor.archive')}</button>
              </div>
            </div>
            {msg && <p role="status" className="text-sm text-gray-700 dark:text-slate-300">{msg}</p>}

            <Card title={t('mentor.members', { n: num(data.members.length) })}>
              {!data.class.courseId && <form className="flex gap-2 mb-4" onSubmit={(e) => { e.preventDefault(); void act(() => classesApi.addMember(id, email), t('mentor.studentAdded')).then(() => setEmail('')); }}>
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('mentor.emailPh')} className={input} />
                <button type="submit" className="px-4 py-2 bg-digitalcoop-600 text-white rounded-lg text-sm font-bold shrink-0">{t('mentor.add')}</button>
              </form>}
              {data.members.length === 0 ? (
                <Empty>{t('mentor.noMembers')}</Empty>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className="text-gray-500 dark:text-slate-400"><tr><th className="py-2">{t('mentor.colName')}</th><th>{t('mentor.colGrade')}</th><th></th></tr></thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                    {data.members.map((m) => (
                      <tr key={m.userId}>
                        <td className="py-2"><p className="font-medium text-gray-900 dark:text-white">{m.name}</p><p className="text-xs text-gray-500">{m.email}</p></td>
                        <td>
                          {grading?.userId === m.userId ? (
                            <form className="flex gap-1 items-center" onSubmit={(e) => { e.preventDefault(); void act(() => classesApi.grade(id, m.userId, Number(grading.grade), grading.note), t('mentor.gradeSaved')).then(() => setGrading(null)); }}>
                              <input type="number" min={0} max={100} value={grading.grade} onChange={(e) => setGrading({ ...grading, grade: e.target.value })} className="w-20 px-2 py-1 border rounded dark:bg-slate-800 dark:text-white" />
                              <input value={grading.note} onChange={(e) => setGrading({ ...grading, note: e.target.value })} placeholder={t('mentor.notePh')} maxLength={500} className="px-2 py-1 border rounded dark:bg-slate-800 dark:text-white" />
                              <button type="submit" className="px-2 py-1 bg-digitalcoop-600 text-white rounded text-xs">{t('mentor.save')}</button>
                            </form>
                          ) : m.grade === null ? '-' : <span className="font-mono font-bold">{m.grade}{m.gradeNote ? <span className="font-sans font-normal text-xs text-gray-500">, {m.gradeNote}</span> : null}</span>}
                        </td>
                        <td className="text-right whitespace-nowrap">
                          <button onClick={() => setGrading({ userId: m.userId, grade: m.grade === null ? '' : String(m.grade), note: m.gradeNote ?? '' })} className="text-xs underline mr-3">{t('mentor.grade')}</button>
                          <button onClick={() => confirm(t('mentor.removeAsk', { n: m.name })) && void act(() => classesApi.removeMember(id, m.userId))} className="text-xs underline text-red-600">{t('mentor.remove')}</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>

            <Card title={t('mentor.sessions')}>
              <form className="grid md:grid-cols-4 gap-2 mb-4" onSubmit={(e) => { e.preventDefault(); void act(() => classesApi.addSession(id, { title, startsAt: new Date(startsAt).toISOString(), meetingUrl: url }), t('mentor.sessionDone')).then(() => { setTitle(''); setUrl(''); }); }}>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('mentor.sessionPh')} className={input} />
                <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={input} />
                <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder={t('mentor.urlPh')} className={input} />
                <button type="submit" disabled={!title || !startsAt} className="px-4 py-2 bg-digitalcoop-600 text-white rounded-lg text-sm font-bold disabled:opacity-50">{t('mentor.schedule')}</button>
              </form>
              {data.sessions.length === 0 ? (
                <Empty>{t('mentor.noSessions')}</Empty>
              ) : (
                <ul className="divide-y divide-gray-100 dark:divide-slate-800">
                  {data.sessions.map((s) => (
                    <li key={s.id} className="py-2 flex justify-between items-center text-sm">
                      <span><b className="text-gray-900 dark:text-white">{s.title}</b>, {dateTimeId(s.startsAt)}{s.meetingUrl && <> , <a href={s.meetingUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">{t('mentor.link')}</a></>}</span>
                      <button onClick={() => confirm(t('mentor.delSessionAsk')) && void act(() => classesApi.deleteSession(id, s.id))} className="text-xs underline text-red-600">{t('mentor.delete')}</button>
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

const ClassRoom: React.FC = () => {
  const t = useT();
  const { data, loading, error, reload } = useAsync(() => classesApi.list());
  const [openId, setOpenId] = useState<string | null>(null);
  const [form, setForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [err, setErr] = useState('');

  if (openId) return <ClassDetailView id={openId} onBack={() => setOpenId(null)} onChanged={() => void reload()} />;

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    try {
      const { id } = await classesApi.create({ name, description });
      setName('');
      setDescription('');
      setForm(false);
      await reload();
      setOpenId(id);
    } catch (e2) {
      setErr(apiMessage(e2, t('mentor.createFail')));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center"><Users className="mr-3 text-digitalcoop-600" /> {t('mentor.title')}</h2>
          <p className="text-gray-500 dark:text-slate-400">{t('mentor.sub')}</p>
        </div>
        <button onClick={() => setForm(!form)} className="px-4 py-2 bg-digitalcoop-600 text-white rounded-lg text-sm font-bold">{t('mentor.newClass')}</button>
      </div>
      {form && (
        <Card>
          <form onSubmit={create} className="space-y-3">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('mentor.namePh')} maxLength={120} className={input} />
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('mentor.descPh')} rows={3} maxLength={1000} className={input} />
            {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
            <button type="submit" className="px-4 py-2 bg-digitalcoop-600 text-white rounded-lg text-sm font-bold">{t('mentor.create')}</button>
          </form>
        </Card>
      )}
      <StateBox loading={loading} error={error} onRetry={reload}>
        {data && data.length === 0 ? (
          <Empty>{t('mentor.noClasses')}</Empty>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {data?.map((c) => (
              <button key={c.id} onClick={() => setOpenId(c.id)} className="text-left">
                <Card className="hover:border-digitalcoop-300">
                  <h3 className="font-bold text-gray-900 dark:text-white">{c.name}{c.archived && <span className="text-xs text-red-600 ml-2">{t('mentor.archShort')}</span>}</h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400">{t('mentor.membersN', { n: num(c.members) })}</p>
                  <p className="text-xs text-gray-500 mt-1">{c.nextSession ? t('mentor.nextSession', { d: dateTimeId(c.nextSession) }) : t('mentor.noUpcoming')}</p>
                </Card>
              </button>
            ))}
          </div>
        )}
      </StateBox>
    </div>
  );
};

export default ClassRoom;
