import React, { useState } from 'react';
import { Users } from 'lucide-react';
import { apiMessage, classesApi } from '../../services/classes';
import { Card, Empty, StateBox, dateTimeId, num, useAsync } from '../../components/ReportBits';

const input = 'w-full px-3 py-2 text-sm border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white';

const ClassDetailView: React.FC<{ id: string; onBack: () => void; onChanged: () => void }> = ({ id, onBack, onChanged }) => {
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
      setMsg(apiMessage(e, 'Gagal.'));
    }
  };

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="text-sm text-gray-500 hover:text-digitalcoop-600">&larr; Kembali</button>
      <StateBox loading={loading} error={error} onRetry={reload}>
        {data && (
          <>
            <div className="flex justify-between items-start flex-wrap gap-3">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{data.class.name}</h2>
                {data.class.description && <p className="text-gray-500 dark:text-slate-400">{data.class.description}</p>}
                {data.class.archived && <p className="text-xs text-red-600 font-bold mt-1">Diarsipkan</p>}
              </div>
              <div className="text-right text-sm">
                {data.class.courseId ? (
                  <p className="text-xs text-gray-500 max-w-[14rem]">Workshop berbayar: peserta masuk otomatis setelah membeli kursusnya.</p>
                ) : (
                  <>
                    <p className="text-gray-500">Kode gabung</p>
                    <p className="font-mono text-lg font-bold tracking-widest">{data.class.joinCode}</p>
                    <button onClick={() => confirm('Ganti kode? Kode lama tidak berlaku lagi.') && void act(() => classesApi.newCode(id), 'Kode diganti.')} className="text-xs underline text-gray-500">Ganti kode</button>
                  </>
                )}
                <button onClick={() => void act(() => classesApi.update(id, { name: data.class.name, description: data.class.description ?? '', archived: !data.class.archived }))} className="text-xs underline text-gray-500 ml-3">{data.class.archived ? 'Aktifkan' : 'Arsipkan'}</button>
              </div>
            </div>
            {msg && <p role="status" className="text-sm text-gray-700 dark:text-slate-300">{msg}</p>}

            <Card title={`Anggota (${num(data.members.length)})`}>
              {!data.class.courseId && <form className="flex gap-2 mb-4" onSubmit={(e) => { e.preventDefault(); void act(() => classesApi.addMember(id, email), 'Siswa ditambahkan.').then(() => setEmail('')); }}>
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email siswa terdaftar" className={input} />
                <button type="submit" className="px-4 py-2 bg-digitalcoop-600 text-white rounded-lg text-sm font-bold shrink-0">Tambah</button>
              </form>}
              {data.members.length === 0 ? (
                <Empty>Belum ada anggota. Tambahkan lewat email atau bagikan kode gabung.</Empty>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className="text-gray-500 dark:text-slate-400"><tr><th className="py-2">Nama</th><th>Nilai</th><th></th></tr></thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                    {data.members.map((m) => (
                      <tr key={m.userId}>
                        <td className="py-2"><p className="font-medium text-gray-900 dark:text-white">{m.name}</p><p className="text-xs text-gray-500">{m.email}</p></td>
                        <td>
                          {grading?.userId === m.userId ? (
                            <form className="flex gap-1 items-center" onSubmit={(e) => { e.preventDefault(); void act(() => classesApi.grade(id, m.userId, Number(grading.grade), grading.note), 'Nilai disimpan.').then(() => setGrading(null)); }}>
                              <input type="number" min={0} max={100} value={grading.grade} onChange={(e) => setGrading({ ...grading, grade: e.target.value })} className="w-20 px-2 py-1 border rounded dark:bg-slate-800 dark:text-white" />
                              <input value={grading.note} onChange={(e) => setGrading({ ...grading, note: e.target.value })} placeholder="Catatan" maxLength={500} className="px-2 py-1 border rounded dark:bg-slate-800 dark:text-white" />
                              <button type="submit" className="px-2 py-1 bg-digitalcoop-600 text-white rounded text-xs">Simpan</button>
                            </form>
                          ) : m.grade === null ? '-' : <span className="font-mono font-bold">{m.grade}{m.gradeNote ? <span className="font-sans font-normal text-xs text-gray-500">, {m.gradeNote}</span> : null}</span>}
                        </td>
                        <td className="text-right whitespace-nowrap">
                          <button onClick={() => setGrading({ userId: m.userId, grade: m.grade === null ? '' : String(m.grade), note: m.gradeNote ?? '' })} className="text-xs underline mr-3">Nilai</button>
                          <button onClick={() => confirm(`Keluarkan ${m.name} dari kelas?`) && void act(() => classesApi.removeMember(id, m.userId))} className="text-xs underline text-red-600">Keluarkan</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>

            <Card title="Jadwal sesi">
              <form className="grid md:grid-cols-4 gap-2 mb-4" onSubmit={(e) => { e.preventDefault(); void act(() => classesApi.addSession(id, { title, startsAt: new Date(startsAt).toISOString(), meetingUrl: url }), 'Sesi dijadwalkan, anggota diberi tahu.').then(() => { setTitle(''); setUrl(''); }); }}>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Judul sesi" className={input} />
                <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={input} />
                <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://... (opsional)" className={input} />
                <button type="submit" disabled={!title || !startsAt} className="px-4 py-2 bg-digitalcoop-600 text-white rounded-lg text-sm font-bold disabled:opacity-50">Jadwalkan</button>
              </form>
              {data.sessions.length === 0 ? (
                <Empty>Belum ada sesi.</Empty>
              ) : (
                <ul className="divide-y divide-gray-100 dark:divide-slate-800">
                  {data.sessions.map((s) => (
                    <li key={s.id} className="py-2 flex justify-between items-center text-sm">
                      <span><b className="text-gray-900 dark:text-white">{s.title}</b>, {dateTimeId(s.startsAt)}{s.meetingUrl && <> , <a href={s.meetingUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">tautan</a></>}</span>
                      <button onClick={() => confirm('Hapus sesi ini?') && void act(() => classesApi.deleteSession(id, s.id))} className="text-xs underline text-red-600">Hapus</button>
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
      setErr(apiMessage(e2, 'Gagal membuat kelas.'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center"><Users className="mr-3 text-digitalcoop-600" /> Kelas Saya</h2>
          <p className="text-gray-500 dark:text-slate-400">Kelola anggota, jadwal sesi, dan nilai siswa.</p>
        </div>
        <button onClick={() => setForm(!form)} className="px-4 py-2 bg-digitalcoop-600 text-white rounded-lg text-sm font-bold">Kelas baru</button>
      </div>
      {form && (
        <Card>
          <form onSubmit={create} className="space-y-3">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama kelas" maxLength={120} className={input} />
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Deskripsi (opsional)" rows={3} maxLength={1000} className={input} />
            {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
            <button type="submit" className="px-4 py-2 bg-digitalcoop-600 text-white rounded-lg text-sm font-bold">Buat kelas</button>
          </form>
        </Card>
      )}
      <StateBox loading={loading} error={error} onRetry={reload}>
        {data && data.length === 0 ? (
          <Empty>Belum ada kelas.</Empty>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {data?.map((c) => (
              <button key={c.id} onClick={() => setOpenId(c.id)} className="text-left">
                <Card className="hover:border-digitalcoop-300">
                  <h3 className="font-bold text-gray-900 dark:text-white">{c.name}{c.archived && <span className="text-xs text-red-600 ml-2">arsip</span>}</h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400">{num(c.members)} anggota</p>
                  <p className="text-xs text-gray-500 mt-1">{c.nextSession ? `Sesi berikutnya: ${dateTimeId(c.nextSession)}` : 'Belum ada sesi mendatang'}</p>
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
