import { createAgentUIStreamResponse } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { requireOrgContext, jsonError } from '@/lib/org/context'
import { getCreditBalance, getEntitlements, getOrgPlanTier } from '@/lib/entitlements'
import { assertRateLimit } from '@/lib/rateLimit'
import {
  createFreyaRouterAgent,
  hasAiKey,
  chargeAgentRun,
  recordUsageTokens,
  checkCrisisGate,
  latestUserTextFromMessages,
} from '@/lib/agents'

export const maxDuration = 60
export const runtime = 'nodejs'

// Per-org cap on Freya chat turns per minute.
const CHAT_LIMIT = 20
const CHAT_WINDOW_MS = 60_000

function countByKey(rows: { stage?: string | null; status?: string | null }[], key: 'stage' | 'status') {
  const map = new Map<string, number>()
  for (const row of rows) {
    const k = String(row[key] || 'unknown')
    map.set(k, (map.get(k) ?? 0) + 1)
  }
  if (map.size === 0) return 'none'
  return [...map.entries()]
    .map(([k, n]) => `${n} ${k}`)
    .join(', ')
}

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

    const body = await req.json()
    const uiMessages = body.messages ?? []
    const latestUser = latestUserTextFromMessages(uiMessages)
    const crisis = checkCrisisGate(latestUser)

    // Rule 0: short safe reply, no tools, no credit charge.
    if (crisis.kind === 'crisis') {
      return Response.json({
        role: 'assistant',
        content: crisis.reply,
        crisis: true,
        crisisVariant: crisis.variant,
      })
    }

    const { usageEventId } = await chargeAgentRun(supabase, {
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
      agent: 'freya_chat',
      credits: 1,
    })

    const [
      { data: bp },
      { data: prefs },
      { data: profile },
      { data: goals },
      { data: channels },
      planTier,
      creditsRemaining,
      waitingRes,
      { data: postsRows },
      { data: inboxRows },
      { data: leadsRows },
      { data: dealsRows },
      { data: invoicesRows },
    ] = await Promise.all([
      supabase
        .from('business_profiles')
        .select(
          'business_name, industry, customers, business_type, audience_serve, team_size',
        )
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
      getCreditBalance(supabase, ctx.organizationId),
      supabase
        .from('freya_activity_items')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', ctx.organizationId)
        .eq('status', 'waiting'),
      supabase
        .from('content_posts')
        .select('id, title, caption, status')
        .eq('organization_id', ctx.organizationId)
        .order('created_at', { ascending: false })
        .limit(40),
      supabase
        .from('inbox_threads')
        .select('id, subject, contact_name, status')
        .eq('organization_id', ctx.organizationId)
        .eq('status', 'open')
        .order('last_message_at', { ascending: false })
        .limit(8),
      supabase
        .from('leads')
        .select('id, stage')
        .eq('organization_id', ctx.organizationId)
        .limit(200),
      supabase
        .from('crm_deals')
        .select('id, stage')
        .eq('organization_id', ctx.organizationId)
        .limit(200),
      supabase
        .from('money_invoices')
        .select('id, status, total_bdt, number')
        .eq('organization_id', ctx.organizationId)
        .limit(100),
    ])

    const posts = postsRows ?? []
    const draftPosts = posts.filter((p) => p.status === 'draft').length
    const postsByStatus = countByKey(posts, 'status')
    const recentTitles = posts
      .slice(0, 3)
      .map((p) => (p.title || p.caption || 'Untitled').slice(0, 40))
      .filter(Boolean)
    const postsSummary =
      posts.length === 0
        ? 'none'
        : `${postsByStatus}${recentTitles.length ? `; recent: ${recentTitles.join(' · ')}` : ''}`

    const openInbox = (inboxRows ?? []).length
    const sampleSubjects = (inboxRows ?? [])
      .slice(0, 3)
      .map((t) => `${t.contact_name || 'Contact'}: ${(t.subject || 'thread').slice(0, 36)}`)
    const messagesSummary =
      openInbox === 0
        ? 'none'
        : `${openInbox} open${sampleSubjects.length ? `; ${sampleSubjects.join(' · ')}` : ''}`

    const leadsSummary = countByKey(leadsRows ?? [], 'stage')
    const dealsSummary = countByKey(dealsRows ?? [], 'stage')

    const invoices = invoicesRows ?? []
    const overdue = invoices.filter((i) => i.status === 'overdue')
    const overdueTotal = overdue.reduce((s, i) => s + Number(i.total_bdt ?? 0), 0)
    const moneySummary =
      invoices.length === 0
        ? 'none'
        : [
            countByKey(invoices, 'status'),
            overdue.length
              ? `overdue ${overdue.length} totalling ৳${overdueTotal.toLocaleString('en-BD')}`
              : 'overdue none',
          ].join('; ')

    const waitingCount = waitingRes.count ?? 0
    const entitlements = getEntitlements(planTier)
    const modules = entitlements.modules.join(', ') || 'none'
    const todayDate = new Date().toISOString().slice(0, 10)

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
        waitingApprovals: waitingCount,
        draftPosts,
        openInbox,
        waitingApprovalsSummary: waitingCount === 0 ? 'none' : String(waitingCount),
        postsSummary,
        messagesSummary,
        leadsSummary,
        dealsSummary,
        moneySummary,
        availableModules: modules,
        aiCreditsRemaining: creditsRemaining,
        todayDate,
        allergenPressure: crisis.allergenPressure,
      },
    })

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
