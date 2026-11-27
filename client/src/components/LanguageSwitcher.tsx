import React from "react";
import { useI18n, type Lang } from "../i18n";

const OPTIONS: { code: Lang; flag: string; label: string }[] = [
  { code: "en", flag: "🇬🇧", label: "English" },
  { code: "id", flag: "🇮🇩", label: "Bahasa Indonesia" },
];

/** Pemilih bahasa berbentuk ikon bendera, ditaruh di navbar dekat lonceng. */
const LanguageSwitcher: React.FC = () => {
  const { lang, setLang, t } = useI18n();
  return (
    <div className="flex items-center gap-0.5 rounded-full bg-gray-100 p-0.5 dark:bg-slate-800" role="group" aria-label={t("common.language")}>
      {OPTIONS.map((o) => (
        <button
          key={o.code}
          type="button"
          onClick={() => setLang(o.code)}
          title={o.label}
          aria-label={o.label}
          aria-pressed={lang === o.code}
          className={`flex h-7 w-7 items-center justify-center rounded-full text-base leading-none transition ${
            lang === o.code
              ? "bg-white shadow-sm ring-1 ring-digitalcoop-300 dark:bg-slate-700"
              : "opacity-55 hover:opacity-100"
          }`}
        >
          <span aria-hidden>{o.flag}</span>
        </button>
      ))}
    </div>
  );
};

export default LanguageSwitcher;
