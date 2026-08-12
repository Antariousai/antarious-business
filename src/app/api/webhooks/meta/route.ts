import { NextResponse } from 'next/server'
import { metaWebhookVerifyToken, metaConfigured } from '@/lib/meta/config'
import { verifyMetaWebhookSignature } from '@/lib/integrations/meta/client'
import { persistAndProcessWebhook } from '@/lib/integrations/meta/processWebhookEvent'

export const runtime = 'nodejs'
export const maxDuration = 60

/** Meta webhook verification challenge */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')
  const expected = metaWebhookVerifyToken()

  if (mode === 'subscribe' && expected && token === expected && challenge) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    })
  }
  return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
}

/** Ingest Meta webhook events (Instagram + Page messaging). */
export async function POST(request: Request) {
  if (!metaConfigured()) {
    return NextResponse.json({ error: 'Meta not configured' }, { status: 503 })
  }

  const rawBody = await request.text()
  const signature = request.headers.get('x-hub-signature-256')

  // Allow skip only in explicit local/dev when verify is disabled
  const skipSig = process.env.META_WEBHOOK_SKIP_SIGNATURE === '1' && process.env.NODE_ENV !== 'production'
  if (!skipSig && !verifyMetaWebhookSignature(rawBody, signature)) {
    console.error(JSON.stringify({ event: 'meta.webhook.invalid_signature' }))
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: unknown
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  console.info(
    JSON.stringify({
      event: 'meta.webhook.received',
      object: (payload as { object?: string })?.object,
    }),
  )

  // Persist + process; always 200 after valid signature so Meta does not storm retries
  try {
    const result = await persistAndProcessWebhook(payload)
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    console.error(
      JSON.stringify({
        event: 'meta.webhook.error',
        message: e instanceof Error ? e.message : String(e),
      }),
    )
    return NextResponse.json({ ok: false }, { status: 200 })
  }
}
