import { spawn } from "child_process";
import { promises as fs } from "fs";
import os from "os";
import path from "path";

/**
 * Konversi berkas Office (PPT/PPTX) menjadi PDF memakai LibreOffice headless.
 * Butuh biner `soffice` terpasang di server (atau set env SOFFICE_BIN ke path-nya).
 * Mengembalikan isi PDF sebagai Buffer; melempar error bila LibreOffice tak ada / konversi gagal.
 */
export const convertToPdf = async (input: Buffer, originalName: string): Promise<Buffer> => {
  const ext = (originalName.split(".").pop() || "pptx").toLowerCase().replace(/[^a-z0-9]/g, "") || "pptx";
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "acad-conv-"));
  const inFile = path.join(dir, `source.${ext}`);
  const outFile = path.join(dir, "source.pdf");
  try {
    await fs.writeFile(inFile, input);
    await runSoffice(dir, inFile);
    const pdf = await fs.readFile(outFile);
    if (!pdf.length) throw new Error("Hasil konversi PDF kosong.");
    return pdf;
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
};

const runSoffice = (outdir: string, inFile: string): Promise<void> =>
  new Promise((resolve, reject) => {
    const bin = process.env.SOFFICE_BIN || "soffice";
    // UserInstallation terpisah agar tidak terkunci bila beberapa konversi berjalan paralel.
    const proc = spawn(
      bin,
      [
        `-env:UserInstallation=file://${path.join(outdir, "profile")}`,
        "--headless",
        "--norestore",
        "--nolockcheck",
        "--convert-to",
        "pdf",
        "--outdir",
        outdir,
        inFile,
      ],
      { timeout: 120_000 },
    );
    let err = "";
    proc.stderr.on("data", (d) => (err += d.toString()));
    proc.on("error", (e) => reject(new Error(`LibreOffice tidak tersedia ("${bin}"). ${e.message}`)));
    proc.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`Konversi LibreOffice gagal (exit ${code}). ${err.slice(0, 300)}`))));
  });
