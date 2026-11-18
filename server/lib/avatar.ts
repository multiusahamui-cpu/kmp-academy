import path from "node:path";
import { deletePublic, publicKeyFromUrl, putPublic, readR2Config, resolveDriver } from "./storage";

export const newAvatarKey = (userId: string, ext: string, now = Date.now()): string => `avatars/${userId}-${now}.${ext}`;

/** Menyimpan foto di penyimpanan publik; mengembalikan URL untuk disimpan di users.avatar. */
export const newThumbnailKey = (courseId: string, ext: string, now = Date.now()): string => `thumbnails/${courseId}-${now}.${ext}`;

export const saveAvatar = (key: string, data: Uint8Array, mime: string): Promise<string> => putPublic(key, data, mime);

/**
 * Menghapus berkas publik lama milik satu pemilik. Hanya objek di `folder/` yang namanya diawali id pemilik yang
 * disentuh, jadi nilai lama (mis. URL luar atau milik driver lain) tidak pernah menghapus berkas lain.
 */
export const removeOldPublicFile = async (folder: string, ownerId: string, url: string | null | undefined): Promise<void> => {
  if (!url) return;
  const driver = resolveDriver();
  const key = publicKeyFromUrl(url, driver, driver === "r2" ? readR2Config() : null);
  if (!key || !key.startsWith(`${folder}/`)) return;
  if (!path.basename(key).startsWith(`${ownerId}-`)) return;
  await deletePublic(key);
};

export const removeOldAvatar = (userId: string, avatar: string | null | undefined): Promise<void> =>
  removeOldPublicFile("avatars", userId, avatar);
