# Meta integration architecture (Antarious)

## Repository audit (Phase 0)

| Area | Finding |
|------|---------|
| Frontend | Next.js 15 App Router · React 19 · views under `src/views` · Settings / Inbox already Meta-aware |
| Backend | Route handlers in `src/app/api/**` · `requireOrgContext` org tenancy |
| DB | Supabase Postgres + RLS · org via `organizations` / `organization_members` |
| Auth | Supabase Auth · cookie SSR · `AuthGate` client routing |
| Existing Meta | **Facebook Page OAuth** in `src/lib/meta/*` + `/api/meta/oauth/*` storing Page tokens on `channel_connections` |
| Inbox | `inbox_threads` / `inbox_messages` · Freya drafts · `sent_stub` delivery · stub webhook only |
| CRM / Leads | Separate `crm_*` + `leads` · soft identity link later via `social_contacts.crm_contact_id` |
| Campaigns | Local campaign drafts · no Ads API |
| Jobs | Vercel cron `/api/cron/daily` only · **no queue** → webhook: persist then process inline+best-effort / cron drain |
| AI | Freya ToolLoopAgent · credits · **suggest replies only** by default |
| Encryption | **Missing** for Page tokens (plaintext today) — add AES-GCM envelope |
| Channels plan | `maxChannels` via entitlements |

### Critical existing pieces (reuse)

- `channel_connections` = SocialConnection (extend, do not fork)
- `inbox_threads` / `inbox_messages` = Conversation / Message (extend with provider IDs)
- Settings Connect UI (`SettingsPage`) — branch Instagram Login vs Facebook Page OAuth
- `docs/META_OAUTH_SETUP.md` — keep; supplement with this folder

### Dual auth modes (product decision)

1. **Facebook Page OAuth** (existing) — Facebook + Messenger (+ Page-linked IG Business account)
2. **Instagram Business Login** (API with Instagram Login) — matches manual Graph Explorer tests (`instagram_business_*` scopes, `/me` = IG user)

Instagram **Connect** prefers Instagram Business Login. Facebook / Messenger keep Page OAuth.

Historical `GET /me/conversations?platform=instagram` returning `[]` is **not** treated as an auth failure. Messaging is **webhook-first**.

## Proposed layout

```
src/lib/meta/                     # existing OAuth + graph helpers (kept)
src/lib/integrations/
  crypto/tokenEncryption.ts       # AES-GCM for access tokens
  social/types.ts                 # provider interfaces
  meta/
    client.ts                     # centralized Graph client (versioned)
    facebookProvider.ts
    instagramProvider.ts          # IG Login + Page-linked IG
    webhook.ts                    # verify + parse + normalize
    processWebhookEvent.ts        # idempotent processor
src/app/api/meta/
  oauth/*                         # existing Facebook Login
  instagram/oauth/*               # Instagram Business Login
  sync/{account,media,comments}/
  diagnostics/
  conversations/sync/             # optional; tolerate empty remote list
src/app/api/webhooks/meta/        # GET verify + POST ingest
src/app/api/social/               # posts list, comment reply (authenticated)
```

## Database changes

New migration `20260811120000_meta_integration_foundation.sql`:

| Concept | Approach |
|---------|----------|
| SocialConnection | Extend `channel_connections` (`access_token_enc`, `token_kind`, `last_synced_at`, `last_error`, `metadata`) |
| WebhookEvent | New `meta_webhook_events` (idempotent `provider`+`event_key`) |
| SocialPost | New `social_posts` (synced IG/FB media — separate from Antarious `content_posts`) |
| SocialComment | New `social_comments` |
| SocialContact | New `social_contacts` (+ optional `crm_contact_id`) |
| Conversation/Message | Add `provider_*` columns on `inbox_threads` / `inbox_messages` |
| AI mode | `freya_preferences.inbox_ai_mode` = `off` \| `suggest` \| `auto` (default `suggest`) |

## Security

- Never return tokens from `/api/me` or diagnostics
- Encrypt at rest with `META_TOKEN_ENCRYPTION_KEY` (32-byte base64); migrate-write: encrypt on save, decrypt on use
- Validate Meta webhook `X-Hub-Signature-256`
- OAuth `state` HMAC (existing `oauthState.ts`)
- All Meta calls server-side only

## Webhook processing (no durable queue yet)

1. Validate signature → insert `meta_webhook_events` (`RECEIVED`) → **200 ASAP**
2. Same request (or follow-up) marks `PROCESSING` → normalize → inbox/social rows → `PROCESSED`
3. Cron `/api/cron/daily` (and dedicated later) drains `RECEIVED`/`FAILED` with `attempts < N`
4. Duplicate `event_key` → ignore

## Messaging policy

- Inbound: webhooks create/update thread + message + social contact
- Outbound human send: decrypt token → Instagram/Messenger Send API → store OUTBOUND with provider message id
- Outbound Freya: **suggest only** (`inbox_ai_mode=suggest`); never auto-send unless `auto`
- Conversation history sync (`syncConversations`) optional; empty remote list does not wipe local

## Implementation phases (status)

1. Audit + this doc — **done**
2. Schema + encryption + Meta client — **done**
3. Instagram Login OAuth + Facebook Page OAuth (equal Settings options) — **done**
4. Media + comments sync + reply — **done**
5. Webhooks + inbox DM send + suggest-only AI — **done**
6. Diagnostics UI + TESTING.md — **done**
7. Automated unit tests (crypto / webhook verify / normalization) — **done** (`npm run test:meta`)

Inbox refreshes via **~8s polling** until Supabase Realtime is wired.

Product preference: Settings shows **Connect Instagram** and **Connect Facebook Page** as equal options.

## Files to modify (high level)

- `.env.example`
- `src/lib/meta/config.ts`, `saveConnection.ts`, Instagram auth routes
- `src/views/SettingsPage.tsx` (dual connect + diagnostics + posts)
- `src/app/api/inbox/messages/route.ts` (real Meta send when connected)
- `src/context/InboxContext.tsx` (polling + suggest endpoint)
- `docs/meta-integration/TESTING.md`
