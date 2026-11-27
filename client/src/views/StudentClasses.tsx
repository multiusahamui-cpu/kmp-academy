import React, { useState } from 'react';
import { GraduationCap } from 'lucide-react';
import { apiMessage, classesApi } from '../services/classes';
import { Card, Empty, StateBox, dateTimeId, useAsync } from '../components/ReportBits';

const StudentClasses: React.FC = () => {
  const { data, loading, error, reload } = useAsync(() => classesApi.mine());
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    try {
      const r = await classesApi.join(code);
      setCode('');
      setMsg(`Berhasil bergabung ke ${r.name}.`);
      await reload();
    } catch (e2) {
      setMsg(apiMessage(e2, 'Gagal bergabung.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center"><GraduationCap className="mr-3 text-digitalcoop-600" /> Kelas</h2>
        <p className="text-gray-500 dark:text-slate-400">Kelas dari Mentor: jadwal sesi dan nilai Anda.</p>
      </div>
      <Card title="Gabung dengan kode">
        <form onSubmit={join} className="flex gap-2">
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Kode dari Mentor" className="flex-1 px-3 py-2 text-sm border rounded-lg font-mono uppercase dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
          <button type="submit" disabled={busy || !code.trim()} className="px-4 py-2 bg-digitalcoop-600 text-white rounded-lg text-sm font-bold disabled:opacity-50">Gabung</button>
        </form>
        {msg && <p role="status" className="text-sm mt-2 text-gray-700 dark:text-slate-300">{msg}</p>}
      </Card>
      <StateBox loading={loading} error={error} onRetry={reload}>
        {data && data.length === 0 ? (
          <Empty>Anda belum tergabung di kelas mana pun.</Empty>
        ) : (
          data?.map((c) => (
            <Card key={c.id} title={c.name}>
              <p className="text-sm text-gray-500 dark:text-slate-400">Mentor: {c.mentor}{c.archived ? ' (kelas diarsipkan)' : ''}</p>
              {c.description && <p className="text-sm mt-1">{c.description}</p>}
              <p className="text-sm mt-3">Nilai: <b className="font-mono">{c.grade === null ? 'belum dinilai' : c.grade}</b>{c.gradeNote ? <span className="text-gray-500">, {c.gradeNote}</span> : null}</p>
              <h4 className="font-bold text-sm mt-4 mb-1">Sesi mendatang</h4>
              {c.sessions.length === 0 ? (
                <p className="text-sm text-gray-500">Belum ada jadwal.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {c.sessions.map((s) => (
                    <li key={s.id}>{dateTimeId(s.startsAt)}: <b>{s.title}</b>{s.meetingUrl && <> , <a href={s.meetingUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">buka tautan</a></>}</li>
                  ))}
                </ul>
              )}
            </Card>
          ))
        )}
      </StateBox>
    </div>
  );
};

export default StudentClasses;
