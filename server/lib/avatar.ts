import fs from "node:fs/promises";
import path from "node:path";

export const AVATAR_DIR = path.resolve("static", "avatars");
export const AVATAR_URL_PREFIX = "/cdn/avatars/";

export const avatarUrl = (fileName: string): string => `${AVATAR_URL_PREFIX}${fileName}`;

export const newAvatarFileName = (userId: string, ext: string, now = Date.now()): string => `${userId}-${now}.${ext}`;

/** Menyimpan foto baru di static/avatars; mengembalikan nama berkas. */
export const saveAvatarFile = async (fileName: string, data: Uint8Array): Promise<void> => {
  await fs.mkdir(AVATAR_DIR, { recursive: true });
  await fs.writeFile(path.join(AVATAR_DIR, fileName), data, { flag: "wx" });
};

/**
 * Menghapus foto lama milik user. Hanya berkas di static/avatars yang namanya diawali id user
 * yang disentuh, jadi nilai `avatar` dari data lama (mis. URL luar) tidak pernah menghapus berkas lain.
 */
export const removeOldAvatar = async (userId: string, avatar: string | null | undefined): Promise<void> => {
  if (!avatar || !avatar.startsWith(AVATAR_URL_PREFIX)) return;
  const fileName = path.basename(avatar);
  if (!fileName.startsWith(`${userId}-`)) return;
  try {
    await fs.unlink(path.join(AVATAR_DIR, fileName));
  } catch {
    // berkas sudah tidak ada: tidak masalah
  }
};
