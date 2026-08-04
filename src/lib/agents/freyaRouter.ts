import { tool } from 'ai'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { canAccessPath, type PlanTier } from '@/data/planTiers'
import { contentWriterTools } from './contentWriter'
import {
  inboxReplierTools,
  leadAssistantTools,
  crmCopilotTools,
  moneyAssistantTools,
  campaignPlannerTools,
} from './specialists'
import { profileEditorTools } from './profileTools'

export function freyaRouterTools(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  planTier?: PlanTier | string | null,
) {
  const content = contentWriterTools(supabase, organizationId, userId)
  const inbox = inboxReplierTools(supabase, organizationId, userId, planTier)
  const leads = leadAssistantTools(supabase, organizationId, userId, planTier)
  const crm = crmCopilotTools(supabase, organizationId, userId, planTier)
  const money = moneyAssistantTools(supabase, organizationId, userId, planTier)
  const campaigns = campaignPlannerTools(supabase, organizationId, userId, planTier)
  const profile = profileEditorTools(supabase, organizationId, userId)

  return {
    ...content,
    ...inbox,
    ...leads,
    ...crm,
    ...money,
    ...campaigns,
    ...profile,

    workspace_status: tool({
      description:
        'Get a fresh snapshot of this business workspace: waiting approvals, draft posts, and open inbox threads. Use before answering status questions.',
      inputSchema: z.object({}),
      execute: async () => {
        const [waiting, drafts, inboxCount] = await Promise.all([
          supabase
            .from('freya_activity_items')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', organizationId)
            .eq('status', 'waiting'),
          supabase
            .from('content_posts')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', organizationId)
            .eq('status', 'draft'),
          supabase
            .from('inbox_threads')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', organizationId)
            .eq('status', 'open'),
        ])
        return {
          waitingApprovals: waiting.count ?? 0,
          draftPosts: drafts.count ?? 0,
          openInboxThreads: inboxCount.count ?? 0,
          planTier: planTier ?? 'starter',
        }
      },
    }),

    navigate_hint: tool({
      description:
        'Send the owner to an in-app screen. Use when they should open Posts, Inbox, Customers, Money, Campaigns, Settings, etc. Only use paths their plan can open.',
      inputSchema: z.object({
        path: z
          .string()
          .describe('App path like /app/content, /app/inbox, /app/leads, /app/money'),
        reason: z.string().describe('One short reason Freya can say aloud'),
      }),
      execute: async ({ path, reason }) => {
        if (!canAccessPath(planTier as PlanTier | null | undefined, path)) {
          return {
            ok: false as const,
            code: 'PLAN' as const,
            error: `Your plan cannot open ${path}. Upgrade in Settings to unlock that screen.`,
            path: '/app/settings',
            reason,
          }
        }
        return { ok: true, path, reason }
      },
    }),

    open_activity: tool({
      description:
        'Open Freya activity / approvals. Use when something is waiting for the owner to approve.',
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
      description:
        'Count items waiting for approval. Does not approve them — tell the owner to tap Approve in the Freya activity panel.',
      inputSchema: z.object({}),
      execute: async () => {
        const { count } = await supabase
          .from('freya_activity_items')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .eq('status', 'waiting')
        return { waitingCount: count ?? 0, approveVia: 'Freya activity panel' }
      },
    }),
  }
}
