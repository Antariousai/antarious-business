const NAME_KEY = 'antarious-remembered-name'
const EMAIL_KEY = 'antarious-remembered-email'

export function getRememberedName(): string | null {
  try {
    const v = localStorage.getItem(NAME_KEY)?.trim()
    return v || null
  } catch {
    return null
  }
}

export function getRememberedEmail(): string | null {
  try {
    const v = localStorage.getItem(EMAIL_KEY)?.trim()
    return v || null
  } catch {
    return null
  }
}

export function rememberUser(input: { name?: string | null; email?: string | null }) {
  try {
    const name = input.name?.trim()
    if (name) localStorage.setItem(NAME_KEY, name)
    const email = input.email?.trim().toLowerCase()
    if (email) localStorage.setItem(EMAIL_KEY, email)
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearRememberedUser() {
  try {
    localStorage.removeItem(NAME_KEY)
    localStorage.removeItem(EMAIL_KEY)
  } catch {
    /* ignore */
  }
}
