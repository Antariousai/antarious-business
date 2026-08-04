import { hasSupabaseEnv } from './mode'

export type FreyaChatMessage = {
  id: string
  role: 'freya' | 'you'
  text: string
}

export type FreyaRefreshModule =
  | 'activity'
  | 'content'
  | 'inbox'
  | 'leads'
  | 'campaigns'
  | 'money'
  | 'crm'
  | 'profile'

/** Structured deliverable shown as its own block in Freya chat. */
export type FreyaOutputCard = {
  id: string
  kind: string
  title: string
  body: string
  meta?: string
  path?: string
}

export type FreyaChatResult = {
  text: string
  /** Result / deliverable blocks (caption, lead, invoice…)。 */
  cards?: FreyaOutputCard[]
  /** Trailing question peeled off from `text` when present. */
  followUp?: string
  navigatePath?: string
  focusPostId?: string
  openActivity?: boolean
  refreshModules?: FreyaRefreshModule[]
  offline?: boolean
}

export type FreyaStreamHandlers = {
  onDelta?: (text: string) => void
  onStatus?: (status: string) => void
}

type StreamChunk = {
  type?: string
  delta?: string
  toolName?: string
  output?: unknown
  errorText?: string
}

type ToolMeta = {
  navigatePath?: string
  openActivity?: boolean
  focusPostId?: string
  refreshModules: Set<FreyaRefreshModule>
  cards: FreyaOutputCard[]
}

const TOOL_STATUS: Record<string, string> = {
  draft_caption: 'Sketching a caption…',
  suggest_platforms: 'Picking channels…',
  suggest_tag: 'Choosing a tag…',
  create_post_draft: 'Drafting your post…',
  update_post_draft: 'Updating the draft…',
  schedule_post: 'Scheduling the post…',
  list_posts: 'Checking your posts…',
  list_threads: 'Looking at your inbox…',
  summarize_thread: 'Reading the conversation…',
  draft_reply: 'Drafting a reply…',
  list_leads: 'Checking interested people…',
  create_lead: 'Saving a lead…',
  update_lead_stage: 'Updating the lead…',
  list_deals: 'Checking the pipeline…',
  create_deal: 'Adding a deal…',
  suggest_next_step: 'Suggesting a next step…',
  list_invoices: 'Checking invoices…',
  draft_invoice: 'Drafting an invoice…',
  draft_bill: 'Drafting a bill…',
  remind_invoice: 'Queuing a reminder…',
  list_campaigns: 'Checking campaigns…',
  create_campaign_draft: 'Planning a campaign…',
  update_campaign_status: 'Updating the campaign…',
  workspace_status: 'Checking your workspace…',
  navigate_hint: 'Opening the right screen…',
  open_activity: 'Opening activity…',
  approve_waiting: 'Checking what’s waiting…',
  get_business_profile: 'Checking your business details…',
  update_business_profile: 'Updating your business profile…',
}

export function statusForTool(toolName: string | undefined): string {
  if (!toolName) return 'Working on it…'
  return TOOL_STATUS[toolName] ?? 'Working on it…'
}

/**
 * Freya should not show em/en dashes in owner-facing chat.
 * Turns “Done — I saved…” into “Done. I saved…”.
 */
export function sanitizeFreyaPunctuation(text: string): string {
  return text
    .replace(/\s*[\u2014\u2013]\s*/g, '. ')
    .replace(/\.\s+\./g, '.')
    .replace(/([.!?])\s*\./g, '$1')
    .replace(/ {2,}/g, ' ')
}

/**
 * Peel a trailing follow-up question into its own string so the chat can
 * render deliverable + question as separate bubbles.
 */
export function splitFreyaReply(text: string): { body: string; followUp?: string } {
  const trimmed = sanitizeFreyaPunctuation(text).trim()
  if (!trimmed) return { body: '' }

  const parts = trimmed.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
  if (parts.length >= 2) {
    const last = parts[parts.length - 1]
    if (/[?？]\s*$/.test(last) || /^(want|shall|should|need|ready|ok if|can i|could i|how about)\b/i.test(last)) {
      return { body: parts.slice(0, -1).join('\n\n'), followUp: last }
    }
  }

  // Single block: last sentence is a question and there's content before it.
  const sentenceMatch = trimmed.match(/^([\s\S]+?[.!]["']?)\s+((?:Want|Shall|Should|Need|Ready|Ok if|Can I|Could I|How about|Anything else)[\s\S]*\?)\s*$/i)
  if (sentenceMatch) {
    return { body: sentenceMatch[1].trim(), followUp: sentenceMatch[2].trim() }
  }

  const lines = trimmed.split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length >= 2) {
    const last = lines[lines.length - 1]
    if (/[?？]\s*$/.test(last)) {
      return { body: lines.slice(0, -1).join('\n'), followUp: last }
    }
  }

  return { body: trimmed }
}

function extractTextFromParts(parts: unknown): string {
  if (!Array.isArray(parts)) return ''
  return parts
    .map((p) => {
      if (p && typeof p === 'object' && 'type' in p && (p as { type: string }).type === 'text') {
        return String((p as { text?: string }).text ?? '')
      }
      return ''
    })
    .join('')
}

function isOk(output: unknown): boolean {
  if (!output || typeof output !== 'object') return true
  const o = output as { ok?: boolean }
  return o.ok !== false
}

function markRefresh(acc: ToolMeta, ...modules: FreyaRefreshModule[]) {
  for (const m of modules) acc.refreshModules.add(m)
}

function str(v: unknown, max = 400): string {
  if (v == null) return ''
  const s = String(v).trim()
  if (s.length <= max) return s
  return `${s.slice(0, max - 1)}…`
}

function pushCard(acc: ToolMeta, card: Omit<FreyaOutputCard, 'id'>) {
  acc.cards.push({ ...card, id: `card-${acc.cards.length + 1}-${Date.now()}` })
}

function buildCardFromTool(toolName: string, output: unknown, acc: ToolMeta) {
  if (!output || typeof output !== 'object') return
  const o = output as Record<string, unknown>
  if (o.ok === false) {
    pushCard(acc, {
      kind: 'error',
      title: o.code === 'PLAN' ? 'Upgrade needed' : 'Couldn’t finish that',
      body: str(o.error || 'Something went wrong.', 220),
      path: typeof o.path === 'string' ? o.path : undefined,
    })
    return
  }

  switch (toolName) {
    case 'create_post_draft':
    case 'update_post_draft':
    case 'schedule_post': {
      const caption = str(o.caption || o.message || 'Draft saved under Posts.', 480)
      pushCard(acc, {
        kind: 'post',
        title:
          toolName === 'schedule_post'
            ? 'Post scheduled'
            : toolName === 'update_post_draft'
              ? 'Post updated'
              : 'Post draft ready',
        body: caption,
        meta: Array.isArray(o.platforms) ? o.platforms.map(String).join(' · ') : 'Posts → Drafts',
        path: typeof o.path === 'string' ? o.path : '/app/content',
      })
      break
    }
    case 'list_posts': {
      const posts = Array.isArray(o.posts) ? o.posts : []
      const lines = posts.slice(0, 5).map((p) => {
        const row = p as { title?: string; status?: string; caption?: string }
        return `• ${str(row.title || row.caption || 'Untitled', 48)} (${row.status || 'draft'})`
      })
      pushCard(acc, {
        kind: 'list',
        title: posts.length ? `${posts.length} post${posts.length === 1 ? '' : 's'}` : 'No posts found',
        body: lines.join('\n') || 'Nothing matched.',
        path: '/app/content',
      })
      break
    }
    case 'draft_reply':
      pushCard(acc, {
        kind: 'reply',
        title: 'Reply draft waiting for approval',
        body: str(o.body || o.message || 'Draft saved in Inbox — approve to send.', 480),
        meta: 'Inbox · Freya Activity',
        path: typeof o.path === 'string' ? o.path : '/app/inbox',
      })
      break
    case 'summarize_thread':
      pushCard(acc, {
        kind: 'summary',
        title: 'Thread summary',
        body: str(o.summary || '', 360),
        path: '/app/inbox',
      })
      break
    case 'list_threads': {
      const threads = Array.isArray(o.threads) ? o.threads : []
      const lines = threads.slice(0, 5).map((t) => {
        const row = t as { contact_name?: string; subject?: string; platform?: string }
        return `• ${str(row.contact_name || 'Contact', 40)} — ${str(row.subject || row.platform || 'thread', 48)}`
      })
      pushCard(acc, {
        kind: 'list',
        title: threads.length ? 'Open conversations' : 'No open threads',
        body: lines.join('\n') || 'Inbox is clear.',
        path: '/app/inbox',
      })
      break
    }
    case 'create_lead':
    case 'update_lead_stage': {
      const lead = (o.lead as Record<string, unknown> | undefined) || o
      pushCard(acc, {
        kind: 'lead',
        title: toolName === 'create_lead' ? 'Lead saved' : 'Lead updated',
        body: str(lead.name || o.name || o.leadId || 'Lead', 80),
        meta: str(lead.stage || o.stage || lead.company || 'Interested people', 60),
        path: typeof o.path === 'string' ? o.path : '/app/leads',
      })
      break
    }
    case 'list_leads': {
      const leads = Array.isArray(o.leads) ? o.leads : []
      const lines = leads.slice(0, 5).map((l) => {
        const row = l as { name?: string; stage?: string; company?: string }
        return `• ${str(row.name, 40)}${row.company ? ` · ${str(row.company, 28)}` : ''} (${row.stage || 'new'})`
      })
      pushCard(acc, {
        kind: 'list',
        title: leads.length ? `${leads.length} lead${leads.length === 1 ? '' : 's'}` : 'No leads yet',
        body: lines.join('\n') || 'Nothing matched.',
        path: '/app/leads',
      })
      break
    }
    case 'create_deal':
    case 'suggest_next_step': {
      pushCard(acc, {
        kind: 'deal',
        title: toolName === 'create_deal' ? 'Deal added' : 'Next step set',
        body: str(o.nextStep || o.title || o.dealId || 'Saved to pipeline', 200),
        path: typeof o.path === 'string' ? o.path : '/app/pipeline',
      })
      break
    }
    case 'list_deals': {
      const deals = Array.isArray(o.deals) ? o.deals : []
      const lines = deals.slice(0, 5).map((d) => {
        const row = d as { title?: string; stage?: string; value_bdt?: number }
        return `• ${str(row.title, 40)} — ${row.stage || 'open'}${row.value_bdt != null ? ` · ৳${row.value_bdt}` : ''}`
      })
      pushCard(acc, {
        kind: 'list',
        title: deals.length ? 'Pipeline' : 'No deals yet',
        body: lines.join('\n') || 'Pipeline is empty.',
        path: '/app/pipeline',
      })
      break
    }
    case 'draft_invoice':
    case 'draft_bill':
      pushCard(acc, {
        kind: 'money',
        title: toolName === 'draft_bill' ? 'Bill drafted' : 'Invoice drafted',
        body: str(o.message || `Saved as draft in Money.`, 160),
        meta: o.invoiceId || o.billId ? `ID · ${str(o.invoiceId || o.billId, 36)}` : undefined,
        path: typeof o.path === 'string' ? o.path : '/app/money',
      })
      break
    case 'list_invoices': {
      const invoices = Array.isArray(o.invoices) ? o.invoices : []
      const lines = invoices.slice(0, 5).map((inv) => {
        const row = inv as { number?: string; status?: string; total_bdt?: number }
        return `• ${str(row.number, 24)} — ${row.status || 'draft'}${row.total_bdt != null ? ` · ৳${row.total_bdt}` : ''}`
      })
      pushCard(acc, {
        kind: 'list',
        title: invoices.length ? 'Invoices' : 'No invoices',
        body: lines.join('\n') || 'Nothing matched.',
        path: '/app/money',
      })
      break
    }
    case 'remind_invoice':
      pushCard(acc, {
        kind: 'money',
        title: 'Reminder queued',
        body: 'Waiting in Freya Activity for your OK before anything goes out.',
        path: typeof o.path === 'string' ? o.path : '/app/money',
      })
      break
    case 'create_campaign_draft':
    case 'update_campaign_status':
      pushCard(acc, {
        kind: 'campaign',
        title: toolName === 'create_campaign_draft' ? 'Campaign draft ready' : 'Campaign updated',
        body: str(o.message || o.title || 'Saved under Campaigns.', 200),
        path: typeof o.path === 'string' ? o.path : '/app/campaigns',
      })
      break
    case 'list_campaigns': {
      const campaigns = Array.isArray(o.campaigns) ? o.campaigns : []
      const lines = campaigns.slice(0, 5).map((c) => {
        const row = c as { title?: string; status?: string }
        return `• ${str(row.title, 48)} (${row.status || 'draft'})`
      })
      pushCard(acc, {
        kind: 'list',
        title: campaigns.length ? 'Campaigns' : 'No campaigns yet',
        body: lines.join('\n') || 'Nothing matched.',
        path: '/app/campaigns',
      })
      break
    }
    case 'update_business_profile': {
      const updated = Array.isArray(o.updated) ? o.updated.map(String) : []
      const prof = (o.profile as Record<string, unknown> | undefined) || {}
      const lines = updated.length
        ? updated.map((key) => {
            const val = prof[key]
            return `• ${key}: ${str(Array.isArray(val) ? val.join(', ') : val ?? 'updated', 80)}`
          })
        : [str(o.message || 'Profile updated.', 200)]
      pushCard(acc, {
        kind: 'profile',
        title: 'Profile updated',
        body: lines.join('\n'),
        path: typeof o.path === 'string' ? o.path : '/app/settings',
      })
      break
    }
    case 'get_business_profile': {
      const prof = (o.profile as Record<string, unknown> | undefined) || {}
      const lines = [
        `Business: ${str(prof.businessName || '—', 60)}`,
        `Industry: ${str(prof.industry || '—', 60)}`,
        `Serves: ${str(prof.customers || '—', 80)}`,
        `Goals: ${Array.isArray(prof.goals) ? prof.goals.join(', ') || '—' : '—'}`,
        `Channels: ${Array.isArray(prof.platforms) ? prof.platforms.join(', ') || '—' : '—'}`,
      ]
      pushCard(acc, {
        kind: 'profile',
        title: 'Your business profile',
        body: lines.join('\n'),
        path: '/app/settings',
      })
      break
    }
    default:
      break
  }
}

function applyToolOutput(toolName: string | undefined, output: unknown, acc: ToolMeta) {
  if (!toolName) return
  const o = (output && typeof output === 'object' ? output : {}) as {
    path?: string
    postId?: string
    pendingApproval?: boolean
    code?: string
    ok?: boolean
  }

  buildCardFromTool(toolName, output, acc)

  // Plan-gated tools: send them to Settings when upgrade is required.
  if (o.ok === false && o.code === 'PLAN') {
    acc.navigatePath = o.path || '/app/settings'
    return
  }

  if (!isOk(output)) return

  if (toolName === 'navigate_hint' && o.path) {
    acc.navigatePath = o.path
  }
  if (toolName === 'open_activity') {
    acc.openActivity = true
    markRefresh(acc, 'activity')
  }
  if (toolName === 'approve_waiting' || toolName === 'workspace_status') {
    markRefresh(acc, 'activity')
  }

  if (toolName === 'create_post_draft' && o.postId) {
    acc.focusPostId = o.postId
    acc.navigatePath = o.path || '/app/content'
    acc.openActivity = true
    markRefresh(acc, 'content', 'activity')
  }
  if (toolName === 'update_post_draft' || toolName === 'schedule_post') {
    if (o.postId) acc.focusPostId = o.postId
    acc.navigatePath = o.path || '/app/content'
    if (o.pendingApproval || toolName === 'schedule_post') acc.openActivity = true
    markRefresh(acc, 'content', 'activity')
  }
  if (toolName === 'list_posts') {
    markRefresh(acc, 'content')
  }

  if (toolName === 'draft_reply') {
    acc.navigatePath = o.path || '/app/inbox'
    acc.openActivity = true
    markRefresh(acc, 'inbox', 'activity')
  }
  if (toolName === 'list_threads' || toolName === 'summarize_thread') {
    markRefresh(acc, 'inbox')
  }

  if (toolName === 'create_lead' || toolName === 'update_lead_stage') {
    acc.navigatePath = o.path || '/app/leads'
    markRefresh(acc, 'leads')
  }
  if (toolName === 'list_leads') {
    markRefresh(acc, 'leads')
  }

  if (
    toolName === 'create_deal' ||
    toolName === 'suggest_next_step' ||
    toolName === 'list_deals'
  ) {
    if (toolName !== 'list_deals') acc.navigatePath = o.path || '/app/pipeline'
    markRefresh(acc, 'crm')
  }

  if (
    toolName === 'draft_invoice' ||
    toolName === 'draft_bill' ||
    toolName === 'remind_invoice' ||
    toolName === 'list_invoices'
  ) {
    if (toolName !== 'list_invoices') acc.navigatePath = o.path || '/app/money'
    if (toolName === 'remind_invoice' || o.pendingApproval) acc.openActivity = true
    markRefresh(acc, 'money', ...(o.pendingApproval ? (['activity'] as const) : []))
  }

  if (
    toolName === 'create_campaign_draft' ||
    toolName === 'update_campaign_status' ||
    toolName === 'list_campaigns'
  ) {
    if (toolName !== 'list_campaigns') acc.navigatePath = o.path || '/app/campaigns'
    markRefresh(acc, 'campaigns')
  }

  if (toolName === 'update_business_profile' || toolName === 'get_business_profile') {
    if (toolName === 'update_business_profile') markRefresh(acc, 'profile')
  }
}

/** POST /api/freya/chat — streams UI message SSE when AI key is set; JSON stub otherwise. */
export async function streamFreyaChat(
  history: FreyaChatMessage[],
  onDeltaOrHandlers?: ((text: string) => void) | FreyaStreamHandlers,
  signal?: AbortSignal,
): Promise<FreyaChatResult> {
  const handlers: FreyaStreamHandlers =
    typeof onDeltaOrHandlers === 'function'
      ? { onDelta: onDeltaOrHandlers }
      : onDeltaOrHandlers ?? {}

  if (!hasSupabaseEnv()) {
    throw new Error('Supabase env not configured')
  }

  const messages = history.map((m) => ({
    id: m.id,
    role: m.role === 'you' ? 'user' : 'assistant',
    parts: [{ type: 'text' as const, text: m.text }],
  }))

  handlers.onStatus?.('Looking at what you need…')

  const res = await fetch('/api/freya/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ messages }),
    signal,
  })

  const contentType = res.headers.get('content-type') ?? ''

  if (!res.ok) {
    const errBody = contentType.includes('json')
      ? await res.json().catch(() => ({}))
      : {}
    const message =
      errBody && typeof errBody === 'object' && 'error' in errBody
        ? String((errBody as { error: unknown }).error)
        : `Freya chat failed (${res.status})`
    throw new Error(message)
  }

  if (contentType.includes('application/json')) {
    const data = (await res.json()) as {
      content?: string
      offline?: boolean
      error?: string
    }
    const text = data.content ?? data.error ?? 'Hmm, I blanked for a second. Try again?'
    const split = splitFreyaReply(text)
    handlers.onDelta?.(split.body || text)
    return {
      text: split.body || text,
      followUp: split.followUp,
      offline: Boolean(data.offline),
    }
  }

  if (!res.body) {
    return { text: 'No response from Freya.' }
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let text = ''
  const meta: ToolMeta = { refreshModules: new Set(), cards: [] }
  const toolNames = new Map<string, string>()
  let sawTool = false

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const payload = trimmed.slice(5).trim()
      if (!payload || payload === '[DONE]') continue
      let chunk: StreamChunk & { toolCallId?: string }
      try {
        chunk = JSON.parse(payload) as StreamChunk & { toolCallId?: string }
      } catch {
        continue
      }
      if (chunk.type === 'text-delta' && chunk.delta) {
        if (!text) handlers.onStatus?.('Writing your reply…')
        text += chunk.delta
        handlers.onDelta?.(sanitizeFreyaPunctuation(text))
      }
      if (chunk.type === 'error' && chunk.errorText) {
        throw new Error(chunk.errorText)
      }
      if (
        (chunk.type === 'tool-input-available' ||
          chunk.type === 'tool-input-start' ||
          chunk.type === 'tool-call' ||
          chunk.type === 'tool-call-streaming-start') &&
        chunk.toolName
      ) {
        if (chunk.toolCallId) toolNames.set(chunk.toolCallId, chunk.toolName)
        sawTool = true
        handlers.onStatus?.(statusForTool(chunk.toolName))
      }
      if (chunk.type === 'tool-output-available') {
        const name =
          chunk.toolName ?? (chunk.toolCallId ? toolNames.get(chunk.toolCallId) : undefined)
        if (name) handlers.onStatus?.(statusForTool(name).replace('…', '. Done. Wrapping up…'))
        applyToolOutput(name, chunk.output, meta)
      }
    }
  }

  if (sawTool && !text) handlers.onStatus?.('Almost done…')

  const split = splitFreyaReply(text || (meta.cards.length ? 'Here’s what I did.' : 'Done.'))

  // Prefer tool-returned caption on post cards when tool didn’t embed it.
  return {
    text: split.body || text || 'Done.',
    followUp: split.followUp,
    cards: meta.cards.length ? meta.cards : undefined,
    navigatePath: meta.navigatePath,
    focusPostId: meta.focusPostId,
    openActivity: meta.openActivity,
    refreshModules: [...meta.refreshModules],
  }
}

export async function approveFreyaActivities(opts: {
  ids?: string[]
  id?: string
  approveAll?: boolean
}): Promise<{ ok: boolean; results?: unknown[] }> {
  const res = await fetch('/api/freya/approve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(opts),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(
      data && typeof data === 'object' && 'error' in data
        ? String((data as { error: unknown }).error)
        : 'Approve failed',
    )
  }
  return data as { ok: boolean; results?: unknown[] }
}

/** Collect plain text from a finished UI message-like object (offline helpers). */
export function messageText(msg: { content?: string; parts?: unknown }): string {
  if (msg.content) return msg.content
  return extractTextFromParts(msg.parts)
}
