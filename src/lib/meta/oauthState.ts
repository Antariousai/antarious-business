import { createHmac, timingSafeEqual } from 'node:crypto'
import { metaAppSecret } from './config'

export type MetaOAuthState = {
  organizationId: string
  userId: string
  platform: string
  nonce: string
  exp: number
}

function sign(payloadB64: string): string {
  return createHmac('sha256', metaAppSecret()).update(payloadB64).digest('base64url')
}

export function encodeMetaOAuthState(state: Omit<MetaOAuthState, 'exp' | 'nonce'> & { nonce?: string }): string {
  const full: MetaOAuthState = {
    ...state,
    nonce: state.nonce || crypto.randomUUID(),
    exp: Date.now() + 15 * 60 * 1000,
  }
  const payloadB64 = Buffer.from(JSON.stringify(full), 'utf8').toString('base64url')
  return `${payloadB64}.${sign(payloadB64)}`
}

export function decodeMetaOAuthState(raw: string | null | undefined): MetaOAuthState | null {
  if (!raw || !raw.includes('.')) return null
  const [payloadB64, sig] = raw.split('.')
  if (!payloadB64 || !sig) return null
  const expected = sign(payloadB64)
  try {
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  } catch {
    return null
  }
  try {
    const json = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as MetaOAuthState
    if (!json.organizationId || !json.userId || !json.platform || !json.exp) return null
    if (Date.now() > json.exp) return null
    return json
  } catch {
    return null
  }
}

export type PendingMetaPage = {
  id: string
  name: string
  accessToken: string
  igUserId: string | null
  igUsername: string | null
  pageUrl: string
}

export function encodePendingMetaPages(pages: PendingMetaPage[], meta: MetaOAuthState): string {
  const body = {
    organizationId: meta.organizationId,
    userId: meta.userId,
    platform: meta.platform,
    exp: Date.now() + 10 * 60 * 1000,
    pages,
  }
  const payloadB64 = Buffer.from(JSON.stringify(body), 'utf8').toString('base64url')
  return `${payloadB64}.${sign(payloadB64)}`
}

export function decodePendingMetaPages(raw: string | null | undefined): {
  organizationId: string
  userId: string
  platform: string
  pages: PendingMetaPage[]
} | null {
  if (!raw || !raw.includes('.')) return null
  const [payloadB64, sig] = raw.split('.')
  if (!payloadB64 || !sig) return null
  const expected = sign(payloadB64)
  try {
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  } catch {
    return null
  }
  try {
    const json = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as {
      organizationId: string
      userId: string
      platform: string
      exp: number
      pages: PendingMetaPage[]
    }
    if (!json.organizationId || !json.userId || !Array.isArray(json.pages)) return null
    if (Date.now() > json.exp) return null
    return json
  } catch {
    return null
  }
}
