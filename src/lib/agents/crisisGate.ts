/**
 * Rule 0 pre-check: crisis / emergency before Freya agent + credit charge.
 * Soft allergen pressure is flagged for prompt context (model still drafts carefully).
 */

export type CrisisGateResult =
  | { kind: 'ok'; allergenPressure: boolean }
  | { kind: 'crisis'; reply: string; variant: 'self_harm' | 'violence' | 'medical' }

const SELF_HARM_PATTERNS: RegExp[] = [
  /\b(kill\s+myself|killing\s+myself|want\s+to\s+die|wanna\s+die|end\s+my\s+life)\b/i,
  /\b(suicide|suicidal|self[-\s]?harm)\b/i,
  /\b(don'?t\s+want\s+to\s+(be\s+here|live)|better\s+off\s+without\s+me)\b/i,
  /\b(everyone\s+would\s+be\s+better\s+off)\b/i,
  /\b(goodbye\s+forever|this\s+is\s+goodbye)\b/i,
]

const VIOLENCE_PATTERNS: RegExp[] = [
  /\b(i'?m\s+going\s+to\s+(kill|shoot|stab|murder)\b)/i,
  /\b(kill\s+(him|her|them|my\s+(partner|spouse|wife|husband|kids?|staff)))\b/i,
  /\b(hurt\s+(someone|them|him|her)\s+(badly|tonight|now))\b/i,
]

const MEDICAL_EMERGENCY_PATTERNS: RegExp[] = [
  /\b(someone\s+(collapsed|is\s+collapsing|passed\s+out|unconscious))\b/i,
  /\b(heart\s+attack|stroke|can'?t\s+breathe|not\s+breathing)\b/i,
  /\b(bleeding\s+(badly|out)|overdose|choking)\b/i,
  /\b(call\s+(an?\s+)?ambulance|emergency\s+in\s+(the\s+)?shop)\b/i,
]

/** Owner pressure to write an unsubstantiated allergen / dietary-safety claim. */
const ALLERGEN_PRESSURE_PATTERNS: RegExp[] = [
  /\b(nut[-\s]?free|allergen[-\s]?free|gluten[-\s]?free|dairy[-\s]?free)\b/i,
  /\b(even\s+though|despite|even\s+if).{0,80}\b(same\s+equipment|shared\s+kitchen|cross[-\s]?contam)/i,
  /\b(write\s+that|say\s+(it'?s|we'?re)|claim).{0,60}\b(nut|allergen|gluten|dairy)/i,
]

const CRISIS_SELF_HARM_REPLY =
  "I'm stopping the work stuff for a second. What you've said sounds serious and I'm not the right thing for it. Please talk to someone tonight. If you're in danger right now, call emergency services. If you want, I can put everything on hold here so it isn't waiting on you."

const CRISIS_VIOLENCE_REPLY =
  "I'm stopping the work. This sounds serious and I'm not the right place for it. If anyone is in danger right now, call emergency services. I'm here for business help when you're ready for that."

const CRISIS_MEDICAL_REPLY = 'Call emergency services now.'

export function detectAllergenPressure(text: string): boolean {
  const t = text.trim()
  if (!t) return false
  return ALLERGEN_PRESSURE_PATTERNS.some((re) => re.test(t))
}

/** Inspect the latest owner message for crisis / allergen pressure. */
export function checkCrisisGate(userMessage: string): CrisisGateResult {
  const text = userMessage.trim()
  if (!text) return { kind: 'ok', allergenPressure: false }

  if (MEDICAL_EMERGENCY_PATTERNS.some((re) => re.test(text))) {
    return { kind: 'crisis', reply: CRISIS_MEDICAL_REPLY, variant: 'medical' }
  }
  if (SELF_HARM_PATTERNS.some((re) => re.test(text))) {
    return { kind: 'crisis', reply: CRISIS_SELF_HARM_REPLY, variant: 'self_harm' }
  }
  if (VIOLENCE_PATTERNS.some((re) => re.test(text))) {
    return { kind: 'crisis', reply: CRISIS_VIOLENCE_REPLY, variant: 'violence' }
  }

  return {
    kind: 'ok',
    allergenPressure: detectAllergenPressure(text),
  }
}

/** Pull plain text from common UI-message / chat history shapes. */
export function latestUserTextFromMessages(messages: unknown): string {
  if (!Array.isArray(messages) || messages.length === 0) return ''
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i] as {
      role?: string
      content?: unknown
      parts?: unknown
    }
    if (m?.role !== 'user') continue
    if (typeof m.content === 'string') return m.content
    if (Array.isArray(m.content)) {
      return m.content
        .map((p) => {
          if (typeof p === 'string') return p
          if (p && typeof p === 'object' && 'text' in p) {
            return String((p as { text?: unknown }).text ?? '')
          }
          return ''
        })
        .join('')
    }
    if (Array.isArray(m.parts)) {
      return m.parts
        .map((p) => {
          if (p && typeof p === 'object' && 'type' in p && (p as { type: string }).type === 'text') {
            return String((p as { text?: unknown }).text ?? '')
          }
          return ''
        })
        .join('')
    }
  }
  return ''
}
