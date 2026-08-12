import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto'

const ALGO = 'aes-256-gcm'
const IV_LEN = 12

function keyFromEnv(): Buffer | null {
  const raw = process.env.META_TOKEN_ENCRYPTION_KEY?.trim()
  if (!raw) return null
  // Accept 32-byte base64 or any passphrase (hashed to 32 bytes)
  try {
    const b64 = Buffer.from(raw, 'base64')
    if (b64.length === 32) return b64
  } catch {
    // fall through
  }
  return createHash('sha256').update(raw).digest()
}

export function tokenEncryptionConfigured(): boolean {
  return Boolean(keyFromEnv())
}

/** Returns envelope `v1:<iv_b64>:<tag_b64>:<ct_b64>` or plaintext if no key (dev fallback). */
export function encryptSecret(plaintext: string): string {
  const key = keyFromEnv()
  if (!key) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('META_TOKEN_ENCRYPTION_KEY is required in production')
    }
    return plaintext
  }
  const iv = randomBytes(IV_LEN)
  const cipher = createCipheriv(ALGO, key, iv)
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`
}

export function decryptSecret(stored: string): string {
  if (!stored.startsWith('v1:')) return stored
  const key = keyFromEnv()
  if (!key) {
    throw new Error('META_TOKEN_ENCRYPTION_KEY required to decrypt tokens')
  }
  const [, ivB64, tagB64, ctB64] = stored.split(':')
  if (!ivB64 || !tagB64 || !ctB64) throw new Error('Invalid encrypted token envelope')
  const decipher = createDecipheriv(ALGO, key, Buffer.from(ivB64, 'base64'))
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
  return Buffer.concat([
    decipher.update(Buffer.from(ctB64, 'base64')),
    decipher.final(),
  ]).toString('utf8')
}

/** Prefer encrypted column; fall back to legacy plaintext. */
export function resolveStoredAccessToken(row: {
  access_token_enc?: string | null
  access_token?: string | null
}): string | null {
  if (row.access_token_enc) {
    try {
      return decryptSecret(row.access_token_enc)
    } catch {
      return null
    }
  }
  return row.access_token || null
}
