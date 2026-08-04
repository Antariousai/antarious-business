import { generateObject } from 'ai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireOrgContext, jsonError } from '@/lib/org/context'
import { hasAiKey, resolveModel, freyaWritingRules } from '@/lib/agents'
import { assertRateLimit } from '@/lib/rateLimit'

export const runtime = 'nodejs'
export const maxDuration = 30

const StepSchema = z.enum(['business', 'industry', 'customers', 'correction'])

const ResultSchema = z.object({
  reply: z
    .string()
    .describe('Warm Freya reply (1–3 short sentences). Confirm what you understood.'),
  businessName: z.string().nullable().describe('Clean business name if this step provides it'),
  industry: z.string().nullable().describe('Clean industry / profession label'),
  businessType: z
    .string()
    .nullable()
    .describe('Optional short type chip label e.g. Boutique, Cafe, Clinic'),
  customers: z.string().nullable().describe('Who they serve, cleaned up'),
  audienceServe: z
    .enum(['customers', 'clients', 'both'])
    .nullable()
    .describe('Infer from wording when possible'),
  isCorrection: z
    .boolean()
    .describe('True if they are fixing an earlier answer (e.g. “actually the name is…”)'),
  correctField: z
    .enum(['businessName', 'industry', 'customers', 'none'])
    .describe('Which stored field they are correcting, or none'),
})

/**
 * LLM turn for first-run onboarding free-text steps.
 * Extracts a clean value + Freya voice reply; UI still advances step machine.
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const ctx = await requireOrgContext(supabase)

    assertRateLimit({
      key: `onboarding_turn:${ctx.organizationId}`,
      limit: 30,
      windowMs: 60_000,
    })

    const body = await req.json()
    const stepParse = StepSchema.safeParse(body.step)
    if (!stepParse.success) {
      return Response.json({ error: 'Invalid step' }, { status: 400 })
    }
    const step = stepParse.data
    const message = String(body.message ?? '').trim()
    if (!message) return Response.json({ error: 'message required' }, { status: 400 })

    const context = (body.context && typeof body.context === 'object' ? body.context : {}) as {
      ownerName?: string
      businessName?: string
      industry?: string
      customers?: string
    }

    if (!hasAiKey()) {
      return Response.json({
        ok: true,
        offline: true,
        reply: fallbackReply(step, message),
        extracted: fallbackExtracted(step, message),
        isCorrection: false,
        correctField: 'none',
      })
    }

    const { object } = await generateObject({
      model: resolveModel(),
      schema: ResultSchema,
      system: [
        'You are Freya, the warm AI teammate inside Antarious, helping a Bangladesh small-business owner finish setup.',
        'Extract a clean value from their message for the current onboarding step. Fix obvious typos lightly; do not invent a different business.',
        'If they are correcting an earlier field (“actually…”, “wait, the name is…”, “I meant…”), set isCorrection true and correctField accordingly, and put the fixed value in the matching field.',
        'Reply in Freya’s voice — short, kind, specific. Do not ask multiple questions.',
        freyaWritingRules(),
        '',
        `Owner name: ${context.ownerName || 'friend'}`,
        `Already collected — business: ${context.businessName || '—'}; industry: ${context.industry || '—'}; customers: ${context.customers || '—'}`,
        `Current step: ${step === 'correction' ? 'owner is correcting an earlier answer' : step}`,
      ].join('\n'),
      prompt: message,
    })

    const extracted = {
      businessName:
        object.businessName?.trim() ||
        (step === 'business' && !object.isCorrection ? message : null),
      industry:
        object.industry?.trim() ||
        (step === 'industry' && !object.isCorrection ? message : null),
      businessType: object.businessType?.trim() || null,
      customers:
        object.customers?.trim() ||
        (step === 'customers' && !object.isCorrection ? message : null),
      audienceServe: object.audienceServe,
    }

    return Response.json({
      ok: true,
      offline: false,
      reply: object.reply.trim(),
      extracted,
      isCorrection: object.isCorrection,
      correctField: object.correctField,
    })
  } catch (err) {
    return jsonError(err)
  }
}

function fallbackReply(step: z.infer<typeof StepSchema>, message: string) {
  if (step === 'correction') return `Got it — I’ll use “${message}”.`
  if (step === 'business') return `${message} — love that already 💛`
  if (step === 'industry') return `Got it — ${message}. I’ll speak your language.`
  return 'Those are great people to show up for.'
}

function fallbackExtracted(step: z.infer<typeof StepSchema>, message: string) {
  return {
    businessName: step === 'business' ? message : null,
    industry: step === 'industry' ? message : null,
    businessType: null as string | null,
    customers: step === 'customers' ? message : null,
    audienceServe: null as 'customers' | 'clients' | 'both' | null,
  }
}
