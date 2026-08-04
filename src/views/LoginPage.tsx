'use client'

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowUp, Eye, EyeOff } from 'lucide-react'
import { FreyaLoginFigure } from '../components/FreyaLoginFigure'
import { LoginStageBackground } from '../components/LoginStageBackground'
import { Logo } from '../components/Logo'
import { useApp } from '../context/AppContext'
import { FREYA_PERSONA } from '../data/freyaPersona'
import { saveLoginHandoff } from '../lib/loginHandoff'
import { getPasswordStrength, isStrongPassword } from '../lib/passwordRules'
import {
  clearRememberedUser,
  getRememberedEmail,
  getRememberedName,
  rememberUser,
} from '../lib/rememberedUser'

type ChatMsg = { id: string; role: 'freya' | 'you'; text: string }
type Step = 'name' | 'auth'
type AuthPanel = 'account' | 'forgot'

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function wait(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms))
}

function hasSupabaseEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )
}

export function LoginPage() {
  const { login, hydrateFromBackend } = useApp()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [step, setStep] = useState<Step>('name')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [returningName, setReturningName] = useState<string | null>(null)
  const [isReturningVisitor, setIsReturningVisitor] = useState(false)
  const [mode, setMode] = useState<'signup' | 'login'>('signup')
  const [authPanel, setAuthPanel] = useState<AuthPanel>('account')
  const [error, setError] = useState<string | null>(null)
  const [checkEmail, setCheckEmail] = useState<string | null>(null)
  const [resetSent, setResetSent] = useState<string | null>(null)
  const [verified, setVerified] = useState(false)
  const [passwordReset, setPasswordReset] = useState(false)
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [bootReady, setBootReady] = useState(false)
  const [typing, setTyping] = useState(false)
  const [sending, setSending] = useState(false)
  const [exiting, setExiting] = useState(false)
  const [inputFocused, setInputFocused] = useState(false)
  const handoffRef = useRef<ChatMsg[]>([])
  const threadRef = useRef<HTMLDivElement>(null)
  const ownerNameRef = useRef('')
  const bootstrapped = useRef(false)

  const freyaEngaged =
    inputFocused ||
    name.trim().length > 0 ||
    email.trim().length > 0 ||
    sending ||
    typing ||
    verified ||
    passwordReset

  useEffect(() => {
    handoffRef.current = messages
  }, [messages])

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, typing, step, verified, checkEmail, resetSent, authPanel])

  // Deep-link from email confirmation / password reset / team invite / auth errors
  useEffect(() => {
    if (bootstrapped.current) return
    bootstrapped.current = true

    const isVerified = searchParams.get('verified') === '1'
    const isReset = searchParams.get('reset') === '1'
    const modeParam = searchParams.get('mode')
    const emailParam = searchParams.get('email')?.trim() || ''
    const errParam = searchParams.get('error')
    const inviteParam = searchParams.get('invite')?.trim() || ''

    if (emailParam) setEmail(emailParam)

    const rememberedName = getRememberedName()
    const rememberedEmail = getRememberedEmail()
    if (!emailParam && rememberedEmail) setEmail(rememberedEmail)
    if (rememberedName) {
      ownerNameRef.current = rememberedName
      setReturningName(rememberedName)
    }

    const isReturning = Boolean(rememberedName || rememberedEmail)
    if (isReturning) setIsReturningVisitor(true)

    function setWelcomeBackMessages(name: string | null) {
      const msgs = FREYA_PERSONA.login.welcomeBack(name).map((text) => ({
        id: uid(),
        role: 'freya' as const,
        text,
      }))
      setMessages(msgs)
      handoffRef.current = msgs
    }

    function setOpenerMessages() {
      const msgs = FREYA_PERSONA.login.opener.map((text) => ({
        id: uid(),
        role: 'freya' as const,
        text,
      }))
      setMessages(msgs)
      handoffRef.current = msgs
    }

    if (inviteParam && inviteParam !== 'accepted') {
      try {
        sessionStorage.setItem('antarious-pending-team-invite', inviteParam)
      } catch {
        /* ignore */
      }
      setStep('auth')
      setMode('login')
      setAuthPanel('account')
      const msgs: ChatMsg[] = [
        {
          id: uid(),
          role: 'freya',
          text: rememberedName
            ? `Hey ${rememberedName}. You’ve got a team invite waiting.`
            : 'You’ve got a team invite waiting.',
        },
        {
          id: uid(),
          role: 'freya',
          text: emailParam
            ? `Sign in or create an account with ${emailParam} (the same inbox the invite was sent to), and I’ll add you to the workspace.`
            : 'Sign in or create an account with the same email the invite was sent to (work or personal), and I’ll add you to the workspace.',
        },
      ]
      setMessages(msgs)
      handoffRef.current = msgs
    } else if (isReset) {
      setPasswordReset(true)
      setVerified(false)
      setStep('auth')
      setMode('login')
      setAuthPanel('account')
      const msgs: ChatMsg[] = [
        {
          id: uid(),
          role: 'freya',
          text: rememberedName
            ? `Password updated. Nice work, ${rememberedName}.`
            : 'Password updated. Nice work.',
        },
        {
          id: uid(),
          role: 'freya',
          text: emailParam
            ? `Log in with ${emailParam} and your new password.`
            : 'Log in with your new password and I’ll open your workspace.',
        },
      ]
      setMessages(msgs)
      handoffRef.current = msgs
    } else if (isVerified) {
      setVerified(true)
      setStep('auth')
      setMode('login')
      setAuthPanel('account')
      setCheckEmail(null)
      const celebrate: ChatMsg[] = [
        {
          id: uid(),
          role: 'freya',
          text: rememberedName
            ? `You’re verified. Welcome to Antarious, ${rememberedName}.`
            : 'You’re verified. Welcome to Antarious.',
        },
        {
          id: uid(),
          role: 'freya',
          text: emailParam
            ? `Your email ${emailParam} is confirmed. Log in below and I’ll open your workspace.`
            : 'Your email is confirmed. Log in below and I’ll open your workspace.',
        },
      ]
      setMessages(celebrate)
      handoffRef.current = celebrate
    } else if (modeParam === 'forgot') {
      setStep('auth')
      setMode('login')
      setAuthPanel('forgot')
      setWelcomeBackMessages(rememberedName)
    } else if (modeParam === 'login' || (isReturning && hasSupabaseEnv())) {
      // Returning browser visitor (saved name or email): skip name ask.
      setStep('auth')
      setMode('login')
      setAuthPanel('account')
      setWelcomeBackMessages(rememberedName)
    } else if (errParam) {
      setStep('auth')
      setMode('login')
      setAuthPanel('account')
      setWelcomeBackMessages(rememberedName)
      setError(
        errParam === 'auth_callback' || errParam === 'auth_confirm'
          ? 'That confirmation link expired or already used. Log in if you already verified, or sign up again.'
          : decodeURIComponent(errParam),
      )
    } else {
      setStep('name')
      setMode('signup')
      setOpenerMessages()
    }

    if (
      isVerified ||
      isReset ||
      errParam ||
      emailParam ||
      modeParam ||
      inviteParam ||
      (isReturning && hasSupabaseEnv())
    ) {
      setSearchParams({}, { replace: true })
    }

    setBootReady(true)
  }, [searchParams, setSearchParams])

  async function finishToOnboarding(displayName: string, fromBackend = false) {
    setExiting(true)
    await wait(520)

    let pendingInvite: string | null = null
    try {
      pendingInvite = sessionStorage.getItem('antarious-pending-team-invite')
      if (pendingInvite) sessionStorage.removeItem('antarious-pending-team-invite')
    } catch {
      pendingInvite = null
    }

    if (fromBackend) {
      const me = await hydrateFromBackend()
      const savedName = me?.profile?.ownerName?.trim() || displayName
      rememberUser({ name: savedName, email: email.trim() || undefined })
      setReturningName(savedName)
      saveLoginHandoff(handoffRef.current)
      if (pendingInvite) {
        window.location.assign(
          `/api/team/invites/accept?token=${encodeURIComponent(pendingInvite)}`,
        )
        return
      }
      if (me?.onboarded) navigate('/app')
      else navigate('/onboarding')
      return
    }
    rememberUser({ name: displayName })
    login(displayName)
    saveLoginHandoff(handoffRef.current)
    navigate('/onboarding')
  }

  function startAsSomeoneElse() {
    clearRememberedUser()
    setReturningName(null)
    setIsReturningVisitor(false)
    ownerNameRef.current = ''
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setMode('signup')
    setAuthPanel('account')
    setStep('name')
    setError(null)
    setCheckEmail(null)
    setVerified(false)
    setPasswordReset(false)
    const opener = FREYA_PERSONA.login.opener.map((text) => ({
      id: uid(),
      role: 'freya' as const,
      text,
    }))
    setMessages(opener)
    handoffRef.current = opener
  }

  async function onNameSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || sending || exiting) return

    setSending(true)
    ownerNameRef.current = trimmed
    rememberUser({ name: trimmed })
    setReturningName(trimmed)
    const userMsg: ChatMsg = { id: uid(), role: 'you', text: trimmed }
    setMessages((prev) => {
      handoffRef.current = [...prev, userMsg]
      return handoffRef.current
    })
    setName('')

    setTyping(true)
    await wait(750)
    setTyping(false)

    const freyaMsg: ChatMsg = {
      id: uid(),
      role: 'freya',
      text: hasSupabaseEnv()
        ? `${FREYA_PERSONA.login.reply(trimmed)} Drop your email + a password so I can keep your workspace safe.`
        : FREYA_PERSONA.login.reply(trimmed),
    }
    setMessages((prev) => {
      handoffRef.current = [...prev, freyaMsg]
      return handoffRef.current
    })

    if (!hasSupabaseEnv()) {
      await wait(1200)
      await finishToOnboarding(trimmed)
      return
    }

    setStep('auth')
    setSending(false)
  }

  async function onAuthSubmit(e: FormEvent) {
    e.preventDefault()
    if (authPanel === 'forgot') {
      await onForgotSubmit()
      return
    }
    if (!email.trim() || !password || sending || exiting) return
    if (mode === 'signup') {
      if (!isStrongPassword(password)) {
        setError('Use 8+ characters with upper, lower, and a number.')
        return
      }
      if (password !== confirmPassword) {
        setError('Passwords don’t match.')
        return
      }
    } else if (password.length < 6) {
      setError('Enter your password.')
      return
    }
    setSending(true)
    setError(null)

    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const displayName = ownerNameRef.current || email.split('@')[0]

      if (mode === 'signup') {
        const appUrl =
          process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || window.location.origin
        const { data, error: signError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: displayName },
            emailRedirectTo: `${appUrl}/auth/callback?intent=confirm`,
          },
        })
        if (signError) throw signError

        // Confirm-email enabled → no session until they click the link.
        if (!data.session) {
          setCheckEmail(email.trim())
          setVerified(false)
          setSending(false)
          rememberUser({ name: displayName, email: email.trim() })
          const youMsg: ChatMsg = {
            id: uid(),
            role: 'you',
            text: `Signed up as ${email.trim()}`,
          }
          const freyaMsg: ChatMsg = {
            id: uid(),
            role: 'freya',
            text: `I sent a confirmation link to ${email.trim()}. Open it to verify, then come back and log in.`,
          }
          setMessages((prev) => {
            handoffRef.current = [...prev, youMsg, freyaMsg]
            return handoffRef.current
          })
          return
        }
      } else {
        const { error: signError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (signError) throw signError
      }

      const youMsg: ChatMsg = {
        id: uid(),
        role: 'you',
        text: mode === 'signup' ? `Signed up as ${email.trim()}` : `Signed in as ${email.trim()}`,
      }
      setMessages((prev) => {
        handoffRef.current = [...prev, youMsg]
        return handoffRef.current
      })

      await finishToOnboarding(displayName, true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Auth failed')
      setSending(false)
    }
  }

  async function onForgotSubmit() {
    if (!email.trim() || sending || exiting) return
    setSending(true)
    setError(null)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || window.location.origin
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${appUrl}/auth/reset-password`,
      })
      if (resetError) throw resetError

      setResetSent(email.trim())
      setSending(false)
      const youMsg: ChatMsg = {
        id: uid(),
        role: 'you',
        text: `Reset password for ${email.trim()}`,
      }
      const freyaMsg: ChatMsg = {
        id: uid(),
        role: 'freya',
        text: `I sent a reset link to ${email.trim()}. Open it, choose a new password, then log in.`,
      }
      setMessages((prev) => {
        handoffRef.current = [...prev, youMsg, freyaMsg]
        return handoffRef.current
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send reset email')
      setSending(false)
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (step === 'name') void onNameSubmit(e as unknown as FormEvent)
      else void onAuthSubmit(e as unknown as FormEvent)
    }
  }

  const showAuthCompact = step === 'auth'

  return (
    <div
      className={`login-stage relative flex min-h-screen flex-col${exiting ? ' login-stage-exit' : ''}${showAuthCompact ? ' login-stage--auth' : ''}`}
    >
      <LoginStageBackground />

      <main className="login-welcome relative z-10">
        <header className="login-brand-bar">
          <Logo size={48} className="login-brand-logo" />
        </header>

        <section className="login-meet" aria-label="Chat with Freya">
          <div className="login-pair">
            <div
              className={`login-freya-presence${showAuthCompact ? ' login-freya-presence--compact' : ''}`}
              aria-label="Freya"
            >
              <FreyaLoginFigure engaged={freyaEngaged} />
            </div>

            <div className="login-chat-col">
              <div className="login-meet-intro">
                <h1 className="login-headline">
                  {passwordReset ? (
                    <>
                      Password <span className="login-accent">updated</span>
                    </>
                  ) : verified ? (
                    <>
                      You’re <span className="login-accent">verified</span>
                    </>
                  ) : authPanel === 'forgot' ? (
                    <>
                      Reset <span className="login-accent">password</span>
                    </>
                  ) : isReturningVisitor && step === 'auth' && !verified && !passwordReset && authPanel !== 'forgot' ? (
                    returningName ? (
                      <>
                        Welcome back, <span className="login-accent">{returningName}</span>
                      </>
                    ) : (
                      <>
                        Welcome <span className="login-accent">back</span>
                      </>
                    )
                  ) : (
                    <>
                      Meet <span className="login-accent">Freya</span>
                    </>
                  )}
                </h1>
                <p className="login-support">
                  {passwordReset
                    ? 'Your new password is ready. Log in to continue.'
                    : verified
                      ? 'Email confirmed. Log in to continue with Freya.'
                      : authPanel === 'forgot'
                        ? 'We’ll email you a secure link to choose a new password.'
                        : isReturningVisitor && step === 'auth'
                          ? 'Log in to open your workspace. No need to introduce yourself again.'
                          : FREYA_PERSONA.login.status}
                </p>
              </div>

              <div
                className={`login-chat${step === 'auth' ? ' login-chat--auth' : ''}${verified || passwordReset ? ' login-chat--verified' : ''}`}
              >
                <div className="login-chat-tail" aria-hidden />
                <div ref={threadRef} className="login-chat-thread">
                  {!bootReady ? null : messages.map((m, i) =>
                    m.role === 'freya' ? (
                      <div
                        key={m.id}
                        className="login-chat-row login-chat-row-freya"
                        style={{ animationDelay: `${i * 0.08}s` }}
                      >
                        <div className="login-chat-bubble login-chat-bubble-freya">{m.text}</div>
                      </div>
                    ) : (
                      <div
                        key={m.id}
                        className="login-chat-row login-chat-row-you"
                        style={{ animationDelay: '0.05s' }}
                      >
                        <div className="login-chat-bubble login-chat-bubble-you">{m.text}</div>
                      </div>
                    ),
                  )}

                  {typing && (
                    <div className="login-chat-row login-chat-row-freya">
                      <div className="login-chat-bubble login-chat-bubble-freya login-chat-typing">
                        <span />
                        <span />
                        <span />
                      </div>
                    </div>
                  )}
                </div>

                {step === 'name' ? (
                  <form onSubmit={onNameSubmit} className="login-chat-composer">
                    {exiting ? (
                      <p className="login-chat-handoff">Opening your workspace…</p>
                    ) : (
                      <>
                        <input
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          onKeyDown={onKeyDown}
                          onFocus={() => setInputFocused(true)}
                          onBlur={() => setInputFocused(false)}
                          placeholder={FREYA_PERSONA.login.placeholder}
                          autoFocus
                          autoComplete="name"
                          enterKeyHint="go"
                          disabled={sending}
                          className="login-chat-input"
                        />
                        <button
                          type="submit"
                          disabled={!name.trim() || sending}
                          className="login-chat-send"
                          aria-label="Start with Freya"
                        >
                          <ArrowUp className="h-5 w-5" strokeWidth={2.5} />
                        </button>
                      </>
                    )}
                  </form>
                ) : (
                  <form onSubmit={onAuthSubmit} className="login-chat-auth">
                    {exiting ? (
                      <p className="login-chat-handoff">Opening your workspace…</p>
                    ) : authPanel === 'forgot' ? (
                      <>
                        {resetSent ? (
                          <div className="login-chat-auth-notice">
                            <p className="login-chat-auth-notice-title">Check your email</p>
                            <p>
                              We sent a reset link to <strong>{resetSent}</strong>. Open it to
                              choose a new password, then log in.
                            </p>
                            <button
                              type="button"
                              className="login-chat-auth-notice-link"
                              onClick={() => {
                                setAuthPanel('account')
                                setMode('login')
                                setResetSent(null)
                              }}
                            >
                              Back to log in →
                            </button>
                          </div>
                        ) : (
                          <>
                            <label className="login-chat-auth-field">
                              <span>Email</span>
                              <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                onFocus={() => setInputFocused(true)}
                                onBlur={() => setInputFocused(false)}
                                placeholder="you@business.com"
                                autoComplete="email"
                                inputMode="email"
                                autoCapitalize="none"
                                autoCorrect="off"
                                autoFocus
                                disabled={sending}
                                className="login-chat-auth-input"
                              />
                            </label>
                            <button
                              type="submit"
                              disabled={!email.trim() || sending}
                              className="login-chat-auth-submit"
                            >
                              {sending ? 'Sending link…' : 'Send reset link'}
                            </button>
                          </>
                        )}
                        {error ? <p className="login-chat-auth-error">{error}</p> : null}
                        <button
                          type="button"
                          className="login-chat-auth-back"
                          onClick={() => {
                            setAuthPanel('account')
                            setMode('login')
                            setResetSent(null)
                            setError(null)
                          }}
                        >
                          ← Back to log in
                        </button>
                      </>
                    ) : (
                      <>
                        {verified ? (
                          <div className="login-chat-auth-notice login-chat-auth-notice--success">
                            <p className="login-chat-auth-notice-title">Email verified</p>
                            <p>You’re all set. Enter your password to log in and meet Freya.</p>
                          </div>
                        ) : null}

                        {passwordReset ? (
                          <div className="login-chat-auth-notice login-chat-auth-notice--success">
                            <p className="login-chat-auth-notice-title">Password updated</p>
                            <p>Log in with your new password to continue.</p>
                          </div>
                        ) : null}

                        <div className="login-chat-auth-modes" role="tablist" aria-label="Account mode">
                          <button
                            type="button"
                            role="tab"
                            aria-selected={mode === 'signup'}
                            className={`login-chat-auth-mode${mode === 'signup' ? ' is-active' : ''}`}
                            onClick={() => {
                              setMode('signup')
                              setCheckEmail(null)
                              setVerified(false)
                              setPasswordReset(false)
                              setError(null)
                              setConfirmPassword('')
                              setShowPassword(false)
                              setShowConfirmPassword(false)
                            }}
                          >
                            Sign up
                          </button>
                          <button
                            type="button"
                            role="tab"
                            aria-selected={mode === 'login'}
                            className={`login-chat-auth-mode${mode === 'login' ? ' is-active' : ''}`}
                            onClick={() => {
                              setMode('login')
                              setCheckEmail(null)
                              setError(null)
                              setConfirmPassword('')
                              setShowPassword(false)
                              setShowConfirmPassword(false)
                            }}
                          >
                            Log in
                          </button>
                        </div>

                        {checkEmail ? (
                          <div className="login-chat-auth-notice">
                            <p className="login-chat-auth-notice-title">Check your email</p>
                            <p>
                              We sent a confirmation link to <strong>{checkEmail}</strong>. Open it
                              to verify, then you’ll come back here to log in.
                            </p>
                            <button
                              type="button"
                              className="login-chat-auth-notice-link"
                              onClick={() => {
                                setMode('login')
                                setCheckEmail(null)
                              }}
                            >
                              Go to log in →
                            </button>
                          </div>
                        ) : (
                          <>
                            <label className="login-chat-auth-field">
                              <span>Email</span>
                              <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                onFocus={() => setInputFocused(true)}
                                onBlur={() => setInputFocused(false)}
                                placeholder="you@business.com"
                                autoComplete="email"
                                inputMode="email"
                                autoCapitalize="none"
                                autoCorrect="off"
                                autoFocus={!verified && !passwordReset}
                                disabled={sending}
                                className="login-chat-auth-input"
                              />
                            </label>
                            <label className="login-chat-auth-field">
                              <span>Password</span>
                              <div className="login-chat-auth-password-wrap">
                                <input
                                  type={showPassword ? 'text' : 'password'}
                                  value={password}
                                  onChange={(e) => setPassword(e.target.value)}
                                  onKeyDown={onKeyDown}
                                  onFocus={() => setInputFocused(true)}
                                  onBlur={() => setInputFocused(false)}
                                  placeholder={
                                    mode === 'signup' ? 'Create a strong password' : 'Your password'
                                  }
                                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                                  autoFocus={verified || passwordReset}
                                  enterKeyHint={mode === 'signup' ? 'next' : 'go'}
                                  disabled={sending}
                                  className="login-chat-auth-input login-chat-auth-input--with-toggle"
                                />
                                <button
                                  type="button"
                                  className="login-chat-auth-visibility"
                                  onClick={() => setShowPassword((v) => !v)}
                                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                                  tabIndex={-1}
                                >
                                  {showPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                              {mode === 'signup' && password.length > 0 ? (
                                (() => {
                                  const strength = getPasswordStrength(password)
                                  return (
                                    <div
                                      className="login-password-meter"
                                      data-score={strength.score}
                                      aria-live="polite"
                                      aria-label={`Password strength: ${strength.label}`}
                                    >
                                      <div className="login-password-meter-track" aria-hidden>
                                        <span className="login-password-meter-fill" />
                                      </div>
                                      <span className="login-password-meter-label">
                                        {strength.label}
                                      </span>
                                    </div>
                                  )
                                })()
                              ) : null}
                            </label>

                            {mode === 'signup' ? (
                              <>
                                <label className="login-chat-auth-field">
                                  <span>Confirm password</span>
                                  <div className="login-chat-auth-password-wrap">
                                    <input
                                      type={showConfirmPassword ? 'text' : 'password'}
                                      value={confirmPassword}
                                      onChange={(e) => setConfirmPassword(e.target.value)}
                                      onKeyDown={onKeyDown}
                                      onFocus={() => setInputFocused(true)}
                                      onBlur={() => setInputFocused(false)}
                                      placeholder="Re-enter password"
                                      autoComplete="new-password"
                                      enterKeyHint="go"
                                      disabled={sending}
                                      className="login-chat-auth-input login-chat-auth-input--with-toggle"
                                    />
                                    <button
                                      type="button"
                                      className="login-chat-auth-visibility"
                                      onClick={() => setShowConfirmPassword((v) => !v)}
                                      aria-label={
                                        showConfirmPassword
                                          ? 'Hide confirm password'
                                          : 'Show confirm password'
                                      }
                                      tabIndex={-1}
                                    >
                                      {showConfirmPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                      ) : (
                                        <Eye className="h-4 w-4" />
                                      )}
                                    </button>
                                  </div>
                                </label>
                                {confirmPassword.length > 0 && confirmPassword !== password ? (
                                  <p className="login-password-mismatch">Passwords don’t match yet.</p>
                                ) : null}
                              </>
                            ) : null}

                            {mode === 'login' ? (
                              <button
                                type="button"
                                className="login-chat-auth-forgot"
                                onClick={() => {
                                  setAuthPanel('forgot')
                                  setError(null)
                                  setPassword('')
                                  setConfirmPassword('')
                                }}
                              >
                                Forgot password?
                              </button>
                            ) : null}
                            {(returningName || email.trim()) && mode === 'login' && authPanel === 'account' ? (
                              <button
                                type="button"
                                className="login-chat-auth-forgot"
                                onClick={startAsSomeoneElse}
                              >
                                {returningName ? `Not ${returningName}? Start fresh` : 'Not you? Start fresh'}
                              </button>
                            ) : null}
                            <button
                              type="submit"
                              disabled={
                                sending ||
                                !email.trim() ||
                                (mode === 'signup'
                                  ? !isStrongPassword(password) || password !== confirmPassword
                                  : password.length < 1)
                              }
                              className="login-chat-auth-submit"
                            >
                              {sending
                                ? mode === 'signup'
                                  ? 'Creating account…'
                                  : 'Signing in…'
                                : mode === 'signup'
                                  ? 'Create account'
                                  : verified || passwordReset
                                    ? 'Log in to continue'
                                    : 'Log in'}
                            </button>
                          </>
                        )}

                        {error ? <p className="login-chat-auth-error">{error}</p> : null}

                        {step === 'auth' && !verified && !passwordReset && !checkEmail ? (
                          <button
                            type="button"
                            className="login-chat-auth-back"
                            onClick={() => {
                              setStep('name')
                              setError(null)
                            }}
                          >
                            ← Back
                          </button>
                        ) : null}
                      </>
                    )}
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
