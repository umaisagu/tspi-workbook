/** True when the e-mail's domain is exactly one of the allowed domains (no subdomain matching). */
export function isAllowedEmail(email: string, allowedDomains: readonly string[]): boolean {
  const at = email.lastIndexOf("@");
  if (at <= 0 || at === email.length - 1) return false;
  const domain = email.slice(at + 1).trim().toLowerCase();
  return allowedDomains.some((d) => d.trim().toLowerCase() === domain);
}

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}
