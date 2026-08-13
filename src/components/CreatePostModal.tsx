import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, ExternalLink, Film, ImagePlus, Upload, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { FreyaArtifactReview } from './FreyaArtifactReview'
import { FreyaCreationAssist } from './FreyaCreationAssist'
import { PlatformIcon } from './PlatformIcon'
import { type ContentPost, type Platform } from '../data/mockData'
import { useApp } from '../context/AppContext'
import { postPlatforms, type SavePostInput, useContent } from '../context/ContentContext'
import { useFreyaActivity } from '../context/FreyaActivityContext'
import { useBackendMode } from '@/lib/backend/BackendModeContext'
import { uploadPostMedia } from '@/lib/mediaUpload'
import { buildRevisePrompt } from '@/lib/freyaAskHandoff'
import {
  freyaDraftCaption,
  freyaPickPlatforms,
  freyaPickPostTag,
  type FreyaBizContext,
} from '../lib/freyaCreationHelpers'

type UploadedFile = {
  id: string
  url: string
  name: string
  kind: 'image' | 'video' | 'other'
  file?: File
  path?: string
  mimeType?: string
}

function fileKind(file: File): UploadedFile['kind'] {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type.startsWith('video/')) return 'video'
  return 'other'
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/** datetime-local value from ISO (or empty). */
function toLocalDatetimeValue(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromLocalDatetimeValue(local: string): string | undefined {
  if (!local.trim()) return undefined
  const d = new Date(local)
  if (Number.isNaN(d.getTime())) return undefined
  return d.toISOString()
}

export function CreatePostModal({
  onClose,
  post,
  initialCaption = '',
  initialPrompt = '',
  initialLeaveToFreya = false,
}: {
  onClose: () => void
  /** When set, opens in edit mode for an existing draft / scheduled / published post */
  post?: ContentPost
  initialCaption?: string
  initialPrompt?: string
  initialLeaveToFreya?: boolean
}) {
  const { createPost, updatePost } = useContent()
  const { prefs, profile } = useApp()
  const { askFreya, refresh: refreshFreyaActivity } = useFreyaActivity()
  const { backend } = useBackendMode()
  const bizCtx: FreyaBizContext = {
    businessName: profile?.businessName,
    industry: profile?.industry,
    customers: profile?.customers,
    goals: profile?.goals,
    platforms: profile?.platforms?.length ? profile.platforms : prefs.connectedPlatforms,
    tone: prefs.tone,
  }
  const connectedPlatforms = prefs.connectedPlatforms
  const hasConnectedPlatform = connectedPlatforms.length > 0
  const isEdit = Boolean(post)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadsRef = useRef<UploadedFile[]>([])

  const [prompt, setPrompt] = useState(initialPrompt)
  const [platforms, setPlatforms] = useState<Platform[]>(() => {
    if (post) return postPlatforms(post)
    if (connectedPlatforms.length) return [connectedPlatforms[0]!]
    if (bizCtx.platforms?.length) return [bizCtx.platforms[0]!]
    return ['Facebook', 'Instagram']
  })
  const [caption, setCaption] = useState(post?.caption ?? initialCaption)
  const [tag, setTag] = useState(post?.tag ?? 'Food')
  const [schedule, setSchedule] = useState(() => toLocalDatetimeValue(post?.scheduledAt))
  const [uploads, setUploads] = useState<UploadedFile[]>(
    post?.image
      ? [{ id: 'existing', url: post.image, name: 'Current media', kind: 'image' as const }]
      : [],
  )
  const [freyaDrafted, setFreyaDrafted] = useState(isEdit)
  const [applying, setApplying] = useState(false)
  const [building, setBuilding] = useState(false)
  const [mediaError, setMediaError] = useState<string | null>(null)
  const [mediaChanged, setMediaChanged] = useState(false)
  const [publishSuccess, setPublishSuccess] = useState<{
    permalink: string | null
  } | null>(null)

  uploadsRef.current = uploads

  useEffect(() => {
    return () => {
      uploadsRef.current.forEach((u) => {
        if (u.url.startsWith('blob:')) URL.revokeObjectURL(u.url)
      })
    }
  }, [])

  function runFreyaFill() {
    if (!prompt.trim()) return
    setApplying(true)
    window.setTimeout(() => {
      setCaption(freyaDraftCaption(prompt, initialCaption || post?.caption || undefined, bizCtx))
      setTag(freyaPickPostTag(prompt))
      setPlatforms(freyaPickPlatforms(prompt, bizCtx))
      setFreyaDrafted(true)
      setApplying(false)
    }, 550)
  }

  useEffect(() => {
    if (!isEdit && initialLeaveToFreya && initialPrompt.trim()) {
      runFreyaFill()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handoff(section?: string) {
    askFreya({
      prompt: buildRevisePrompt({
        kind: 'post',
        section,
        tone: prefs.tone,
        fields: {
          Caption: caption,
          Platforms: platforms.join(', '),
          Tag: tag,
          Schedule: schedule || 'Publish when ready',
        },
      }),
    })
  }

  async function addFiles(fileList: FileList | null) {
    if (!fileList?.length) return
    setMediaError(null)
    const next: UploadedFile[] = []
    for (const file of Array.from(fileList)) {
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        setMediaError('Only images and videos are supported.')
        continue
      }
      if (file.size > 25 * 1024 * 1024) {
        setMediaError(`“${file.name}” is over 25MB.`)
        continue
      }
      const url = file.type.startsWith('image/')
        ? await readFileAsDataUrl(file)
        : URL.createObjectURL(file)
      next.push({
        id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
        url,
        name: file.name,
        kind: fileKind(file),
        file,
        mimeType: file.type,
      })
    }
    if (next.length) {
      setUploads((prev) => [...prev, ...next])
      setMediaChanged(true)
    }
  }

  function removeUpload(id: string) {
    setUploads((prev) => {
      const target = prev.find((u) => u.id === id)
      if (target?.url.startsWith('blob:')) URL.revokeObjectURL(target.url)
      return prev.filter((u) => u.id !== id)
    })
    setMediaChanged(true)
    setMediaError(null)
  }

  async function resolveAssets(): Promise<SavePostInput['assets']> {
    if (!backend) return undefined
    if (!mediaChanged && isEdit) return undefined

    const assets: NonNullable<SavePostInput['assets']> = []
    for (const item of uploads) {
      if (item.path) {
        assets.push({ path: item.path, mimeType: item.mimeType, url: item.url })
        continue
      }
      if (!item.file) continue
      const uploaded = await uploadPostMedia(item.file)
      assets.push({
        path: uploaded.path,
        mimeType: uploaded.mimeType,
        url: uploaded.url,
      })
    }
    return assets
  }

  function buildInput(
    status: ContentPost['status'],
    assets?: SavePostInput['assets'],
  ): SavePostInput {
    const image = assets?.[0]?.url || uploads[0]?.url || ''
    return {
      platforms,
      caption: caption.trim(),
      tag,
      image,
      status,
      scheduledAt: fromLocalDatetimeValue(schedule),
      author: post?.author ?? 'You',
      assets,
    }
  }

  async function handleSubmit(action: 'save' | 'schedule' | 'publish') {
    if (!freyaDrafted && prompt.trim()) {
      runFreyaFill()
      return
    }

    let status: ContentPost['status']
    let republish = false

    if (!hasConnectedPlatform) {
      status = 'draft'
      republish = false
    } else if (action === 'schedule') {
      if (!fromLocalDatetimeValue(schedule)) {
        setMediaError('Pick a date and time to schedule.')
        return
      }
      status = 'scheduled'
      republish = true
    } else if (action === 'publish') {
      status = 'published'
      republish = true
    } else if (isEdit && post) {
      status = post.status === 'published' || post.status === 'scheduled' ? post.status : 'draft'
    } else {
      status = 'draft'
    }

    const publishPlatforms =
      status === 'draft'
        ? platforms
        : platforms.filter((p) => connectedPlatforms.includes(p))

    if (status !== 'draft' && publishPlatforms.length === 0) {
      status = 'draft'
      republish = false
      setMediaError('Connect a channel in Settings before scheduling or posting.')
      return
    }

    setBuilding(true)
    setMediaError(null)
    try {
      const assets = await resolveAssets()
      const input = buildInput(status, assets)
      const plats =
        (status === 'draft' ? platforms : publishPlatforms).length > 0
          ? status === 'draft'
            ? platforms
            : publishPlatforms
          : (['Facebook', 'Instagram'] as Platform[])
      input.platforms = plats
      if (status === 'draft') {
        input.scheduledAt = fromLocalDatetimeValue(schedule)
      } else if (status === 'scheduled') {
        input.scheduledAt = fromLocalDatetimeValue(schedule)
      } else if (status === 'published') {
        input.scheduledAt = undefined
      }
      const result =
        isEdit && post
          ? await updatePost(post.id, input, { republish })
          : await createPost(input)

      if (status === 'published') {
        void refreshFreyaActivity().catch(() => {})
        setPublishSuccess({
          permalink: result?.publishMeta?.permalink ?? null,
        })
        return
      }
      void refreshFreyaActivity().catch(() => {})
      onClose()
    } catch (err) {
      setMediaError(err instanceof Error ? err.message : 'Could not save draft. Try again.')
    } finally {
      setBuilding(false)
    }
  }

  const busy = applying || building
  const hasCaption = caption.trim().length > 0
  const canSave = hasCaption && freyaDrafted
  const selectedConnected = platforms.filter((p) => connectedPlatforms.includes(p))
  const canGoLive =
    hasConnectedPlatform && selectedConnected.length > 0 && hasCaption && freyaDrafted
  const canSchedule = canGoLive && Boolean(fromLocalDatetimeValue(schedule))
  const canPublish = canGoLive
  const isLivePost = post?.status === 'published' || post?.status === 'scheduled'
  const scheduleLabel = isLivePost && post?.status === 'scheduled' ? 'Update schedule' : 'Schedule'
  const publishLabel = !hasConnectedPlatform
    ? 'Connect a channel to post'
    : isLivePost && post?.status === 'published'
      ? 'Republish now'
      : 'Post now'

  if (publishSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]">
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Post published"
          className="w-full max-w-[420px] rounded-2xl bg-white p-6 shadow-2xl"
        >
          <div className="flex flex-col items-center text-center">
            <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-8 w-8" strokeWidth={2} />
            </span>
            <h2 className="text-[18px] font-bold text-ink">Post published</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-muted">
              Your post is live on your Facebook Page.
            </p>
            {publishSuccess.permalink ? (
              <a
                href={publishSuccess.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-sky px-5 py-2.5 text-[13px] font-bold text-white hover:bg-sky-bright"
              >
                <ExternalLink className="h-4 w-4" />
                View on Facebook
              </a>
            ) : (
              <p className="mt-4 text-[12px] text-muted">
                Open your Facebook Page to see it in the feed.
              </p>
            )}
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full rounded-full border border-slate-200 px-5 py-2.5 text-[13px] font-semibold text-slate-600 hover:bg-slate-50"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]">
      <div className="max-h-[90vh] w-full max-w-[560px] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
          <div>
            <h2 className="text-[18px] font-bold text-ink">{isEdit ? 'Edit post' : 'Create a post'}</h2>
            <p className="text-[12px] text-muted">
              {isEdit
                ? 'Review Freya&apos;s draft — use Ask Freya to change copy or targeting.'
                : 'Freya drafts captions · you upload images, GIFs, or video'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-ink"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          {!hasConnectedPlatform && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
              <p className="font-bold">No channel connected</p>
              <p className="mt-1 text-[12px] leading-relaxed">
                You can write and save drafts now. Connect Instagram, Facebook, or another channel in{' '}
                <Link to="/app/settings" className="font-bold underline" onClick={onClose}>
                  Settings
                </Link>{' '}
                to publish or schedule.
              </p>
            </div>
          )}

          <div className="rounded-2xl border border-sky/20 bg-gradient-to-br from-sky-soft/40 via-white to-amber-50/40 p-4">
            <label className="mb-2 block text-[13px] font-bold text-ink">
              Upload media <span className="font-normal text-muted">(images, GIFs, or video)</span>
            </label>
            <p className="mb-3 text-[12px] text-muted">
              Tap below to choose files from your device. Optional for drafts and text posts;
              recommended for feed posts.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,.gif"
              multiple
              className="sr-only"
              onChange={(e) => {
                void addFiles(e.target.files)
                e.target.value = ''
              }}
            />

            {uploads.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {uploads.map((file) => (
                  <div key={file.id} className="group relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    {file.kind === 'video' ? (
                      <video src={file.url} className="aspect-square w-full object-cover" muted />
                    ) : file.kind === 'image' ? (
                      <img src={file.url} alt={file.name} className="aspect-square w-full object-cover" />
                    ) : (
                      <div className="flex aspect-square flex-col items-center justify-center gap-1 p-2 text-center">
                        <Film className="h-6 w-6 text-slate-400" />
                        <span className="line-clamp-2 text-[10px] text-muted">{file.name}</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeUpload(file.id)}
                      className="absolute top-1.5 right-1.5 rounded-full bg-black/55 p-1 text-white opacity-0 transition group-hover:opacity-100"
                      aria-label={`Remove ${file.name}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  void addFiles(e.dataTransfer.files)
                }}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-sky/40 bg-white px-4 py-10 text-center transition hover:border-sky hover:bg-sky-soft/30"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-sky/10 text-sky">
                  <Upload className="h-6 w-6" />
                </span>
                <span className="text-[15px] font-bold text-ink">Choose photos or video</span>
                <span className="text-[12px] text-muted">or drag and drop here · PNG, JPG, GIF, MP4</span>
              </button>
            )}

            {uploads.length > 0 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-sky"
              >
                <ImagePlus className="h-3.5 w-3.5" />
                Add more files
              </button>
            )}

            {mediaError && (
              <p className="mt-3 rounded-xl border border-coral/30 bg-rose-50 px-3 py-2 text-[12px] font-semibold text-coral">
                {mediaError}
              </p>
            )}
          </div>

          <FreyaCreationAssist
            prompt={prompt}
            onPromptChange={setPrompt}
            onApplyPrompt={runFreyaFill}
            applying={applying}
            disabled={busy}
            applyLabel={
              isEdit ? 'Freya, re-draft post from prompt' : 'Freya, draft post from prompt'
            }
            placeholder={
              isEdit
                ? 'e.g. Refresh this post — warmer tone, highlight weekend hours'
                : 'e.g. Warm weekend post about new embroidered kurtis — friendly, local vibe'
            }
          />

          {!freyaDrafted && !applying && (
            <p className="rounded-xl border border-dashed border-sky/30 bg-sky-soft/30 px-4 py-3 text-[12px] text-muted">
              {isEdit
                ? 'Add a prompt and tap the arrow to re-draft, or save as-is. Use Ask Freya on the review card to tweak fields.'
                : 'Add a prompt and tap the arrow — Freya will draft your post for review.'}
            </p>
          )}

          {freyaDrafted && (
            <FreyaArtifactReview
              title={isEdit ? "Freya's draft (current post)" : "Freya's draft"}
              fields={[
                {
                  key: 'platforms',
                  label: 'Platforms',
                  value: platforms.join(', '),
                  children: (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {platforms.map((p) => (
                        <span
                          key={p}
                          className="inline-flex items-center gap-1 rounded-full bg-sky-soft px-2 py-0.5 text-[12px] font-semibold text-sky-bright"
                        >
                          <PlatformIcon platform={p} size={13} />
                          {p}
                        </span>
                      ))}
                    </div>
                  ),
                },
                { key: 'caption', label: 'Caption', value: caption },
                { key: 'tag', label: 'Tag', value: tag },
                {
                  key: 'schedule',
                  label: 'Schedule',
                  value: schedule
                    ? new Date(schedule).toLocaleString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Publish when ready',
                  children: (
                    <div className="mt-2">
                      <input
                        type="datetime-local"
                        value={schedule}
                        onChange={(e) => setSchedule(e.target.value)}
                        disabled={busy}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] text-ink outline-none focus:border-sky focus:ring-2 focus:ring-sky/20"
                      />
                      <p className="mt-1.5 text-[11px] text-muted">
                        Optional — set a time then tap Schedule, or leave blank and Post now.
                      </p>
                    </div>
                  ),
                },
              ]}
              onAskFreya={() => handoff()}
              onAskFreyaField={(_key, label) => handoff(label.toLowerCase())}
              onRegenerate={runFreyaFill}
              regenerating={applying}
            />
          )}
        </div>

        <div className="sticky bottom-0 flex flex-wrap justify-end gap-2 border-t border-slate-100 bg-white px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 px-5 py-2.5 text-[13px] font-semibold text-slate-600"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit('save')}
            disabled={!canSave || busy}
            className="rounded-full border border-sky/40 bg-white px-5 py-2.5 text-[13px] font-bold text-sky hover:bg-sky-soft disabled:border-slate-200 disabled:text-slate-400"
          >
            {building ? 'Saving…' : 'Save draft'}
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit('schedule')}
            disabled={!canSchedule || busy}
            className="rounded-full border border-amber-300 bg-amber-50 px-5 py-2.5 text-[13px] font-bold text-amber-800 hover:bg-amber-100 disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
          >
            {building ? 'Scheduling…' : scheduleLabel}
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit('publish')}
            disabled={!canPublish || busy}
            className="rounded-full bg-sky px-5 py-2.5 text-[13px] font-bold text-white hover:bg-sky-bright disabled:bg-sky-muted"
          >
            {building ? 'Posting…' : publishLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
