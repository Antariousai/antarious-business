import { hasSupabaseEnv } from './mode'

export type FreyaChatMessage = {
  id: string
  role: 'freya' | 'you'
  text: string
}

export type FreyaChatResult = {
  text: string
  navigatePath?: string
  openActivity?: boolean
  offline?: boolean
}

type StreamChunk = {
  type?: string
  delta?: string
  toolName?: string
  output?: unknown
  errorText?: string
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

function applyToolOutput(
  toolName: string | undefined,
  output: unknown,
  acc: { navigatePath?: string; openActivity?: boolean },
) {
  if (!toolName) return
  if (toolName === 'navigate_hint' && output && typeof output === 'object') {
    const path = (output as { path?: string }).path
    if (path) acc.navigatePath = path
  }
  if (toolName === 'open_activity') {
    acc.openActivity = true
  }
}

/** POST /api/freya/chat — streams UI message SSE when AI key is set; JSON stub otherwise. */
export async function streamFreyaChat(
  history: FreyaChatMessage[],
  onDelta?: (text: string) => void,
  signal?: AbortSignal,
): Promise<FreyaChatResult> {
  if (!hasSupabaseEnv()) {
    throw new Error('Supabase env not configured')
  }

  const messages = history.map((m) => ({
    id: m.id,
    role: m.role === 'you' ? 'user' : 'assistant',
    parts: [{ type: 'text' as const, text: m.text }],
  }))

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
    const text = data.content ?? data.error ?? 'Hmm, I blanked for a second — try again?'
    onDelta?.(text)
    return { text, offline: Boolean(data.offline) }
  }

  if (!res.body) {
    return { text: 'No response from Freya.' }
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let text = ''
  const meta: { navigatePath?: string; openActivity?: boolean } = {}
  const toolNames = new Map<string, string>()

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
        text += chunk.delta
        onDelta?.(text)
      }
      if (chunk.type === 'error' && chunk.errorText) {
        throw new Error(chunk.errorText)
      }
      if (
        (chunk.type === 'tool-input-available' || chunk.type === 'tool-input-start') &&
        chunk.toolCallId &&
        chunk.toolName
      ) {
        toolNames.set(chunk.toolCallId, chunk.toolName)
      }
      if (chunk.type === 'tool-output-available') {
        const name =
          chunk.toolName ?? (chunk.toolCallId ? toolNames.get(chunk.toolCallId) : undefined)
        applyToolOutput(name, chunk.output, meta)
      }
    }
  }

  return { text: text || 'Done.', ...meta }
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
