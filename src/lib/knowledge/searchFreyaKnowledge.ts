import { createAdminClient } from '@/lib/supabase/admin'
import { FREYA_KNOWLEDGE_SOURCE } from '@/lib/knowledge/chunkKnowledge'

export type KnowledgeHit = {
  id: string
  source: string
  part: string | null
  heading: string | null
  content: string
  similarity: number
}

const EMBEDDING_MODEL = 'text-embedding-3-small'
const MIN_SIMILARITY = 0.22

export async function embedText(text: string): Promise<number[]> {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('OPENAI_API_KEY is required for knowledge embeddings')

  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text.slice(0, 8000),
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Embedding failed (${res.status}): ${err.slice(0, 200)}`)
  }

  const json = (await res.json()) as { data?: { embedding?: number[] }[] }
  const embedding = json.data?.[0]?.embedding
  if (!embedding?.length) throw new Error('Embedding response missing vector')
  return embedding
}

export async function searchFreyaKnowledge(
  query: string,
  opts?: { matchCount?: number; source?: string | null },
): Promise<{
  ok: boolean
  query: string
  hits: KnowledgeHit[]
  summary: string
}> {
  const q = query.trim()
  if (q.length < 3) {
    return { ok: false, query: q, hits: [], summary: 'Query too short.' }
  }

  const embedding = await embedText(q)
  const supabase = createAdminClient()
  const matchCount = opts?.matchCount ?? 6
  const filterSource = opts?.source === undefined ? FREYA_KNOWLEDGE_SOURCE : opts.source

  const { data, error } = await supabase.rpc('match_freya_knowledge', {
    query_embedding: embedding,
    match_count: matchCount,
    filter_source: filterSource,
  })

  if (error) {
    return {
      ok: false,
      query: q,
      hits: [],
      summary: `Knowledge search failed: ${error.message}`,
    }
  }

  const hits: KnowledgeHit[] = (data ?? [])
    .map((row: Record<string, unknown>) => ({
      id: String(row.id),
      source: String(row.source ?? ''),
      part: row.part != null ? String(row.part) : null,
      heading: row.heading != null ? String(row.heading) : null,
      content: String(row.content ?? ''),
      similarity: Number(row.similarity ?? 0),
    }))
    .filter((h: KnowledgeHit) => h.content && h.similarity >= MIN_SIMILARITY)

  if (!hits.length) {
    return {
      ok: true,
      query: q,
      hits: [],
      summary:
        'No confirmed product knowledge matched. Say you do not have that confirmed yet — do not invent score numbers or funding approvals.',
    }
  }

  const summary = hits
    .map((h, i) => {
      const label = [h.part, h.heading].filter(Boolean).join(' · ') || `Chunk ${i + 1}`
      return `### ${label}\n(similarity ${h.similarity.toFixed(2)})\n${h.content}`
    })
    .join('\n\n')

  return { ok: true, query: q, hits, summary }
}
