import { createHmac, timingSafeEqual } from 'node:crypto'
import { metaAppSecret, metaGraphVersion } from '@/lib/meta/config'

export class MetaApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: number | string,
    public type?: string,
    public fbtraceId?: string,
  ) {
    super(message)
    this.name = 'MetaApiError'
  }
}

export type MetaGraphHost = 'facebook' | 'instagram'

function baseUrl(host: MetaGraphHost): string {
  const version = metaGraphVersion()
  if (host === 'instagram') return `https://graph.instagram.com/${version}`
  return `https://graph.facebook.com/${version}`
}

function redactToken(url: string): string {
  return url.replace(/access_token=[^&]+/gi, 'access_token=[REDACTED]')
}

export async function metaGraphGet<T = unknown>(
  path: string,
  accessToken: string,
  params: Record<string, string | number | undefined> = {},
  opts?: { host?: MetaGraphHost; retries?: number },
): Promise<T> {
  const host = opts?.host ?? 'facebook'
  const retries = opts?.retries ?? 1
  const url = new URL(`${baseUrl(host)}${path.startsWith('/') ? path : `/${path}`}`)
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') url.searchParams.set(k, String(v))
  }
  url.searchParams.set('access_token', accessToken)

  let lastErr: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url.toString(), {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(30_000),
      })
      const json = (await res.json().catch(() => ({}))) as {
        error?: { message?: string; code?: number; type?: string; fbtrace_id?: string }
      }
      if (!res.ok || json.error) {
        const err = new MetaApiError(
          json.error?.message || `Meta GET failed (${res.status})`,
          res.status,
          json.error?.code,
          json.error?.type,
          json.error?.fbtrace_id,
        )
        // Retry only transient 5xx / rate limit
        if ((res.status === 429 || res.status >= 500) && attempt < retries) {
          await new Promise((r) => setTimeout(r, 400 * (attempt + 1)))
          lastErr = err
          continue
        }
        console.error(
          JSON.stringify({
            event: 'meta.api.error',
            method: 'GET',
            path: redactToken(url.pathname),
            status: res.status,
            code: err.code,
            message: err.message,
            fbtrace: err.fbtraceId,
          }),
        )
        throw err
      }
      return json as T
    } catch (e) {
      lastErr = e
      if (attempt >= retries) break
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)))
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr))
}

export async function metaGraphPost<T = unknown>(
  path: string,
  accessToken: string,
  body: Record<string, unknown>,
  opts?: { host?: MetaGraphHost },
): Promise<T> {
  const host = opts?.host ?? 'facebook'
  const url = new URL(`${baseUrl(host)}${path.startsWith('/') ? path : `/${path}`}`)
  url.searchParams.set('access_token', accessToken)

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(45_000),
  })
  const json = (await res.json().catch(() => ({}))) as {
    error?: { message?: string; code?: number; type?: string; fbtrace_id?: string }
  }
  if (!res.ok || json.error) {
    const err = new MetaApiError(
      json.error?.message || `Meta POST failed (${res.status})`,
      res.status,
      json.error?.code,
      json.error?.type,
      json.error?.fbtrace_id,
    )
    console.error(
      JSON.stringify({
        event: 'meta.api.error',
        method: 'POST',
        path: url.pathname,
        status: res.status,
        code: err.code,
        message: err.message,
        fbtrace: err.fbtraceId,
      }),
    )
    throw err
  }
  return json as T
}

/** Form-urlencoded POST — preferred for Page /feed and /photos. */
export async function metaGraphPostForm<T = unknown>(
  path: string,
  accessToken: string,
  fields: Record<string, string>,
  opts?: { host?: MetaGraphHost },
): Promise<T> {
  const host = opts?.host ?? 'facebook'
  const url = new URL(`${baseUrl(host)}${path.startsWith('/') ? path : `/${path}`}`)
  const body = new URLSearchParams({ ...fields, access_token: accessToken })

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
    signal: AbortSignal.timeout(60_000),
  })
  const json = (await res.json().catch(() => ({}))) as {
    error?: { message?: string; code?: number; type?: string; fbtrace_id?: string }
  }
  if (!res.ok || json.error) {
    const err = new MetaApiError(
      json.error?.message || `Meta POST failed (${res.status})`,
      res.status,
      json.error?.code,
      json.error?.type,
      json.error?.fbtrace_id,
    )
    console.error(
      JSON.stringify({
        event: 'meta.api.error',
        method: 'POST_FORM',
        path: url.pathname,
        status: res.status,
        code: err.code,
        message: err.message,
        fbtrace: err.fbtraceId,
      }),
    )
    throw err
  }
  return json as T
}

export function verifyMetaWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!signatureHeader?.startsWith('sha256=')) return false
  const secret = metaAppSecret()
  const expected = createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex')
  const provided = signatureHeader.slice('sha256='.length)
  try {
    const a = Buffer.from(expected, 'utf8')
    const b = Buffer.from(provided, 'utf8')
    return a.length === b.length && timingSafeEqual(a, b)
  } catch {
    return false
  }
}
