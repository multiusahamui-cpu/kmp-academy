// Toast ringan tanpa provider: bisa dipanggil dari mana saja (termasuk di luar React).
// toast.success('...'), toast.error('...'), toast.info('...').

type ToastKind = "success" | "error" | "info";

const PALETTE: Record<ToastKind, { bar: string; icon: string }> = {
  success: { bar: "#228030", icon: "✓" },
  error: { bar: "#dc2626", icon: "!" },
  info: { bar: "#f59e0b", icon: "i" },
};

let host: HTMLDivElement | null = null;

function ensureHost(): HTMLDivElement {
  if (host && document.body.contains(host)) return host;
  host = document.createElement("div");
  host.setAttribute("role", "status");
  host.setAttribute("aria-live", "polite");
  host.style.cssText =
    "position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:9999;display:flex;flex-direction:column;gap:10px;pointer-events:none;width:min(92vw,420px);";
  document.body.appendChild(host);
  return host;
}

function show(message: string, kind: ToastKind, duration = 3600): void {
  if (typeof document === "undefined") return;
  const { bar, icon } = PALETTE[kind];
  const el = document.createElement("div");
  const isDark = document.documentElement.classList.contains("dark");
  el.style.cssText = [
    "pointer-events:auto",
    "display:flex",
    "align-items:flex-start",
    "gap:10px",
    "padding:12px 14px",
    "border-radius:14px",
    `background:${isDark ? "#0f172a" : "#ffffff"}`,
    `color:${isDark ? "#e2e8f0" : "#0f172a"}`,
    `border:1px solid ${isDark ? "#1e293b" : "rgba(0,0,0,0.06)"}`,
    "box-shadow:0 12px 30px -8px rgba(0,0,0,0.25)",
    "font:500 14px/1.4 'Plus Jakarta Sans',system-ui,sans-serif",
    "animation:toastIn .3s cubic-bezier(.22,1,.36,1) both",
  ].join(";");

  const dot = document.createElement("span");
  dot.textContent = icon;
  dot.style.cssText = `flex:0 0 auto;width:22px;height:22px;border-radius:9999px;background:${bar};color:#fff;display:grid;place-items:center;font-size:13px;font-weight:700;margin-top:1px;`;

  const text = document.createElement("div");
  text.textContent = message;
  text.style.cssText = "flex:1;min-width:0;word-break:break-word;";

  el.appendChild(dot);
  el.appendChild(text);
  ensureHost().appendChild(el);

  const remove = () => {
    el.style.transition = "opacity .25s, transform .25s";
    el.style.opacity = "0";
    el.style.transform = "translateY(-8px)";
    setTimeout(() => el.remove(), 260);
  };
  el.addEventListener("click", remove);
  setTimeout(remove, duration);
}

export const toast = {
  success: (m: string, d?: number) => show(m, "success", d),
  error: (m: string, d?: number) => show(m, "error", d),
  info: (m: string, d?: number) => show(m, "info", d),
};

export default toast;
