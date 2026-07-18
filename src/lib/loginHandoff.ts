export type HandoffMsg = { id: string; role: 'freya' | 'you'; text: string }

const KEY = 'antarious-login-handoff'

export function saveLoginHandoff(messages: HandoffMsg[]) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ messages, at: Date.now() }))
  } catch {
    /* ignore */
  }
}

export function loadLoginHandoff(): HandoffMsg[] | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { messages?: HandoffMsg[] }
    if (!Array.isArray(parsed.messages) || !parsed.messages.length) return null
    return parsed.messages
  } catch {
    return null
  }
}

export function clearLoginHandoff() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
