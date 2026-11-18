import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ImagePlus, Loader2 } from 'lucide-react';
import { CategoryDto, CourseDetail, courseAuthoringApi } from '../../services/courses';
import { apiMessage } from '../../services/payments';
import ModulesTab from './ModulesTab';
import ExamTab from './ExamTab';
import PromoTab from './PromoTab';
import PublishTab from './PublishTab';
import { STATUS_LABEL, btnPrimary, inputClass } from './ui';

interface Props {
  courseId: string | null;
  onBack: () => void;
  onCreated: (id: string) => void;
}

type Tab = 'DETAILS' | 'CURRICULUM' | 'EXAM' | 'PROMO' | 'PUBLISH';
const TYPES = [{ id: 'MANDIRI', label: 'Mandiri' }, { id: 'WORKSHOP', label: 'Workshop' }, { id: 'CERTIFICATION', label: 'Sertifikasi' }];

const CourseEditor: React.FC<Props> = ({ courseId, onBack, onCreated }) => {
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [tab, setTab] = useState<Tab>('DETAILS');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('0');
  const [type, setType] = useState('MANDIRI');
  const [cats, setCats] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const thumbRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!courseId) return;
    try {
      const c = (await courseAuthoringApi.detail(courseId)).data.data as CourseDetail;
      setCourse(c);
      setTitle(c.title); setDescription(c.description ?? ''); setPrice(String(c.price)); setType(c.type); setCats(c.categoryIds ?? []);
    } catch (err) { setError(apiMessage(err, 'Gagal memuat kursus.')); }
  }, [courseId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void (async () => { try { setCategories((await courseAuthoringApi.categories()).data.data as CategoryDto[]); } catch { setCategories([]); } })(); }, []);

  const editable = !course || course.status === 'DRAFT' || course.status === 'REJECTED';

  const save = async () => {
    setBusy(true); setError(''); setMsg('');
    const data = { title, description, price: Number(price), type, categoryIds: cats };
    try {
      if (courseId) {
        await courseAuthoringApi.update(courseId, data);
        setMsg('Perubahan disimpan.');
        await load();
      } else {
        const res = await courseAuthoringApi.create(data);
        onCreated((res.data.data as { id: string }).id);
      }
    } catch (err) { setError(apiMessage(err, 'Gagal menyimpan kursus.')); } finally { setBusy(false); }
  };

  const toggleCat = (id: string) => setCats((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length < 3 ? [...c, id] : c));

  const uploadThumb = async (f: File | undefined) => {
    if (!f || !courseId) return;
    setBusy(true); setError('');
    try { await courseAuthoringApi.uploadThumbnail(courseId, f); await load(); } catch (err) { setError(apiMessage(err, 'Gagal mengunggah thumbnail.')); } finally { setBusy(false); if (thumbRef.current) thumbRef.current.value = ''; }
  };

  const tabs: [Tab, string][] = [['DETAILS', 'Detail'], ['CURRICULUM', 'Kurikulum'], ['EXAM', 'Ujian'], ['PROMO', 'Diskon & Promo'], ['PUBLISH', 'Lisensi & Ajukan']];
  const st = course ? STATUS_LABEL[course.status] ?? { label: course.status, cls: 'bg-gray-100 text-gray-700' } : null;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center gap-4">
        <button onClick={onBack} className="rounded-full p-2 transition hover:bg-gray-100 dark:hover:bg-slate-800"><ArrowLeft size={24} className="text-gray-600 dark:text-slate-300" /></button>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{courseId ? 'Kelola Kursus' : 'Buat Kursus Baru'}</h2>
        {st && <span className={`rounded px-2 py-0.5 text-xs font-bold ${st.cls}`}>{st.label}</span>}
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow dark:border-slate-800 dark:bg-slate-900">
        <div className="flex overflow-x-auto border-b border-gray-200 dark:border-slate-800">
          {tabs.map(([id, label]) => (
            <button key={id} disabled={!courseId && id !== 'DETAILS'} onClick={() => setTab(id)}
              className={`flex-1 whitespace-nowrap px-4 py-3 text-sm font-bold disabled:opacity-40 ${tab === id ? 'border-b-2 border-kodman-600 bg-kodman-50 text-kodman-700 dark:bg-kodman-900/20 dark:text-kodman-300' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800'}`}>{label}</button>
          ))}
        </div>

        <div className="space-y-5 p-6">
          {!courseId && tab === 'DETAILS' && <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">Simpan detail kursus dulu sebagai draf. Setelah itu tab Kurikulum, Ujian, dan lainnya terbuka.</p>}

          {tab === 'DETAILS' && (
            <div className="space-y-4">
              {!editable && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">Kursus sedang direview atau sudah terbit, sehingga detail dan harga dasar tidak dapat diubah.</p>}
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Judul kursus
                <input className={inputClass} disabled={!editable} value={title} maxLength={150} onChange={(e) => setTitle(e.target.value)} />
              </label>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Deskripsi
                <textarea className={inputClass} rows={5} disabled={!editable} value={description} maxLength={5000} onChange={(e) => setDescription(e.target.value)} />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Harga dasar (Rp, 0 = gratis)
                  <input className={inputClass} disabled={!editable} inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ''))} />
                </label>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Tipe
                  <select className={inputClass} disabled={!editable} value={type} onChange={(e) => setType(e.target.value)}>{TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</select>
                </label>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-gray-700 dark:text-slate-300">Kategori (maks. 3)</p>
                {categories.length === 0 ? <p className="text-xs text-gray-500">Belum ada kategori yang dibuat Admin.</p> : (
                  <div className="flex flex-wrap gap-2">
                    {categories.map((c) => (
                      <button key={c.id} disabled={!editable} onClick={() => toggleCat(c.id)} className={`rounded-full border px-3 py-1 text-xs font-medium ${cats.includes(c.id) ? 'border-kodman-500 bg-kodman-50 text-kodman-700 dark:bg-kodman-900/20' : 'border-gray-300 text-gray-600 dark:border-slate-600 dark:text-slate-300'}`}>{c.name}</button>
                    ))}
                  </div>
                )}
              </div>
              {courseId && (
                <div className="flex items-center gap-4">
                  <div className="h-24 w-40 overflow-hidden rounded-lg border border-gray-200 bg-gray-100 dark:border-slate-700 dark:bg-slate-800">
                    {course?.thumbnail ? <img src={course.thumbnail} alt="Thumbnail" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-gray-400">Belum ada thumbnail</div>}
                  </div>
                  {editable && (
                    <>
                      <input ref={thumbRef} type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={(e) => void uploadThumb(e.target.files?.[0])} />
                      <button disabled={busy} onClick={() => thumbRef.current?.click()} className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-200"><ImagePlus size={16} /> Unggah Thumbnail (maks. 2 MB)</button>
                    </>
                  )}
                </div>
              )}
              {msg && <p className="text-sm text-green-600">{msg}</p>}
              {error && <p className="text-sm text-red-600">{error}</p>}
              {editable && <button disabled={busy} onClick={() => void save()} className={`${btnPrimary} flex items-center gap-2`}>{busy && <Loader2 size={14} className="animate-spin" />} {courseId ? 'Simpan Perubahan' : 'Simpan Draf'}</button>}
            </div>
          )}

          {courseId && course && tab === 'CURRICULUM' && <ModulesTab courseId={courseId} editable={editable} modules={course.modules} onChanged={() => void load()} />}
          {courseId && course && tab === 'EXAM' && <ExamTab courseId={courseId} editable={editable} onChanged={() => void load()} />}
          {courseId && tab === 'PROMO' && <PromoTab courseId={courseId} />}
          {courseId && course && tab === 'PUBLISH' && <PublishTab course={course} editable={editable} onChanged={() => void load()} />}
          {courseId && !course && error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
};

export default CourseEditor;
