import { useMemo } from 'react'
import type { FreyaLoginMood } from '../data/freyaExpressions'

/** Map login UI state → Freya expression. */
export function resolveLoginFreyaMood(opts: {
  exiting: boolean
  typing: boolean
  sending: boolean
  nameDraft: string
}): FreyaLoginMood {
  if (opts.exiting) return 'wave'
  if (opts.typing) return 'thinking'
  if (opts.sending) return 'excited'
  if (opts.nameDraft.trim().length > 0) return 'listening'
  return 'welcome'
}

/** Bubble avatar mirrors hero mood while Freya is typing. */
export function resolveLoginBubbleMood(heroMood: FreyaLoginMood, typing: boolean): FreyaLoginMood {
  if (typing) return 'thinking'
  return heroMood
}

export function useLoginFreyaMoods(opts: {
  exiting: boolean
  typing: boolean
  sending: boolean
  name: string
}) {
  return useMemo(() => {
    const hero = resolveLoginFreyaMood({
      exiting: opts.exiting,
      typing: opts.typing,
      sending: opts.sending,
      nameDraft: opts.name,
    })
    const bubble = resolveLoginBubbleMood(hero, opts.typing)
    return { hero, bubble }
  }, [opts.exiting, opts.typing, opts.sending, opts.name])
}
