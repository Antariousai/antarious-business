import { useEffect, useRef, useState } from 'react'
import { Film, ImagePlus, Upload, X } from 'lucide-react'
import { FreyaCreationAssist } from './FreyaCreationAssist'
import { FreyaDraftReview, type FreyaDraftSection } from './FreyaDraftReview'
import { PLATFORM_OPTIONS, type ContentPost, type Platform } from '../data/mockData'
import { postPlatforms, type SavePostInput, useContent } from '../context/ContentContext'
import {
  freyaDraftCaption,
  freyaPickPlatforms,
  freyaPickPostTag,
} from '../lib/freyaCreationHelpers'

const TAGS = ['Food', 'Product', 'Lifestyle', 'Coffee']

type UploadedFile = {
  id: string
  url: string
  name: string
  kind: 'image' | 'video' | 'other'
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
  const isEdit = Boolean(post)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadsRef = useRef<UploadedFile[]>([])
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const [prompt, setPrompt] = useState(initialPrompt)
  const [leaveToFreya, setLeaveToFreya] = useState(isEdit ? false : initialLeaveToFreya)
  const [platforms, setPlatforms] = useState<Platform[]>(
    post ? postPlatforms(post) : ['Instagram'],
  )
  const [caption, setCaption] = useState(post?.caption ?? initialCaption)
  const [tag, setTag] = useState(post?.tag ?? 'Food')
  const [schedule, setSchedule] = useState(post?.scheduledAt ?? '')
  const [existingImage] = useState(post?.image ?? '')
  const [uploads, setUploads] = useState<UploadedFile[]>(
    post?.image
      ? [{ id: 'existing', url: post.image, name: 'Current media', kind: 'image' as const }]
      : [],
  )
  const [freyaDrafted, setFreyaDrafted] = useState(false)
  const [showManualEditor, setShowManualEditor] = useState(isEdit)
  const [applying, setApplying] = useState(false)
  const [building, setBuilding] = useState(false)

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
      setCaption(freyaDraftCaption(prompt, initialCaption || post?.caption || undefined))
      setTag(freyaPickPostTag(prompt))
      setPlatforms(freyaPickPlatforms(prompt))
      setFreyaDrafted(true)
      setShowManualEditor(false)
      setApplying(false)
    }, 550)
  }

  useEffect(() => {
    if (!isEdit && initialLeaveToFreya && initialPrompt.trim()) {
      runFreyaFill()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleLeaveToFreyaChange(value: boolean) {
    setLeaveToFreya(value)
    if (value) {
      setShowManualEditor(false)
      if (prompt.trim()) runFreyaFill()
    } else {
      setShowManualEditor(true)
    }
  }

  function openEditor(section: FreyaDraftSection) {
    setShowManualEditor(true)
    window.setTimeout(() => {
      const key = section === 'all' ? 'platforms' : section
      sectionRefs.current[key]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 50)
  }

  function togglePlatform(p: Platform) {
    setPlatforms((prev) =>
      prev.includes(p) ? (prev.length > 1 ? prev.filter((x) => x !== p) : prev) : [...prev, p],
    )
  }

  async function addFiles(fileList: FileList | null) {
    if (!fileList?.length) return
    const next: UploadedFile[] = []
    for (const file of Array.from(fileList)) {
      const url = file.type.startsWith('image/') ? await readFileAsDataUrl(file) : URL.createObjectURL(file)
      next.push({
        id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
        url,
        name: file.name,
        kind: fileKind(file),
      })
    }
    setUploads((prev) => [...prev, ...next])
  }

  function removeUpload(id: string) {
    setUploads((prev) => {
      const target = prev.find((u) => u.id === id)
      if (target?.url.startsWith('blob:')) URL.revokeObjectURL(target.url)
      return prev.filter((u) => u.id !== id)
    })
  }

  function buildInput(status: ContentPost['status']): SavePostInput {
    const image = uploads[0]?.url || existingImage
    return {
      platforms,
      caption: caption.trim(),
      tag,
      image,
      status,
      scheduledAt: schedule || undefined,
      author: post?.author ?? 'You',
    }
  }

  function handleSubmit(action: 'save' | 'publish') {
    if (!isEdit && leaveToFreya && !freyaDrafted && prompt.trim()) {
      runFreyaFill()
      return
    }

    if (isEdit && leaveToFreya && !freyaDrafted && prompt.trim()) {
      runFreyaFill()
      return
    }

    let status: ContentPost['status']
    let republish = false

    if (isEdit && post) {
      if (action === 'publish') {
        status = schedule ? 'scheduled' : 'published'
        republish = true
      } else {
        status = post.status
      }
    } else {
      status = action === 'save' ? 'draft' : schedule ? 'scheduled' : 'published'
      republish = action === 'publish'
    }

    setBuilding(true)
    window.setTimeout(() => {
      const input = buildInput(status)
      if (isEdit && post) {
        updatePost(post.id, input, { republish })
      } else {
        createPost(input)
      }
      setBuilding(false)
      onClose()
    }, action === 'publish' ? 600 : 400)
  }

  const busy = applying || building
  const hasCaption = caption.trim().length > 0
  const hasMedia = uploads.length > 0 || Boolean(existingImage)
  const fullAutoReady = !leaveToFreya || freyaDrafted
  const canSave = hasCaption && fullAutoReady
  const canPublish = hasCaption && platforms.length > 0 && hasMedia && fullAutoReady
  const isLivePost = post?.status === 'published' || post?.status === 'scheduled'
  const publishLabel = schedule
    ? isLivePost
      ? 'Reschedule post'
      : 'Schedule post'
    : isLivePost
      ? 'Republish Now'
      : 'Publish Now'
  const showReview = leaveToFreya && freyaDrafted && !showManualEditor
  const showManualFields = !leaveToFreya || showManualEditor

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]">
      <div className="max-h-[90vh] w-full max-w-[560px] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
          <div>
            <h2 className="text-[18px] font-bold text-ink">{isEdit ? 'Edit post' : 'Create a post'}</h2>
            <p className="text-[12px] text-muted">
              {isEdit
                ? 'Edit anytime — save changes or republish live. Freya can re-draft too.'
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
          <FreyaCreationAssist
            prompt={prompt}
            onPromptChange={setPrompt}
            leaveToFreya={leaveToFreya}
            onLeaveToFreyaChange={handleLeaveToFreyaChange}
            onApplyPrompt={runFreyaFill}
            applying={applying}
            disabled={busy}
            applyLabel={
              isEdit
                ? leaveToFreya
                  ? 'Freya, re-draft post from prompt'
                  : 'Freya, update caption from prompt'
                : leaveToFreya
                  ? 'Freya, draft post from prompt'
                  : 'Freya, write caption from prompt'
            }
            placeholder={
              isEdit
                ? 'e.g. Refresh this post — warmer tone, highlight weekend hours'
                : 'e.g. Warm weekend post about fresh croissants & coffee — friendly, local vibe'
            }
          />

          <div>
            <label className="mb-2 block text-[13px] font-semibold text-ink">
              Media <span className="font-normal text-muted">(required to publish)</span>
            </label>
            <p className="mb-3 text-[12px] text-muted">
              Upload your own images, GIFs, or video — Freya does not generate media.
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
                className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center transition hover:border-sky/40 hover:bg-sky-soft/30"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-sky/10 text-sky">
                  <Upload className="h-5 w-5" />
                </span>
                <span className="text-[14px] font-semibold text-ink">Upload files</span>
                <span className="text-[12px] text-muted">PNG, JPG, GIF, MP4, and more</span>
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
          </div>

          {leaveToFreya && !freyaDrafted && !applying && (
            <p className="rounded-xl border border-dashed border-sky/30 bg-sky-soft/30 px-4 py-3 text-[12px] text-muted">
              {isEdit
                ? 'Tap the arrow — Freya will re-draft from your prompt for you to review before republishing.'
                : 'Add a prompt and tap the arrow — Freya will draft your post for review. Manual fields stay hidden until she\'s done.'}
            </p>
          )}

          {showReview && (
            <FreyaDraftReview
              platforms={platforms}
              caption={caption}
              tag={tag}
              schedule={schedule}
              onEdit={openEditor}
              onRegenerate={runFreyaFill}
              regenerating={applying}
            />
          )}

          {showManualFields && (
            <>
              {!isEdit && leaveToFreya && freyaDrafted && (
                <button
                  type="button"
                  onClick={() => setShowManualEditor(false)}
                  className="text-[12px] font-semibold text-sky hover:underline"
                >
                  ← Back to Freya&apos;s draft review
                </button>
              )}

              <div ref={(el) => { sectionRefs.current.platforms = el }}>
                <label className="mb-2 block text-[13px] font-semibold text-ink">
                  Platforms <span className="font-normal text-muted">(select all that apply)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORM_OPTIONS.map((p) => {
                    const on = platforms.includes(p)
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => togglePlatform(p)}
                        className={`rounded-full border px-4 py-2 text-[13px] font-semibold transition ${
                          on
                            ? 'border-sky bg-sky-soft text-sky-bright'
                            : 'border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div ref={(el) => { sectionRefs.current.caption = el }}>
                <label className="mb-2 block text-[13px] font-semibold text-ink">Caption</label>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={4}
                  placeholder="Write or edit your caption"
                  className="w-full resize-none rounded-xl border border-slate-200 px-3.5 py-3 text-[14px] outline-none focus:border-sky focus:ring-2 focus:ring-sky/20"
                />
              </div>

              <div ref={(el) => { sectionRefs.current.tag = el }}>
                <label className="mb-2 block text-[13px] font-semibold text-ink">Tag</label>
                <div className="flex flex-wrap gap-2">
                  {TAGS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTag(t)}
                      className={`rounded-full px-3.5 py-1.5 text-[12px] font-semibold ${
                        tag === t ? 'bg-sky text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div ref={(el) => { sectionRefs.current.schedule = el }}>
                <label className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-ink">
                  Schedule for (optional)
                </label>
                <input
                  type="datetime-local"
                  value={schedule}
                  onChange={(e) => setSchedule(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm outline-none focus:border-sky focus:ring-2 focus:ring-sky/20"
                />
                {schedule && (
                  <p className="mt-1.5 text-[11px] text-muted">
                    {isLivePost
                      ? 'Reschedule applies when you republish — Save keeps the current live time.'
                      : 'Scheduled time applies when you publish — Save draft keeps it unpublished.'}
                  </p>
                )}
              </div>
            </>
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
            onClick={() => handleSubmit('save')}
            disabled={!canSave || busy}
            className="rounded-full border border-sky/40 bg-white px-5 py-2.5 text-[13px] font-bold text-sky hover:bg-sky-soft disabled:border-slate-200 disabled:text-slate-400"
          >
            {building ? 'Saving…' : isEdit ? 'Save changes' : 'Save draft'}
          </button>
          <button
            type="button"
            onClick={() => handleSubmit('publish')}
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
