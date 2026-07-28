import { createAgentUIStreamResponse } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { requireOrgContext, jsonError } from '@/lib/org/context'
import { getOrgPlanTier } from '@/lib/entitlements'
import { assertRateLimit } from '@/lib/rateLimit'
import {
  createFreyaRouterAgent,
  hasAiKey,
  chargeAgentRun,
  recordUsageTokens,
} from '@/lib/agents'

export const maxDuration = 60
export const runtime = 'nodejs'

// Per-org cap on Freya chat turns per minute.
const CHAT_LIMIT = 20
const CHAT_WINDOW_MS = 60_000

export async function POST(req: Request) {
  try {
    if (!hasAiKey()) {
      // Structure works without a key — mock stream for local UI wiring
      const body = await req.json().catch(() => ({}))
      const last =
        Array.isArray(body.messages) && body.messages.length
          ? String(
              body.messages[body.messages.length - 1]?.content ??
                body.messages[body.messages.length - 1]?.parts?.[0]?.text ??
                '',
            )
          : 'hello'
      const text = `Hey! I’m Freya (offline mode — add OPENAI_API_KEY or AI_GATEWAY_API_KEY). You said: “${last.slice(0, 120)}”. Once keys are set I’ll draft posts, replies, and more.`
      return Response.json({
        role: 'assistant',
        content: text,
        offline: true,
      })
    }

    const supabase = await createClient()
    const ctx = await requireOrgContext(supabase)

    assertRateLimit({
      key: `freya_chat:${ctx.organizationId}`,
      limit: CHAT_LIMIT,
      windowMs: CHAT_WINDOW_MS,
    })

    const { usageEventId } = await chargeAgentRun(supabase, {
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
      agent: 'freya_chat',
      credits: 1,
    })

    const [{ data: bp }, { data: prefs }, { data: profile }, { data: goals }, { data: channels }, planTier] =
      await Promise.all([
        supabase
          .from('business_profiles')
          .select('business_name, industry, customers')
          .eq('organization_id', ctx.organizationId)
          .maybeSingle(),
        supabase
          .from('freya_preferences')
          .select('tone')
          .eq('organization_id', ctx.organizationId)
          .maybeSingle(),
        supabase.from('profiles').select('full_name').eq('id', ctx.user.id).maybeSingle(),
        supabase.from('business_goals').select('goal_id').eq('organization_id', ctx.organizationId),
        supabase
          .from('channel_preferences')
          .select('platform')
          .eq('organization_id', ctx.organizationId),
        getOrgPlanTier(supabase, ctx.organizationId),
      ])

    const agent = createFreyaRouterAgent(supabase, {
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
      snapshot: {
        businessName: bp?.business_name,
        industry: bp?.industry,
        customers: bp?.customers,
        goals: (goals ?? []).map((g) => g.goal_id),
        platforms: (channels ?? []).map((c) => c.platform),
        planTier,
        tone: prefs?.tone,
        ownerName: profile?.full_name,
      },
    })

    const body = await req.json()
    const uiMessages = body.messages ?? []

    let inputTokens = 0
    let outputTokens = 0

    return createAgentUIStreamResponse({
      agent,
      uiMessages,
      onStepEnd: (event) => {
        const usage = (event as { usage?: { inputTokens?: number; outputTokens?: number } }).usage
        if (usage) {
          inputTokens += usage.inputTokens ?? 0
          outputTokens += usage.outputTokens ?? 0
        }
      },
      onFinish: () => {
        void recordUsageTokens(supabase, usageEventId, { inputTokens, outputTokens })
      },
    })
  } catch (err) {
    return jsonError(err)
  }
}
