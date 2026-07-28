import { createClient } from '@/lib/supabase/server'
import { requireOrgContext, jsonError } from '@/lib/org/context'

export const runtime = 'nodejs'

const MAX_BYTES = 25 * 1024 * 1024 // 25MB
const ALLOWED_PREFIXES = ['image/', 'video/']

function extFromName(name: string, mime: string) {
  const fromName = name.split('.').pop()?.toLowerCase()
  if (fromName && /^[a-z0-9]{1,8}$/.test(fromName)) return fromName
  if (mime === 'image/jpeg') return 'jpg'
  if (mime === 'image/png') return 'png'
  if (mime === 'image/gif') return 'gif'
  if (mime === 'image/webp') return 'webp'
  if (mime === 'video/mp4') return 'mp4'
  if (mime === 'video/webm') return 'webm'
  return 'bin'
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const ctx = await requireOrgContext(supabase)

    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      return Response.json({ error: 'file required' }, { status: 400 })
    }
    if (file.size <= 0 || file.size > MAX_BYTES) {
      return Response.json({ error: 'File must be under 25MB' }, { status: 400 })
    }
    const mime = file.type || 'application/octet-stream'
    if (!ALLOWED_PREFIXES.some((p) => mime.startsWith(p))) {
      return Response.json({ error: 'Only images and videos are allowed' }, { status: 400 })
    }

    const ext = extFromName(file.name || 'upload', mime)
    const path = `${ctx.organizationId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabase.storage.from('post-media').upload(path, buffer, {
      contentType: mime,
      upsert: false,
    })
    if (uploadError) {
      throw new Error(
        uploadError.message.includes('Bucket not found')
          ? 'Storage bucket "post-media" is missing. Create it in Supabase → Storage (private).'
          : uploadError.message,
      )
    }

    const { data: signed, error: signError } = await supabase.storage
      .from('post-media')
      .createSignedUrl(path, 60 * 60 * 24 * 30)
    if (signError) throw signError

    return Response.json({
      path,
      url: signed.signedUrl,
      mimeType: mime,
      name: file.name,
    })
  } catch (err) {
    return jsonError(err)
  }
}
