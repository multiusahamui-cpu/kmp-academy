import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, Edit, Search, Tag, X } from 'lucide-react';
import { CATEGORY_DESCRIPTION_MAX, slugify } from '@shared/categories';
import { useI18n } from '../../i18n';
import { CategoryDto, courseAuthoringApi } from '../../services/courses';

interface FormState {
  id: string | null; // null = kategori baru
  name: string;
  slug: string;
  slugTouched: boolean;
  description: string;
}

const EMPTY: FormState = { id: null, name: '', slug: '', slugTouched: false, description: '' };

const CategoryManager: React.FC = () => {
  const { t } = useI18n();
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      setCategories((await courseAuthoringApi.categories()).data.data as CategoryDto[]);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openNew = () => {
    setError('');
    setForm(EMPTY);
  };

  const openEdit = (c: CategoryDto) => {
    setError('');
    setForm({ id: c.id, name: c.name, slug: c.slug, slugTouched: true, description: c.description ?? '' });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setError('');
    const body = { name: form.name, slug: form.slug, description: form.description.trim() || null };
    try {
      if (form.id) await courseAuthoringApi.updateCategory(form.id, body);
      else await courseAuthoringApi.createCategory(body);
      setNotice(form.id ? t('adm4.cmUpdated') : t('adm4.cmAdded'));
      setForm(null);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('adm4.cmSaveFail'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c: CategoryDto) => {
    if (!confirm(t('adm4.cmDelAsk', { n: c.name }))) return;
    setNotice('');
    try {
      await courseAuthoringApi.deleteCategory(c.id);
      setNotice(t('adm4.cmDeleted'));
      await load();
    } catch (err: any) {
      setNotice(err?.response?.data?.message ?? t('adm4.cmDelFail'));
    }
  };

  const term = searchTerm.toLowerCase();
  const filtered = categories.filter((c) => c.name.toLowerCase().includes(term) || c.slug.toLowerCase().includes(term));

  return (
    <div className="max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('adm4.cmTitle')}</h2>
          <p className="text-gray-500 dark:text-slate-400">{t('adm4.cmSub')}</p>
        </div>
        <button onClick={openNew} className="flex items-center px-4 py-2 bg-digitalcoop-600 text-white rounded-lg hover:bg-digitalcoop-700 font-bold text-sm shadow-sm">
          <Plus size={18} className="mr-2" /> {t('adm4.cmAdd')}
        </button>
      </div>

      {notice && (
        <div role="status" className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-digitalcoop-200 dark:border-digitalcoop-800 bg-digitalcoop-50 dark:bg-digitalcoop-900/20 px-4 py-2 text-sm text-digitalcoop-800 dark:text-digitalcoop-200">
          <span>{notice}</span>
          <button onClick={() => setNotice('')} aria-label={t('adm4.close')}><X size={14} /></button>
        </div>
      )}

      {form && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-sm border border-digitalcoop-200 dark:border-digitalcoop-800 mb-6">
          <h3 className="font-bold text-gray-800 dark:text-white mb-4">{form.id ? t('adm4.cmEdit') : t('adm4.cmNew')}</h3>
          <form onSubmit={submit} className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{t('adm4.cmName')}</label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value, slug: form.slugTouched ? form.slug : slugify(e.target.value) })}
                  className="w-full p-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded focus:ring-2 focus:ring-digitalcoop-500"
                  placeholder={t('adm4.cmNamePh')}
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{t('adm4.cmSlug')}</label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value, slugTouched: true })}
                  className="w-full p-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded font-mono text-sm focus:ring-2 focus:ring-digitalcoop-500"
                  placeholder="digital-marketing"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{t('adm4.cmDesc')} <span className="font-normal text-gray-400">{t('adm4.cmOpt')}</span></label>
              <textarea
                rows={2}
                maxLength={CATEGORY_DESCRIPTION_MAX}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full p-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded text-sm focus:ring-2 focus:ring-digitalcoop-500"
                placeholder={t('adm4.cmDescPh')}
              />
              <p className="text-xs text-gray-400 mt-1">{t('adm4.cmDescHint', { n: form.description.length, m: CATEGORY_DESCRIPTION_MAX })}</p>
            </div>
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-3">
              <button type="submit" disabled={saving} className="px-4 py-2 bg-digitalcoop-600 text-white rounded-lg hover:bg-digitalcoop-700 font-bold text-sm disabled:opacity-50">
                {saving ? t('adm4.cmSaving') : t('adm4.cmSave')}
              </button>
              <button type="button" onClick={() => setForm(null)} className="px-4 py-2 text-sm text-gray-600 dark:text-slate-300 hover:underline">{t('adm4.cmCancel')}</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-slate-800">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('adm4.cmSearchPh')}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-md text-sm focus:ring-1 focus:ring-digitalcoop-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
            <thead className="bg-gray-50 dark:bg-slate-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">{t('adm4.cmThName')}</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Slug</th>
                <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">{t('adm4.cmThCount')}</th>
                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">{t('adm4.umThAct')}</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-800">
              {loading && <tr><td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-slate-400">{t('adm4.cmLoading')}</td></tr>}
              {loadError && <tr><td colSpan={4} className="px-6 py-8 text-center text-sm text-red-600">{t('adm4.cmLoadFail')}</td></tr>}
              {!loading && !loadError && filtered.length === 0 && <tr><td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-slate-400">{t('adm4.cmNone')}</td></tr>}
              {filtered.map((cat) => (
                <tr key={cat.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                  <td className="px-6 py-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 shrink-0 rounded bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <Tag size={16} />
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-gray-900 dark:text-white">{cat.name}</span>
                        {cat.description && <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 max-w-md">{cat.description}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400 font-mono">/{cat.slug}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span
                      title={t('adm4.cmTip', { a: cat.count, b: cat.totalCourses })}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-300"
                    >
                      {t('adm4.cmCourses', { n: cat.totalCourses })}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => openEdit(cat)} className="text-digitalcoop-600 dark:text-digitalcoop-400 hover:text-digitalcoop-900 mx-2" aria-label={t('adm4.cmEditL', { n: cat.name })}><Edit size={16} /></button>
                    <button onClick={() => remove(cat)} className="text-red-600 hover:text-red-900" aria-label={t('adm4.cmDelL', { n: cat.name })}><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CategoryManager;
