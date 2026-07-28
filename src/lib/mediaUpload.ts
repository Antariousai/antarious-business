import { apiFetch } from '@/lib/backend/api'

export type UploadedMedia = {
  path: string
  url: string
  mimeType: string
  name?: string
}

/** Upload a local file to Supabase Storage via /api/uploads. */
export async function uploadPostMedia(file: File): Promise<UploadedMedia> {
  const form = new FormData()
  form.append('file', file)
  return apiFetch<UploadedMedia>('/api/uploads', {
    method: 'POST',
    body: form,
  })
}
