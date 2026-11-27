import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { dict, type Lang } from "./translations";

const STORAGE_KEY = "academy_lang";
const DEFAULT_LANG: Lang = "en";

// Mendukung kunci datar bertitik di dalam namespace (mis. "nc.AKUN.label"): coba kunci terpanjang dulu.
const readParts = (cur: unknown, parts: string[]): string | undefined => {
  if (parts.length === 0) return typeof cur === "string" ? cur : undefined;
  if (!cur || typeof cur !== "object") return undefined;
  const o = cur as Record<string, unknown>;
  for (let i = parts.length; i >= 1; i--) {
    const key = parts.slice(0, i).join(".");
    if (key in o) {
      const hit = readParts(o[key], parts.slice(i));
      if (hit !== undefined) return hit;
    }
  }
  return undefined;
};

const read = (obj: Record<string, unknown>, path: string): string | undefined => readParts(obj, path.split("."));

const interpolate = (s: string, vars?: Record<string, string | number>): string =>
  vars ? s.replace(/\{\{(\w+)\}\}/g, (_, k) => (k in vars ? String(vars[k]) : `{{${k}}}`)) : s;

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<Ctx | null>(null);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "en" || saved === "id") return saved;
    } catch { /* ignore */ }
    return DEFAULT_LANG;
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* ignore */ }
    if (typeof document !== "undefined") document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => setLangState(l), []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const hit = read(dict[lang], key) ?? read(dict[DEFAULT_LANG], key) ?? key;
      return interpolate(hit, vars);
    },
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = (): Ctx => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n harus di dalam <LanguageProvider>");
  return ctx;
};

/** Pintasan: const t = useT(); t("nav.dashboard") */
export const useT = () => useI18n().t;
export type { Lang };
