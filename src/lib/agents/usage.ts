import type { SupabaseClient } from '@supabase/supabase-js'
import { spendCredits } from '@/lib/entitlements'
import { resolveModelId } from './model'

export interface AgentRunOptions {
  organizationId: string
  userId?: string | null
  agent: string
  /** Credits to debit for this run (min 1). */
  credits: number
  model?: string
  meta?: Record<string, unknown>
}

export interface AgentRunHandle {
  usageEventId: string | null
}

/**
 * Charge an agent run: debit credits (throws on insufficient) AND record an
 * `ai_usage_events` row. Call this for EVERY agent invocation so metering and
 * the credit ledger stay in sync. Returns the usage event id so token counts
 * can be back-filled after streaming via {@link recordUsageTokens}.
 */
export async function chargeAgentRun(
  supabase: SupabaseClient,
  opts: AgentRunOptions,
): Promise<AgentRunHandle> {
  const credits = Math.max(1, Math.floor(opts.credits))

  await spendCredits(supabase, {
    organizationId: opts.organizationId,
    amount: credits,
    reason: opts.agent,
    userId: opts.userId ?? null,
  })

  const model = opts.model ?? resolveModelId()
  const { data } = await supabase
    .from('ai_usage_events')
    .insert({
      organization_id: opts.organizationId,
      user_id: opts.userId ?? null,
      agent: opts.agent,
      model,
      credits_spent: credits,
      meta: opts.meta ?? {},
    })
    .select('id')
    .maybeSingle()

  return { usageEventId: data?.id ?? null }
}

/** Best-effort back-fill of token counts once a streamed run finishes. */
export async function recordUsageTokens(
  supabase: SupabaseClient,
  usageEventId: string | null,
  tokens: { inputTokens?: number; outputTokens?: number },
): Promise<void> {
  if (!usageEventId) return
  if (tokens.inputTokens == null && tokens.outputTokens == null) return
  await supabase
    .from('ai_usage_events')
    .update({
      input_tokens: Math.round(tokens.inputTokens ?? 0),
      output_tokens: Math.round(tokens.outputTokens ?? 0),
    })
    .eq('id', usageEventId)
}
