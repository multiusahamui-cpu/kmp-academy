import React, { useRef, useState } from 'react';
import { ArrowDown, ArrowUp, FileText, Loader2, PlayCircle, Trash2, UploadCloud } from 'lucide-react';
import { ModuleDto, ModuleKind, courseAuthoringApi, uploadModuleFile } from '../../services/courses';
import { apiMessage } from '../../services/payments';
import { btnPrimary, inputClass } from './ui';

interface Props {
  courseId: string;
  editable: boolean;
  modules: ModuleDto[];
  onChanged: () => void;
}

const KIND_LABEL: Record<ModuleKind, string> = { VIDEO: 'Video', PDF: 'PDF', TEXT: 'Teks' };
const ACCEPT: Record<ModuleKind, string> = { VIDEO: 'video/mp4,video/webm', PDF: 'application/pdf', TEXT: '' };

const ModulesTab: React.FC<Props> = ({ courseId, editable, modules, onChanged }) => {
  const [type, setType] = useState<ModuleKind>('VIDEO');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [text, setText] = useState('');
  const [free, setFree] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ id: string; pct: number } | null>(null);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const [replaceId, setReplaceId] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setError('');
    try { await fn(); onChanged(); } catch (err) { setError(err instanceof Error && !('response' in err) ? err.message : apiMessage(err, 'Gagal memproses.')); } finally { setBusy(false); setProgress(null); }
  };

  const add = () => run(async () => {
    if (type !== 'TEXT' && !file) throw new Error('Pilih berkas materi terlebih dahulu.');
    const res = await courseAuthoringApi.addModule(courseId, { title, description, type, textContent: type === 'TEXT' ? text : undefined, isFreePreview: free });
    const created = res.data.data as ModuleDto;
    setTitle(''); setDescription(''); setText(''); setFree(false);
    if (type !== 'TEXT' && file) {
      const f = file;
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      await uploadModuleFile(courseId, created.id, f, (pct) => setProgress({ id: created.id, pct }));
    }
  });

  const replaceFile = (m: ModuleDto, f: File | undefined) => {
    if (!f) return;
    void run(async () => { await uploadModuleFile(courseId, m.id, f, (pct) => setProgress({ id: m.id, pct })); });
    if (replaceRef.current) replaceRef.current.value = '';
  };

  const move = (idx: number, dir: -1 | 1) => run(async () => {
    const ids = modules.map((m) => m.id);
    const j = idx + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[idx], ids[j]] = [ids[j], ids[idx]];
    await courseAuthoringApi.reorderModules(courseId, ids);
  });

  const remove = (m: ModuleDto) => {
    if (!window.confirm(`Hapus modul "${m.title}"?`)) return;
    void run(async () => { await courseAuthoringApi.deleteModule(courseId, m.id); });
  };

  return (
    <div className="space-y-6">
      <input ref={replaceRef} type="file" hidden accept={replaceId ? ACCEPT[modules.find((m) => m.id === replaceId)?.type ?? 'VIDEO'] : ''} onChange={(e) => { const m = modules.find((x) => x.id === replaceId); if (m) replaceFile(m, e.target.files?.[0]); }} />
      <div className="space-y-2">
        {modules.length === 0 && <p className="rounded-lg border border-dashed border-gray-300 py-8 text-center text-sm text-gray-500 dark:border-slate-700">Belum ada modul.</p>}
        {modules.map((m, idx) => (
          <div key={m.id} className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 dark:border-slate-700">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600 dark:bg-slate-800 dark:text-slate-300">{idx + 1}</span>
            <span className="text-kodman-600">{m.type === 'VIDEO' ? <PlayCircle size={18} /> : <FileText size={18} />}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-gray-900 dark:text-white">{m.title} {m.isFreePreview && <span className="ml-1 rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-bold text-green-700">Pratinjau gratis</span>}</p>
              <p className="text-xs text-gray-500">{KIND_LABEL[m.type]} • {m.hasContent ? 'Isi tersedia' : <span className="text-red-600">Belum ada isi</span>}</p>
              {progress?.id === m.id && <div className="mt-1 h-1.5 w-full overflow-hidden rounded bg-gray-200"><div className="h-full bg-kodman-600 transition-all" style={{ width: `${progress.pct}%` }} /></div>}
            </div>
            {editable && (
              <div className="flex shrink-0 items-center gap-1">
                {m.type !== 'TEXT' && <button disabled={busy} title="Unggah / ganti berkas" onClick={() => { setReplaceId(m.id); setTimeout(() => replaceRef.current?.click(), 0); }} className="rounded p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800"><UploadCloud size={16} /></button>}
                <button disabled={busy || idx === 0} onClick={() => void move(idx, -1)} className="rounded p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-slate-800"><ArrowUp size={16} /></button>
                <button disabled={busy || idx === modules.length - 1} onClick={() => void move(idx, 1)} className="rounded p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-slate-800"><ArrowDown size={16} /></button>
                <button disabled={busy} onClick={() => remove(m)} className="rounded p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 size={16} /></button>
              </div>
            )}
          </div>
        ))}
      </div>

      {editable && (
        <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-800/40">
          <h4 className="text-sm font-bold text-gray-900 dark:text-white">Tambah Modul</h4>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-xs text-gray-500">Jenis
              <select className={inputClass} value={type} onChange={(e) => { setType(e.target.value as ModuleKind); setFile(null); }}>
                <option value="VIDEO">Video (MP4/WebM, maks. 500 MB)</option>
                <option value="PDF">PDF (maks. 50 MB)</option>
                <option value="TEXT">Teks</option>
              </select>
            </label>
            <label className="text-xs text-gray-500 md:col-span-2">Judul modul
              <input className={inputClass} value={title} maxLength={150} onChange={(e) => setTitle(e.target.value)} />
            </label>
          </div>
          <label className="block text-xs text-gray-500">Deskripsi singkat (opsional)
            <input className={inputClass} value={description} maxLength={1000} onChange={(e) => setDescription(e.target.value)} />
          </label>
          {type === 'TEXT' ? (
            <label className="block text-xs text-gray-500">Isi materi
              <textarea className={inputClass} rows={6} maxLength={20000} value={text} onChange={(e) => setText(e.target.value)} />
            </label>
          ) : (
            <input ref={fileRef} type="file" accept={ACCEPT[type]} onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-kodman-600 file:px-3 file:py-2 file:text-sm file:font-bold file:text-white" />
          )}
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300"><input type="checkbox" checked={free} onChange={(e) => setFree(e.target.checked)} /> Jadikan pratinjau gratis (bisa dibuka calon peserta)</label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button disabled={busy || title.trim().length < 3} onClick={() => void add()} className={`${btnPrimary} flex items-center gap-2`}>{busy && <Loader2 size={14} className="animate-spin" />} Tambah Modul</button>
        </div>
      )}
      {!editable && <p className="text-sm text-gray-500">Kursus ini sedang direview atau sudah terbit, sehingga modul tidak dapat diubah.</p>}
      {error && !editable && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
};

export default ModulesTab;
