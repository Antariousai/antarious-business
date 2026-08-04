import { ToolLoopAgent } from 'ai'
import type { SupabaseClient } from '@supabase/supabase-js'
import { freyaRouterTools } from './freyaRouter'
import { freyaSystemPrompt, type FreyaBizSnapshot } from './persona'
import { resolveModel } from './model'

export function createFreyaRouterAgent(
  supabase: SupabaseClient,
  opts: {
    organizationId: string
    userId: string
    snapshot: FreyaBizSnapshot
  },
) {
  return new ToolLoopAgent({
    id: 'freya-router',
    model: resolveModel(),
    instructions: freyaSystemPrompt(opts.snapshot),
    tools: freyaRouterTools(supabase, opts.organizationId, opts.userId, opts.snapshot.planTier),
  })
}
