// Pembuat PDF sertifikat tanpa dependensi (huruf standar PDF, tanpa font tertanam). Tulisan dipetakan ke WinAnsi: karakter di luar Latin-1 menjadi "?".
// Lebar huruf (per 1000 satuan) untuk Helvetica/Times dipakai memusatkan dan membungkus teks.
const W: Record<string, number[]> = {
  H: [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584],
  HB: [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584],
  T: [250,333,408,500,500,833,778,180,333,333,500,564,250,333,250,278,500,500,500,500,500,500,500,500,500,500,278,278,564,564,564,444,921,722,667,667,722,611,556,722,722,333,389,722,611,889,722,722,556,722,667,556,611,722,722,944,722,722,611,333,278,333,469,500,333,444,500,444,500,444,333,500,500,278,278,500,278,778,500,500,500,500,333,389,278,500,500,722,500,500,444,480,200,480,541],
  TB: [250,333,555,500,500,1000,833,278,333,333,500,570,250,333,250,278,500,500,500,500,500,500,500,500,500,500,333,333,570,570,570,500,930,722,667,722,722,667,611,778,778,389,500,778,667,944,722,778,611,778,722,556,667,722,722,1000,722,722,667,333,278,333,581,500,333,500,556,444,556,444,333,500,556,278,333,556,278,833,556,500,556,556,444,389,333,556,500,722,500,500,444,394,220,394,520],
};

export type CertFont = "H" | "HB" | "T" | "TB";
const BASE_FONT: Record<CertFont, string> = { H: "Helvetica", HB: "Helvetica-Bold", T: "Times-Roman", TB: "Times-Bold" };

/** Hanya karakter yang dapat dipetakan ke WinAnsi/Latin-1; sisanya "?". Kontrol dibuang. */
export const winAnsi = (s: string): string => [...s].map((ch) => { const c = ch.codePointAt(0)!; return c < 32 ? "" : c <= 255 ? ch : "?"; }).join("");

export const textWidth = (s: string, font: CertFont, size: number): number => {
  let total = 0;
  for (const ch of winAnsi(s)) { const c = ch.charCodeAt(0); total += c >= 32 && c <= 126 ? W[font][c - 32] : 556; }
  return (total * size) / 1000;
};

export const wrapText = (s: string, font: CertFont, size: number, maxWidth: number): string[] => {
  const lines: string[] = [];
  let cur = "";
  for (const word of winAnsi(s).split(/\s+/).filter(Boolean)) {
    const next = cur ? `${cur} ${word}` : word;
    if (cur && textWidth(next, font, size) > maxWidth) { lines.push(cur); cur = word; } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
};

const esc = (s: string): string => winAnsi(s).replace(/[\\()]/g, (m) => `\\${m}`);
const n = (v: number): string => (Math.round(v * 100) / 100).toString();

/** Satu halaman; origin kiri-bawah, satuan poin. */
export class PdfPage {
  private ops: string[] = [];
  constructor(readonly width: number, readonly height: number) {}
  color(r: number, g: number, b: number, stroke = false): this { this.ops.push(`${n(r)} ${n(g)} ${n(b)} ${stroke ? "RG" : "rg"}`); return this; }
  rect(x: number, y: number, w: number, h: number, lineWidth: number): this { this.ops.push(`${n(lineWidth)} w ${n(x)} ${n(y)} ${n(w)} ${n(h)} re S`); return this; }
  line(x1: number, y1: number, x2: number, y2: number, lineWidth: number): this { this.ops.push(`${n(lineWidth)} w ${n(x1)} ${n(y1)} m ${n(x2)} ${n(y2)} l S`); return this; }
  text(s: string, x: number, y: number, font: CertFont, size: number): this {
    this.ops.push(`BT /${font} ${n(size)} Tf ${n(x)} ${n(y)} Td (${esc(s)}) Tj ET`);
    return this;
  }
  centered(s: string, cx: number, y: number, font: CertFont, size: number): this { return this.text(s, cx - textWidth(s, font, size) / 2, y, font, size); }
  content(): string { return this.ops.join("\n"); }
}

export const buildPdf = (page: PdfPage, title: string): Buffer => {
  const content = Buffer.from(page.content(), "latin1");
  const fonts = (Object.keys(BASE_FONT) as CertFont[]).map((k, i) => ({ k, id: 5 + i }));
  const objs: Buffer[] = [];
  const add = (body: string | Buffer) => objs.push(Buffer.isBuffer(body) ? body : Buffer.from(body, "latin1"));
  add("<< /Type /Catalog /Pages 2 0 R >>");
  add("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${n(page.width)} ${n(page.height)}] /Contents 4 0 R /Resources << /Font << ${fonts.map((f) => `/${f.k} ${f.id} 0 R`).join(" ")} >> >> >>`);
  add(Buffer.concat([Buffer.from(`<< /Length ${content.length} >>\nstream\n`, "latin1"), content, Buffer.from("\nendstream", "latin1")]));
  for (const f of fonts) add(`<< /Type /Font /Subtype /Type1 /BaseFont /${BASE_FONT[f.k]} /Encoding /WinAnsiEncoding >>`);
  add(`<< /Title (${esc(title)}) /Producer (KMP-ADNG Academy) >>`);
  const parts: Buffer[] = [Buffer.from("%PDF-1.4\n", "latin1")];
  const offsets: number[] = [];
  let pos = parts[0].length;
  objs.forEach((o, i) => {
    offsets.push(pos);
    const chunk = Buffer.concat([Buffer.from(`${i + 1} 0 obj\n`, "latin1"), o, Buffer.from("\nendobj\n", "latin1")]);
    parts.push(chunk);
    pos += chunk.length;
  });
  const xref = [`xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`, ...offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`)].join("");
  parts.push(Buffer.from(`${xref}trailer\n<< /Size ${objs.length + 1} /Root 1 0 R /Info ${objs.length} 0 R >>\nstartxref\n${pos}\n%%EOF\n`, "latin1"));
  return Buffer.concat(parts);
};
