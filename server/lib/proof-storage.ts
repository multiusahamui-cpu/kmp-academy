import fs from "node:fs/promises";
import path from "node:path";

// Bukti transfer bersifat privat: disimpan DI LUAR folder `static` (yang dilayani publik lewat /cdn)
// dan hanya dibuka lewat endpoint admin yang memeriksa role.
export const PROOF_DIR = path.resolve("private-uploads", "settlements");

export const saveProofFile = async (fileName: string, data: Uint8Array): Promise<void> => {
  await fs.mkdir(PROOF_DIR, { recursive: true });
  await fs.writeFile(path.join(PROOF_DIR, fileName), data, { flag: "wx" });
};

export const removeProofFile = async (fileName: string): Promise<void> => {
  try {
    await fs.unlink(path.join(PROOF_DIR, path.basename(fileName)));
  } catch {
    // sudah tidak ada
  }
};

/** Path berkas dari nama yang tersimpan di database; basename mencegah keluar dari PROOF_DIR. */
export const proofPath = (fileName: string): string => path.join(PROOF_DIR, path.basename(fileName));
