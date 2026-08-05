/**
 * Part 19.1 boundary linter — flags external past/future completion phrases.
 * Soft-completion closers can be stripped when no matching outbound tool success.
 */

export type BoundaryLintHit = {
  phrase: string
  index: number
}

export type BoundaryLintResult = {
  flagged: boolean
  hits: BoundaryLintHit[]
  /** Soft-completion style flags (F7) safe to strip when no tool outbound. */
  softCompletionHits: BoundaryLintHit[]
}

/** Exact Part 19.1 flag list (case-insensitive, word-boundary where sensible). */
const BOUNDARY_PATTERNS: { label: string; re: RegExp; soft?: boolean }[] = [
  { label: 'posted', re: /\bposted\b/i },
  { label: 'published', re: /\bpublished\b/i },
  { label: 'went live', re: /\bwent\s+live\b/i },
  { label: "it's live", re: /\bit'?s\s+live\b/i },
  { label: 'shared to', re: /\bshared\s+to\b/i },
  { label: 'uploaded to', re: /\buploaded\s+to\b/i },
  { label: 'sent', re: /\bsent\b/i },
  { label: "I've sent", re: /\bi'?ve\s+sent\b/i },
  { label: 'emailed', re: /\bemailed\b/i },
  { label: 'texted', re: /\btexted\b/i },
  { label: 'messaged them', re: /\bmessaged\s+them\b/i },
  { label: 'DMed', re: /\bdmed\b/i },
  { label: 'notified', re: /\bnotified\b/i },
  { label: 'called', re: /\bcalled\b/i },
  { label: 'rang', re: /\brang\b/i },
  { label: 'phoned', re: /\bphoned\b/i },
  { label: 'reached out to', re: /\breached\s+out\s+to\b/i },
  { label: 'followed up with them', re: /\bfollowed\s+up\s+with\s+them\b/i },
  { label: 'charged', re: /\bcharged\b/i },
  { label: 'billed', re: /\bbilled\b/i },
  { label: 'payment cleared', re: /\bpayment\s+cleared\b/i },
  { label: 'funds received', re: /\bfunds\s+received\b/i },
  { label: 'refunded', re: /\brefunded\b/i },
  { label: 'processed the payment', re: /\bprocessed\s+the\s+payment\b/i },
  { label: 'connected', re: /\bconnected\b/i },
  { label: 'linked', re: /\blinked\b/i },
  { label: 'synced', re: /\bsynced\b/i },
  { label: 'integrated with', re: /\bintegrated\s+with\b/i },
  { label: 'engagement is', re: /\bengagement\s+is\b/i },
  { label: 'reach was', re: /\breach\s+was\b/i },
  { label: 'impressions', re: /\bimpressions\b/i },
  { label: 'views were', re: /\bviews\s+were\b/i },
  { label: '% up', re: /(?:\d+\s*%\s*up\b|\bup\s+\d+\s*%)/i },
  { label: '% down', re: /(?:\d+\s*%\s*down\b|\bdown\s+\d+\s*%)/i },
  { label: "it'll go out", re: /\bit'?ll\s+go\s+out\b/i },
  { label: 'will be posted', re: /\bwill\s+be\s+posted\b/i },
  { label: 'will be sent', re: /\bwill\s+be\s+sent\b/i },
  { label: 'goes out automatically', re: /\bgoes\s+out\s+automatically\b/i },
  { label: 'taken care of', re: /\btaken\s+care\s+of\b/i, soft: true },
  { label: 'handled it', re: /\bhandled\s+it\b/i, soft: true },
  { label: 'all sorted', re: /\ball\s+sorted\b/i, soft: true },
  { label: 'done and dusted', re: /\bdone\s+and\s+dusted\b/i, soft: true },
]

/** Legitimate phrases that contain flagged tokens (Part 19.1 nuance). */
const ALLOWLIST: RegExp[] = [
  /\bmarked\s+as\s+sent\b/i,
  /\bwaiting\s+for\s+(your\s+)?(ok|approval)\b/i,
  /\bin\s+your\s+(approvals|inbox)\b/i,
  /\bscheduled\s+in\s+the\s+app\b/i,
  /\bqueued\s+(for|to)\b/i,
  /\bdrafted\b/i,
  /\bready\s+(to\s+)?(paste|approve|review)\b/i,
]

function isAllowlistedContext(text: string, index: number, phraseLen: number): boolean {
  const start = Math.max(0, index - 40)
  const end = Math.min(text.length, index + phraseLen + 40)
  const window = text.slice(start, end)
  return ALLOWLIST.some((re) => re.test(window))
}

export function lintFreyaBoundaryClaims(text: string): BoundaryLintResult {
  const hits: BoundaryLintHit[] = []
  const softCompletionHits: BoundaryLintHit[] = []
  if (!text?.trim()) {
    return { flagged: false, hits, softCompletionHits }
  }

  for (const { label, re, soft } of BOUNDARY_PATTERNS) {
    re.lastIndex = 0
    let m: RegExpExecArray | null
    const global = new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`)
    while ((m = global.exec(text)) !== null) {
      if (isAllowlistedContext(text, m.index, m[0].length)) continue
      const hit = { phrase: label, index: m.index }
      hits.push(hit)
      if (soft) softCompletionHits.push(hit)
    }
  }

  return {
    flagged: hits.length > 0,
    hits,
    softCompletionHits,
  }
}

const SOFT_CLOSER_RES: RegExp[] = [
  /\bthat'?s\s+all\s+taken\s+care\s+of[.!]?\s*/gi,
  /\bconsider\s+it\s+handled[.!]?\s*/gi,
  /\b(all\s+sorted|done\s+and\s+dusted)[.!]?\s*/gi,
  /\bi'?ve\s+handled\s+it[.!]?\s*/gi,
  /\bhandled\s+it[.!]?\s*/gi,
  /\btaken\s+care\s+of[.!]?\s*/gi,
]

/**
 * Light cleanup: strip soft-completion closers when nothing outbound actually ran.
 * Does not invent replacements or hard-fail the reply.
 */
export function stripSoftCompletionClosers(text: string): string {
  let out = text
  for (const re of SOFT_CLOSER_RES) {
    out = out.replace(re, '')
  }
  return out.replace(/ {2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
}

export function applyBoundarySoftCleanup(
  text: string,
  opts?: { hadOutboundToolSuccess?: boolean },
): { text: string; lint: BoundaryLintResult; cleaned: boolean } {
  const lint = lintFreyaBoundaryClaims(text)
  if (opts?.hadOutboundToolSuccess) {
    return { text, lint, cleaned: false }
  }
  if (lint.softCompletionHits.length === 0) {
    return { text, lint, cleaned: false }
  }
  const cleaned = stripSoftCompletionClosers(text)
  return {
    text: cleaned || text,
    lint,
    cleaned: cleaned !== text,
  }
}
