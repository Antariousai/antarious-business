import { createClient } from '@/lib/supabase/server'
import { requireOrgContext, jsonError } from '@/lib/org/context'
import { assertModuleAccess } from '@/lib/entitlements'
import { assertRateLimit } from '@/lib/rateLimit'
import { hasAiKey, chargeAgentRun } from '@/lib/agents'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST() {
  try {
    const supabase = await createClient()
    const ctx = await requireOrgContext(supabase)
    await assertModuleAccess(supabase, ctx.organizationId, 'ideas')

    assertRateLimit({
      key: `discover_refresh:${ctx.organizationId}`,
      limit: 6,
      windowMs: 60_000,
    })

    if (hasAiKey()) {
      await chargeAgentRun(supabase, {
        organizationId: ctx.organizationId,
        userId: ctx.user.id,
        agent: 'discover_refresh',
        credits: 2,
      })
    }

    const [{ data: posts }, { data: leads }, { data: threads }] = await Promise.all([
      supabase
        .from('content_posts')
        .select('caption, tag, status')
        .eq('organization_id', ctx.organizationId)
        .limit(10),
      supabase
        .from('leads')
        .select('name, stage, notes')
        .eq('organization_id', ctx.organizationId)
        .limit(10),
      supabase
        .from('inbox_threads')
        .select('contact_name, subject, platform')
        .eq('organization_id', ctx.organizationId)
        .limit(10),
    ])

    const signals = [
      {
        organization_id: ctx.organizationId,
        title: 'Eid prep window',
        body: 'Customers ask about festive stock 2–3 weeks early. Draft a teaser post and WhatsApp note.',
        status: 'new',
        meta: { source: 'heuristic', posts: posts?.length ?? 0 },
      },
      {
        organization_id: ctx.organizationId,
        title: 'Warm leads need a nudge',
        body: `${leads?.length ?? 0} leads on file — Freya can draft a soft follow-up for open stages.`,
        status: 'new',
        meta: { source: 'leads' },
      },
      {
        organization_id: ctx.organizationId,
        title: 'Inbox themes',
        body:
          threads && threads.length
            ? `Recent chats on ${[...new Set(threads.map((t) => t.platform).filter(Boolean))].join(', ') || 'chat'} — turn FAQs into a Tips post.`
            : 'No threads yet — seed demo inbox or connect a channel flag in Settings.',
        status: 'new',
        meta: { source: 'inbox' },
      },
    ]

    const ideas = [
      {
        organization_id: ctx.organizationId,
        title: 'New arrival carousel',
        caption: 'Fresh drops this week — pick your favourite colour. DM to reserve 💛',
        status: 'saved',
      },
      {
        organization_id: ctx.organizationId,
        title: 'Delivery reassurance',
        caption: 'Safe packing + cash on delivery across BD. Order on WhatsApp.',
        status: 'saved',
      },
    ]

    const trends = [
      {
        organization_id: ctx.organizationId,
        title: 'Festive gift sets',
        summary: 'Customers pair small gift sets with bigger orders — higher basket value.',
        direction: 'up',
        change_label: '+34% interest',
        topic: 'Occasions',
        freya_tip: 'Bundle a “buy 2 get a gift box” offer in your next post.',
      },
      {
        organization_id: ctx.organizationId,
        title: 'Delivery reassurance',
        summary: 'Cash-on-delivery + safe packing keeps coming up in chats.',
        direction: 'up',
        change_label: 'Rising',
        topic: 'Trust',
        freya_tip: 'Pin a highlight showing your packing + COD across BD.',
      },
    ]

    // Seed a competitor watch only if the org has none yet (persistent, not per-run spam).
    const { count: watchCount } = await supabase
      .from('competitor_watches')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', ctx.organizationId)

    if (!watchCount) {
      await supabase.from('competitor_watches').insert([
        {
          organization_id: ctx.organizationId,
          name: 'Nearby boutique',
          notes: 'Similar catalogue, pushing delivery speed.',
          last_move: 'Started same-day delivery within 5km',
          threat: 'medium',
          freya_take: 'Offer a 2-hour pickup window instead of matching a delivery fleet.',
        },
      ])
    }

    await supabase.from('discover_signals').insert(signals)
    await supabase.from('content_ideas').insert(ideas)
    await supabase.from('discover_trends').insert(trends)

    return Response.json({
      ok: true,
      signals: signals.length,
      ideas: ideas.length,
      trends: trends.length,
    })
  } catch (err) {
    return jsonError(err)
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const ctx = await requireOrgContext(supabase)
    await assertModuleAccess(supabase, ctx.organizationId, 'ideas')

    const [signals, ideas, insights, trends, competitors] = await Promise.all([
      supabase
        .from('discover_signals')
        .select('*')
        .eq('organization_id', ctx.organizationId)
        .order('created_at', { ascending: false })
        .limit(30),
      supabase
        .from('content_ideas')
        .select('*')
        .eq('organization_id', ctx.organizationId)
        .order('created_at', { ascending: false })
        .limit(30),
      supabase
        .from('discover_insights')
        .select('*')
        .eq('organization_id', ctx.organizationId)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('discover_trends')
        .select('*')
        .eq('organization_id', ctx.organizationId)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('competitor_watches')
        .select('*')
        .eq('organization_id', ctx.organizationId)
        .order('created_at', { ascending: false })
        .limit(20),
    ])

    return Response.json({
      signals: signals.data ?? [],
      ideas: ideas.data ?? [],
      insights: insights.data ?? [],
      trends: trends.data ?? [],
      competitors: competitors.data ?? [],
    })
  } catch (err) {
    return jsonError(err)
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = await createClient()
    const ctx = await requireOrgContext(supabase)
    await assertModuleAccess(supabase, ctx.organizationId, 'ideas')

    const body = await req.json()
    const id = String(body.id ?? '')
    const resource = body.resource === 'ideas' ? 'ideas' : 'signals'
    if (!id) return Response.json({ error: 'id required' }, { status: 400 })
    if (!body.status) return Response.json({ error: 'status required' }, { status: 400 })

    if (resource === 'ideas') {
      const { data, error } = await supabase
        .from('content_ideas')
        .update({ status: String(body.status) })
        .eq('id', id)
        .eq('organization_id', ctx.organizationId)
        .select('*')
        .single()
      if (error) throw error
      return Response.json({ idea: data })
    }

    const { data, error } = await supabase
      .from('discover_signals')
      .update({ status: String(body.status) })
      .eq('id', id)
      .eq('organization_id', ctx.organizationId)
      .select('*')
      .single()
    if (error) throw error
    return Response.json({ signal: data })
  } catch (err) {
    return jsonError(err)
  }
}
