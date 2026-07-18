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

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function wait(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms))
}

export function LoginPage() {
  const { login } = useApp()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [messages, setMessages] = useState<ChatMsg[]>(() =>
    FREYA_PERSONA.login.opener.map((text, i) => ({ id: `f${i}`, role: 'freya', text })),
  )
  const [typing, setTyping] = useState(false)
  const [sending, setSending] = useState(false)
  const [exiting, setExiting] = useState(false)
  const [inputFocused, setInputFocused] = useState(false)
  const handoffRef = useRef<ChatMsg[]>(messages)
  const threadRef = useRef<HTMLDivElement>(null)

  const freyaEngaged = inputFocused || name.trim().length > 0 || sending || typing

  useEffect(() => {
    handoffRef.current = messages
  }, [messages])

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, typing])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || sending || exiting) return

    setSending(true)
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
      text: FREYA_PERSONA.login.reply(trimmed),
    }
    setMessages((prev) => {
      handoffRef.current = [...prev, freyaMsg]
      return handoffRef.current
    })

    await wait(1700)
    setExiting(true)
    await wait(520)

    login(trimmed)
    saveLoginHandoff(handoffRef.current)
    navigate('/onboarding')
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void onSubmit(e as unknown as FormEvent)
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

                <form onSubmit={onSubmit} className="login-chat-composer">
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
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
