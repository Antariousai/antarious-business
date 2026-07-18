import { audienceWord, type PlanTier } from '../data/planTiers'

export type FreyaNavState = Record<string, unknown>

export type FreyaIntentAction =
  | 'approveAll'
  | 'approveInbox'
  | 'openTour'
  | 'openActivity'
  | 'closePanel'

export interface FreyaIntentResult {
  reply: string
  navigate?: string
  navigateState?: FreyaNavState
  actions?: FreyaIntentAction[]
}

export interface FreyaIntentContext {
  waitingCount: number
  overdueCount: number
  ownerName: string
  businessName: string
  tone: 'warm' | 'professional' | 'playful'
  customers?: string
  industry?: string
  audienceServe?: 'customers' | 'clients' | 'both'
  planTier?: PlanTier
}

function tonePrefix(tone: FreyaIntentContext['tone'], owner: string) {
  if (tone === 'professional') return `Understood, ${owner}.`
  if (tone === 'playful') return `On it, ${owner}!`
  return `Got it, ${owner}.`
}

function peopleWord(ctx: FreyaIntentContext) {
  return audienceWord(ctx.customers, ctx.industry, ctx.audienceServe)
}

/** Keyword intents that actually move the product. */
export function parseFreyaIntent(raw: string, ctx: FreyaIntentContext): FreyaIntentResult {
  const text = raw.trim().toLowerCase()
  const p = tonePrefix(ctx.tone, ctx.ownerName)
  const biz = ctx.businessName
  const people = peopleWord(ctx)

  if (/tour|walk me|show me around|get started|first run|onboarding/.test(text)) {
    return {
      reply: `${p} I'll walk you through approving a draft, checking Messages, and seeing a post Freya drafted — about a minute.`,
      actions: ['openTour', 'closePanel'],
    }
  }

  if (/approve all|clear (the )?queue|handle (it|everything)|let freya|approve waiting|ok everything/.test(text)) {
    if (ctx.waitingCount === 0) {
      return {
        reply: `${p} Nothing's waiting — you're clear. Want a tour of what I can do next?`,
      }
    }
    return {
      reply: `${p} Approving all ${ctx.waitingCount} waiting item${ctx.waitingCount === 1 ? '' : 's'} and sending message drafts. Check Activity for the paper trail.`,
      actions: ['approveAll', 'approveInbox', 'openActivity'],
    }
  }

  if (/approve|needs? (my |your )?ok|waiting/.test(text) && !/invoice|money|bill/.test(text)) {
    return {
      reply: `${p} You have ${ctx.waitingCount} item${ctx.waitingCount === 1 ? '' : 's'} waiting. Opening Activity so you can approve or edit.`,
      actions: ['openActivity'],
    }
  }

  if (/draft (a )?post|new post|write (a )?post|create (a )?post|post something/.test(text)) {
    return {
      reply: `${p} Opening Posts with a blank draft — I'll help write the caption once you're in.`,
      navigate: '/app/content',
      navigateState: { openCreate: true },
      actions: ['closePanel'],
    }
  }

  if (/plan (my |the )?week|calendar|schedule/.test(text)) {
    return {
      reply: `${p} Pulling up your post calendar so we can sketch the week for ${biz}.`,
      navigate: '/app/content',
      navigateState: { tab: 'calendar' },
      actions: ['closePanel'],
    }
  }

  if (/overdue|invoice|bill|money|finance|cash/.test(text)) {
    return {
      reply:
        ctx.overdueCount > 0
          ? `${p} You've got ${ctx.overdueCount} overdue invoice${ctx.overdueCount === 1 ? '' : 's'} — opening Money so we can chase them.`
          : `${p} Opening Money — what's owed, what's due, and this week's picture.`,
      navigate: '/app/money',
      actions: ['closePanel'],
    }
  }

  if (/inbox|reply|message|chat with customer|customer chat|client chat/.test(text)) {
    return {
      reply: `${p} Opening Messages — draft replies for your ${people} are ready for your OK.`,
      navigate: '/app/inbox',
      actions: ['closePanel'],
    }
  }

  if (/lead|lead-gen|interested|follow.?up|contact/.test(text)) {
    if (ctx.planTier === 'starter' || !ctx.planTier) {
      return {
        reply: `${p} On Starter we keep it simple — people who ask show up in Messages. I'll open that so you can reply.`,
        navigate: '/app/inbox',
        actions: ['closePanel'],
      }
    }
    return {
      reply: `${p} Here's your interested-people board for ${biz}.`,
      navigate: '/app/leads',
      actions: ['closePanel'],
    }
  }

  if (/discover|signal|trend|competitor|idea/.test(text)) {
    if (ctx.planTier === 'starter') {
      return {
        reply: `${p} Ideas unlock on Growth. For now, ask me to draft a post or check Messages.`,
        navigate: '/app',
        actions: ['closePanel'],
      }
    }
    return {
      reply: `${p} Ideas is where I park trends and tips for ${biz} — opening it now.`,
      navigate: '/app/discover',
      actions: ['closePanel'],
    }
  }

  if (/campaign/.test(text)) {
    if (ctx.planTier === 'starter') {
      return {
        reply: `${p} Campaigns unlock on Growth. Want me to draft a simple post instead?`,
        navigate: '/app/content',
        navigateState: { openCreate: true },
        actions: ['closePanel'],
      }
    }
    return {
      reply: `${p} Opening Campaigns — I can spin up the next push when you're ready.`,
      navigate: '/app/campaigns',
      actions: ['closePanel'],
    }
  }

  if (/crm|pipeline|deal|customer/.test(text)) {
    return {
      reply: `${p} Opening Customers — your people and deals.`,
      navigate: '/app/pipeline',
      actions: ['closePanel'],
    }
  }

  if (/team|seat|invite/.test(text)) {
    if (ctx.planTier !== 'scale') {
      return {
        reply: `${p} Team invites unlock on Scale. Extra seats are $7/mo each when you're ready — for now it's just you and me.`,
        navigate: '/app',
        actions: ['closePanel'],
      }
    }
    return {
      reply: `${p} Opening Team — invite people at $7/seat/mo beyond the owner.`,
      navigate: '/app/team',
      actions: ['closePanel'],
    }
  }

  if (/template/.test(text)) {
    if (ctx.planTier === 'starter') {
      return {
        reply: `${p} Templates unlock on Growth. I can still draft a post from your words — opening Posts.`,
        navigate: '/app/content',
        navigateState: { openCreate: true },
        actions: ['closePanel'],
      }
    }
    return {
      reply: `${p} Opening your winning post templates.`,
      navigate: '/app/templates',
      actions: ['closePanel'],
    }
  }

  if (/setting|profile|connect (instagram|facebook|linkedin)|preference/.test(text)) {
    return {
      reply: `${p} Opening Settings — business profile, connected platforms, and how I should talk to you.`,
      navigate: '/app/settings',
      actions: ['closePanel'],
    }
  }

  if (/story|arc|menu to money|what happened/.test(text)) {
    if (ctx.planTier === 'starter') {
      return {
        reply: `${p} On Starter the story is simple: Freya drafts → you approve → Messages, Posts, or Money. Open Activity to see what’s waiting.`,
        actions: ['openActivity'],
      }
    }
    return {
      reply: `${p} The live story is campaign → interested person → deal → invoice. Switch to Activity and look for the “Story” badges.`,
      actions: ['openActivity'],
    }
  }

  if (/hello|hi |hey|good morning|good afternoon/.test(text)) {
    return {
      reply: `${p} Here's ${biz} at a glance — ${ctx.waitingCount} need your OK${
        ctx.overdueCount ? `, ${ctx.overdueCount} overdue on Money` : ''
      }. Try “approve what’s waiting”, “draft a post”, or “check messages”.`,
    }
  }

  return {
    reply:
      ctx.planTier === 'starter'
        ? `${p} I can approve what's waiting, draft a post, open Messages, Customers, or Money. What do you need for ${biz}?${
            ctx.waitingCount > 0 ? ` (${ctx.waitingCount} still need your OK.)` : ''
          }`
        : `${p} I can approve what's waiting, draft a post, open Messages/Money/Ideas, start a tour, or jump to Settings. What do you need for ${biz}?${
            ctx.waitingCount > 0 ? ` (${ctx.waitingCount} still need your OK.)` : ''
          }`,
  }
}
