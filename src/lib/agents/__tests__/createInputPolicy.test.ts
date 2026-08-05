import { describe, expect, it, vi } from 'vitest'
import {
  isPlaceholderName,
  missingCreateFields,
  needInputResult,
  gateCreateInput,
} from '../createInputPolicy'
import { leadAssistantTools, crmCopilotTools, moneyAssistantTools, campaignPlannerTools } from '../specialists'
import { contentWriterTools } from '../contentWriter'
import { freyaSystemPrompt } from '../persona'

function mockSupabase() {
  const insert = vi.fn(() => ({
    select: () => ({
      single: async () => ({ data: { id: 'x' }, error: null }),
      maybeSingle: async () => ({ data: { id: 'x' }, error: null }),
    }),
  }))
  return {
    from: vi.fn(() => ({
      insert,
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
            single: async () => ({ data: null, error: null }),
          }),
          maybeSingle: async () => ({ data: null, error: null }),
          single: async () => ({ data: null, error: null }),
          order: () => ({
            limit: async () => ({ data: [], error: null }),
          }),
        }),
      }),
      update: () => ({
        eq: () => ({
          eq: () => ({
            select: () => ({
              single: async () => ({ data: null, error: null }),
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
          in: () => ({
            select: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
        }),
      }),
    })),
    insert,
  }
}

describe('createInputPolicy', () => {
  it('detects placeholder names', () => {
    expect(isPlaceholderName('')).toBe(true)
    expect(isPlaceholderName('   ')).toBe(true)
    expect(isPlaceholderName('new customer')).toBe(true)
    expect(isPlaceholderName('New Customer')).toBe(true)
    expect(isPlaceholderName('someone')).toBe(true)
    expect(isPlaceholderName('tbd')).toBe(true)
    expect(isPlaceholderName('test')).toBe(true)
    expect(isPlaceholderName('n/a')).toBe(true)
    expect(isPlaceholderName('কাস্টমার')).toBe(true)
    expect(isPlaceholderName('Rahim Cafe')).toBe(false)
    expect(isPlaceholderName('Joy Bakery')).toBe(false)
  })

  it('flags missing fields for major create tools', () => {
    expect(missingCreateFields('create_lead', {})).toEqual(['name'])
    expect(missingCreateFields('create_lead', { name: 'new customer' })).toEqual(['name'])
    expect(missingCreateFields('create_lead', { name: 'Rahim' })).toEqual([])

    expect(missingCreateFields('create_deal', { title: 'Rahim' })).toEqual(['valueBdt'])
    expect(missingCreateFields('create_deal', { title: 'Rahim', valueBdt: 15000 })).toEqual([])

    expect(missingCreateFields('draft_invoice', { totalBdt: 500 })).toEqual(['notes'])
    expect(missingCreateFields('draft_invoice', { totalBdt: 500, notes: 'for Sarah' })).toEqual([])

    expect(missingCreateFields('create_post_draft', { caption: 'Check this out!' })).toEqual(['topic'])
    expect(
      missingCreateFields('create_post_draft', {
        caption: 'Friday specials are ready. Stop by for warm trays after 5.',
        topic: 'Friday specials',
      }),
    ).toEqual([])
    expect(
      missingCreateFields('create_post_draft', {
        caption: 'Our Eid trays are open for pre-order this week. Message us to reserve.',
      }),
    ).toEqual([])

    expect(missingCreateFields('create_campaign_draft', { title: 'new customer' })).toEqual([
      'campaignTheme',
    ])
    expect(
      missingCreateFields('create_campaign_draft', { title: 'Weekend Walk-ins · Summer Linen' }),
    ).toEqual([])
  })

  it('builds NEED_INPUT with askHint', () => {
    const result = needInputResult('create_deal', ['title', 'valueBdt'])
    expect(result).toMatchObject({
      ok: false,
      code: 'NEED_INPUT',
      missing: ['title', 'valueBdt'],
      mode: 'ask_fact',
    })
    expect(result.askHint.toLowerCase()).toMatch(/name|title/)
    expect(result.askHint).toMatch(/৳/)
  })

  it('suggests numbered options for creative creates', () => {
    const post = needInputResult('create_post_draft', ['topic'])
    expect(post.mode).toBe('suggest_options')
    expect(post.options?.length).toBeGreaterThanOrEqual(2)
    expect(post.askHint.toLowerCase()).toMatch(/you decide|pick/)

    const campaign = needInputResult('create_campaign_draft', ['campaignTheme'])
    expect(campaign.mode).toBe('suggest_options')
    expect(campaign.options?.length).toBe(3)

    const amountOnly = needInputResult('create_deal', ['valueBdt'])
    expect(amountOnly.mode).toBe('suggest_options')
    expect(amountOnly.options?.some((o) => o.includes('৳'))).toBe(true)
  })

  it('does not invent fake customer-name options', () => {
    const lead = needInputResult('create_lead', ['name'])
    expect(lead.mode).toBe('ask_fact')
    expect(lead.options).toBeUndefined()
  })
})

describe('write tools NEED_INPUT gate', () => {
  it('create_lead rejects placeholder without insert', async () => {
    const sb = mockSupabase()
    const tools = leadAssistantTools(sb as never, 'org-1', 'user-1', 'growth')
    const result = await tools.create_lead.execute!(
      { name: 'new customer' },
      { toolCallId: 't1', messages: [], abortSignal: undefined as never },
    )
    expect(result).toMatchObject({ ok: false, code: 'NEED_INPUT', missing: ['name'] })
    expect(sb.insert).not.toHaveBeenCalled()
  })

  it('create_deal rejects missing amount without insert', async () => {
    const sb = mockSupabase()
    const tools = crmCopilotTools(sb as never, 'org-1', 'user-1', 'growth')
    const result = await tools.create_deal.execute!(
      { title: 'Rahim Cafe', valueBdt: undefined as never },
      { toolCallId: 't1', messages: [], abortSignal: undefined as never },
    )
    expect(result).toMatchObject({ ok: false, code: 'NEED_INPUT' })
    expect((result as { missing: string[] }).missing).toContain('valueBdt')
    expect(sb.insert).not.toHaveBeenCalled()
  })

  it('draft_invoice rejects missing notes without insert', async () => {
    const sb = mockSupabase()
    const tools = moneyAssistantTools(sb as never, 'org-1', 'user-1', 'growth')
    const result = await tools.draft_invoice.execute!(
      { totalBdt: 1000, notes: '' },
      { toolCallId: 't1', messages: [], abortSignal: undefined as never },
    )
    expect(result).toMatchObject({ ok: false, code: 'NEED_INPUT', missing: ['notes'] })
    expect(sb.insert).not.toHaveBeenCalled()
  })

  it('create_post_draft rejects vague caption without topic', async () => {
    const sb = mockSupabase()
    const tools = contentWriterTools(sb as never, 'org-1', 'user-1')
    const result = await tools.create_post_draft.execute!(
      { caption: 'Check this out!' },
      { toolCallId: 't1', messages: [], abortSignal: undefined as never },
    )
    expect(result).toMatchObject({ ok: false, code: 'NEED_INPUT' })
    expect((result as { missing: string[] }).missing).toContain('topic')
    expect(sb.insert).not.toHaveBeenCalled()
  })

  it('create_campaign_draft rejects placeholder title', async () => {
    const sb = mockSupabase()
    const tools = campaignPlannerTools(sb as never, 'org-1', 'user-1', 'growth')
    const result = await tools.create_campaign_draft.execute!(
      { title: 'new customer' },
      { toolCallId: 't1', messages: [], abortSignal: undefined as never },
    )
    expect(result).toMatchObject({ ok: false, code: 'NEED_INPUT' })
    expect(sb.insert).not.toHaveBeenCalled()
  })

  it('gateCreateInput returns null when fields present', () => {
    expect(gateCreateInput('create_lead', { name: 'Sara' })).toBeNull()
    expect(gateCreateInput('create_deal', { title: 'Sara', valueBdt: 0 })).toBeNull()
  })
})

describe('Create gate in prompt', () => {
  it('includes Create gate language in system prompt', () => {
    const prompt = freyaSystemPrompt({
      businessName: 'Joy Bakery',
      industry: 'bakery',
      ownerName: 'Kamrul',
      planTier: 'starter',
      todayDate: '2026-08-06',
    })
    expect(prompt).toContain('## Create gate')
    expect(prompt).toMatch(/Never invent person\/business names/i)
    expect(prompt).toMatch(/Create gate/i)
    expect(prompt).toMatch(/you decide/i)
    expect(prompt).toMatch(/2–3|2-3|numbered/i)
    expect(prompt).toMatch(/when the owner gave a topic|after a topic/i)
    expect(prompt).toMatch(/NEED_INPUT/)
  })
})
