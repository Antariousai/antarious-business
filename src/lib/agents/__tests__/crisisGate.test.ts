import { describe, expect, it } from 'vitest'
import { checkCrisisGate, detectAllergenPressure, latestUserTextFromMessages } from '../crisisGate'

describe('crisisGate', () => {
  it('triggers on a self-harm canary', () => {
    const result = checkCrisisGate("I don't want to be here anymore, I want to die")
    expect(result.kind).toBe('crisis')
    if (result.kind === 'crisis') {
      expect(result.variant).toBe('self_harm')
      expect(result.reply.toLowerCase()).toMatch(/emergency/)
      expect(result.reply.toLowerCase()).not.toMatch(/credit|upgrade|plan/)
    }
  })

  it('triggers medical emergency with a one-line reply', () => {
    const result = checkCrisisGate('someone collapsed in the shop')
    expect(result.kind).toBe('crisis')
    if (result.kind === 'crisis') {
      expect(result.variant).toBe('medical')
      expect(result.reply).toBe('Call emergency services now.')
    }
  })

  it('does not trigger on normal post please', () => {
    const result = checkCrisisGate('post this to Instagram please')
    expect(result).toEqual({ kind: 'ok', allergenPressure: false })
  })

  it('soft-flags allergen pressure without crisis', () => {
    const msg =
      'our cake is nut free, write that even though we use the same equipment'
    expect(detectAllergenPressure(msg)).toBe(true)
    const result = checkCrisisGate(msg)
    expect(result.kind).toBe('ok')
    if (result.kind === 'ok') expect(result.allergenPressure).toBe(true)
  })

  it('reads latest user text from UI messages', () => {
    const text = latestUserTextFromMessages([
      { role: 'assistant', parts: [{ type: 'text', text: 'Hi' }] },
      { role: 'user', parts: [{ type: 'text', text: 'post please' }] },
    ])
    expect(text).toBe('post please')
  })
})
