/**
 * Ingest Antarious Freya Training Knowledge into Supabase pgvector.
 *
 * Usage:
 *   npm run knowledge:ingest
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY
 * (loaded from .env.local if present)
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  chunkKnowledgeMarkdown,
  FREYA_KNOWLEDGE_SOURCE,
} from '../src/lib/knowledge/chunkKnowledge'

const EMBEDDING_MODEL = 'text-embedding-3-small'
const BATCH = 32

function loadEnvLocal() {
  const path = resolve(process.cwd(), '.env.local')
  if (!existsSync(path)) return
  const text = readFileSync(path, 'utf8')
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 0) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val
  }
}

async function embedBatch(texts: string[], apiKey: string): Promise<number[][]> {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: texts.map((t) => t.slice(0, 8000)),
    }),
  })
  if (!res.ok) {
    throw new Error(`OpenAI embeddings ${res.status}: ${(await res.text()).slice(0, 300)}`)
  }
  const json = (await res.json()) as {
    data: { index: number; embedding: number[] }[]
  }
  const sorted = [...json.data].sort((a, b) => a.index - b.index)
  return sorted.map((d) => d.embedding)
}

function assertServiceRoleKey(key: string) {
  const parts = key.split('.')
  if (parts.length < 2) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY does not look like a JWT')
  }
  try {
    const json = Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString(
      'utf8',
    )
    const payload = JSON.parse(json) as { role?: string }
    if (payload.role !== 'service_role') {
      throw new Error(
        `SUPABASE_SERVICE_ROLE_KEY must be the service_role secret from Supabase → Settings → API (got JWT role="${payload.role ?? 'unknown'}"). You currently have the anon key — replace it, then re-run npm run knowledge:ingest.`,
      )
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes('service_role')) throw e
    throw new Error('Could not decode SUPABASE_SERVICE_ROLE_KEY JWT')
  }
}

async function main() {
  loadEnvLocal()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const openaiKey = process.env.OPENAI_API_KEY
  if (!url || !serviceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  assertServiceRoleKey(serviceKey)
  if (!openaiKey) throw new Error('Missing OPENAI_API_KEY')

  const mdPath = resolve(
    process.cwd(),
    'docs/knowledge/Antarious_Freya_Training_Knowledge.md',
  )
  if (!existsSync(mdPath)) {
    throw new Error(`Knowledge file not found: ${mdPath}`)
  }

  const markdown = readFileSync(mdPath, 'utf8')
  const chunks = chunkKnowledgeMarkdown(markdown)
  console.log(`Chunked ${chunks.length} sections from Training Knowledge`)

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { error: delErr } = await supabase
    .from('freya_knowledge_chunks')
    .delete()
    .eq('source', FREYA_KNOWLEDGE_SOURCE)
  if (delErr) {
    throw new Error(
      `Delete old chunks failed (${delErr.message}). Apply migration 20260806120000_freya_knowledge_vectors.sql first.`,
    )
  }

  let inserted = 0
  for (let i = 0; i < chunks.length; i += BATCH) {
    const slice = chunks.slice(i, i + BATCH)
    const embeddings = await embedBatch(
      slice.map((c) => c.content),
      openaiKey,
    )
    const rows = slice.map((c, j) => ({
      source: FREYA_KNOWLEDGE_SOURCE,
      part: c.part,
      heading: c.heading,
      content: c.content,
      token_estimate: c.tokenEstimate,
      embedding: embeddings[j],
    }))
    const { error } = await supabase.from('freya_knowledge_chunks').insert(rows)
    if (error) throw new Error(`Insert failed at offset ${i}: ${error.message}`)
    inserted += rows.length
    console.log(`Inserted ${inserted}/${chunks.length}`)
  }

  console.log(`Done. source=${FREYA_KNOWLEDGE_SOURCE} chunks=${inserted}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
