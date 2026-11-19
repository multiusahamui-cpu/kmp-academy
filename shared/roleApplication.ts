// Pengajuan naik peran (Student menjadi Mentor atau Creator).
export const APPLY_ROLES = ["MENTOR", "CREATOR"] as const;
export type ApplyRole = (typeof APPLY_ROLES)[number];
export const APPLY_LIMITS = { profileMin: 30, profileMax: 1000, experienceMin: 30, experienceMax: 2000 } as const;

export const validateRoleApplication = (b: { requestedRole?: unknown; profile?: unknown; experience?: unknown }):
  { ok: true; value: { requestedRole: ApplyRole; profile: string; experience: string } } | { ok: false; message: string } => {
  const requestedRole = String(b.requestedRole ?? "");
  if (!(APPLY_ROLES as readonly string[]).includes(requestedRole)) return { ok: false, message: "Pilih peran Mentor atau Creator." };
  const clean = (v: unknown) => String(v ?? "").trim().replace(/[ \t]+/g, " ");
  const profile = clean(b.profile), experience = clean(b.experience);
  if (profile.length < APPLY_LIMITS.profileMin || profile.length > APPLY_LIMITS.profileMax) return { ok: false, message: `Profil singkat ${APPLY_LIMITS.profileMin}-${APPLY_LIMITS.profileMax} karakter.` };
  if (experience.length < APPLY_LIMITS.experienceMin || experience.length > APPLY_LIMITS.experienceMax) return { ok: false, message: `Pengalaman ${APPLY_LIMITS.experienceMin}-${APPLY_LIMITS.experienceMax} karakter.` };
  return { ok: true, value: { requestedRole: requestedRole as ApplyRole, profile, experience } };
};
