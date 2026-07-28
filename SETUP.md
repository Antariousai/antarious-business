# Antarious — local setup (Next.js + Supabase + OpenAI)

## Prerequisites
- Node 20+
- A [Supabase](https://supabase.com) project (Auth + Postgres)
- Optional: `OPENAI_API_KEY` or Vercel `AI_GATEWAY_API_KEY` for Freya agents

## 1. Install
```bash
npm install
cp .env.example .env.local
```

Fill `.env.local` with your Supabase URL, anon key, and service role key.

## 2. Database
Apply the migration in `supabase/migrations/20260726120000_init.sql`:

```bash
# Option A — Supabase CLI (linked project)
npx supabase link --project-ref YOUR_REF
npx supabase db push

# Option B — SQL editor
# Paste the migration file into the Supabase SQL editor and run it.
```

Enable Email auth (password) in Supabase → Authentication → Providers.

## 3. Run
```bash
npm run dev
```
Open http://localhost:3000

### Demo vs backend mode
| Mode | When | Behavior |
|------|------|----------|
| **Demo** | No `NEXT_PUBLIC_SUPABASE_*` env | Name-only login; domain contexts stay in **localStorage**. Ask Freya uses keyword intents (`freyaIntents`). |
| **Backend** | Supabase env set **and** signed-in session | Login is email/password; contexts load/mutate via `/api/*` (posts, templates, inbox, campaigns, leads, CRM, money, discover, team invites, Freya chat/approve, profile). |

Without a session (env set but logged out), the app stays on the login screen and does **not** revive demo localStorage.

## 4. Seed BD boutique demo
After signup + onboarding:
```bash
curl -X POST http://localhost:3000/api/demo/seed -H "Cookie: <session>"
```
Or call `POST /api/demo/seed` from the browser while signed in.

## 5. Freya agents
Set `OPENAI_API_KEY` or `AI_GATEWAY_API_KEY`. Without a key, `POST /api/freya/chat` returns a JSON offline stub so the UI still wires up. Demo mode never calls the chat API.

## 6. Deploy (Vercel)
- Import the repo, set the same env vars
- Remove any SPA rewrite leftovers (this repo’s `vercel.json` only defines cron)
- Cron: `GET /api/cron/daily` with `Authorization: Bearer $CRON_SECRET`

## 7. Production checklist

Run through this before pointing real users at the app.

### Environment variables (Vercel → Project → Settings → Environment Variables)
| Var | Scope | Notes |
|-----|-------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | all | Public — safe in the browser |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | all | Public anon key; RLS enforces access |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | **Never** prefix with `NEXT_PUBLIC_`. Used by `lib/supabase/admin.ts` (cron + invite accept) |
| `OPENAI_API_KEY` *or* `AI_GATEWAY_API_KEY` | server only | Without a key, Freya chat returns an offline stub |
| `CRON_SECRET` | server only | Required — `/api/cron/daily` rejects requests without `Authorization: Bearer $CRON_SECRET` |

### Migrations
- Apply **both** migration files in order:
  1. `supabase/migrations/20260726120000_init.sql`
  2. `supabase/migrations/20260726130000_mvp_final.sql` (money reconcile/ledger/cashflow, discover trends, credit/usage/audit insert policies)
- `npx supabase db push` (linked) applies anything unapplied.
- Regenerate types after schema changes: `npm run db:types`.

### Cron (`vercel.json`)
- `GET /api/cron/daily` marks overdue invoices and queues chase reminders. Uses the service-role client and requires `CRON_SECRET`.
- Configure the schedule in `vercel.json` (already wired). Add a discover refresh / credit-reset cron here later if desired.

### Storage buckets
- Buckets `post-media` and `receipts` are created by the init migration (`storage.buckets` insert) with authenticated-only RW policies. If your project blocks SQL bucket creation, create them manually in **Supabase → Storage** (private) and re-run the two storage policies.

### Service-role safety
- `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS. It is only imported by `src/lib/supabase/admin.ts` and used server-side in `/api/cron/daily` and `/api/team/invites/accept` (the invitee is not yet a member, so RLS can’t see the invite).
- Do not import `admin.ts` from client components. All other routes use the request-scoped session client (`lib/supabase/server.ts`) so RLS applies.

### AI metering, credits & rate limits
- Every agent run debits the credit ledger **and** writes an `ai_usage_events` row via `chargeAgentRun` (`src/lib/agents/usage.ts`). Streamed chat back-fills token counts on finish.
- Insufficient credits → `402`. Rate limit exceeded → `429`.
- Freya chat is capped at 20 turns/min per org; discover refresh at 6/min per org (`src/lib/rateLimit.ts`, in-memory per instance). For multi-instance horizontal scale, swap the store for a Supabase counter or Upstash.

### RLS
- RLS is enabled on every table. Policies are org-scoped via `is_org_member` / `can_edit_org` / `org_role`. The final migration adds the previously-missing insert policies for `ai_credit_ledger`, `ai_usage_events` (+ update), and `freya_audit_log`.
- Sanity check after deploy: sign in as two users in different orgs and confirm neither can read the other’s data.

### Team invites
- Email delivery is **out of scope** (no Resend/SMTP). Invites are stored with a token; owners copy the accept link from **Team → Copy invite link** (`/api/team/invites/accept?token=…`). If you enable Supabase Auth email templates later, you can send this link automatically.

## Key paths
| Area | Path |
|------|------|
| Migrations | `supabase/migrations/` |
| Supabase clients | `src/lib/supabase/{client,server,admin}.ts` |
| Backend mode | `src/lib/backend/` |
| Entitlements | `src/lib/entitlements.ts` |
| Freya agents | `src/lib/agents/` |
| APIs | `src/app/api/**` |
| UI routes | `src/app/(app)/app/**` |
| Page components | `src/views/**` |

### Backend coverage (backend mode)
- Money: invoices, bills, expenses, accounts, parties, **bank transactions, ledger accounts, cashflow snapshots** all persist via `/api/money`. Match / reconcile / exclude and Freya auto-match are wired to the API.
- CRM: full CRUD incl. **DELETE** for deals/contacts/companies; contact & company patches are **non-optimistic** (write → refresh).
- Discover: signals, ideas, insights, **trends, competitor watches** persist; `POST /api/discover/refresh` regenerates them.
- Team: invites stored; **accept flow** via `/api/team/invites/accept` (GET link + POST). Email send is out of scope.
- Prod hardening: agent routes rate-limited; every agent run debits credits + logs `ai_usage_events`; RLS insert policies added for ledger/usage/audit.

### Still out of scope (intentional)
- Live Meta / WhatsApp / bKash / Nagad send + payout APIs.
- Stripe / bKash subscription billing (credit ledger simulates packs).
- Transactional email (invite + reminder delivery) — links are copied manually.
- Usage-metering dashboard UI, Bangla i18n, competitor web scraping, bank open-banking sync.