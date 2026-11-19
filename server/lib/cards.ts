import { eq } from "drizzle-orm";
import { cardHistory, notifications, userPreferences, users } from "../schema/schema";
import { cardPrefixFor, formatCardNumber } from "@shared/card";
import { shouldCreate, type NotificationCategory } from "@shared/notifications";

// Tipe transaksi Drizzle (db.transaction) tanpa mengimpor `db` agar mudah diuji.
type Tx = any;

export interface IssueCardResult {
  cardNumber: string;
  issuedAt: Date;
  replaced: boolean;
}

/**
 * Menerbitkan kartu untuk satu pengguna sesuai role-nya saat ini.
 * Nomor dibekukan di users.card_number; setiap penerbitan dicatat di card_history.
 * Mengembalikan null bila role tidak berhak kartu, atau kartu dengan awalan yang sama sudah ada.
 * Harus dipanggil di dalam transaksi.
 */
export const issueCard = async (
  tx: Tx,
  userId: string,
  issuer: { id: string; name: string } | null,
  now: Date = new Date(),
): Promise<IssueCardResult | null> => {
  const [user] = await tx.select().from(users).where(eq(users.id, userId)).for("update");
  if (!user) return null;

  const prefix = cardPrefixFor(user.role);
  if (!prefix || user.memberSequence == null) return null;
  if (user.cardNumber && user.cardNumber.startsWith(`${prefix}.`)) return null;

  const cardNumber = formatCardNumber(prefix, now, user.memberSequence);
  const replaced = Boolean(user.cardNumber);

  await tx.update(users).set({ cardNumber, cardIssuedAt: now, updatedAt: now }).where(eq(users.id, userId));
  await tx.insert(cardHistory).values({
    userId,
    cardNumber,
    prefix,
    event: replaced ? "REPLACED" : "ISSUED",
    issuedBy: issuer?.id ?? null,
    issuedByName: issuer?.name ?? null,
  });

  return { cardNumber, issuedAt: now, replaced };
};

/**
 * Membuat notifikasi dalam aplikasi. Kategori yang dimatikan pengguna dilewati, kecuali kategori terkunci
 * (akun & keamanan, pembayaran) yang selalu dibuat.
 */
export const notifyUser = async (tx: Tx, userId: string, title: string, body: string, category: NotificationCategory = "INFO"): Promise<void> => {
  const [pref] = await tx.select({ muted: userPreferences.mutedCategories }).from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1);
  if (!shouldCreate(category, pref?.muted ?? [])) return;
  await tx.insert(notifications).values({ userId, title, body, category });
};
