// Normalisasi nomor HP Indonesia ke format 62xxxxxxxxxx (tanpa "+", spasi, atau tanda hubung).
// Dipakai untuk menyimpan dan mencari akun, agar "0812-3456-789", "+62 812 3456 789", dan "812..." sama.

export const normalizePhone = (raw: string): string | null => {
  let digits = raw.replace(/[\s().-]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  if (!/^\d+$/.test(digits)) return null;

  if (digits.startsWith("0")) digits = `62${digits.slice(1)}`;
  else if (digits.startsWith("8")) digits = `62${digits}`;

  // Nomor seluler Indonesia: 628 + 7 sampai 11 digit.
  return /^628\d{7,11}$/.test(digits) ? digits : null;
};

/** Pembeda input login: mengandung "@" berarti email, selain itu dianggap No HP. */
export const looksLikeEmail = (value: string): boolean => value.includes("@");
