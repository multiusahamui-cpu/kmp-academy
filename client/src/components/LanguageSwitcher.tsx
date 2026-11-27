import React, { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { useI18n, type Lang } from "../i18n";

const OPTIONS: { code: Lang; flag: string; label: string }[] = [
  { code: "en", flag: "🇬🇧", label: "English" },
  { code: "id", flag: "🇮🇩", label: "Bahasa Indonesia" },
];

/** Pemilih bahasa berbentuk dropdown bendera, ditaruh di navbar dekat lonceng. */
const LanguageSwitcher: React.FC = () => {
  const { lang, setLang, t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = OPTIONS.find((o) => o.code === lang) ?? OPTIONS[0];

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={t("common.language")}
        aria-label={t("common.language")}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-1 rounded-full px-2 py-1.5 text-gray-600 transition hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <span className="text-base leading-none" aria-hidden>{current.flag}</span>
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={t("common.language")}
          className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"
        >
          {OPTIONS.map((o) => (
            <button
              key={o.code}
              type="button"
              role="option"
              aria-selected={lang === o.code}
              onClick={() => { setLang(o.code); setOpen(false); }}
              className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition hover:bg-gray-50 dark:hover:bg-slate-800 ${
                lang === o.code ? "font-bold text-digitalcoop-700 dark:text-digitalcoop-300" : "text-gray-700 dark:text-slate-300"
              }`}
            >
              <span className="text-lg leading-none" aria-hidden>{o.flag}</span>
              <span className="flex-1">{o.label}</span>
              {lang === o.code && <Check size={16} className="text-digitalcoop-600 dark:text-digitalcoop-400" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
