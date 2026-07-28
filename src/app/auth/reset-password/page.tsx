'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Logo } from '@/components/Logo'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [email, setEmail] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [invalid, setInvalid] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (cancelled) return
        if (!session?.user) {
          setInvalid(true)
          setReady(true)
          return
        }
        setEmail(session.user.email ?? null)
        setReady(true)
      } catch {
        if (!cancelled) {
          setInvalid(true)
          setReady(true)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (sending) return
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords don’t match.')
      return
    }

    setSending(true)
    setError(null)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError

      await supabase.auth.signOut()
      const qs = new URLSearchParams({ reset: '1' })
      if (email) qs.set('email', email)
      router.replace(`/?${qs.toString()}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update password')
      setSending(false)
    }
  }

  return (
    <div className="login-stage login-stage--auth relative flex min-h-screen flex-col">
      <div className="login-welcome relative z-10" style={{ maxWidth: '28rem' }}>
        <header className="login-brand-bar">
          <Logo size={42} className="login-brand-logo" />
        </header>

        <section className="login-meet" aria-label="Reset password">
          <div className="login-meet-intro" style={{ textAlign: 'left' }}>
            <h1 className="login-headline">
              New <span className="login-accent">password</span>
            </h1>
            <p className="login-support">
              {invalid
                ? 'This reset link is invalid or expired.'
                : email
                  ? `Choose a new password for ${email}.`
                  : 'Choose a new password for your Antarious account.'}
            </p>
          </div>

          <div className="login-chat login-chat--auth" style={{ width: '100%' }}>
            {!ready ? (
              <div className="login-chat-auth">
                <p className="login-chat-handoff">Checking your reset link…</p>
              </div>
            ) : invalid ? (
              <div className="login-chat-auth">
                <div className="login-chat-auth-notice">
                  <p className="login-chat-auth-notice-title">Link expired</p>
                  <p>Request a new reset email from the log in screen.</p>
                </div>
                <Link href="/?mode=login" className="login-chat-auth-submit" style={{ textAlign: 'center' }}>
                  Back to log in
                </Link>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="login-chat-auth">
                <label className="login-chat-auth-field">
                  <span>New password</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    autoComplete="new-password"
                    autoFocus
                    disabled={sending}
                    className="login-chat-auth-input"
                  />
                </label>
                <label className="login-chat-auth-field">
                  <span>Confirm password</span>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Repeat password"
                    autoComplete="new-password"
                    disabled={sending}
                    className="login-chat-auth-input"
                  />
                </label>
                <button
                  type="submit"
                  disabled={password.length < 6 || confirm.length < 6 || sending}
                  className="login-chat-auth-submit"
                >
                  {sending ? 'Saving…' : 'Save new password'}
                </button>
                {error ? <p className="login-chat-auth-error">{error}</p> : null}
              </form>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
