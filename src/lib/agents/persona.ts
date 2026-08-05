import { GOAL_OPTIONS, type GoalId } from '@/data/mockData'
import { freyaSystemPromptV2 } from './freyaSystemPromptV2'

export type FreyaBizSnapshot = {
  businessName?: string | null
  industry?: string | null
  customers?: string | null
  goals?: string[] | GoalId[] | null
  platforms?: string[] | null
  planTier?: string | null
  tone?: string | null
  ownerName?: string | null
  /** Live workspace counts (optional — improves action answers). */
  waitingApprovals?: number | null
  draftPosts?: number | null
  openInbox?: number | null
  /** Part 18 injected summaries — use "none" when empty. */
  waitingApprovalsSummary?: string | null
  postsSummary?: string | null
  messagesSummary?: string | null
  /** @deprecated Prefer messagesSummary */
  inboxSummary?: string | null
  leadsSummary?: string | null
  dealsSummary?: string | null
  moneySummary?: string | null
  availableModules?: string | null
  aiCreditsRemaining?: number | null
  todayDate?: string | null
  /** Soft Rule 0 flag from crisisGate allergen heuristics. */
  allergenPressure?: boolean
}

export function labelGoals(goals?: string[] | GoalId[] | null) {
  if (!goals?.length) return 'not set yet'
  return goals
    .map((id) => GOAL_OPTIONS.find((g) => g.id === id)?.label ?? String(id))
    .join('; ')
}

/** Shared writing rules — §6.8 length ladder + §6.9 formatting. */
export function freyaWritingRules() {
  return [
    'Writing quality (always):',
    '- Length ladder: greeting 1–2 short sentences; factual answer 1–3 (number first); caption 2–4 lines; customer reply under 60 words; how-it-works 3–5 sentences no headers; week of ideas = list one line each; refusal 2–3 sentences; otherwise shorter than you think.',
    '- Most chat sentences under fifteen words. Most replies under sixty words unless they asked for a full draft.',
    '- Captions: 2–4 short sentences. Campaign goals/audience: 1–2 sentences each.',
    '- Campaign titles: 4–8 words, title case, concrete. Never paste the user prompt as the title.',
    '- Align every draft with THIS business’s industry, who they serve, and their goals.',
    '- Do not default to boutique/fashion unless that is their industry.',
    '- Use BDT (৳) only. Never mix ৳ and $ in one artifact.',
    '- Prefer clear CTAs. Avoid jargon, filler, and generic “exciting opportunity” fluff.',
    '- Match preferred tone (warm / professional / playful) in customer-facing drafts.',
    '- Formatting in chat: no markdown headers; bullets only for real lists (five max); no bold-labelled sections; no tables.',
    '- Emoji: never in owner-facing replies. At most one in customer-facing copy when the brand suits it.',
    '- Never open with Absolutely! or close with Let me know if there’s anything else.',
    '- Never use an em dash (—) or en dash (–) in owner-facing chat. Use a period or comma instead (e.g. “Done. I saved…”).',
  ].join('\n')
}

/** Part 18 system prompt (V2). */
export function freyaSystemPrompt(snapshot: FreyaBizSnapshot) {
  return freyaSystemPromptV2(snapshot)
}
