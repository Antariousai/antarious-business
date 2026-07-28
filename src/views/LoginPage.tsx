'use client'

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUp } from 'lucide-react'
import { FreyaLoginFigure } from '../components/FreyaLoginFigure'
import { LoginStageBackground } from '../components/LoginStageBackground'
import { Logo } from '../components/Logo'
import { useApp } from '../context/AppContext'
import { FREYA_PERSONA } from '../data/freyaPersona'
import { saveLoginHandoff } from '../lib/loginHandoff'

type ChatMsg = { id: string; role: 'freya' | 'you'; text: string }
type Step = 'name' | 'auth'

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
  const [step, setStep] = useState<Step>('name')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'signup' | 'login'>('signup')
  const [error, setError] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMsg[]>(() =>
    FREYA_PERSONA.login.opener.map((text, i) => ({ id: `f${i}`, role: 'freya', text })),
  )
  const [typing, setTyping] = useState(false)
  const [sending, setSending] = useState(false)
  const [exiting, setExiting] = useState(false)
  const [inputFocused, setInputFocused] = useState(false)
  const handoffRef = useRef<ChatMsg[]>(messages)
  const threadRef = useRef<HTMLDivElement>(null)
  const ownerNameRef = useRef('')

  const freyaEngaged =
    inputFocused || name.trim().length > 0 || email.trim().length > 0 || sending || typing

  useEffect(() => {
    handoffRef.current = messages
  }, [messages])

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, typing])

  async function finishToOnboarding(displayName: string, fromBackend = false) {
    setExiting(true)
    await wait(520)
    if (fromBackend) {
      const me = await hydrateFromBackend()
      saveLoginHandoff(handoffRef.current)
      if (me?.onboarded) navigate('/app')
      else navigate('/onboarding')
      return
    }
    login(displayName)
    saveLoginHandoff(handoffRef.current)
    navigate('/onboarding')
  }

  async function onNameSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || sending || exiting) return

    setSending(true)
    ownerNameRef.current = trimmed
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
    if (!email.trim() || password.length < 6 || sending || exiting) return
    setSending(true)
    setError(null)

    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const displayName = ownerNameRef.current || email.split('@')[0]

      if (mode === 'signup') {
        const { error: signError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: displayName } },
        })
        if (signError) throw signError
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

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (step === 'name') void onNameSubmit(e as unknown as FormEvent)
      else void onAuthSubmit(e as unknown as FormEvent)
    }
  }

  return (
    <div
      className={`login-stage relative flex min-h-screen flex-col overflow-hidden${exiting ? ' login-stage-exit' : ''}`}
    >
      <LoginStageBackground />

      <main className="login-welcome relative z-10">
        <header className="login-brand-bar">
          <Logo size={48} className="login-brand-logo" />
        </header>

        <section className="login-meet" aria-label="Chat with Freya">
          <div className="login-pair">
            <div className="login-freya-presence" aria-label="Freya">
              <FreyaLoginFigure engaged={freyaEngaged} />
            </div>

            <div className="login-chat-col">
              <div className="login-meet-intro">
                <h1 className="login-headline">
                  Meet <span className="login-accent">Freya</span>
                </h1>
                <p className="login-support">{FREYA_PERSONA.login.status}</p>
              </div>

              <div className="login-chat">
                <div className="login-chat-tail" aria-hidden />
                <div ref={threadRef} className="login-chat-thread">
                  {messages.map((m, i) =>
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
                  <form
                    onSubmit={onAuthSubmit}
                    className="login-chat-composer items-stretch gap-2 p-3"
                    style={{ flexDirection: 'column', height: 'auto' }}
                  >
                    {exiting ? (
                      <p className="login-chat-handoff">Opening your workspace…</p>
                    ) : (
                      <>
                        <div className="flex gap-2 text-[12px]">
                          <button
                            type="button"
                            className={`rounded-full px-3 py-1 font-semibold ${mode === 'signup' ? 'bg-sky text-white' : 'bg-slate-100 text-slate-600'}`}
                            onClick={() => setMode('signup')}
                          >
                            Sign up
                          </button>
                          <button
                            type="button"
                            className={`rounded-full px-3 py-1 font-semibold ${mode === 'login' ? 'bg-sky text-white' : 'bg-slate-100 text-slate-600'}`}
                            onClick={() => setMode('login')}
                          >
                            Log in
                          </button>
                        </div>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          onFocus={() => setInputFocused(true)}
                          onBlur={() => setInputFocused(false)}
                          placeholder="you@business.com"
                          autoFocus
                          disabled={sending}
                          className="login-chat-input w-full"
                        />
                        <div className="flex gap-2">
                          <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyDown={onKeyDown}
                            placeholder="Password (6+ chars)"
                            disabled={sending}
                            className="login-chat-input min-w-0 flex-1"
                          />
                          <button
                            type="submit"
                            disabled={!email.trim() || password.length < 6 || sending}
                            className="login-chat-send"
                            aria-label={mode === 'signup' ? 'Create account' : 'Log in'}
                          >
                            <ArrowUp className="h-5 w-5" strokeWidth={2.5} />
                          </button>
                        </div>
                        {error && <p className="text-[12px] text-coral">{error}</p>}
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
