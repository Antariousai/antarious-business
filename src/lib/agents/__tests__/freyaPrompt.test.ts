import { describe, expect, it } from 'vitest'
import { freyaSystemPrompt, freyaWritingRules } from '../persona'
import { FREYA_PERSONA } from '@/data/freyaPersona'

describe('freyaSystemPrompt Part 18 snapshot', () => {
  const prompt = freyaSystemPrompt({
    businessName: 'Joy Bakery',
    industry: 'bakery',
    ownerName: 'Kamrul',
    planTier: 'starter',
    availableModules: 'today, posts, messages, customers, leads, money, settings',
    aiCreditsRemaining: 42,
    waitingApprovalsSummary: 'none',
    postsSummary: 'none',
    messagesSummary: 'none',
    leadsSummary: 'none',
    dealsSummary: 'none',
    moneySummary: 'none',
    todayDate: '2026-08-06',
  })

  it('keeps Rule 0 and Boundary before voice/context', () => {
    const r0 = prompt.indexOf('## Rule 0')
    const r1 = prompt.indexOf('## Rule 1 — the boundary')
    const how = prompt.indexOf('## How you talk')
    const ctx = prompt.indexOf('## Current context')
    expect(r0).toBeGreaterThan(-1)
    expect(r1).toBeGreaterThan(r0)
    expect(how).toBeGreaterThan(r1)
    expect(ctx).toBeGreaterThan(how)
  })

  it('includes no-emoji-to-owner and app vocabulary', () => {
    expect(prompt).toMatch(/Never use emoji toward the owner/i)
    expect(prompt).toMatch(/Interested people/)
    expect(prompt).toMatch(/Never lead, CRM, pipeline/)
    expect(prompt).toMatch(/Absolutely!/)
  })

  it('injects none for empty summaries and real credits/date', () => {
    expect(prompt).toContain('Waiting for approval: none')
    expect(prompt).toContain('Posts: none')
    expect(prompt).toContain('Messages: none')
    expect(prompt).toContain('AI credits remaining: 42')
    expect(prompt).toContain('Today is 2026-08-06')
  })

  it('keeps Actions map and Banglish appendix', () => {
    expect(prompt).toContain('## Actions map')
    expect(prompt).toContain('create_post_draft')
    expect(prompt).toContain('Banglish')
    expect(prompt).toMatch(/paona|invoice dao|koto baki/i)
  })

  it('includes Create gate and softened post-always language', () => {
    expect(prompt).toContain('## Create gate')
    expect(prompt).toMatch(/you decide/i)
    expect(prompt).toMatch(/2–3 concrete options|numbered options|1\/2\/3/i)
    expect(prompt).toMatch(/after a topic|gave a topic/i)
    expect(prompt).not.toMatch(/always when asked to write a post/i)
  })

  it('says owner taps Approve (not Freya auto-approve)', () => {
    expect(prompt).toMatch(/owner taps Approve/i)
  })

  it('persona has colleague warmth and no owner emoji rule', () => {
    expect(FREYA_PERSONA.essence).toMatch(/colleague/i)
    expect(FREYA_PERSONA.voice.rules.some((r) => /emoji/i.test(r) && /owner/i.test(r))).toBe(true)
  })

  it('writing rules match §6.8 / §6.9', () => {
    const rules = freyaWritingRules()
    expect(rules).toMatch(/Length ladder/)
    expect(rules).toMatch(/never in owner-facing/i)
    expect(rules).toMatch(/no markdown headers/i)
  })
})
