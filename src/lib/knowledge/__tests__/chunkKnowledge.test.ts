import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  chunkKnowledgeMarkdown,
  estimateTokens,
  FREYA_KNOWLEDGE_SOURCE,
} from '../chunkKnowledge'

describe('chunkKnowledgeMarkdown', () => {
  it('estimates tokens roughly by character length', () => {
    expect(estimateTokens('abcd')).toBe(1)
    expect(estimateTokens('a'.repeat(400))).toBe(100)
  })

  it('splits PART and ## headings into separate chunks', () => {
    const md = `
# PART 1 — Overview
Intro paragraph about Antarious Business.

## Plans
Starter Growth Scale details.

# PART 2 — Credit Score
Score is 0 to 100.
`.trim()
    const chunks = chunkKnowledgeMarkdown(md)
    expect(chunks.length).toBeGreaterThanOrEqual(2)
    expect(chunks.some((c) => c.part?.includes('PART 1'))).toBe(true)
    expect(chunks.some((c) => /Plans|PART 2|Credit/i.test(c.heading ?? ''))).toBe(true)
    expect(FREYA_KNOWLEDGE_SOURCE).toContain('antarious_training')
  })

  it('chunks the Training Knowledge file into a healthy volume', () => {
    const path = resolve(
      process.cwd(),
      'docs/knowledge/Antarious_Freya_Training_Knowledge.md',
    )
    const md = readFileSync(path, 'utf8')
    const chunks = chunkKnowledgeMarkdown(md)
    expect(chunks.length).toBeGreaterThan(20)
    expect(chunks.every((c) => c.content.length >= 40)).toBe(true)
    expect(chunks.every((c) => c.tokenEstimate > 0)).toBe(true)
  })
})
