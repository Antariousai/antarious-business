/**
 * Minimal in-memory sliding-window rate limiter for agent routes.
 * No paid deps. Per-process only — good enough for a single Vercel Fluid
 * instance / MVP. For multi-region horizontal scale, swap the store for a
 * Supabase counter table or Upstash later (same interface).
 */
import { EntitlementError } from '@/lib/entitlements'

type Hit = { count: number; resetAt: number }

const store = new Map<string, Hit>()

export interface RateLimitOptions {
  /** Bucket key, e.g. `freya_chat:<orgId>`. */
  key: string
  /** Max requests allowed within the window. */
  limit: number
  /** Window length in milliseconds. */
  windowMs: number
}

export interface RateLimitResult {
  ok: boolean
  remaining: number
  resetAt: number
}

export function rateLimit(opts: RateLimitOptions): RateLimitResult {
  const now = Date.now()
  const existing = store.get(opts.key)

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + opts.windowMs
    store.set(opts.key, { count: 1, resetAt })
    return { ok: true, remaining: opts.limit - 1, resetAt }
  }

  if (existing.count >= opts.limit) {
    return { ok: false, remaining: 0, resetAt: existing.resetAt }
  }

  existing.count += 1
  return { ok: true, remaining: opts.limit - existing.count, resetAt: existing.resetAt }
}

/** Throw a 429-style EntitlementError when the bucket is exhausted. */
export function assertRateLimit(opts: RateLimitOptions): RateLimitResult {
  const result = rateLimit(opts)
  if (!result.ok) {
    const seconds = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000))
    throw new EntitlementError(
      `Rate limit reached — try again in ${seconds}s`,
      'RATE_LIMIT',
    )
  }
  return result
}

// Opportunistic cleanup so the map does not grow unbounded.
if (typeof setInterval === 'function') {
  const timer = setInterval(() => {
    const now = Date.now()
    for (const [key, hit] of store) {
      if (hit.resetAt <= now) store.delete(key)
    }
  }, 60_000)
  // Do not keep the event loop alive just for cleanup.
  ;(timer as { unref?: () => void }).unref?.()
}
