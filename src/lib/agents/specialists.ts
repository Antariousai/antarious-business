import { tool } from 'ai'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  canAccessModule,
  minTierForModule,
  type AppModule,
  type PlanTier,
} from '@/data/planTiers'

/** Shared plan gate for Freya tools — refuse before writing to a locked module. */
export function denyIfNoModule(tier: PlanTier | string | null | undefined, module: AppModule) {
  if (canAccessModule(tier as PlanTier | null | undefined, module)) return null
  const need = minTierForModule(module)
  const current = tier || 'starter'
  return {
    ok: false as const,
    code: 'PLAN' as const,
    error: `That needs the ${need} plan (this workspace is on ${current}). Open Settings to upgrade — don’t create the item yet.`,
    path: '/app/settings',
    upgradeTo: need,
  }
}

export function inboxReplierTools(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  planTier?: PlanTier | string | null,
) {
  return {
    list_threads: tool({
      description:
        'List recent inbox threads (open by default). Use before drafting a reply so you have threadId.',
      inputSchema: z.object({
        status: z.enum(['open', 'handled', 'all']).optional(),
        limit: z.number().min(1).max(20).optional(),
      }),
      execute: async ({ status, limit }) => {
        const denied = denyIfNoModule(planTier, 'messages')
        if (denied) return denied
        let query = supabase
          .from('inbox_threads')
          .select('id, subject, contact_name, platform, status, unread, last_message_at')
          .eq('organization_id', organizationId)
          .order('last_message_at', { ascending: false })
          .limit(limit ?? 8)
        if (status && status !== 'all') query = query.eq('status', status)
        else if (!status) query = query.eq('status', 'open')
        const { data, error } = await query
        if (error) return { ok: false, error: error.message }
        return { ok: true, threads: data ?? [] }
      },
    }),

    summarize_thread: tool({
      description:
        'Read messages for one inbox thread and return a short summary plus recent message bodies.',
      inputSchema: z.object({
        threadId: z.string(),
      }),
      execute: async ({ threadId }) => {
        const denied = denyIfNoModule(planTier, 'messages')
        if (denied) return denied
        const { data: thread, error: tErr } = await supabase
          .from('inbox_threads')
          .select('id, subject, contact_name, platform, status')
          .eq('id', threadId)
          .eq('organization_id', organizationId)
          .maybeSingle()
        if (tErr) return { ok: false, error: tErr.message }
        if (!thread) return { ok: false, error: 'Thread not found' }

        const { data: messages, error: mErr } = await supabase
          .from('inbox_messages')
          .select('id, kind, body, created_at, delivery_status')
          .eq('thread_id', threadId)
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: true })
          .limit(30)
        if (mErr) return { ok: false, error: mErr.message }

        const msgs = messages ?? []
        const lastCustomer = [...msgs].reverse().find((m) => m.kind === 'customer')
        const summary = lastCustomer
          ? `${thread.contact_name} on ${thread.platform}: ${(lastCustomer.body ?? '').slice(0, 160)}`
          : `${thread.contact_name} — no customer messages yet`

        return {
          ok: true,
          thread,
          summary,
          messages: msgs.map((m) => ({
            id: m.id,
            kind: m.kind,
            body: (m.body ?? '').slice(0, 400),
            at: m.created_at,
          })),
        }
      },
    }),

    draft_reply: tool({
      description:
        'Draft a Freya reply for an inbox thread (creates freya_draft + waiting approval to send). Never sends until the owner approves.',
      inputSchema: z.object({
        threadId: z.string(),
        body: z.string(),
      }),
      execute: async ({ threadId, body }) => {
        const denied = denyIfNoModule(planTier, 'messages')
        if (denied) return denied
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
        return { ok: true, messageId: data.id, body, path: '/app/inbox', pendingApproval: true }
      },
    }),
  }
}

export function leadAssistantTools(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  planTier?: PlanTier | string | null,
) {
  return {
    list_leads: tool({
      description: 'List leads (interested people). Optional stage filter: new, contacted, qualified, converted.',
      inputSchema: z.object({
        stage: z.string().optional(),
        limit: z.number().min(1).max(30).optional(),
      }),
      execute: async ({ stage, limit }) => {
        const denied = denyIfNoModule(planTier, 'leads')
        if (denied) return denied
        let query = supabase
          .from('leads')
          .select('id, name, company, phone, email, stage, notes, updated_at')
          .eq('organization_id', organizationId)
          .order('updated_at', { ascending: false })
          .limit(limit ?? 10)
        if (stage) query = query.eq('stage', stage)
        const { data, error } = await query
        if (error) return { ok: false, error: error.message }
        return { ok: true, leads: data ?? [] }
      },
    }),

    create_lead: tool({
      description:
        'Create a lead immediately as stage new (or given stage). Does not need approval to create — follow-ups stay manual or via activity later.',
      inputSchema: z.object({
        name: z.string(),
        company: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        stage: z.string().optional(),
        notes: z.string().optional(),
      }),
      execute: async (lead) => {
        const denied = denyIfNoModule(planTier, 'leads')
        if (denied) return denied
        const { data, error } = await supabase
          .from('leads')
          .insert({
            organization_id: organizationId,
            name: lead.name,
            company: lead.company ?? null,
            phone: lead.phone ?? null,
            email: lead.email ?? null,
            stage: lead.stage ?? 'new',
            notes: lead.notes ?? null,
          })
          .select('id, name, stage')
          .single()
        if (error) return { ok: false, error: error.message }
        void userId
        return {
          ok: true,
          leadId: data.id,
          name: data.name,
          stage: data.stage,
          path: '/app/leads',
        }
      },
    }),

    update_lead_stage: tool({
      description: 'Move a lead to a new stage (new, contacted, qualified, converted).',
      inputSchema: z.object({
        leadId: z.string(),
        stage: z.string().describe('Stage key for this org funnel (e.g. new, contacted, or a custom step key)'),
        notes: z.string().optional(),
      }),
      execute: async ({ leadId, stage, notes }) => {
        const denied = denyIfNoModule(planTier, 'leads')
        if (denied) return denied
        const { data: existing } = await supabase
          .from('leads')
          .select('stage')
          .eq('id', leadId)
          .eq('organization_id', organizationId)
          .maybeSingle()
        if (!existing) return { ok: false, error: 'Lead not found' }

        const patch: Record<string, unknown> = { stage }
        if (notes !== undefined) patch.notes = notes

        const { data, error } = await supabase
          .from('leads')
          .update(patch)
          .eq('id', leadId)
          .eq('organization_id', organizationId)
          .select('id, name, stage')
          .single()
        if (error) return { ok: false, error: error.message }

        if (existing.stage !== stage) {
          await supabase.from('lead_stage_events').insert({
            lead_id: leadId,
            from_stage: existing.stage,
            to_stage: stage,
            created_by: userId,
          })
        }
        return { ok: true, lead: data, path: '/app/leads' }
      },
    }),
  }
}

export function crmCopilotTools(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  planTier?: PlanTier | string | null,
) {
  return {
    list_deals: tool({
      description: 'List CRM pipeline deals. Optional stage filter.',
      inputSchema: z.object({
        stage: z.string().optional(),
        limit: z.number().min(1).max(30).optional(),
      }),
      execute: async ({ stage, limit }) => {
        const denied = denyIfNoModule(planTier, 'customers')
        if (denied) return denied
        let query = supabase
          .from('crm_deals')
          .select('id, title, stage, value_bdt, next_step, updated_at')
          .eq('organization_id', organizationId)
          .order('updated_at', { ascending: false })
          .limit(limit ?? 10)
        if (stage) query = query.eq('stage', stage)
        const { data, error } = await query
        if (error) return { ok: false, error: error.message }
        return { ok: true, deals: data ?? [] }
      },
    }),

    create_deal: tool({
      description: 'Create a CRM deal in draft/qualified stage for the pipeline.',
      inputSchema: z.object({
        title: z.string(),
        valueBdt: z.number().optional(),
        stage: z.string().optional(),
        nextStep: z.string().optional(),
      }),
      execute: async ({ title, valueBdt, stage, nextStep }) => {
        const denied = denyIfNoModule(planTier, 'customers')
        if (denied) return denied
        const { data, error } = await supabase
          .from('crm_deals')
          .insert({
            organization_id: organizationId,
            title,
            stage: stage ?? 'qualified',
            value_bdt: valueBdt ?? 0,
            next_step: nextStep ?? null,
          })
          .select('id, title, stage')
          .single()
        if (error) return { ok: false, error: error.message }
        void userId
        return { ok: true, dealId: data.id, path: '/app/pipeline' }
      },
    }),

    suggest_next_step: tool({
      description: 'Suggest and save a next step for an existing deal.',
      inputSchema: z.object({
        dealId: z.string(),
        title: z.string().optional(),
      }),
      execute: async ({ dealId, title }) => {
        const denied = denyIfNoModule(planTier, 'customers')
        if (denied) return denied
        const next =
          title?.toLowerCase().includes('gift')
            ? 'Send swatches + confirm delivery date on WhatsApp'
            : 'Call today and confirm budget in BDT'
        const { error } = await supabase
          .from('crm_deals')
          .update({ next_step: next })
          .eq('id', dealId)
          .eq('organization_id', organizationId)
        if (error) return { ok: false, error: error.message }
        return { ok: true, nextStep: next, path: '/app/pipeline' }
      },
    }),
  }
}

export function moneyAssistantTools(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  planTier?: PlanTier | string | null,
) {
  return {
    list_invoices: tool({
      description: 'List invoices. Optional status: draft, sent, overdue, paid, etc.',
      inputSchema: z.object({
        status: z.string().optional(),
        limit: z.number().min(1).max(30).optional(),
      }),
      execute: async ({ status, limit }) => {
        const denied = denyIfNoModule(planTier, 'money')
        if (denied) return denied
        let query = supabase
          .from('money_invoices')
          .select('id, number, status, total_bdt, due_at, notes')
          .eq('organization_id', organizationId)
          .order('due_at', { ascending: true, nullsFirst: false })
          .limit(limit ?? 10)
        if (status) query = query.eq('status', status)
        const { data, error } = await query
        if (error) return { ok: false, error: error.message }
        return { ok: true, invoices: data ?? [] }
      },
    }),

    draft_invoice: tool({
      description: 'Draft a BDT invoice (creates draft invoice row immediately).',
      inputSchema: z.object({
        totalBdt: z.number(),
        notes: z.string().optional(),
        dueInDays: z.number().optional(),
      }),
      execute: async ({ totalBdt, notes, dueInDays }) => {
        const denied = denyIfNoModule(planTier, 'money')
        if (denied) return denied
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
        return {
          ok: true,
          invoiceId: data.id,
          totalBdt,
          message: `Draft invoice for ৳${totalBdt.toLocaleString('en-BD')} saved in Money.`,
          path: '/app/money',
        }
      },
    }),

    draft_bill: tool({
      description: 'Draft a bill / payable (money_bills) for tracking outbound money.',
      inputSchema: z.object({
        totalBdt: z.number(),
        notes: z.string().optional(),
        dueInDays: z.number().optional(),
      }),
      execute: async ({ totalBdt, notes, dueInDays }) => {
        const denied = denyIfNoModule(planTier, 'money')
        if (denied) return denied
        const due = new Date()
        due.setDate(due.getDate() + (dueInDays ?? 7))
        const { data, error } = await supabase
          .from('money_bills')
          .insert({
            organization_id: organizationId,
            number: `BILL-${Date.now().toString().slice(-6)}`,
            status: 'awaiting',
            total_bdt: totalBdt,
            due_at: due.toISOString().slice(0, 10),
          })
          .select('id')
          .single()
        if (error) return { ok: false, error: error.message }
        if (notes) {
          await supabase.from('money_bill_lines').insert({
            bill_id: data.id,
            description: notes,
            qty: 1,
            unit_bdt: totalBdt,
          })
        }
        void userId
        return { ok: true, billId: data.id, path: '/app/money' }
      },
    }),

    remind_invoice: tool({
      description:
        'Queue a soft reminder activity for an invoice (does not send email/payment — owner reviews in Freya Activity).',
      inputSchema: z.object({
        invoiceId: z.string(),
        note: z.string().optional(),
      }),
      execute: async ({ invoiceId, note }) => {
        const denied = denyIfNoModule(planTier, 'money')
        if (denied) return denied
        const { data: inv } = await supabase
          .from('money_invoices')
          .select('id, number, total_bdt, status')
          .eq('id', invoiceId)
          .eq('organization_id', organizationId)
          .maybeSingle()
        if (!inv) return { ok: false, error: 'Invoice not found' }

        await supabase.from('freya_activity_items').insert({
          organization_id: organizationId,
          kind: 'mark_invoice_sent',
          title: `Reminder: invoice ${inv.number}`,
          summary: note ?? `Follow up on ৳${inv.total_bdt} (${inv.status})`,
          status: 'waiting',
          payload: {
            action: 'mark_invoice_sent',
            invoice_id: inv.id,
            soft: true,
          },
          href: '/app/money',
          created_by: userId,
        })
        return { ok: true, pendingApproval: true, path: '/app/money' }
      },
    }),
  }
}

export function campaignPlannerTools(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  planTier?: PlanTier | string | null,
) {
  return {
    list_campaigns: tool({
      description: 'List campaigns. Optional status: draft, paused, running, done.',
      inputSchema: z.object({
        status: z.string().optional(),
        limit: z.number().min(1).max(30).optional(),
      }),
      execute: async ({ status, limit }) => {
        const denied = denyIfNoModule(planTier, 'campaigns')
        if (denied) return denied
        let query = supabase
          .from('campaigns')
          .select('id, title, status, goal, audience, budget_bdt, platforms, created_at')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false })
          .limit(limit ?? 10)
        if (status) query = query.eq('status', status)
        const { data, error } = await query
        if (error) return { ok: false, error: error.message }
        return { ok: true, campaigns: data ?? [] }
      },
    }),

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
        const denied = denyIfNoModule(planTier, 'campaigns')
        if (denied) return denied
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
        return {
          ok: true,
          campaignId: data.id,
          title: input.title,
          message: `Campaign “${input.title}” saved as draft.`,
          path: '/app/campaigns',
        }
      },
    }),

    update_campaign_status: tool({
      description: 'Update campaign status to draft or paused (safe). Do not set running/live ads from chat.',
      inputSchema: z.object({
        campaignId: z.string(),
        status: z.enum(['draft', 'paused']),
      }),
      execute: async ({ campaignId, status }) => {
        const denied = denyIfNoModule(planTier, 'campaigns')
        if (denied) return denied
        const { data, error } = await supabase
          .from('campaigns')
          .update({ status })
          .eq('id', campaignId)
          .eq('organization_id', organizationId)
          .select('id, title, status')
          .single()
        if (error) return { ok: false, error: error.message }
        return { ok: true, campaign: data, path: '/app/campaigns' }
      },
    }),
  }
}
