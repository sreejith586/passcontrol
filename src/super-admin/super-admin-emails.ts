/**
 * Comma-separated list in SUPER_ADMIN_EMAILS (case-insensitive match).
 */
export function isSuperAdminEmail(email: string | null | undefined): boolean {
  if (email == null || email === '') return false;
  const normalized = email.trim().toLowerCase();
  const raw = process.env.SUPER_ADMIN_EMAILS ?? '';
  const allowed = raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0);
  return allowed.includes(normalized);
}
