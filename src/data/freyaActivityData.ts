import { BAKERY } from './mockData'

/** Freya's Activity — transparent log of what Freya is doing */

export type FreyaActivityStatus = 'waiting' | 'done' | 'working'
export type FreyaActivityArea =
  | 'content'
  | 'leads'
  | 'inbox'
  | 'campaigns'
  | 'money'
  | 'discover'
  | 'crm'
  | 'templates'

export interface FreyaActivityItem {
  id: string
  title: string
  detail: string
  status: FreyaActivityStatus
  area: FreyaActivityArea
  time: string
  href?: string
  actionLabel?: string
  /** Rich card on Home for drafts needing OK */
  kind?: 'post' | 'message' | 'generic'
  previewImage?: string
  previewBody?: string
  recipient?: string
  /** Links campaign → lead → deal → invoice story */
  storyId?: string
  storyStep?: number
}

export const AREA_LABEL: Record<FreyaActivityArea, string> = {
  content: 'Posts',
  leads: 'Interested people',
  inbox: 'Messages',
  campaigns: 'Campaigns',
  money: 'Money',
  discover: 'Ideas',
  crm: 'Customers',
  templates: 'Templates',
}

export const SEED_FREYA_ACTIVITY: FreyaActivityItem[] = [
  // Story arc: campaign → lead → deal → invoice
  {
    id: 'fa-arc1',
    title: 'New Menu Teaser campaign went live',
    detail: 'Story 1/4 — reach + buzz. Next: Freya converted a warm lead.',
    status: 'done',
    area: 'campaigns',
    time: '14 Jul, 9:00',
    href: '/app/campaigns/c2',
    storyId: 'menu-to-money',
    storyStep: 1,
  },
  {
    id: 'fa-arc2',
    title: 'Converted Discover signal → lead: Marcus Rivera',
    detail: 'Story 2/4 — event planner who engaged with the teaser.',
    status: 'done',
    area: 'leads',
    time: '14 Jul, 16:40',
    href: '/app/leads',
    storyId: 'menu-to-money',
    storyStep: 2,
  },
  {
    id: 'fa-arc3',
    title: 'Opened CRM deal: Chamber tasting for Marcus',
    detail: 'Story 3/4 — follow-up task drafted. Approve to lock it in.',
    status: 'waiting',
    area: 'crm',
    time: '15 Jul, 11:05',
    href: '/app/pipeline',
    actionLabel: 'Approve task',
    storyId: 'menu-to-money',
    storyStep: 3,
  },
  {
    id: 'fa-arc4',
    title: 'Draft invoice ready after tasting deposit',
    detail: 'Story 4/4 — $545 deposit invoice for Priya still needs chase OK.',
    status: 'waiting',
    area: 'money',
    time: '16 Jul, 9:15',
    href: '/app/money',
    actionLabel: 'Review chase',
    storyId: 'menu-to-money',
    storyStep: 4,
  },

  // Home-grade draft approvals (unified queue)
  {
    id: 'fa-a1',
    title: 'New seasonal menu post',
    detail: 'Caption + image ready for your approval.',
    status: 'waiting',
    area: 'content',
    time: '16 Jul, 12:00',
    href: '/app/content',
    actionLabel: 'Approve post',
    kind: 'post',
    previewImage: BAKERY.seasonalFruit,
    previewBody:
      "New seasonal menu dropping next week 🍇 Can you guess what flavor we're adding? Hint: it's berry-licious.",
  },
  {
    id: 'fa-a2',
    title: 'Flash sale — bread loaves',
    detail: 'Friday 3pm promo draft waiting.',
    status: 'waiting',
    area: 'content',
    time: '16 Jul, 11:40',
    href: '/app/content',
    actionLabel: 'Approve post',
    kind: 'post',
    previewImage: BAKERY.freshBread,
    previewBody:
      'Flash sale this Friday only — 20% off all bread loaves from 3pm to close. Set your reminder ⏰',
  },
  {
    id: 'fa-a5',
    title: 'Drafted a reply to Priya Patel',
    detail: 'Wedding cake inquiry — waiting for your OK before sending.',
    status: 'waiting',
    area: 'inbox',
    time: '14 Jul, 10:00',
    href: '/app/inbox',
    actionLabel: 'Review in Inbox',
    kind: 'message',
    recipient: 'Priya Patel',
    previewBody:
      "Hi Priya! I'd love to help with your wedding cake. Could you share an approximate guest count and any dietary needs? Happy to suggest flavors that photograph beautifully too.",
  },
  {
    id: 'fa-a6',
    title: 'Drafted a reply to Sarah Chen',
    detail: 'Corporate catering options — ready to send.',
    status: 'waiting',
    area: 'inbox',
    time: '14 Jul, 9:20',
    href: '/app/inbox',
    actionLabel: 'Review in Inbox',
    kind: 'message',
    recipient: 'Sarah Chen',
    previewBody:
      'Hi Sarah — thanks for reaching out! We have corporate breakfast packages starting at $12/person. Would Tuesday or Thursday work for a tasting?',
  },

  {
    id: 'fa-a7',
    title: 'Saturday morning Reel — oven BTS',
    detail: '15s Reel draft with trending audio — needs your OK.',
    status: 'waiting',
    area: 'content',
    time: '16 Jul, 10:20',
    href: '/app/content',
    actionLabel: 'Approve post',
    kind: 'post',
    previewImage: BAKERY.pastryChef,
    previewBody:
      '5am in the bakery 👨‍🍳 Watch the croissants puff. Come grab one warm — doors open at 7.',
  },
  {
    id: 'fa1',
    title: 'Drafted a new Instagram post for the New Menu Teaser',
    detail: 'Caption + image ready — already in Content drafts.',
    status: 'done',
    area: 'content',
    time: '16 Jul, 8:00',
    href: '/app/content',
  },
  {
    id: 'fa2',
    title: 'Found a new lead on LinkedIn: Marcus Rivera',
    detail: 'Local event planner, matches your ideal customer.',
    status: 'done',
    area: 'leads',
    time: '15 Jul, 17:00',
    href: '/app/leads',
  },
  {
    id: 'fa4',
    title: 'Spring Bloom Sale campaign completed',
    detail: 'Reached 6,800 people, 18 new leads. Summary ready.',
    status: 'done',
    area: 'campaigns',
    time: '15 Jul, 18:00',
    href: '/app/campaigns',
  },
  {
    id: 'fa5',
    title: 'Logged 3 new sales from online orders',
    detail: '$148 in, all marked paid.',
    status: 'done',
    area: 'money',
    time: '15 Jul, 20:00',
    href: '/app/money',
  },
  {
    id: 'fa7',
    title: 'Matched Meta Ads bank transaction ($186)',
    detail: 'Suggested category: Marketing. Confirm or change.',
    status: 'waiting',
    area: 'money',
    time: '16 Jul, 7:40',
    href: '/app/money',
    actionLabel: 'Confirm match',
  },
  {
    id: 'fa8',
    title: 'Spotted life-event signal: Priya planning her wedding',
    detail: 'Added to Discover feed — convert to lead when ready.',
    status: 'done',
    area: 'discover',
    time: '14 Jul, 16:20',
    href: '/app/discover',
  },
  {
    id: 'fa10',
    title: 'Saved “Product Spotlight” usage from weekend Reel',
    detail: 'Template used 13× now. Style still performing well.',
    status: 'done',
    area: 'templates',
    time: '13 Jul, 19:00',
    href: '/app/templates',
  },
  {
    id: 'fa11',
    title: 'Drafting Stories for #FarmersMarketSaturday',
    detail: 'Pulling from Discover idea — almost ready.',
    status: 'working',
    area: 'content',
    time: 'Just now',
    href: '/app/content',
  },
]
