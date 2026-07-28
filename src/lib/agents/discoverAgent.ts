import { tool } from 'ai'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'

/** DiscoverAgent tool stub — refresh heuristics live in `/api/discover/refresh`. */
export function discoverAgentTools(_supabase: SupabaseClient, _organizationId: string) {
  return {
    note: tool({
      description: 'Acknowledge a discover refresh request.',
      inputSchema: z.object({ focus: z.string().optional() }),
      execute: async ({ focus }) => ({ ok: true, focus: focus ?? 'general' }),
    }),
  }
}
