export interface RateLimitRule {
  /** Identifier prefix, e.g. "login:email". */
  name: string;
  limit: number;
  windowMs: number;
}

export const RATE_LIMITS = {
  loginEmail: { name: "login:email", limit: 5, windowMs: 15 * 60 * 1000 },
  loginIp: { name: "login:ip", limit: 30, windowMs: 15 * 60 * 1000 },
  resetEmail: { name: "reset:email", limit: 3, windowMs: 60 * 60 * 1000 },
  resetIp: { name: "reset:ip", limit: 10, windowMs: 60 * 60 * 1000 },
  registerIp: { name: "register:ip", limit: 10, windowMs: 60 * 60 * 1000 },
} as const satisfies Record<string, RateLimitRule>;

/** Start of the fixed window containing `now`. */
export function windowStart(now: Date, windowMs: number): Date {
  return new Date(Math.floor(now.getTime() / windowMs) * windowMs);
}

export function rateLimitKey(rule: RateLimitRule, subject: string): string {
  return `${rule.name}:${subject.trim().toLowerCase()}`;
}

/** Seconds until the window containing `now` ends. */
export function retryAfterSeconds(now: Date, windowMs: number): number {
  return Math.ceil((windowStart(now, windowMs).getTime() + windowMs - now.getTime()) / 1000);
}
