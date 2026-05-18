/**
 * Centralized time-based magic constants used across the backend.
 *
 * Before this file, values like "30 minutes", "5 minutes", "1 hour" were
 * duplicated as raw arithmetic (`5 * 60 * 1000`) in cache calls, JWT configs,
 * cookie max-age, signed URLs, and throttlers — making it easy to bump one
 * site and forget the others (or to misread `60 * 60` as 60 minutes).
 *
 * All values are NUMBERS in their natural unit for the consumer:
 *   - CACHE_TTL_MS — milliseconds (AppCacheService takes ms)
 *   - SIGNED_URL_TTL_SECONDS — seconds (Bunny CDN signature uses seconds)
 *   - COOKIE_MAX_AGE_SECONDS — seconds (Set-Cookie max-age is seconds)
 *   - THROTTLE — { ttl: ms, limit: N } shape used by @nestjs/throttler
 */

const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_S = 24 * 60 * 60;

/** Cache TTLs (milliseconds, for AppCacheService.set) */
export const CACHE_TTL_MS = {
  /** Course detail / curriculum — short because pendingChanges flips often. */
  COURSE_DETAIL: 5 * MINUTE_MS,
  /** Public course list — longer; invalidated on any course mutation. */
  COURSE_LIST: 15 * MINUTE_MS,
  /** Categories — change rarely. */
  CATEGORIES: 1 * HOUR_MS,
  /** Stats endpoints — heavy aggregations, fine to be slightly stale. */
  STATS: 5 * MINUTE_MS,
} as const;

/** Signed URL TTLs (seconds — Bunny CDN signature format) */
export const SIGNED_URL_TTL_SECONDS = {
  /** Authenticated playback URL. Short to limit token-sharing damage. */
  PLAYBACK: 15 * 60,
  /** Free-lesson preview. */
  PREVIEW: 15 * 60,
} as const;

/** Cookie max-age (seconds — Set-Cookie format) */
export const COOKIE_MAX_AGE_SECONDS = {
  /** Mirrors refresh-token TTL. Bump both together. */
  REFRESH_TOKEN: 7 * DAY_S,
  /** Frontend role cookie (mirrored from refresh token). */
  USER_ROLE: 7 * DAY_S,
} as const;

/**
 * Throttler presets — { ttl ms, limit N }. Use via:
 *   `@Throttle({ default: THROTTLE.READS })`
 * Pick the bucket that matches the endpoint's risk profile, not the exact
 * number you want — that way changing "what counts as a sensitive endpoint"
 * is one edit here, not a sweep across controllers.
 */
export const THROTTLE = {
  /** Login, register, forgot-password — credential-stuffing surface. */
  AUTH_CRITICAL: { ttl: 1 * MINUTE_MS, limit: 3 },
  /** Review submission — abuse vector for spam. */
  WRITES_RARE: { ttl: 1 * MINUTE_MS, limit: 5 },
  /** Order placement, cart-clear — destructive-ish writes. */
  WRITES_NORMAL: { ttl: 1 * MINUTE_MS, limit: 10 },
  /** Cart/wishlist add/remove — frequent but bounded. */
  WRITES_FREQUENT: { ttl: 1 * MINUTE_MS, limit: 30 },
  /** File uploads — heavy but human-paced. */
  UPLOADS: { ttl: 1 * MINUTE_MS, limit: 20 },
  /** Read endpoints (signed URL fetch, etc.). */
  READS: { ttl: 1 * MINUTE_MS, limit: 30 },
  /** Global default — set in AppModule. */
  GLOBAL_DEFAULT: { ttl: 1 * MINUTE_MS, limit: 100 },
} as const;

/** Pagination defaults & caps. */
export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  /** Hard cap for admin lists — prevents `?limit=999999` memory blowup. */
  ADMIN_MAX_LIMIT: 100,
  /** Public-facing max (reviews, courses page). */
  PUBLIC_MAX_LIMIT: 50,
} as const;
