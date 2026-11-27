import React, { useCallback, useEffect, useState } from 'react';
import { Award, GraduationCap, Loader2, MapPin, Search } from 'lucide-react';
import { apiMessage } from '../services/classes';
import { formatLongDate } from '../services/learning';
import { talentApi, type TalentCard, type TalentPublic } from '../services/talent';

const input = 'w-full p-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded';
const KIND: Record<string, string> = { EXAM: 'Lulus ujian', COMPLETION: 'Menyelesaikan materi', PARTICIPATION: 'Keikutsertaan' };

const Directory: React.FC = () => {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<TalentCard[]>([]);
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(true);
  const load = useCallback(async (query: string, p: number) => {
    setBusy(true);
    try { const r = await talentApi.directory(query, p); setItems((prev) => (p === 1 ? r.items : [...prev, ...r.items])); setMore(r.hasMore); } finally { setBusy(false); }
  }, []);
  useEffect(() => { void load('', 1); }, [load]);
  return (
    <div className="space-y-6">
      <form onSubmit={(e) => { e.preventDefault(); setPage(1); void load(q, 1); }} className="flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama, keahlian, atau kota" className={input} />
        <button type="submit" className="px-4 py-2 bg-digitalcoop-600 text-white rounded font-bold inline-flex items-center gap-1"><Search size={16} /> Cari</button>
      </form>
      {items.length === 0 && !busy && <p className="text-center text-gray-500 py-10">Belum ada talenta yang cocok.</p>}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((t) => (
          <a key={t.slug} href={`/talent/${t.slug}`} className="block border border-gray-200 dark:border-slate-800 rounded-lg p-4 bg-white dark:bg-slate-900 hover:shadow-md transition">
            <div className="flex gap-3 items-center mb-2">
              {t.avatar ? <img src={t.avatar} alt="" className="w-12 h-12 rounded-full object-cover" /> : <div className="w-12 h-12 rounded-full bg-digitalcoop-100 flex items-center justify-center font-bold text-digitalcoop-700">{t.name.slice(0, 1)}</div>}
              <div><p className="font-bold dark:text-white">{t.name}</p><p className="text-sm text-gray-600 dark:text-slate-400">{t.headline}</p></div>
            </div>
            {t.city && <p className="text-xs text-gray-500 flex items-center gap-1 mb-2"><MapPin size={12} /> {t.city}</p>}
            <div className="flex flex-wrap gap-1">{t.skills.slice(0, 5).map((s) => <span key={s} className="text-xs bg-gray-100 dark:bg-slate-800 dark:text-slate-300 px-2 py-0.5 rounded">{s}</span>)}</div>
          </a>
        ))}
      </div>
      {busy && <div className="text-center"><Loader2 className="animate-spin inline" /></div>}
      {more && !busy && <div className="text-center"><button onClick={() => { const n = page + 1; setPage(n); void load(q, n); }} className="px-5 py-2 border rounded font-bold dark:border-slate-700 dark:text-slate-200">Muat lebih banyak</button></div>}
    </div>
  );
};

const Profile: React.FC<{ slug: string }> = ({ slug }) => {
  const [p, setP] = useState<TalentPublic | null>(null);
  const [missing, setMissing] = useState(false);
  const [f, setF] = useState({ senderName: '', company: '', senderEmail: '', message: '' });
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { talentApi.profile(slug).then(setP).catch(() => setMissing(true)); }, [slug]);
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    try { await talentApi.inquire(slug, f); setMsg('Pesan Anda diteruskan ke talenta. Balasan dikirim langsung ke email Anda.'); setF({ senderName: '', company: '', senderEmail: '', message: '' }); } catch (err) { setMsg(apiMessage(err, 'Gagal mengirim pesan.')); } finally { setBusy(false); }
  };
  if (missing) return <p className="text-center py-16 text-gray-500">Profil tidak ditemukan atau tidak ditayangkan.</p>;
  if (!p) return <div className="text-center py-16"><Loader2 className="animate-spin inline" /></div>;
  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="border border-gray-200 dark:border-slate-800 rounded-lg p-6 bg-white dark:bg-slate-900 flex gap-4">
          {p.avatar ? <img src={p.avatar} alt="" className="w-20 h-20 rounded-full object-cover" /> : <div className="w-20 h-20 rounded-full bg-digitalcoop-100 flex items-center justify-center text-2xl font-bold text-digitalcoop-700">{p.name.slice(0, 1)}</div>}
          <div>
            <h2 className="text-2xl font-bold dark:text-white">{p.name}</h2>
            <p className="text-gray-700 dark:text-slate-300">{p.headline}</p>
            {p.city && <p className="text-sm text-gray-500 flex items-center gap-1"><MapPin size={14} /> {p.city}</p>}
            <div className="flex gap-3 mt-2 text-sm">
              {p.linkedinUrl && <a href={p.linkedinUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-digitalcoop-600 font-bold">LinkedIn</a>}
              {p.portfolioUrl && <a href={p.portfolioUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-digitalcoop-600 font-bold">Portofolio</a>}
            </div>
          </div>
        </div>
        <section className="border border-gray-200 dark:border-slate-800 rounded-lg p-6 bg-white dark:bg-slate-900">
          <h3 className="font-bold mb-2 dark:text-white">Tentang</h3>
          <p className="text-sm whitespace-pre-line text-gray-700 dark:text-slate-300">{p.bio}</p>
          <div className="flex flex-wrap gap-1 mt-3">{p.skills.map((s) => <span key={s} className="text-xs bg-gray-100 dark:bg-slate-800 dark:text-slate-300 px-2 py-0.5 rounded">{s}</span>)}</div>
        </section>
        <section className="border border-gray-200 dark:border-slate-800 rounded-lg p-6 bg-white dark:bg-slate-900">
          <h3 className="font-bold mb-3 dark:text-white flex items-center gap-2"><Award size={18} /> Kompetensi dan sertifikat</h3>
          {p.certificates.length === 0 ? <p className="text-sm text-gray-500">Belum ada sertifikat.</p> : (
            <ul className="divide-y divide-gray-100 dark:divide-slate-800">
              {p.certificates.map((c) => (
                <li key={c.serial} className="py-2 text-sm dark:text-slate-200">
                  <p className="font-bold">{c.courseTitle}</p>
                  <p className="text-xs text-gray-500">{KIND[c.kind] ?? c.kind}{c.grade ? ` · Nilai ${c.grade}` : ''} · {formatLongDate(c.issuedAt)} · <a className="text-digitalcoop-600 font-bold" href={`/verify?no=${c.serial}`}>Verifikasi {c.serial}</a></p>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="border border-gray-200 dark:border-slate-800 rounded-lg p-6 bg-white dark:bg-slate-900">
          <h3 className="font-bold mb-3 dark:text-white flex items-center gap-2"><GraduationCap size={18} /> Kursus yang diselesaikan</h3>
          {p.completedCourses.length === 0 ? <p className="text-sm text-gray-500">Belum ada.</p> : <ul className="text-sm space-y-1 dark:text-slate-200">{p.completedCourses.map((c, i) => <li key={i}>{c.title} <span className="text-xs text-gray-500">({c.type}{c.completedAt ? `, ${formatLongDate(c.completedAt)}` : ''})</span></li>)}</ul>}
        </section>
      </div>
      <form onSubmit={send} className="border border-gray-200 dark:border-slate-800 rounded-lg p-5 bg-white dark:bg-slate-900 space-y-3 h-fit">
        <h3 className="font-bold dark:text-white">Hubungi {p.name.split(' ')[0]}</h3>
        <p className="text-xs text-gray-500">Pesan diteruskan lewat Academy; kontak talenta tidak dibagikan. Email Anda hanya dilihat talenta ini.</p>
        <input required value={f.senderName} onChange={(e) => setF({ ...f, senderName: e.target.value })} placeholder="Nama Anda" className={input} />
        <input required value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} placeholder="Perusahaan" className={input} />
        <input required type="email" value={f.senderEmail} onChange={(e) => setF({ ...f, senderEmail: e.target.value })} placeholder="Email kantor" className={input} />
        <textarea required minLength={20} maxLength={1000} rows={4} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} placeholder="Tulis kebutuhan atau posisi yang dibuka (min. 20 karakter)" className={input} />
        {msg && <p role="status" className="text-sm text-gray-700 dark:text-slate-300">{msg}</p>}
        <button disabled={busy} type="submit" className="w-full py-2 bg-digitalcoop-600 text-white rounded font-bold disabled:opacity-50">Kirim pesan</button>
      </form>
    </div>
  );
};

/** Industry Hub publik: /talent (direktori) dan /talent/<slug> (profil). */
const TalentHub: React.FC<{ onHome: () => void }> = ({ onHome }) => {
  const slug = window.location.pathname.replace(/^\/talent\/?/, '').split('/')[0];
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <a href="/talent" className="font-extrabold text-xl text-digitalcoop-900 dark:text-white flex items-center gap-2"><GraduationCap /> Industry Hub KMP - ADNG</a>
          <button onClick={onHome} className="text-sm font-bold text-digitalcoop-600">Ke Academy</button>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8">
        {slug ? <Profile slug={slug} /> : (<><h1 className="text-2xl font-bold mb-1 dark:text-white">Temukan talenta</h1><p className="text-gray-600 dark:text-slate-400 mb-6">Lulusan KMP - ADNG Academy dengan sertifikat yang dapat diverifikasi.</p><Directory /></>)}
      </main>
    </div>
  );
};

export default TalentHub;
