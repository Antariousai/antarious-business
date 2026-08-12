# Meta integration — manual test plan

Use a staging/production HTTPS URL (or an HTTPS tunnel to local) for webhooks.

## Prerequisites

1. Apply migration `supabase/migrations/20260811120000_meta_integration_foundation.sql`.
2. Set env vars from `.env.example` (at minimum `META_APP_ID`, `META_APP_SECRET`, `META_TOKEN_ENCRYPTION_KEY`, `META_WEBHOOK_VERIFY_TOKEN`, `NEXT_PUBLIC_APP_URL`).
3. In Meta Developer Dashboard for **Antarious AI**:
   - **Instagram** → Valid OAuth Redirect URI:  
     `https://<domain>/api/meta/instagram/oauth/callback`
   - **Facebook Login** → Valid OAuth Redirect URI:  
     `https://<domain>/api/meta/oauth/callback`
   - **Webhooks** Callback URL:  
     `https://<domain>/api/webhooks/meta`  
     Verify Token = `META_WEBHOOK_VERIFY_TOKEN`
   - Subscribe to Instagram messaging / comments fields you need (and Page messaging if using Messenger).
4. Sign in to Antarious as an org member.

## TEST A — Connection

1. Open **Settings → Connected channels**.
2. Click **Connect Instagram** (Instagram Business Login) **or** **Connect Facebook Page**.
3. Complete Meta authorization.

**Expected:** Redirect back to Settings with Connected status; Instagram shows `@username`. Tokens never appear in the browser Network response bodies from `/api/me`.

## TEST B — Account identity

1. In **Instagram / Meta diagnostics**, click **Sync account**.

**Expected:** Account matches the authorized IG user (e.g. `@antarious_test` in your test app). Not hardcoded.

## TEST C — Media sync

1. Click **Sync posts**.

**Expected:** Posts appear under diagnostics with caption/permalink/comment count. Idempotent re-sync does not duplicate rows.

## TEST D — Comments

```bash
curl -X POST "$APP_URL/api/meta/sync/comments" \
  -H "Cookie: <session>" \
  -H "Content-Type: application/json" \
  -d '{"providerPostId":"<media_id>"}'
```

**Expected:** Comments stored in `social_comments`.

## TEST E — Comment reply

```bash
curl -X PUT "$APP_URL/api/meta/sync/comments" \
  -H "Cookie: <session>" \
  -H "Content-Type: application/json" \
  -d '{"providerCommentId":"<comment_id>","text":"Test reply from Antarious AI"}'
```

**Expected:** Reply visible on Instagram.

## TEST F — Incoming DM (webhook-first)

1. From an external Instagram account, send: `Hello Antarious`.
2. Confirm Meta delivers to `/api/webhooks/meta`.

**Expected:**

- Row in `meta_webhook_events` → `processed`
- `social_contacts` upserted
- `inbox_threads` + inbound `inbox_messages`
- Messages UI shows conversation (polls every ~8s)

Do **not** rely on `GET /me/conversations` (may return `[]`).

## TEST G — Human reply

1. Open Inbox → thread → send `Hello! How can we help you?`

**Expected:** Message stored as outbound; appears in the external Instagram DM. Delivery status `sent` when Meta accepts.

## TEST H — AI suggestion

1. Click Ask Freya (suggest) on a thread with `What services do you provide?`

**Expected:** `freya_draft` created; **not** auto-sent to Meta until Approve.

## TEST I — Conversation sync (optional)

1. Diagnostics → **Test conversation sync**.

**Expected:** Succeeds even if remote count is `0`. Local conversations are **not** deleted.

## Local webhook development

1. Run `npm run dev`.
2. Expose HTTPS (any tunnel): map to `http://localhost:3000`.
3. Point Meta webhook to `https://<tunnel>/api/webhooks/meta`.
4. Never set `META_WEBHOOK_SKIP_SIGNATURE=1` in production.

## Duplicate delivery

Re-send the same webhook payload (Meta retry). **Expected:** `meta_webhook_events` unique on fingerprint; no duplicate `provider_message_id` messages.
