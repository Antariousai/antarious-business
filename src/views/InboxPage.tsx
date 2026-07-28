import { useEffect, useRef, useState } from 'react'
import { Bookmark, Check, Inbox, MessageCircle, Pencil, Send, Sparkles } from 'lucide-react'
import { Avatar } from '../components/Avatar'
import { FreyaAvatar } from '../components/FreyaAvatar'
import { PlatformBadge, PlatformIcon } from '../components/PlatformIcon'
import { useInbox } from '../context/InboxContext'
import { CHANNEL_META, type InboxChannel, type InboxMessage } from '../data/inboxData'

const CHANNEL_CHIP: Record<InboxChannel | 'all', { active: string; idle: string }> = {
  all: {
    active: 'bg-navy-deep text-white shadow-sm',
    idle: 'bg-white/80 text-ink ring-1 ring-sky/20 hover:bg-sky-soft/50',
  },
  facebook: {
    active: 'bg-[#1877F2] text-white shadow-sm shadow-blue-300/40',
    idle: 'bg-blue-50 text-[#1877F2] ring-1 ring-blue-200 hover:bg-blue-100',
  },
  instagram: {
    active: 'bg-gradient-to-r from-[#F77737] via-[#FD1D1D] to-coral text-white shadow-sm',
    idle: 'bg-rose-50 text-rose-600 ring-1 ring-rose-200 hover:bg-rose-100',
  },
  whatsapp: {
    active: 'bg-[#25D366] text-white shadow-sm',
    idle: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100',
  },
  messenger: {
    active: 'bg-[#0084FF] text-white shadow-sm shadow-sky/30',
    idle: 'bg-sky-soft text-sky-bright ring-1 ring-sky/25 hover:bg-sky/15',
  },
}

export function InboxPage() {
  const {
    filteredThreads,
    activeThread,
    activeId,
    setActiveId,
    unreadCount,
    channelFilter,
    setChannelFilter,
    approveDraft,
    updateDraft,
    discardDraft,
    sendReply,
    askFreyaDraft,
    approveAllDrafts,
    threads,
  } = useInbox()
  const [reply, setReply] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [batchMsg, setBatchMsg] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const draftCount = threads.filter((t) => t.messages.some((m) => m.kind === 'freya-draft')).length

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeThread?.messages.length, activeId])

  function onSend() {
    if (!activeThread || !reply.trim()) return
    sendReply(activeThread.id, reply)
    setReply('')
  }

  function onApproveAll() {
    const n = approveAllDrafts()
    setBatchMsg(n ? `Freya sent ${n} approved ${n === 1 ? 'reply' : 'replies'}.` : 'No drafts waiting.')
    setTimeout(() => setBatchMsg(null), 3000)
  }

  return (
    <div className="absolute inset-0 flex overflow-hidden bg-page">
      <aside className="flex w-[320px] shrink-0 flex-col border-r border-sky/15 bg-gradient-to-b from-sky-soft/80 via-white to-peach/15">
        <div className="relative overflow-hidden border-b border-sky/15 px-4 py-4">
          <div className="pointer-events-none absolute -top-8 -right-8 h-28 w-28 rounded-full bg-sunshine/25 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-6 -left-6 h-20 w-20 rounded-full bg-mint/20 blur-xl" />
          <div className="relative">
            <div className="mb-1 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-sky to-sky-bright text-white shadow-sm shadow-sky/30">
                <Inbox className="h-4 w-4" />
              </span>
              <h2 className="text-[20px] font-bold text-ink">Messages</h2>
              {unreadCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-r from-coral to-rose-500 px-1.5 text-[11px] font-bold text-white shadow-sm shadow-coral/30">
                  {unreadCount}
                </span>
              )}
            </div>
            <p className="text-[12px] text-muted">Freya drafts every reply — you just approve.</p>
            {draftCount > 0 && (
              <button
                type="button"
                onClick={onApproveAll}
                className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-sky-bright via-sky-bright to-mint px-3 py-2.5 text-[12px] font-bold text-white shadow-md shadow-sky/25 hover:brightness-105"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Freya: approve all drafts ({draftCount})
              </button>
            )}
            {batchMsg && (
              <p className="mt-2 rounded-lg bg-mint/15 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-mint/30">
                {batchMsg}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'facebook', label: 'Facebook' },
                  { id: 'instagram', label: 'Instagram' },
                  { id: 'whatsapp', label: 'WhatsApp' }, { id: 'messenger', label: 'Messenger' },
                ] as const
              ).map((c) => {
                const chip = CHANNEL_CHIP[c.id]
                const active = channelFilter === c.id
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setChannelFilter(c.id)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold transition ${
                      active ? chip.active : chip.idle
                    }`}
                  >
                    {c.id !== 'all' && (
                      <PlatformIcon
                        platform={c.id}
                        size={12}
                        tone={active ? 'white' : 'brand'}
                      />
                    )}
                    {c.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredThreads.map((thread) => {
            const active = thread.id === activeId
            return (
              <button
                key={thread.id}
                type="button"
                onClick={() => setActiveId(thread.id)}
                className={`relative flex w-full items-start gap-3 border-b border-sky/10 px-4 py-3.5 text-left transition ${
                  active
                    ? 'bg-gradient-to-r from-sky-soft/70 via-white to-peach/10 shadow-inner'
                    : 'hover:bg-sky-soft/25'
                }`}
              >
                {active && (
                  <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-gradient-to-b from-sky via-sky-bright to-mint" />
                )}
                <div className="relative shrink-0">
                  <Avatar letter={thread.name.charAt(0)} size={42} color={thread.avatarColor} />
                  <ChannelBadge channel={thread.channel} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`truncate text-[13.5px] ${
                        thread.unread ? 'font-bold text-ink' : 'font-semibold text-ink'
                      }`}
                    >
                      {thread.name}
                    </span>
                    {thread.unread && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-gradient-to-r from-coral to-sky shadow-sm" />
                    )}
                    <span className="ml-auto shrink-0 text-[11px] font-medium text-muted">{thread.updatedAt}</span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 truncate text-[12px] text-muted">
                    <PlatformIcon platform={thread.channel} size={12} className="shrink-0" />
                    <span className="truncate">{thread.preview}</span>
                  </div>
                </div>
              </button>
            )
          })}
          {!filteredThreads.length && (
            <div className="mx-4 my-8 rounded-2xl border border-dashed border-sky/30 bg-gradient-to-br from-sky-soft/50 to-white px-4 py-10 text-center">
              <MessageCircle className="mx-auto mb-2 h-8 w-8 text-sky/60" />
              <p className="text-[13px] font-semibold text-ink">No conversations here</p>
              <p className="mt-0.5 text-[12px] text-muted">Try another channel filter.</p>
            </div>
          )}
        </div>
      </aside>

      {activeThread ? (
        <section className="flex min-w-0 flex-1 flex-col bg-white">
          <header className="border-b border-sky/15 bg-gradient-to-r from-white via-sky-soft/20 to-peach/10 px-5 py-3.5">
            <div className="flex items-start gap-3">
              <Avatar letter={activeThread.name.charAt(0)} size={40} color={activeThread.avatarColor} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <div className="min-w-0 truncate text-[15px] font-bold text-ink">
                    {activeThread.name}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
                    {activeThread.freyaHandling && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gradient-to-r from-sky-bright/15 to-sky-soft px-2.5 py-1 text-[11px] font-bold text-sky-bright ring-1 ring-sky/25">
                        <Sparkles className="h-3 w-3 text-sky-bright" />
                        Freya handling
                      </span>
                    )}
                    <button
                      type="button"
                      className="inline-flex shrink-0 items-center gap-1 rounded-full bg-sunshine/15 px-2.5 py-1 text-[12px] font-semibold text-amber-800 ring-1 ring-sunshine/40 hover:bg-sunshine/25"
                    >
                      <Bookmark className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Saved replies</span>
                      <span className="sm:hidden">Replies</span>
                    </button>
                  </div>
                </div>
                <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[12px] text-muted">
                  <span className="truncate">{activeThread.handle}</span>
                  <span className="text-slate-300">·</span>
                  <span className="inline-flex items-center gap-1.5 font-semibold" style={{ color: CHANNEL_META[activeThread.channel].color }}>
                    <PlatformIcon platform={activeThread.channel} size={14} />
                    {CHANNEL_META[activeThread.channel].label}
                  </span>
                </div>
              </div>
            </div>
          </header>

          <div className="flex-1 space-y-4 overflow-y-auto bg-gradient-to-b from-sky-soft/25 via-page to-peach/10 px-5 py-5">
            {activeThread.messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                editing={editingId === msg.id}
                editText={editText}
                onStartEdit={() => {
                  setEditingId(msg.id)
                  setEditText(msg.text)
                }}
                onEditChange={setEditText}
                onSaveEdit={() => {
                  updateDraft(activeThread.id, msg.id, editText)
                  setEditingId(null)
                }}
                onCancelEdit={() => setEditingId(null)}
                onApprove={() => approveDraft(activeThread.id, msg.id)}
                onDiscard={() => discardDraft(activeThread.id, msg.id)}
              />
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-sky/15 bg-gradient-to-r from-white to-sky-soft/20 px-4 py-3">
            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={() => askFreyaDraft(activeThread.id)}
                className="mb-1 inline-flex items-center gap-1 rounded-full border border-sky/50 bg-gradient-to-r from-sky-bright/10 to-sky-soft px-3 py-2 text-[12px] font-bold text-sky-bright hover:from-sky-bright hover:to-sky-bright hover:text-white"
                title="Let Freya draft a reply"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Freya
              </button>
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    onSend()
                  }
                }}
                rows={2}
                placeholder="Type a reply, or let Freya handle it..."
                className="max-h-28 min-h-[44px] flex-1 resize-none rounded-xl border border-sky/25 bg-white px-3.5 py-2.5 text-[14px] shadow-sm outline-none focus:border-sky focus:ring-2 focus:ring-sky/20"
              />
              <button
                type="button"
                onClick={onSend}
                disabled={!reply.trim()}
                className="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-sky to-sky-bright text-white shadow-md shadow-sky/30 hover:brightness-105 disabled:bg-sky-muted disabled:shadow-none"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center bg-gradient-to-br from-sky-soft/30 via-white to-mint/10">
          <div className="rounded-2xl border border-sky/20 bg-white/80 px-10 py-12 text-center shadow-lg shadow-sky/10 backdrop-blur-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky via-sky-bright to-mint text-white shadow-md shadow-sky/30">
              <MessageCircle className="h-7 w-7" />
            </div>
            <p className="text-[15px] font-bold text-ink">Select a conversation</p>
            <p className="mt-1 text-[13px] text-muted">Freya has drafts ready — pick a thread to review.</p>
          </div>
        </div>
      )}
    </div>
  )
}

function MessageBubble({
  message,
  editing,
  editText,
  onStartEdit,
  onEditChange,
  onSaveEdit,
  onCancelEdit,
  onApprove,
  onDiscard,
}: {
  message: InboxMessage
  editing: boolean
  editText: string
  onStartEdit: () => void
  onEditChange: (v: string) => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onApprove: () => void
  onDiscard: () => void
}) {
  if (message.kind === 'customer') {
    return (
      <div className="flex max-w-[75%] flex-col items-start gap-1">
        <div className="rounded-2xl rounded-bl-md border border-sky/20 bg-white px-4 py-2.5 text-[14px] leading-relaxed text-ink shadow-md shadow-sky/5">
          {message.text}
        </div>
        <span className="px-1 text-[11px] font-medium text-muted">{message.time}</span>
      </div>
    )
  }

  if (message.kind === 'you') {
    return (
      <div className="ml-auto flex max-w-[75%] flex-col items-end gap-1">
        <div className="rounded-2xl rounded-br-md bg-gradient-to-br from-sky to-sky-bright px-4 py-2.5 text-[14px] leading-relaxed text-white shadow-md shadow-sky/25">
          {message.text}
        </div>
        <span className="px-1 text-[11px] font-medium text-muted">{message.time}</span>
      </div>
    )
  }

  return (
    <div className="ml-auto flex max-w-[80%] flex-col items-end gap-1.5">
      <div className="w-full rounded-2xl rounded-br-md border border-sky/60 bg-gradient-to-br from-sky-soft/90 via-sky-soft/80 to-white px-4 py-3 shadow-md shadow-sky/50 ring-1 ring-sky/15">
        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-sky-bright">
          <FreyaAvatar size={18} />
          Freya&apos;s draft
        </div>
        {editing ? (
          <textarea
            value={editText}
            onChange={(e) => onEditChange(e.target.value)}
            rows={3}
            className="mb-3 w-full resize-none rounded-xl border border-sky/40 bg-white px-3 py-2 text-[14px] text-ink outline-none focus:ring-2 focus:ring-sky/20"
            autoFocus
          />
        ) : (
          <p className="mb-3 text-[14px] leading-relaxed text-ink">{message.text}</p>
        )}
        <div className="flex flex-wrap gap-2">
          {editing ? (
            <>
              <button
                type="button"
                onClick={onCancelEdit}
                className="rounded-full border border-sky/20 bg-white px-3 py-1.5 text-[12px] font-semibold text-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onSaveEdit}
                className="rounded-full bg-gradient-to-r from-sky to-sky-bright px-3 py-1.5 text-[12px] font-bold text-white shadow-sm"
              >
                Save draft
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onStartEdit}
                className="inline-flex items-center gap-1 rounded-full border border-sky/25 bg-white px-3 py-1.5 text-[12px] font-semibold text-ink hover:bg-sky-soft/50"
              >
                <Pencil className="h-3 w-3" />
                Edit
              </button>
              <button
                type="button"
                onClick={onDiscard}
                className="rounded-full px-3 py-1.5 text-[12px] font-semibold text-muted hover:text-coral"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={onApprove}
                className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-mint to-emerald-500 px-3.5 py-1.5 text-[12px] font-bold text-white shadow-sm shadow-emerald-300/40 hover:brightness-105"
              >
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
                Approve & send
              </button>
            </>
          )}
        </div>
      </div>
      <span className="px-1 text-[11px] font-medium text-muted">{message.time}</span>
    </div>
  )
}

function ChannelBadge({ channel }: { channel: InboxChannel }) {
  return <PlatformBadge platform={channel} />
}
