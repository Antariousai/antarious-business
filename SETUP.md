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

## 5b. Freya product knowledge (Supabase Vector)
Official Antarious Business / Credit Score / Finance facts live in `docs/knowledge/Antarious_Freya_Training_Knowledge.md` and are embedded into `freya_knowledge_chunks` (pgvector). Freya calls `lookup_product_knowledge` at chat time.

1. Apply migration `supabase/migrations/20260806120000_freya_knowledge_vectors.sql` (`npx supabase db push` or SQL editor).
2. Ensure `OPENAI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` are in `.env.local`.
3. Ingest (re-run after editing the markdown):

```bash
npm run knowledge:ingest
```

Re-ingest deletes and replaces rows for source `antarious_training_knowledge_v1` only.

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
- Apply migrations in order under `supabase/migrations/` (init → mvp_final → later feature files, including `20260806120000_freya_knowledge_vectors.sql` for Freya product RAG).
- `npx supabase db push` (linked) applies anything unapplied.
- After knowledge migration: `npm run knowledge:ingest` (see §5b).
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
- Invites are emailed via **Resend** (`RESEND_API_KEY`, optional `RESEND_FROM`, default `Freya <invites@freya.antarious.com>`). Accept link: `/api/team/invites/accept?token=…`.
- Invitee must sign in with the **same email** the invite was sent to (work or personal). Owners can still **Copy invite link** if email delivery is unavailable.

## Key paths
| Area | Path |
|------|------|
| Migrations | `supabase/migrations/` |
| Supabase clients | `src/lib/supabase/{client,server,admin}.ts` |
| Backend mode | `src/lib/backend/` |
| Entitlements | `src/lib/entitlements.ts` |
| Freya agents | `src/lib/agents/` |
| Freya product knowledge | `docs/knowledge/`, `src/lib/knowledge/`, `scripts/ingest-freya-knowledge.ts` |
| APIs | `src/app/api/**` |
| UI routes | `src/app/(app)/app/**` |
| Page components | `src/views/**` |

### Backend coverage (backend mode)
- Money: invoices, bills, expenses, accounts, parties, **bank transactions, ledger accounts, cashflow snapshots** all persist via `/api/money`. Match / reconcile / exclude and Freya auto-match are wired to the API.
- CRM: full CRUD incl. **DELETE** for deals/contacts/companies; contact & company patches are **non-optimistic** (write → refresh).
- Discover: signals, ideas, insights, **trends, competitor watches** persist; `POST /api/discover/refresh` regenerates them.
- Team: invites emailed via Resend; **accept flow** via `/api/team/invites/accept` (GET link + POST). Copy-link fallback if Resend is not configured.
- Prod hardening: agent routes rate-limited; every agent run debits credits + logs `ai_usage_events`; RLS insert policies added for ledger/usage/audit.

### Still out of scope (intentional)
- Live Meta / WhatsApp / bKash / Nagad send + payout APIs.
- Stripe / bKash subscription billing (credit ledger simulates packs).
- Transactional email beyond team invites (invoice reminders, etc.).
- Usage-metering dashboard UI, Bangla i18n, competitor web scraping, bank open-banking sync.