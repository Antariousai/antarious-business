import { tool } from 'ai'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { gateCreateInput } from './createInputPolicy'

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

    list_posts: tool({
      description:
        'List content posts for this business. Filter by status (draft, scheduled, published) to answer “what drafts do I have?”.',
      inputSchema: z.object({
        status: z.enum(['draft', 'scheduled', 'published']).optional(),
        limit: z.number().min(1).max(30).optional(),
      }),
      execute: async ({ status, limit }) => {
        let query = supabase
          .from('content_posts')
          .select(
            'id, title, caption, tag, status, scheduled_at, published_at, created_at, content_post_platforms(platform)',
          )
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false })
          .limit(limit ?? 10)
        if (status) query = query.eq('status', status)
        const { data, error } = await query
        if (error) return { ok: false, error: error.message }
        return {
          ok: true,
          posts: (data ?? []).map((p) => ({
            id: p.id,
            title: p.title,
            caption: (p.caption ?? '').slice(0, 160),
            tag: p.tag,
            status: p.status,
            scheduledAt: p.scheduled_at,
            platforms: (
              (p as { content_post_platforms?: { platform: string }[] }).content_post_platforms ??
              []
            ).map((x) => x.platform),
          })),
        }
      },
    }),

    update_post_draft: tool({
      description:
        'Edit an existing draft post (caption, title, tag, platforms, or schedule). Call only with a real postId from list_posts. If unclear which post, ask — do not invent an id. Only touches drafts unless scheduling.',
      inputSchema: z.object({
        postId: z.string(),
        caption: z.string().optional(),
        title: z.string().optional(),
        tag: z.string().optional(),
        platforms: z.array(z.string()).optional(),
        scheduledAt: z
          .string()
          .optional()
          .describe('ISO datetime if scheduling; leave null/omit to clear'),
      }),
      execute: async ({ postId, caption, title, tag, platforms, scheduledAt }) => {
        const need = gateCreateInput('update_post_draft', {
          postId,
          caption,
          title,
          tag,
          platforms,
          scheduledAt,
        })
        if (need) return need
        const { data: existing } = await supabase
          .from('content_posts')
          .select('id, status')
          .eq('id', postId)
          .eq('organization_id', organizationId)
          .maybeSingle()
        if (!existing) return { ok: false, error: 'Post not found' }
        if (existing.status !== 'draft' && existing.status !== 'scheduled') {
          return { ok: false, error: 'Only draft or scheduled posts can be edited via Freya' }
        }

        const patch: Record<string, unknown> = {}
        if (caption !== undefined) patch.caption = caption.trim()
        if (title !== undefined) patch.title = title.trim()
        if (tag !== undefined) patch.tag = tag.trim()
        if (scheduledAt !== undefined) {
          patch.scheduled_at = scheduledAt || null
          patch.status = scheduledAt ? 'scheduled' : 'draft'
        }

        if (Object.keys(patch).length) {
          const { error } = await supabase
            .from('content_posts')
            .update(patch)
            .eq('id', postId)
            .eq('organization_id', organizationId)
          if (error) return { ok: false, error: error.message }
        }

        if (platforms?.length) {
          await supabase.from('content_post_platforms').delete().eq('post_id', postId)
          await supabase.from('content_post_platforms').insert(
            platforms.map((platform) => ({ post_id: postId, platform: platform.trim() })),
          )
        }

        return {
          ok: true,
          postId,
          path: '/app/content',
          message: 'Post updated. Waiting for your OK before anything is treated as published.',
        }
      },
    }),

    schedule_post: tool({
      description:
        'Set a schedule time on a draft and queue publish approval. Call only with a real postId from list_posts and a scheduledAt the owner stated. If missing, do not invent — ask. Say scheduled in the app / waiting for your OK — never posted, published, or it will go out automatically. Owner must Approve in Freya Activity.',
      inputSchema: z.object({
        postId: z.string(),
        scheduledAt: z.string().describe('ISO datetime when the post should go live'),
      }),
      execute: async ({ postId, scheduledAt }) => {
        const need = gateCreateInput('schedule_post', { postId, scheduledAt })
        if (need) return need
        const { data: post, error } = await supabase
          .from('content_posts')
          .update({
            scheduled_at: scheduledAt,
            status: 'scheduled',
          })
          .eq('id', postId)
          .eq('organization_id', organizationId)
          .in('status', ['draft', 'scheduled'])
          .select('id, caption, status')
          .maybeSingle()
        if (error) return { ok: false, error: error.message }
        if (!post) return { ok: false, error: 'Draft/scheduled post not found' }

        const { data: waiting } = await supabase
          .from('freya_activity_items')
          .select('id, payload')
          .eq('organization_id', organizationId)
          .eq('status', 'waiting')
          .eq('kind', 'publish_post')
          .limit(40)

        const alreadyQueued = (waiting ?? []).some((item) => {
          const payload = item.payload as { post_id?: string } | null
          return payload?.post_id === postId
        })

        if (!alreadyQueued) {
          await supabase.from('freya_activity_items').insert({
            organization_id: organizationId,
            kind: 'publish_post',
            title: 'Approve scheduled publish',
            summary: (post.caption ?? '').slice(0, 120),
            status: 'waiting',
            payload: { action: 'publish_post', post_id: post.id, scheduled_at: scheduledAt },
            href: '/app/content',
            created_by: userId,
          })
        }

        return {
          ok: true,
          postId: post.id,
          status: 'scheduled',
          pendingApproval: true,
          path: '/app/content',
          message: 'Scheduled in the app. Waiting for your OK before it is treated as published.',
        }
      },
    }),

    create_post_draft: tool({
      description:
        'Save a draft post under Posts → Drafts and queue it waiting for owner OK. Call only when the owner gave a topic (or you already asked and they answered). Write a complete caption (2–4 short sentences). Pass topic when known. If missing topic, do not invent — ask. Say drafted / waiting for your OK — never posted, published, or went live.',
      inputSchema: z.object({
        caption: z
          .string()
          .min(12)
          .describe('Full post caption Freya wrote — ready for the owner to review'),
        topic: z
          .string()
          .optional()
          .describe('Subject/theme the owner asked for (grounds the caption)'),
        title: z.string().optional(),
        platforms: z
          .array(z.string())
          .optional()
          .describe('e.g. Facebook, Instagram — defaults if omitted'),
        tag: z.string().optional(),
      }),
      execute: async ({ caption, topic, title, platforms, tag }) => {
        const need = gateCreateInput('create_post_draft', {
          caption,
          topic,
          title,
          platforms,
          tag,
        })
        if (need) return need

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
          caption: caption.trim(),
          title: post.title,
          platforms: plats,
          path: '/app/content',
          pendingApproval: true,
          message: 'Draft saved under Posts → Drafts. Waiting for your OK before anything is treated as published.',
        }
      },
    }),
  }
}
