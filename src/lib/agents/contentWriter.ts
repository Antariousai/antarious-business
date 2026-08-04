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
        'Optional helper to sketch a caption idea. Prefer writing the final caption yourself in create_post_draft.caption (2–4 short sentences, on-brand for this business).',
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
            ? 'Save this and message us when you’re ready — happy to help you choose.'
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
      description:
        'Save a draft post to Posts → Drafts for this business. Write a complete mid-length caption yourself (2–4 short sentences) using the business industry/customers/goals. Always call this when the owner asks you to draft a post. Returns postId so they can open it.',
      inputSchema: z.object({
        caption: z
          .string()
          .min(12)
          .describe('Full post caption Freya wrote — ready for the owner to review'),
        title: z.string().optional(),
        platforms: z
          .array(z.string())
          .optional()
          .describe('e.g. Facebook, Instagram — defaults if omitted'),
        tag: z.string().optional(),
      }),
      execute: async ({ caption, title, platforms, tag }) => {
        const plats =
          platforms?.length && platforms.some((p) => p.trim())
            ? platforms.map((p) => p.trim()).filter(Boolean)
            : ['Facebook', 'Instagram']

        const { data: post, error } = await supabase
          .from('content_posts')
          .insert({
            organization_id: organizationId,
            caption: caption.trim(),
            title: title?.trim() || caption.trim().slice(0, 48),
            tag: tag?.trim() || 'Promo',
            status: 'draft',
            scheduled_at: null,
            created_by: userId,
          })
          .select('id, caption, status, title, tag')
          .single()

        if (error || !post) {
          return { ok: false, error: error?.message ?? 'Could not create draft' }
        }

        const { error: platError } = await supabase.from('content_post_platforms').insert(
          plats.map((platform) => ({ post_id: post.id, platform })),
        )
        if (platError) {
          return {
            ok: false,
            error: platError.message,
            postId: post.id,
          }
        }

        await supabase.from('freya_activity_items').insert({
          organization_id: organizationId,
          kind: 'publish_post',
          title: 'Review post draft',
          summary: caption.trim().slice(0, 120),
          status: 'waiting',
          payload: { action: 'publish_post', post_id: post.id },
          href: '/app/content',
          created_by: userId,
        })

        return {
          ok: true,
          postId: post.id,
          status: 'draft',
          platforms: plats,
          path: '/app/content',
          message: 'Draft saved under Posts → Drafts. Owner should review before publishing.',
        }
      },
    }),
  }
}
