import { tool } from 'ai'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'

export function inboxReplierTools(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
) {
  return {
    draft_reply: tool({
      description: 'Draft a Freya reply for an inbox thread (creates freya_draft + approval item).',
      inputSchema: z.object({
        threadId: z.string(),
        body: z.string(),
      }),
      execute: async ({ threadId, body }) => {
        const { data, error } = await supabase
          .from('inbox_messages')
          .insert({
            thread_id: threadId,
            organization_id: organizationId,
            kind: 'freya_draft',
            body,
            delivery_status: 'local_only',
            created_by: userId,
          })
          .select('id')
          .single()
        if (error) return { ok: false, error: error.message }
        await supabase.from('freya_activity_items').insert({
          organization_id: organizationId,
          kind: 'send_inbox_draft',
          title: 'Approve Freya reply',
          summary: body.slice(0, 120),
          status: 'waiting',
          payload: { action: 'send_inbox_draft', message_id: data.id, thread_id: threadId },
          href: '/app/inbox',
          created_by: userId,
        })
        return { ok: true, messageId: data.id }
      },
    }),
  }
}

export function leadAssistantTools(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
) {
  return {
    create_lead: tool({
      description: 'Create a lead from natural language fields.',
      inputSchema: z.object({
        name: z.string(),
        company: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        stage: z.string().optional(),
        notes: z.string().optional(),
      }),
      execute: async (lead) => {
        await supabase.from('freya_activity_items').insert({
          organization_id: organizationId,
          kind: 'create_lead',
          title: `Create lead: ${lead.name}`,
          summary: lead.notes ?? lead.company ?? '',
          status: 'waiting',
          payload: { action: 'create_lead', lead },
          href: '/app/leads',
          created_by: userId,
        })
        return { ok: true, pendingApproval: true }
      },
    }),
  }
}

export function crmCopilotTools(
  supabase: SupabaseClient,
  organizationId: string,
  _userId: string,
) {
  return {
    suggest_next_step: tool({
      description: 'Suggest a next step for a deal.',
      inputSchema: z.object({
        dealId: z.string(),
        title: z.string().optional(),
      }),
      execute: async ({ dealId, title }) => {
        const next =
          title?.toLowerCase().includes('gift')
            ? 'Send swatches + confirm delivery date on WhatsApp'
            : 'Call today and confirm budget in BDT'
        await supabase
          .from('crm_deals')
          .update({ next_step: next })
          .eq('id', dealId)
          .eq('organization_id', organizationId)
        return { nextStep: next }
      },
    }),
  }
}

export function moneyAssistantTools(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
) {
  return {
    draft_invoice: tool({
      description: 'Draft a BDT invoice (creates draft invoice row).',
      inputSchema: z.object({
        totalBdt: z.number(),
        notes: z.string().optional(),
        dueInDays: z.number().optional(),
      }),
      execute: async ({ totalBdt, notes, dueInDays }) => {
        const due = new Date()
        due.setDate(due.getDate() + (dueInDays ?? 7))
        const { data, error } = await supabase
          .from('money_invoices')
          .insert({
            organization_id: organizationId,
            number: `INV-${Date.now().toString().slice(-6)}`,
            status: 'draft',
            total_bdt: totalBdt,
            due_at: due.toISOString().slice(0, 10),
            notes: notes ?? null,
          })
          .select('id')
          .single()
        if (error) return { ok: false, error: error.message }
        void userId
        return { ok: true, invoiceId: data.id }
      },
    }),
  }
}

export function campaignPlannerTools(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
) {
  return {
    create_campaign_draft: tool({
      description:
        'Create a draft campaign. Title must be a proper campaign name (4–8 words, Outcome · Theme) — never paste the user prompt. Goal and audience should be 1–2 mid-length sentences aligned to this business.',
      inputSchema: z.object({
        title: z
          .string()
          .describe('Proper campaign title, e.g. "Weekend Walk-ins · Summer Linen"'),
        goal: z.string().optional().describe('1–2 sentences: what success looks like for this business'),
        audience: z.string().optional().describe('1–2 sentences: who this reaches'),
        platforms: z.array(z.string()).optional(),
        budgetBdt: z.number().optional(),
        objective: z.string().optional(),
        tone: z.string().optional(),
      }),
      execute: async (input) => {
        const { data, error } = await supabase
          .from('campaigns')
          .insert({
            organization_id: organizationId,
            title: input.title,
            goal: input.goal ?? null,
            audience: input.audience ?? null,
            platforms: input.platforms ?? ['Facebook', 'Instagram'],
            budget_bdt: input.budgetBdt ?? 0,
            objective: input.objective ?? null,
            tone: input.tone ?? null,
            status: 'draft',
          })
          .select('id')
          .single()
        if (error) return { ok: false, error: error.message }
        void userId
        return { ok: true, campaignId: data.id }
      },
    }),
  }
}
