import { tool } from 'ai'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'

export function contentWriterTools(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
) {
  return {
    draft_caption: tool({
      description:
        'Draft a mid-length social caption (2–4 short sentences) aligned to this org’s industry, customers, and goals. Do not use a generic boutique template.',
      inputSchema: z.object({
        offer: z.string().describe('What is being promoted'),
        tone: z.enum(['warm', 'professional', 'playful']).optional(),
        platform: z.string().optional(),
      }),
      execute: async ({ offer, tone, platform }) => {
        const caption = [
          offer.trim(),
          '',
          platform === 'Instagram'
            ? 'Save this post and message us when you’re ready — happy to help you choose.'
            : 'Message us with what you need. We’ll reply with clear next steps.',
          tone === 'professional' ? 'Limited availability this week.' : 'We’re here when you are.',
        ].join('\n')
        return { caption, offer, platform: platform ?? 'Facebook' }
      },
    }),

    suggest_platforms: tool({
      description: 'Suggest platforms for a post based on the offer.',
      inputSchema: z.object({
        offer: z.string(),
      }),
      execute: async ({ offer }) => {
        const lower = offer.toLowerCase()
        const platforms = ['Facebook', 'Instagram']
        if (/whatsapp|order|delivery/.test(lower)) platforms.push('WhatsApp')
        if (/b2b|wholesale|corporate/.test(lower)) platforms.push('LinkedIn')
        return { platforms }
      },
    }),

    suggest_tag: tool({
      description: 'Suggest a short content tag/category.',
      inputSchema: z.object({
        caption: z.string(),
      }),
      execute: async ({ caption }) => {
        const lower = caption.toLowerCase()
        let tag = 'Promo'
        if (/eid|puja|festive/.test(lower)) tag = 'Festive'
        else if (/new|arrival|drop/.test(lower)) tag = 'New arrival'
        else if (/tip|how|guide/.test(lower)) tag = 'Tips'
        return { tag }
      },
    }),

    create_post_draft: tool({
      description: 'Create a draft content post in the org (needs human publish).',
      inputSchema: z.object({
        caption: z.string(),
        title: z.string().optional(),
        platforms: z.array(z.string()).optional(),
        tag: z.string().optional(),
        scheduled_at: z.string().optional(),
      }),
      execute: async ({ caption, title, platforms, tag, scheduled_at }) => {
        const { data: post, error } = await supabase
          .from('content_posts')
          .insert({
            organization_id: organizationId,
            caption,
            title: title ?? null,
            tag: tag ?? null,
            status: scheduled_at ? 'scheduled' : 'draft',
            scheduled_at: scheduled_at ?? null,
            created_by: userId,
          })
          .select('id')
          .single()

        if (error) return { ok: false, error: error.message }

        const plats = platforms?.length ? platforms : ['Facebook', 'Instagram']
        if (post?.id) {
          await supabase.from('content_post_platforms').insert(
            plats.map((platform) => ({ post_id: post.id, platform })),
          )

          await supabase.from('freya_activity_items').insert({
            organization_id: organizationId,
            kind: 'publish_post',
            title: 'Review post draft',
            summary: caption.slice(0, 120),
            status: 'waiting',
            payload: { action: 'publish_post', post_id: post.id },
            href: '/app/content',
            created_by: userId,
          })
        }

        return { ok: true, postId: post?.id, platforms: plats }
      },
    }),
  }
}
