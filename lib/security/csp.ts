/**
 * Content-Security-Policy for HTML pages (set per request in proxy.ts).
 * Scripts: only Next's own, carrying the per-request nonce ('strict-dynamic' lets them load their chunks).
 * Styles: 'unsafe-inline' is kept because React `style` props become inline style attributes, which a nonce
 * cannot cover; injected styles cannot run code, so the XSS protection comes from script-src.
 */
export function buildCsp({ nonce, dev, https }: { nonce: string; dev: boolean; https: boolean }): string {
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(https ? ["upgrade-insecure-requests"] : []),
  ];
  return directives.join("; ");
}

/** A fresh, unguessable nonce (base64 of 16 random bytes). */
export function newNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}
