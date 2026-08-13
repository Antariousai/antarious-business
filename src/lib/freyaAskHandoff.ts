/** How “Ask Freya” from create/edit popups hands off into the chat panel. */
export type FreyaAskMode = 'paste' | 'send'

const MODE_KEY = 'antarious-freya-ask-mode-v1'

export function loadFreyaAskMode(): FreyaAskMode {
  try {
    const raw = localStorage.getItem(MODE_KEY)
    return raw === 'send' ? 'send' : 'paste'
  } catch {
    return 'paste'
  }
}

export function saveFreyaAskMode(mode: FreyaAskMode) {
  try {
    localStorage.setItem(MODE_KEY, mode)
  } catch {
    /* ignore */
  }
}

export type FreyaAskHandoff = {
  /** Text that goes into the composer (and optionally auto-sends). */
  prompt: string
  /** Optional short label for UI / analytics. */
  label?: string
  /** Force mode for this handoff; otherwise use user preference. */
  mode?: FreyaAskMode
}

/** Build a Freya chat prompt to revise a create/edit artifact. */
export function buildRevisePrompt(opts: {
  kind: string
  section?: string
  fields: Record<string, string>
  instruction?: string
  tone?: string
}): string {
  const lines = Object.entries(opts.fields)
    .filter(([, v]) => v.trim())
    .map(([k, v]) => `${k}: ${v.trim()}`)

  const focus = opts.section
    ? `Please change the ${opts.section} only.`
    : 'Please revise this based on what I say next.'

  const toneLine = opts.tone ? `Preferred tone: ${opts.tone}.` : ''
  const instruction = opts.instruction?.trim()

  return [
    `I'm reviewing this ${opts.kind} draft in Antarious.`,
    '',
    'Current draft:',
    ...lines.map((l) => `- ${l}`),
    '',
    focus,
    toneLine,
    instruction || 'What should we change?',
  ]
    .filter(Boolean)
    .join('\n')
}
