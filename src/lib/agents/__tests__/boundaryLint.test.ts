import { describe, expect, it } from 'vitest'
import {
  applyBoundarySoftCleanup,
  lintFreyaBoundaryClaims,
  stripSoftCompletionClosers,
} from '../boundaryLint'

describe('lintFreyaBoundaryClaims', () => {
  it('flags classic P0 outbound phrases', () => {
    const lint = lintFreyaBoundaryClaims('Posted to your Instagram. Engagement is up 34%.')
    expect(lint.flagged).toBe(true)
    expect(lint.hits.map((h) => h.phrase)).toEqual(
      expect.arrayContaining(['posted', 'engagement is', '% up']),
    )
  })

  it('flags soft-completion closers', () => {
    const lint = lintFreyaBoundaryClaims('All sorted. Done and dusted.')
    expect(lint.flagged).toBe(true)
    expect(lint.softCompletionHits.length).toBeGreaterThan(0)
  })

  it('allowlists marked as sent in inbox', () => {
    const lint = lintFreyaBoundaryClaims('Reply marked as sent in your inbox after you approve.')
    // "sent" may still appear but allowlist should skip the marked-as-sent window
    const sentHits = lint.hits.filter((h) => h.phrase === 'sent')
    expect(sentHits).toHaveLength(0)
  })

  it('strips soft closers when no outbound tool success', () => {
    const { text, cleaned } = applyBoundarySoftCleanup('Draft ready. All sorted.', {
      hadOutboundToolSuccess: false,
    })
    expect(cleaned).toBe(true)
    expect(text.toLowerCase()).not.toContain('all sorted')
  })

  it('keeps soft closers when tool success is claimed', () => {
    const original = 'Saved the lead. All sorted.'
    const { text, cleaned } = applyBoundarySoftCleanup(original, {
      hadOutboundToolSuccess: true,
    })
    expect(cleaned).toBe(false)
    expect(text).toBe(original)
  })

  it('stripSoftCompletionClosers is idempotent on clean text', () => {
    expect(stripSoftCompletionClosers('Draft waiting for your OK.')).toBe(
      'Draft waiting for your OK.',
    )
  })
})
