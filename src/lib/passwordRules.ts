export type PasswordCheck = { id: string; label: string; ok: boolean }

/** Standard strong password: 8+, upper, lower, number. */
export function getPasswordChecks(password: string): PasswordCheck[] {
  return [
    { id: 'len', label: 'At least 8 characters', ok: password.length >= 8 },
    { id: 'lower', label: 'One lowercase letter', ok: /[a-z]/.test(password) },
    { id: 'upper', label: 'One uppercase letter', ok: /[A-Z]/.test(password) },
    { id: 'number', label: 'One number', ok: /\d/.test(password) },
  ]
}

export function isStrongPassword(password: string) {
  return getPasswordChecks(password).every((c) => c.ok)
}

export type PasswordStrength = {
  score: 0 | 1 | 2 | 3 | 4
  label: 'Weak' | 'Fair' | 'Good' | 'Strong'
}

/** Visual strength only — submit still requires isStrongPassword. */
export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return { score: 0, label: 'Weak' }
  const met = getPasswordChecks(password).filter((c) => c.ok).length
  if (met <= 1) return { score: 1, label: 'Weak' }
  if (met === 2) return { score: 2, label: 'Fair' }
  if (met === 3) return { score: 3, label: 'Good' }
  return { score: 4, label: 'Strong' }
}
