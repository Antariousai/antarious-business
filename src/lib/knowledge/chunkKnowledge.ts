/** Chunk Antarious Training Knowledge markdown into embeddable sections. */

export type KnowledgeChunkDraft = {
  part: string | null
  heading: string | null
  content: string
  tokenEstimate: number
}

const MAX_CHARS = 2800
const SOURCE_DEFAULT = 'antarious_training_knowledge_v1'

export const FREYA_KNOWLEDGE_SOURCE = SOURCE_DEFAULT

export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4))
}

/**
 * Split by # PART and ## headings. Merge tiny blocks; split oversized by paragraphs.
 */
export function chunkKnowledgeMarkdown(markdown: string): KnowledgeChunkDraft[] {
  const normalized = markdown.replace(/\r\n/g, '\n').trim()
  if (!normalized) return []

  const lines = normalized.split('\n')
  const sections: { part: string | null; heading: string | null; body: string[] }[] = []
  let part: string | null = null
  let heading: string | null = null
  let body: string[] = []

  const flush = () => {
    const text = body.join('\n').trim()
    if (!text) {
      body = []
      return
    }
    sections.push({ part, heading, body: [...body] })
    body = []
  }

  for (const line of lines) {
    const partMatch = line.match(/^#\s+(PART\s+\d+[A-Z]?)\b(.*)$/i)
    const h2Match = line.match(/^##\s+(.+)$/)
    if (partMatch) {
      flush()
      part = `${partMatch[1].toUpperCase()}${partMatch[2] || ''}`.trim()
      heading = part
      body.push(line)
      continue
    }
    if (h2Match) {
      flush()
      heading = h2Match[1].trim()
      body.push(line)
      continue
    }
    body.push(line)
  }
  flush()

  const drafts: KnowledgeChunkDraft[] = []
  for (const s of sections) {
    const text = s.body.join('\n').trim()
    if (text.length < 40) continue
    if (text.length <= MAX_CHARS) {
      drafts.push({
        part: s.part,
        heading: s.heading,
        content: text,
        tokenEstimate: estimateTokens(text),
      })
      continue
    }
    // Split large sections by blank lines
    const paras = text.split(/\n{2,}/)
    let buf = ''
    for (const p of paras) {
      const next = buf ? `${buf}\n\n${p}` : p
      if (next.length > MAX_CHARS && buf) {
        drafts.push({
          part: s.part,
          heading: s.heading,
          content: buf.trim(),
          tokenEstimate: estimateTokens(buf),
        })
        buf = p
      } else {
        buf = next
      }
    }
    if (buf.trim().length >= 40) {
      drafts.push({
        part: s.part,
        heading: s.heading,
        content: buf.trim(),
        tokenEstimate: estimateTokens(buf),
      })
    }
  }

  return drafts
}
