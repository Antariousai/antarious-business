import { tool } from 'ai'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { contentWriterTools } from './contentWriter'

export function freyaRouterTools(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
) {
  const content = contentWriterTools(supabase, organizationId, userId)

  return {
    ...content,

    navigate_hint: tool({
      description: 'Suggest an in-app path the user should open.',
      inputSchema: z.object({
        path: z.string().describe('App path like /app/content or /app/inbox'),
        reason: z.string(),
      }),
      execute: async ({ path, reason }) => ({ path, reason }),
    }),

    open_activity: tool({
      description: 'Point the user at Freya activity items waiting for approval.',
      inputSchema: z.object({
        note: z.string().optional(),
      }),
      execute: async ({ note }) => {
        const { data } = await supabase
          .from('freya_activity_items')
          .select('id, title, status')
          .eq('organization_id', organizationId)
          .eq('status', 'waiting')
          .order('created_at', { ascending: false })
          .limit(5)
        return { waiting: data ?? [], note: note ?? null }
      },
    }),

    approve_waiting: tool({
      description: 'List waiting approvals (does not approve — use /api/freya/approve).',
      inputSchema: z.object({}),
      execute: async () => {
        const { count } = await supabase
          .from('freya_activity_items')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .eq('status', 'waiting')
        return { waitingCount: count ?? 0, approveVia: '/api/freya/approve' }
      },
    }),
  }
}
