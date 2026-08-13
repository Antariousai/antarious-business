import { useEffect, useRef, useState } from 'react'
import { Film, ImagePlus, Upload, X } from 'lucide-react'
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
  const { askFreya } = useFreyaActivity()
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
  const [schedule] = useState(post?.scheduledAt ?? '')
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
      scheduledAt: schedule || undefined,
      author: post?.author ?? 'You',
      assets,
    }
  }

  async function handleSubmit(action: 'save' | 'publish') {
    if (!freyaDrafted && prompt.trim()) {
      runFreyaFill()
      return
    }

    let status: ContentPost['status']
    let republish = false

    if (!hasConnectedPlatform) {
      status = 'draft'
      republish = false
    } else if (isEdit && post) {
      if (action === 'publish') {
        status = schedule ? 'scheduled' : 'published'
        republish = true
      } else {
        status = post.status === 'published' || post.status === 'scheduled' ? post.status : 'draft'
      }
    } else {
      status = action === 'save' ? 'draft' : schedule ? 'scheduled' : 'published'
      republish = action === 'publish'
    }

    const publishPlatforms =
      status === 'draft'
        ? platforms
        : platforms.filter((p) => connectedPlatforms.includes(p))

    if (status !== 'draft' && publishPlatforms.length === 0) {
      status = 'draft'
      republish = false
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
        input.scheduledAt = undefined
      }
      if (isEdit && post) {
        await updatePost(post.id, input, { republish })
      } else {
        await createPost(input)
      }
      onClose()
    } catch (err) {
      setMediaError(err instanceof Error ? err.message : 'Could not save draft. Try again.')
    } finally {
      setBuilding(false)
    }
  }

  const busy = applying || building
  const hasCaption = caption.trim().length > 0
  const hasMedia = uploads.length > 0
  const canSave = hasCaption && freyaDrafted
  const selectedConnected = platforms.filter((p) => connectedPlatforms.includes(p))
  const canPublish =
    hasConnectedPlatform &&
    selectedConnected.length > 0 &&
    hasCaption &&
    hasMedia &&
    freyaDrafted
  const isLivePost = post?.status === 'published' || post?.status === 'scheduled'
  const publishLabel = !hasConnectedPlatform
    ? 'Connect a channel to publish'
    : schedule
      ? isLivePost
        ? 'Reschedule post'
        : 'Schedule post'
      : isLivePost
        ? 'Republish Now'
        : 'Publish Now'

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
              Tap below to choose files from your device. Required to publish; optional for drafts.
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
                  value: schedule || 'Publish when ready',
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
            {building ? 'Saving…' : isEdit ? 'Save changes' : 'Save draft'}
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit('publish')}
            disabled={!canPublish || busy}
            className="rounded-full bg-sky px-5 py-2.5 text-[13px] font-bold text-white hover:bg-sky-bright disabled:bg-sky-muted"
          >
            {building ? (isLivePost ? 'Republishing…' : 'Publishing…') : publishLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
