import React, { useCallback, useEffect, useRef, useState } from "react";
import { Bell, Settings } from "lucide-react";
import { NotificationItem, notificationsApi } from "../services/notifications";
import { useI18n } from "../i18n";
import { translateNotification } from "../i18n/notificationText";

const POLL_MS = 60_000;

const timeAgo = (iso: string, t: (k: string, v?: Record<string, string | number>) => string, lang: string): string => {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return t("help.nbJustNow");
  if (s < 3600) return t("help.nbMin", { n: Math.floor(s / 60) });
  if (s < 86400) return t("help.nbHour", { n: Math.floor(s / 3600) });
  return new Date(iso).toLocaleDateString(lang === "en" ? "en-US" : "id-ID", { day: "numeric", month: "short", year: "numeric" });
};

interface Props {
  onOpenSettings: () => void;
}

const NotificationBell: React.FC<Props> = ({ onOpenSettings }) => {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  const refreshCount = useCallback(async () => {
    try {
      setUnread(await notificationsApi.unreadCount());
    } catch {
      /* jaringan putus: biarkan angka lama */
    }
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      setItems(await notificationsApi.list());
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshCount();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void refreshCount();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [refreshCount]);

  useEffect(() => {
    if (!open) return;
    void loadList();
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, loadList]);

  const readOne = async (n: NotificationItem) => {
    if (n.readAt) return;
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)));
    setUnread((c) => Math.max(0, c - 1));
    try {
      await notificationsApi.markRead(n.id);
    } catch {
      void loadList();
      void refreshCount();
    }
  };

  const readAll = async () => {
    try {
      await notificationsApi.markAllRead();
      setItems((prev) => prev.map((x) => ({ ...x, readAt: x.readAt ?? new Date().toISOString() })));
      setUnread(0);
    } catch {
      void refreshCount();
    }
  };

  return (
    <div className="relative" ref={box}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-300 transition"
        title={t("help.nbTitle")}
        aria-label={unread > 0 ? t("help.nbUnreadAria", { n: unread }) : t("help.nbTitle")}
        aria-expanded={open}
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-4 h-4 px-1 bg-red-500 rounded-full border border-white dark:border-slate-900 text-[10px] text-white flex items-center justify-center font-bold">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-800">
            <span className="font-semibold text-sm text-gray-900 dark:text-white">{t("help.nbTitle")}</span>
            <div className="flex items-center gap-3">
              {unread > 0 && (
                <button onClick={readAll} className="text-xs text-digitalcoop-600 dark:text-digitalcoop-400 hover:underline">
                  {t("help.nbMarkAll")}
                </button>
              )}
              <button
                onClick={() => {
                  setOpen(false);
                  onOpenSettings();
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
                title={t("help.nbSettings")}
                aria-label={t("help.nbSettings")}
              >
                <Settings size={16} />
              </button>
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-800">
            {loading && items.length === 0 && <p className="p-6 text-center text-sm text-gray-500 dark:text-slate-400">{t("help.nbLoading")}</p>}
            {failed && <p className="p-6 text-center text-sm text-red-600">{t("help.nbFail")}</p>}
            {!loading && !failed && items.length === 0 && (
              <p className="p-6 text-center text-sm text-gray-500 dark:text-slate-400">{t("help.nbNone")}</p>
            )}
            {items.map((n) => (
              <button
                key={n.id}
                onClick={() => readOne(n)}
                className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-800 transition ${n.readAt ? "" : "bg-digitalcoop-50/60 dark:bg-slate-800/60"}`}
              >
                <div className="flex items-start gap-2">
                  {!n.readAt && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-digitalcoop-600" aria-label={t("help.nbUnread")} />}
                  <div className="min-w-0">
                    <p className={`text-sm text-gray-900 dark:text-white ${n.readAt ? "" : "font-semibold"}`}>{translateNotification(n, lang).title}</p>
                    <p className="text-xs text-gray-600 dark:text-slate-400 mt-0.5 break-words">{translateNotification(n, lang).body}</p>
                    <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1">{timeAgo(n.createdAt, t, lang)}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
