import { generateObject } from 'ai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireOrgContext, jsonError } from '@/lib/org/context'
import { assertModuleAccess } from '@/lib/entitlements'
import { assertRateLimit } from '@/lib/rateLimit'
import {
  hasAiKey,
  resolveModel,
  freyaWritingRules,
  chargeAgentRun,
  recordUsageTokens,
} from '@/lib/agents'

export const runtime = 'nodejs'
export const maxDuration = 60

const COLORS = ['pink', 'blue', 'mint', 'amber', 'coral'] as const

const PlanSchema = z.object({
  note: z
    .string()
    .describe('Short owner-facing note (1–2 sentences) about the week Freya planned'),
  posts: z
    .array(
      z.object({
        dayOffset: z
          .number()
          .int()
          .min(0)
          .max(6)
          .describe('0 = week start (today or Monday), through 6'),
        hour: z.number().int().min(8).max(20).describe('Local hour to suggest posting'),
        title: z.string().min(4).max(48).describe('Short calendar title, not the full caption'),
        caption: z.string().min(24).describe('Full post caption, 2–4 short sentences'),
        tag: z
          .string()
          .describe('One of: Product, Promo, Community, Tips, Lifestyle, Update, Occasion'),
        platforms: z.array(z.string()).min(1).max(3).optional(),
      }),
    )
    .min(3)
    .max(7),
})

type PlannedPost = z.infer<typeof PlanSchema>['posts'][number]

function startOfLocalDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function weekStart(from = new Date()) {
  // Plan from today through the next 6 days (rolling week).
  return startOfLocalDay(from)
}

function colorForTag(tag: string): (typeof COLORS)[number] {
  const t = tag.toLowerCase()
  if (/(product|drop|arrival)/.test(t)) return 'pink'
  if (/(promo|sale|offer|deal)/.test(t)) return 'blue'
  if (/(community|bts|story|team)/.test(t)) return 'mint'
  if (/(campaign|reel|ads)/.test(t)) return 'coral'
  return 'amber'
}

function fallbackPlan(biz: {
  businessName: string
  industry: string
  customers: string
  goals: string[]
}): z.infer<typeof PlanSchema> {
  const bizName = biz.businessName || 'your shop'
  const who = biz.customers || 'your customers'
  const industry = biz.industry || 'small business'
  const goal = biz.goals[0] || 'grow the business'

  return {
    note: `I sketched a 5-post week for ${bizName}. Review the drafts on Content, then approve when ready.`,
    posts: [
      {
        dayOffset: 0,
        hour: 10,
        title: 'Week opener',
        caption: `Fresh week at ${bizName}. Here’s what ${who} can expect from us in ${industry}. Message us if you want first pick.`,
        tag: 'Update',
        platforms: ['Instagram', 'Facebook'],
      },
      {
        dayOffset: 1,
        hour: 11,
        title: 'Product spotlight',
        caption: `Something worth a closer look from ${bizName}. Made with ${who} in mind. Save this post and ask us for details.`,
        tag: 'Product',
        platforms: ['Instagram', 'Facebook'],
      },
      {
        dayOffset: 3,
        hour: 12,
        title: 'Midweek tip',
        caption: `Quick tip from ${bizName} for ${who}. Small habits help you ${goal}. Reply if you want us to tailor this for you.`,
        tag: 'Tips',
        platforms: ['Instagram'],
      },
      {
        dayOffset: 4,
        hour: 17,
        title: 'Soft offer',
        caption: `A little midweek love from ${bizName}. Ask about this week’s pick — we’re happy to help ${who} choose.`,
        tag: 'Promo',
        platforms: ['Facebook', 'Instagram'],
      },
      {
        dayOffset: 6,
        hour: 10,
        title: 'Weekend invite',
        caption: `Weekend plans with ${bizName}? Come see what’s new, or message us and we’ll set something aside for you.`,
        tag: 'Community',
        platforms: ['Instagram', 'Facebook'],
      },
    ],
  }
}

/**
 * Freya plans the next 7 days of content, saves draft posts with planned dates,
 * and queues them for owner review. Uses LLM when AI key is set; otherwise a
 * brand-aware offline fallback.
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const ctx = await requireOrgContext(supabase)
    await assertModuleAccess(supabase, ctx.organizationId, 'posts')

    assertRateLimit({
      key: `content_plan_week:${ctx.organizationId}`,
      limit: 8,
      windowMs: 60_000,
    })

    const body = await req.json().catch(() => ({}))
    const anchor = body.anchorDate ? new Date(String(body.anchorDate)) : new Date()
    const start = Number.isNaN(anchor.getTime()) ? weekStart() : weekStart(anchor)

    const [{ data: bp }, { data: prefs }, { data: goals }, { data: channels }, { data: recent }] =
      await Promise.all([
        supabase
          .from('business_profiles')
          .select('business_name, industry, customers, business_type')
          .eq('organization_id', ctx.organizationId)
          .maybeSingle(),
        supabase
          .from('freya_preferences')
          .select('tone')
          .eq('organization_id', ctx.organizationId)
          .maybeSingle(),
        supabase.from('business_goals').select('goal_id').eq('organization_id', ctx.organizationId),
        supabase
          .from('channel_preferences')
          .select('platform')
          .eq('organization_id', ctx.organizationId),
        supabase
          .from('content_posts')
          .select('title, caption, tag, status')
          .eq('organization_id', ctx.organizationId)
          .order('created_at', { ascending: false })
          .limit(8),
      ])

    const biz = {
      businessName: bp?.business_name?.trim() || 'your business',
      industry: bp?.industry?.trim() || 'small business',
      customers: bp?.customers?.trim() || 'your customers',
      businessType: bp?.business_type?.trim() || '',
      goals: (goals ?? []).map((g) => String(g.goal_id)),
      tone: prefs?.tone || 'warm',
      platforms: (channels ?? []).map((c) => String(c.platform)).filter(Boolean),
    }

    const recentLines = (recent ?? [])
      .map((p) => `- [${p.status}] ${(p.title || p.caption || '').slice(0, 60)}`)
      .join('\n')

    let plan: z.infer<typeof PlanSchema>
    let offline = false

    if (!hasAiKey()) {
      offline = true
      plan = fallbackPlan(biz)
    } else {
      const { usageEventId } = await chargeAgentRun(supabase, {
        organizationId: ctx.organizationId,
        userId: ctx.user.id,
        agent: 'content_plan_week',
        credits: 1,
      })

      const { object, usage } = await generateObject({
        model: resolveModel(),
        schema: PlanSchema,
        system: [
          'You are Freya, the AI teammate inside Antarious Business.',
          'Plan a practical week of social posts for THIS business only.',
          'Vary formats: opener, product/service spotlight, tip or education, soft promo, community/weekend.',
          'Do not invent fake discounts, stock, or events the owner did not mention.',
          'Titles: short calendar labels. Captions: ready to post after owner review.',
          'Never say posted or published — these are drafts waiting for OK.',
          freyaWritingRules(),
          '',
          `Business: ${biz.businessName}`,
          `Industry: ${biz.industry}${biz.businessType ? ` (${biz.businessType})` : ''}`,
          `Serves: ${biz.customers}`,
          `Goals: ${biz.goals.join(', ') || 'grow steadily'}`,
          `Tone: ${biz.tone}`,
          `Preferred channels: ${biz.platforms.join(', ') || 'Instagram, Facebook'}`,
          `Week starts (local): ${start.toISOString().slice(0, 10)}`,
          recentLines ? `Recent posts (avoid repeating):\n${recentLines}` : 'No recent posts yet.',
        ].join('\n'),
        prompt:
          'Plan 5 posts across the next 7 days (dayOffset 0–6). Spread them out. Match this business.',
      })

      plan = object
      await recordUsageTokens(supabase, usageEventId, {
        inputTokens: usage?.inputTokens,
        outputTokens: usage?.outputTokens,
      })
    }

    const defaultPlatforms =
      biz.platforms.length > 0 ? biz.platforms.slice(0, 2) : ['Instagram', 'Facebook']

    const created: Array<{
      id: string
      title: string
      caption: string
      tag: string
      scheduledAt: string
      day: number
      color: (typeof COLORS)[number]
      platforms: string[]
    }> = []

    for (const item of plan.posts as PlannedPost[]) {
      const when = new Date(start)
      when.setDate(start.getDate() + item.dayOffset)
      when.setHours(item.hour, item.dayOffset % 2 === 0 ? 0 : 30, 0, 0)

      const platforms =
        item.platforms?.map((p) => p.trim()).filter(Boolean).slice(0, 3) ?? defaultPlatforms
      const title = item.title.trim().slice(0, 48)
      const caption = item.caption.trim()
      const tag = item.tag.trim() || 'Update'

      const { data: post, error } = await supabase
        .from('content_posts')
        .insert({
          organization_id: ctx.organizationId,
          title,
          caption,
          tag,
          status: 'draft',
          scheduled_at: when.toISOString(),
          created_by: ctx.user.id,
        })
        .select('id, title, caption, tag, scheduled_at')
        .single()

      if (error || !post) continue

      if (platforms.length) {
        await supabase.from('content_post_platforms').insert(
          platforms.map((platform) => ({ post_id: post.id, platform })),
        )
      }

      await supabase.from('freya_activity_items').insert({
        organization_id: ctx.organizationId,
        kind: 'publish_post',
        title: 'Review planned post',
        summary: caption.slice(0, 120),
        status: 'waiting',
        payload: { action: 'publish_post', post_id: post.id },
        href: '/app/content',
        created_by: ctx.user.id,
      })

      created.push({
        id: post.id,
        title: post.title || title,
        caption: post.caption || caption,
        tag: post.tag || tag,
        scheduledAt: post.scheduled_at || when.toISOString(),
        day: when.getDate(),
        color: colorForTag(tag),
        platforms,
      })
    }

    return Response.json({
      ok: true,
      offline,
      note: plan.note.trim(),
      weekStart: start.toISOString(),
      posts: created,
    })
  } catch (err) {
    return jsonError(err)
  }
}
