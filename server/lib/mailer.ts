import nodemailer from "nodemailer";

export interface MailInput {
  to: string;
  subject: string;
  text: string;
  attachments?: { filename: string; content: Buffer; contentType: string }[];
}

const secureFlag = (port: number, raw: string | undefined): boolean => {
  const v = (raw ?? "").trim().toLowerCase();
  if (v) return ["1", "true", "yes", "on"].includes(v);
  return port === 465;
};

/** Konfigurasi SMTP dari .env; null bila belum lengkap (fitur email nonaktif). */
export const readSmtpConfig = (env: NodeJS.ProcessEnv = process.env) => {
  const host = (env.SMTP_HOST ?? "").trim();
  const user = (env.SMTP_USER ?? "").trim();
  const pass = (env.SMTP_PASSWORD ?? "").trim();
  const from = (env.SMTP_FROM ?? "").trim();
  const portRaw = Number(env.SMTP_PORT ?? "587");
  if (!host || !user || !pass || !from || !Number.isFinite(portRaw)) return null;
  const port = Math.max(1, Math.min(65535, Math.floor(portRaw)));
  return { host, port, user, pass, from, secure: secureFlag(port, env.SMTP_SECURE) };
};

/** Alamat pengirim dari SMTP_FROM dengan nama tampilan tetap "KMP-ADNG Academy" (ganti lewat SMTP_FROM_NAME bila perlu). */
export const fromHeader = (rawFrom: string, env: NodeJS.ProcessEnv = process.env): string => {
  const m = rawFrom.match(/<([^<>]+)>\s*$/);
  const address = (m ? m[1] : rawFrom).trim();
  const name = ((env.SMTP_FROM_NAME ?? "").trim() || "KMP-ADNG Academy").replace(/["\r\n]/g, "");
  return `"${name}" <${address}>`;
};

export const isSmtpConfigured = (): boolean => readSmtpConfig() !== null;

export const sendMail = async (input: MailInput): Promise<void> => {
  const cfg = readSmtpConfig();
  if (!cfg) throw new Error("SMTP belum dikonfigurasi");
  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
  });
  await transporter.sendMail({ from: fromHeader(cfg.from), to: input.to, subject: input.subject, text: input.text, attachments: input.attachments });
};
