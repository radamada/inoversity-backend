/**
 * Centralized cookie configuration.
 *
 * Production uses the `__Host-` prefix which enforces:
 *   • Secure flag (HTTPS only)
 *   • Path = /  (cannot be scoped to a sub-path)
 *   • No Domain attribute (cookie locked to the exact host, not subdomains)
 *
 * Development keeps plain names because `__Host-` requires HTTPS (Secure flag)
 * and the local dev server runs over HTTP.
 */
const IS_PROD = process.env.NODE_ENV === 'production';

// ── Cookie names ─────────────────────────────────────────────────────────────
export const COOKIE_NAMES = {
  refreshToken: IS_PROD ? '__Host-refresh_token' : 'refresh_token',
  userRole:     IS_PROD ? '__Host-user_role'     : 'user_role',
} as const;

// ── Cookie set-options ────────────────────────────────────────────────────────

/**
 * Options for the refresh-token cookie.
 *
 * Path note:
 *   • Dev  → '/api/auth/refresh'  (narrow scope, extra defense-in-depth)
 *   • Prod → '/'                  (__Host- prefix mandates Path=/)
 */
export const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   IS_PROD,
  sameSite: 'strict' as const,
  path:     IS_PROD ? '/' : '/api/auth/refresh',
  maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days
};

/** Options for the user-role cookie (read by Next.js middleware for routing). */
export const ROLE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   IS_PROD,
  sameSite: 'strict' as const,
  path:     '/',
  maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days
};

/** Clear options must match the path used when the cookie was set. */
export const REFRESH_COOKIE_CLEAR_OPTIONS = {
  path: IS_PROD ? '/' : '/api/auth/refresh',
};

export const ROLE_COOKIE_CLEAR_OPTIONS = {
  path: '/',
};
