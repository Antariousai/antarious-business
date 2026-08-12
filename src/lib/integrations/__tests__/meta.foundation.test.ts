import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { encryptSecret, decryptSecret } from '@/lib/integrations/crypto/tokenEncryption'
import {
  extractInboundMessages,
  fingerprintWebhookEvent,
} from '@/lib/integrations/meta/processWebhookEvent'
import { createHmac } from 'node:crypto'
import { verifyMetaWebhookSignature } from '@/lib/integrations/meta/client'

describe('tokenEncryption', () => {
  const prev = process.env.META_TOKEN_ENCRYPTION_KEY

  beforeEach(() => {
    process.env.META_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64')
  })
  afterEach(() => {
    if (prev === undefined) delete process.env.META_TOKEN_ENCRYPTION_KEY
    else process.env.META_TOKEN_ENCRYPTION_KEY = prev
  })

  it('round-trips secrets', () => {
    const plain = 'EAAB.test-token-value'
    const enc = encryptSecret(plain)
    expect(enc.startsWith('v1:')).toBe(true)
    expect(enc).not.toContain(plain)
    expect(decryptSecret(enc)).toBe(plain)
  })

  it('returns plaintext for legacy unencrypted values', () => {
    expect(decryptSecret('legacy-plain')).toBe('legacy-plain')
  })
})

describe('webhook fingerprints & normalization', () => {
  it('fingerprints identically for same payload', () => {
    const payload = { object: 'instagram', entry: [] }
    expect(fingerprintWebhookEvent(payload)).toBe(fingerprintWebhookEvent({ ...payload }))
  })

  it('extracts inbound IG messages and skips echoes', () => {
    const payload = {
      object: 'instagram',
      entry: [
        {
          id: '17841400000000000',
          messaging: [
            {
              sender: { id: 'customer-igs' },
              recipient: { id: '17841400000000000' },
              timestamp: 1_700_000_000_000,
              message: { mid: 'mid.1', text: 'Hello Antarious' },
            },
            {
              sender: { id: '17841400000000000' },
              recipient: { id: 'customer-igs' },
              timestamp: 1_700_000_000_100,
              message: { mid: 'mid.2', text: 'echo', is_echo: true },
            },
          ],
        },
      ],
    }
    const msgs = extractInboundMessages(payload)
    expect(msgs).toHaveLength(1)
    expect(msgs[0]?.text).toBe('Hello Antarious')
    expect(msgs[0]?.messageId).toBe('mid.1')
    expect(msgs[0]?.senderId).toBe('customer-igs')
    expect(msgs[0]?.provider).toBe('instagram')
  })
})

describe('webhook signature', () => {
  const prev = process.env.META_APP_SECRET
  beforeEach(() => {
    process.env.META_APP_SECRET = 'test-secret'
  })
  afterEach(() => {
    if (prev === undefined) delete process.env.META_APP_SECRET
    else process.env.META_APP_SECRET = prev
  })

  it('accepts valid X-Hub-Signature-256', () => {
    const body = '{"object":"instagram"}'
    const digest = createHmac('sha256', 'test-secret').update(body).digest('hex')
    expect(verifyMetaWebhookSignature(body, `sha256=${digest}`)).toBe(true)
  })

  it('rejects invalid signatures', () => {
    expect(verifyMetaWebhookSignature('{}', 'sha256=deadbeef')).toBe(false)
    expect(verifyMetaWebhookSignature('{}', null)).toBe(false)
  })
})
