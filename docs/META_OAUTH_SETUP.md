# Meta Page OAuth (Facebook / Instagram / Messenger)

This is the checklist for connecting real Meta Pages from Freya Settings on `https://app.antarious.com`.

## A. Meta Developer Dashboard

1. Open [https://developers.facebook.com/apps](https://developers.facebook.com/apps) (not `dev.meta.ai`).
2. Open your **Antarious AI** app.
3. **Use cases** — Customize:
   - Manage everything on your Page
   - Manage messaging & content on Instagram
   - Engage with customers on Messenger  
   (Skip ads MCP for now.)
4. **App settings → Basic**
   - App Domains: `app.antarious.com`
   - Privacy Policy URL: `https://app.antarious.com/privacy`
   - Terms / data deletion: real Antarious URLs (not facebook.com)
   - App icon uploaded
5. **Facebook Login** (or Facebook Login for Business) → **Settings**
   - Add **Valid OAuth Redirect URIs** (exact match):
     - `https://app.antarious.com/api/meta/oauth/callback`
     - `http://localhost:3000/api/meta/oauth/callback`
   - Save changes
6. **App roles** — you must be Admin/Developer/Tester while the app is in Development mode.
7. Copy **App ID** + **App Secret**.

## B. Vercel / env

Set on Vercel (Production) and in `.env.local` for local:

```
META_APP_ID=...
META_APP_SECRET=...
NEXT_PUBLIC_APP_URL=https://app.antarious.com
```

Redeploy after adding env vars.

## C. Database

Run migration:

`supabase/migrations/20260807010000_channel_meta_oauth.sql`

(SQL editor or `npx supabase db push`)

## D. Supabase redirect URLs (login only — NOT Meta)

Supabase → **Authentication → URL configuration**:

| Field | Value |
|-------|--------|
| Site URL | `https://app.antarious.com` |
| Redirect URLs | `https://app.antarious.com/**` |
| | `https://app.antarious.com/auth/callback` |
| | `https://app.antarious.com/auth/confirm` |
| | `https://app.antarious.com/auth/reset-password` |
| | `http://localhost:3000/**` (local) |

**Do not** add `/api/meta/oauth/callback` here. That URL belongs only in the **Meta** Facebook Login settings.

## E. Test on production

1. Sign in at `https://app.antarious.com`
2. Open **Settings → Connect platforms**
3. Click **Connect with Meta** on Facebook (or Instagram / Messenger)
4. Approve permissions → pick Page if asked
5. You should land back on Settings with Facebook (+ Messenger/Instagram if slots allow) marked connected via Meta

### Common errors

| Message / symptom | Fix |
|-------------------|-----|
| Meta OAuth is not configured | Missing `META_APP_ID` / `META_APP_SECRET` on Vercel |
| URL blocked / redirect_uri mismatch | Meta Valid OAuth Redirect URI must match exactly, including `https` |
| No Facebook Pages found | Your Facebook user must be admin of a Page |
| Invalid OAuth state | Cookie blocked / different domain — use `app.antarious.com` with matching `NEXT_PUBLIC_APP_URL` |
| Plan allows N channels | Disconnect a channel or upgrade (Starter = 2) |

Publish-to-feed: when a post is set to **published**, Antarious calls Meta Graph
(`/{page-id}/feed` or `/{page-id}/photos`) with the stored Page token so it appears
on the connected **Facebook Page** (not a personal profile).
