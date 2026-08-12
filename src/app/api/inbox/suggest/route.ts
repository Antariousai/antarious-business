import { generateText } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { requireOrgContext, jsonError } from '@/lib/org/context'
import { assertModuleAccess } from '@/lib/entitlements'
import { hasAiKey, resolveModel } from '@/lib/agents/model'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * AI suggest-only reply for inbox (never auto-sends).
 * Honors freya_preferences.inbox_ai_mode: off | suggest | auto (auto still requires human send).
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const ctx = await requireOrgContext(supabase)
    await assertModuleAccess(supabase, ctx.organizationId, 'messages')

    const body = await req.json()
    const threadId = String(body.threadId ?? '')
    if (!threadId) return Response.json({ error: 'threadId required' }, { status: 400 })

    const { data: prefs } = await supabase
      .from('freya_preferences')
      .select('inbox_ai_mode, tone')
      .eq('organization_id', ctx.organizationId)
      .maybeSingle()

    const mode = (prefs?.inbox_ai_mode as string) || 'suggest'
    if (mode === 'off') {
      return Response.json({ mode: 'off', suggestion: null, message: 'Inbox AI suggestions are off.' })
    }

    const { data: thread } = await supabase
      .from('inbox_threads')
      .select('id, contact_name, platform, subject')
      .eq('id', threadId)
      .eq('organization_id', ctx.organizationId)
      .maybeSingle()
    if (!thread) return Response.json({ error: 'Thread not found' }, { status: 404 })

    const { data: messages } = await supabase
      .from('inbox_messages')
      .select('kind, body, direction, sender_type, created_at')
      .eq('thread_id', threadId)
      .eq('organization_id', ctx.organizationId)
      .order('created_at', { ascending: false })
      .limit(12)

    const transcript = (messages ?? [])
      .reverse()
      .map((m) => {
        const who =
          m.kind === 'customer' || m.sender_type === 'customer'
            ? 'Customer'
            : m.kind === 'freya_draft'
              ? 'Draft'
              : 'Agent'
        return `${who}: ${m.body}`
      })
      .join('\n')

    let suggestion =
      'Thanks for reaching out! Happy to help — what would you like to know first?'

    if (hasAiKey()) {
      try {
        const { text } = await generateText({
          model: resolveModel(),
          prompt: [
            'Draft a short, helpful customer-support reply.',
            'Output reply text only — no quotes, no preamble.',
            `Tone: ${prefs?.tone || 'warm'}. Channel: ${thread.platform || 'instagram'}.`,
            'Do not make financial, legal, or refund commitments.',
            '',
            transcript || `Customer subject: ${thread.subject || '(new conversation)'}`,
          ].join('\n'),
        })
        if (text.trim()) suggestion = text.trim()
      } catch {
        // keep fallback copy
      }
    }

    const { data: draft, error } = await supabase
      .from('inbox_messages')
      .insert({
        thread_id: threadId,
        organization_id: ctx.organizationId,
        kind: 'freya_draft',
        body: suggestion,
        delivery_status: 'local_only',
        direction: 'outbound',
        sender_type: 'ai',
        created_by: ctx.user.id,
      })
      .select('*')
      .single()
    if (error) throw error

    await supabase.from('freya_activity_items').insert({
      organization_id: ctx.organizationId,
      kind: 'send_inbox_draft',
      title: 'Approve Freya reply',
      summary: suggestion.slice(0, 120),
      status: 'waiting',
      payload: { action: 'send_inbox_draft', message_id: draft.id, thread_id: threadId },
      href: '/app/inbox',
      created_by: ctx.user.id,
    })

    return Response.json({
      mode: 'suggest',
      autoSend: false,
      suggestion,
      message: draft,
      note: 'AUTO send is disabled. Human must approve before Meta delivery.',
    })
  } catch (err) {
    return jsonError(err)
  }
}
