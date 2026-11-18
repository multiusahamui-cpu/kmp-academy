import { deletePrivate, privateAccess, putPrivate, PrivateAccess } from "./storage";

// Bukti transfer bersifat privat (bucket private / folder di luar `static`); hanya dibuka lewat endpoint admin
// yang memeriksa role. Di database tersimpan nama berkasnya saja; kunci objek = settlements/<nama>.
const keyOf = (fileName: string): string => `settlements/${fileName.replace(/[^a-z0-9._-]/gi, "").toLowerCase()}`;

export const saveProofFile = (fileName: string, data: Uint8Array, mime: string): Promise<void> => putPrivate(keyOf(fileName), data, mime);
export const removeProofFile = (fileName: string): Promise<void> => deletePrivate(keyOf(fileName));
export const proofAccess = (fileName: string, mime: string): Promise<PrivateAccess> => privateAccess(keyOf(fileName), mime);
