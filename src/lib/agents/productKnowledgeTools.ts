import { tool } from 'ai'
import { z } from 'zod'
import { searchFreyaKnowledge } from '@/lib/knowledge/searchFreyaKnowledge'
import { FREYA_KNOWLEDGE_SOURCE } from '@/lib/knowledge/chunkKnowledge'

/**
 * Product knowledge lookup — Antarious Business / Credit Score / Finance facts.
 * Call when the owner asks about plans, platforms, score factors, funding, or what Freya can do.
 */
export function productKnowledgeTools() {
  return {
    lookup_product_knowledge: tool({
      description:
        'Look up official Antarious product knowledge (Freya Business app, Credit Score, Finance funding facts). Use for questions about plans/pricing tiers, what Freya can or cannot do today, social platforms, score 0–100 meaning, five score categories, soft credit check, credit building options, funding vs BNPL, loan ranges, partners, eligibility, or company history. Do NOT use for inventing this owner’s numbers — workspace tools answer their live data. Always ground score/funding answers only in returned hits.',
      inputSchema: z.object({
        query: z
          .string()
          .min(3)
          .describe(
            'Short search query, e.g. "starter growth scale plan differences", "credit score five categories", "loan ranges partners", "what freya cannot do today"',
          ),
      }),
      execute: async ({ query }) => {
        try {
          const result = await searchFreyaKnowledge(query, {
            matchCount: 6,
            source: FREYA_KNOWLEDGE_SOURCE,
          })
          if (!result.ok && !result.hits.length) {
            return {
              ok: false as const,
              query,
              hits: [] as const,
              message: result.summary,
            }
          }
          return {
            ok: true as const,
            query: result.query,
            hitCount: result.hits.length,
            // Truncate for model context — headings + content already in summary
            passages: result.hits.map((h) => ({
              part: h.part,
              heading: h.heading,
              similarity: Number(h.similarity.toFixed(3)),
              content: h.content.slice(0, 2200),
            })),
            guidance:
              result.hits.length === 0
                ? result.summary
                : 'Answer only from these passages. If something is not covered, say it is not confirmed yet — never invent score thresholds or funding approvals.',
          }
        } catch (e) {
          return {
            ok: false as const,
            query,
            hits: [] as const,
            message: e instanceof Error ? e.message : 'Knowledge lookup failed',
          }
        }
      },
    }),
  }
}
