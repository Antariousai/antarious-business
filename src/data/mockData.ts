export type GoalId =
  | 'customers'
  | 'engagement'
  | 'leads'
  | 'replies'
  | 'money'

export type Platform = 'Instagram' | 'Facebook' | 'LinkedIn'

export interface BusinessProfile {
  ownerName: string
  businessName: string
  industry: string
  customers: string
  goals: GoalId[]
  platforms: Platform[]
  /** Starter | Growth | Scale — gates nav & features */
  planTier?: import('./planTiers').PlanTier
  teamSize?: import('./planTiers').TeamSize
  businessType?: import('./planTiers').BusinessTypeChip
  /** How Freya talks about who you serve */
  audienceServe?: 'customers' | 'clients' | 'both'
}

export interface ApprovalItem {
  id: string
  type: 'post' | 'message'
  emoji?: string
  tag?: string
  title: string
  body: string
  image?: string
  recipient?: string
  status: 'waiting'
}

export interface ContentPost {
  id: string
  platform: Platform
  platforms?: Platform[]
  author: string
  status: 'draft' | 'scheduled' | 'published'
  caption: string
  image: string
  tag?: string
  scheduledAt?: string
  date: string
  likes: number
  views: number
  comments: number
  shares?: number
}

export interface CampaignSetup {
  objective: string
  platform: string
  format: string
  audience: string
  schedule: string
  budget: string
  tone: string
}

export interface CampaignPost {
  id: string
  image: string
  caption: string
}

export interface EngagementPoint {
  label: string
  value: number
}

export interface Campaign {
  id: string
  title: string
  description: string
  summary: string
  status: 'done' | 'running' | 'draft' | 'paused'
  iconColor: string
  reach: number
  clicks: number
  leads: number
  goal?: string
  audience?: string
  platforms?: string[]
  budget?: string
  report?: string
  reachProgress?: number
  setup?: CampaignSetup
  posts?: CampaignPost[]
  engagement?: EngagementPoint[]
  engagementInsight?: string
  interactions30d?: number
  bestDay?: string
  vsPrior7d?: number
}

export const GOAL_OPTIONS: { id: GoalId; label: string }[] = [
  { id: 'customers', label: 'Get more customers' },
  { id: 'engagement', label: 'Get more love on posts' },
  { id: 'leads', label: 'Find people who are interested' },
  { id: 'replies', label: 'Save time on replies' },
  { id: 'money', label: 'Keep money tidy' },
]

export const PLATFORM_OPTIONS: Platform[] = ['Instagram', 'Facebook', 'LinkedIn']

/** Square Instagram-style bakery photos. */
function igPhoto(id: string) {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&h=800&q=80`
}

export const BAKERY = {
  croissants: igPhoto('photo-1555507036-ab1f4038808a'),
  sourdough: igPhoto('photo-1509440159596-0249088772ff'),
  coffeeAndPastry: igPhoto('photo-1495474472287-4d71bcdd2085'),
  berryTart: igPhoto('photo-1488477181946-6428a0291777'),
  bakeryCounter: igPhoto('photo-1517433670267-08bbd4be890f'),
  bakerKitchen: igPhoto('photo-1556910103-1c02745aae4d'),
  pastryChef: igPhoto('photo-1577219491135-ce391730fb2c'),
  breakfastCatering: igPhoto('photo-1504754524776-8f4f37790ca0'),
  seasonalFruit: igPhoto('photo-1464305795204-6f5bbfc7fb81'),
  cozyCafe: igPhoto('photo-1554118811-1e0d58224f24'),
  freshBread: igPhoto('photo-1586444248902-2f64eddc13df'),
  laminatedPastry: igPhoto('photo-1623334044303-241021148842'),
  berryCake: igPhoto('photo-1565958011703-44f9829ba187'),
  cupcakes: igPhoto('photo-1486427944299-d1955d23e34d'),
  cookies: igPhoto('photo-1612203985729-70726954388c'),
  cinnamonRoll: igPhoto('photo-1515823064-d6e0c04616a7'),
} as const

/** Fallback pool for generated campaign creatives */
export const DEMO_IMAGES = Object.values(BAKERY)

export const APPROVALS: ApprovalItem[] = [
  {
    id: 'a1',
    type: 'post',
    emoji: '📸',
    tag: 'Freya draft',
    title: 'New seasonal menu',
    body: "New seasonal menu dropping next week 🍇 Can you guess what flavor we're adding? Hint: it's berry-licious.",
    image: BAKERY.seasonalFruit,
    status: 'waiting',
  },
  {
    id: 'a2',
    type: 'post',
    emoji: '🍞',
    tag: 'Freya draft',
    title: 'Flash sale',
    body: 'Flash sale this Friday only — 20% off all bread loaves from 3pm to close. Set your reminder ⏰',
    image: BAKERY.freshBread,
    status: 'waiting',
  },
  {
    id: 'a3',
    type: 'post',
    emoji: '💻',
    tag: 'Freya draft',
    title: 'Meet the team',
    body: "Meet the team Monday 👋 This is Amina, our head pastry chef — 12 years of turning butter into magic.",
    image: BAKERY.pastryChef,
    status: 'waiting',
  },
  {
    id: 'a4',
    type: 'post',
    emoji: '💼',
    tag: 'Freya draft',
    title: 'Chamber catering',
    body: "Proud to announce we'll be catering the annual Chamber of Commerce breakfast next month... 🥐",
    image: BAKERY.breakfastCatering,
    status: 'waiting',
  },
  {
    id: 'a5',
    type: 'message',
    recipient: 'Priya Patel',
    title: 'Wedding cake inquiry',
    body: "Hi Priya! I'd love to help with your wedding cake. Could you share an approximate guest count and any dietary needs? Happy to suggest flavors that photograph beautifully too.",
    status: 'waiting',
  },
  {
    id: 'a6',
    type: 'message',
    recipient: 'Sarah Chen',
    title: 'Catering options',
    body: "Hi Sarah — thanks for reaching out! We have corporate breakfast packages starting at $12/person. Would Tuesday or Thursday work for a tasting?",
    status: 'waiting',
  },
  {
    id: 'a7',
    type: 'message',
    recipient: 'Diego Santos',
    title: 'Craft-service pastries',
    body: "Hey Diego! We can do a craft-service pastry box for your film day — croissants, muffins, and fruit danishes. How many crew members?",
    status: 'waiting',
  },
  {
    id: 'a8',
    type: 'message',
    recipient: 'Olivia Brooks',
    title: 'Weekly breakfast',
    body: "Olivia — love the weekly breakfast idea. We can set up a standing Tuesday order with rotating seasonal items. Want me to send a sample menu?",
    status: 'waiting',
  },
]

export const CONTENT_POSTS: ContentPost[] = [
  {
    id: 'p1',
    platform: 'Instagram',
    author: 'Freya',
    status: 'published',
    caption: 'What running a small bakery taught me about community. A short reflection on 3 years of feeding our neighborhood.',
    image: BAKERY.cozyCafe,
    date: 'Wed 8 Jul · 9:00',
    likes: 156,
    views: 4200,
    comments: 24,
    shares: 12,
  },
  {
    id: 'p2',
    platform: 'Facebook',
    author: 'Freya',
    status: 'published',
    caption: 'Fresh out of the oven — our Saturday sourdough loaves. Come early, they go fast 🍞',
    image: BAKERY.sourdough,
    date: 'Tue 7 Jul · 8:30',
    likes: 98,
    views: 2800,
    comments: 14,
    shares: 8,
  },
  {
    id: 'p3',
    platform: 'Instagram',
    author: 'You',
    status: 'published',
    caption: 'Behind the scenes: laminating croissant dough at 5am. Worth every fold.',
    image: BAKERY.laminatedPastry,
    date: 'Mon 6 Jul · 7:15',
    likes: 142,
    views: 3600,
    comments: 19,
  },
  {
    id: 'p4',
    platform: 'LinkedIn',
    author: 'Freya',
    status: 'scheduled',
    caption: 'How local bakeries can partner with event planners — a few lessons from our Chamber breakfast.',
    image: BAKERY.breakfastCatering,
    date: 'Thu 16 Jul · 10:00',
    likes: 0,
    views: 0,
    comments: 0,
  },
  {
    id: 'p5',
    platform: 'Instagram',
    author: 'Freya',
    status: 'draft',
    caption: 'NEW: our summer berry tart is here 🫐 Limited batch this weekend only.',
    image: BAKERY.berryTart,
    date: 'Draft',
    likes: 0,
    views: 0,
    comments: 0,
  },
  {
    id: 'p6',
    platform: 'Instagram',
    author: 'Freya',
    status: 'published',
    caption: 'Weekend special: buy any pastry, get a coffee half off. Tell a friend ☕',
    image: BAKERY.coffeeAndPastry,
    date: 'Sat 4 Jul · 11:00',
    likes: 88,
    views: 2100,
    comments: 11,
  },
  {
    id: 'p7',
    platform: 'Facebook',
    author: 'You',
    status: 'published',
    caption: 'Saturday morning line already forming — thank you for making this place home.',
    image: BAKERY.bakeryCounter,
    date: 'Sat 4 Jul · 9:00',
    likes: 74,
    views: 1900,
    comments: 9,
  },
  {
    id: 'p8',
    platform: 'Instagram',
    author: 'Freya',
    status: 'published',
    caption: 'Close-up of our berry danish. Food photography tip: natural light + one berry on the side.',
    image: BAKERY.berryCake,
    date: 'Fri 3 Jul · 14:00',
    likes: 201,
    views: 5100,
    comments: 31,
  },
]

export const CALENDAR_EVENTS: {
  day: number
  title: string
  color: 'pink' | 'blue' | 'mint' | 'amber' | 'coral'
}[] = [
  { day: 14, title: 'Fresh sourdough', color: 'amber' },
  { day: 15, title: 'Weekend special', color: 'coral' },
  { day: 16, title: 'Summer berry drop', color: 'pink' },
  { day: 16, title: 'Oven BTS story', color: 'coral' },
  { day: 16, title: 'Flash sale reminder', color: 'amber' },
  { day: 16, title: 'Closing thank-you', color: 'mint' },
  { day: 18, title: 'Saturday morning', color: 'mint' },
  { day: 21, title: 'Fresh sourdough', color: 'amber' },
  { day: 21, title: 'Weekend special', color: 'blue' },
  { day: 23, title: 'Meet the team', color: 'coral' },
  { day: 25, title: 'Chamber breakfast', color: 'mint' },
  { day: 28, title: 'Flash sale Friday', color: 'pink' },
]

const SPRING_ENGAGEMENT: EngagementPoint[] = [
  { label: '17 Jun', value: 180 },
  { label: '20 Jun', value: 210 },
  { label: '23 Jun', value: 245 },
  { label: '26 Jun', value: 268 },
  { label: '29 Jun', value: 310 },
  { label: '2 Jul', value: 340 },
  { label: '5 Jul', value: 375 },
  { label: '8 Jul', value: 410 },
  { label: '11 Jul', value: 445 },
  { label: '14 Jul', value: 430 },
  { label: '16 Jul', value: 461 },
]

export const CAMPAIGNS: Campaign[] = [
  {
    id: 'c1',
    title: 'Spring Bloom Sale',
    description: 'Get more foot traffic for spring specials',
    summary: 'Reached 6,800 people, 18 new leads. Weekend special post drove most of the results.',
    status: 'done',
    iconColor: '#dbeafe',
    reach: 6800,
    clicks: 512,
    leads: 18,
    goal: 'Get more people into the shop for spring.',
    audience: 'Locals within 5km who love fresh baked goods.',
    platforms: ['Instagram', 'Facebook'],
    budget: '$200',
    reachProgress: 100,
    report:
      'Your Spring Bloom Sale reached 6,800 people. 512 clicked through to your menu, and 18 of them became new leads. Your weekend special post was the star — it pulled in most of the clicks.',
    engagementInsight:
      'Engagement is trending up — your campaign is gaining momentum. Keep posting consistently.',
    interactions30d: 8415,
    bestDay: '16 Jul · 461',
    vsPrior7d: 23,
    engagement: SPRING_ENGAGEMENT,
    setup: {
      objective: 'Foot traffic',
      platform: 'Meta',
      format: 'Single image + carousel',
      audience: 'Interest: bakery, 18-45, 5km radius',
      schedule: 'Daily 8-10am',
      budget: 'Organic boosted $200',
      tone: 'Warm, local, inviting',
    },
    posts: [
      {
        id: 'cp1',
        image: BAKERY.sourdough,
        caption: 'Fresh sourdough just out of the oven 🥖 Come grab...',
      },
      {
        id: 'cp2',
        image: BAKERY.coffeeAndPastry,
        caption: 'Weekend special: buy any 2 pastries, get a free coffee...',
      },
      {
        id: 'cp3',
        image: BAKERY.croissants,
        caption: 'Behind the scenes: how our croissants get those perfe...',
      },
    ],
  },
  {
    id: 'c2',
    title: 'New Menu Teaser',
    description: 'Build buzz for the seasonal drop',
    summary: 'Running across Instagram Stories + feed. 2 drafts waiting for your OK.',
    status: 'running',
    iconColor: '#ede9fe',
    reach: 2400,
    clicks: 186,
    leads: 7,
    goal: 'Build curiosity for the new seasonal menu.',
    audience: 'Existing followers + lookalikes who engage with food content.',
    platforms: ['Instagram', 'Facebook'],
    budget: '$150',
    reachProgress: 48,
    report:
      "New Menu Teaser is live. You've reached 2,400 people so far — Stories are outperforming feed. Two draft posts are waiting for your OK before the next wave.",
    engagementInsight: 'Early momentum looks solid. Approve the next drafts to keep the teaser rolling.',
    interactions30d: 3120,
    bestDay: '14 Jul · 298',
    vsPrior7d: 12,
    engagement: [
      { label: '5 Jul', value: 120 },
      { label: '7 Jul', value: 145 },
      { label: '9 Jul', value: 160 },
      { label: '11 Jul', value: 190 },
      { label: '13 Jul', value: 220 },
      { label: '14 Jul', value: 298 },
      { label: '15 Jul', value: 260 },
      { label: '16 Jul', value: 275 },
    ],
    setup: {
      objective: 'Awareness',
      platform: 'Instagram',
      format: 'Stories + feed',
      audience: 'Followers + food lookalikes, 18-40',
      schedule: 'Tue / Thu / Sat mornings',
      budget: 'Boosted $150',
      tone: 'Excited, mysterious, playful',
    },
    posts: [
      {
        id: 'cp4',
        image: BAKERY.berryTart,
        caption: 'Something berry special is coming... can you guess? 🫐',
      },
      {
        id: 'cp5',
        image: BAKERY.coffeeAndPastry,
        caption: 'Hint #2: it pairs perfectly with morning coffee ☕',
      },
    ],
  },
  {
    id: 'c3',
    title: 'Corporate Breakfast Push',
    description: 'Attract office catering orders',
    summary: 'Draft ready — Freya built the audience and creative. Launch when you approve.',
    status: 'draft',
    iconColor: '#dcfce7',
    reach: 0,
    clicks: 0,
    leads: 0,
    goal: 'Win weekly corporate breakfast catering deals.',
    audience: 'Office managers and event planners within 10km.',
    platforms: ['LinkedIn', 'Facebook'],
    budget: '$250',
    reachProgress: 0,
    report:
      "Corporate Breakfast Push is ready to launch. Freya built the audience, creative, and schedule — tap Launch when you're happy with the setup.",
    engagementInsight: 'No live data yet — launch to start tracking engagement.',
    interactions30d: 0,
    bestDay: '—',
    vsPrior7d: 0,
    engagement: [
      { label: 'Week 1', value: 0 },
      { label: 'Week 2', value: 0 },
      { label: 'Week 3', value: 0 },
      { label: 'Week 4', value: 0 },
    ],
    setup: {
      objective: 'Lead gen',
      platform: 'LinkedIn + Facebook',
      format: 'Carousel + lead form',
      audience: 'Office managers, 25-55, 10km',
      schedule: 'Mon–Wed 7-9am',
      budget: 'Boosted $250',
      tone: 'Professional, reliable, delicious',
    },
    posts: [
      {
        id: 'cp6',
        image: BAKERY.breakfastCatering,
        caption: 'Fuel your team mornings — catering from $12/person...',
      },
    ],
  },
  {
    id: 'c4',
    title: 'Loyalty Rewards Soft Launch',
    description: 'Re-engage regulars with a stamp card',
    summary: 'Paused while you decide on the offer details. Resume anytime.',
    status: 'paused',
    iconColor: '#ffedd5',
    reach: 1100,
    clicks: 64,
    leads: 3,
    goal: 'Bring regulars back with a simple stamp-card reward.',
    audience: 'Past customers who visited 2+ times in the last 90 days.',
    platforms: ['Instagram', 'Facebook'],
    budget: '$100',
    reachProgress: 35,
    report:
      'Loyalty Rewards Soft Launch reached 1,100 people before you paused it. 64 clicked through. Resume when the stamp-card offer is locked in.',
    engagementInsight: 'Paused mid-run — resume to keep the soft launch going.',
    interactions30d: 890,
    bestDay: '9 Jul · 112',
    vsPrior7d: -8,
    engagement: [
      { label: '1 Jul', value: 80 },
      { label: '3 Jul', value: 95 },
      { label: '5 Jul', value: 100 },
      { label: '7 Jul', value: 88 },
      { label: '9 Jul', value: 112 },
      { label: '11 Jul', value: 70 },
      { label: '13 Jul', value: 40 },
      { label: '15 Jul', value: 15 },
    ],
    setup: {
      objective: 'Retention',
      platform: 'Meta',
      format: 'Single image + story',
      audience: 'Past customers, 2+ visits / 90 days',
      schedule: 'Fri–Sun afternoons',
      budget: 'Boosted $100',
      tone: 'Friendly, grateful, rewarding',
    },
    posts: [
      {
        id: 'cp7',
        image: BAKERY.cinnamonRoll,
        caption: 'Buy 9, get your 10th pastry free ☕ Stamp card starts this week...',
      },
    ],
  },
]

export const ICON_COLORS = ['#dbeafe', '#ede9fe', '#dcfce7', '#ffedd5', '#fce7f3', '#e0e7ff']

export const FREYA_ACTIVITY = [
  {
    color: 'green' as const,
    title: 'Drafted a new Instagram post for the New Menu Teaser',
    sub: 'Caption + image ready for your approval.',
  },
  {
    color: 'green' as const,
    title: 'Found a new lead on LinkedIn: Marcus Rivera',
    sub: 'Local event planner, matches your ideal customer.',
  },
  {
    color: 'yellow' as const,
    title: 'Drafted a reply to Priya Patel',
    sub: 'Waiting for your approval before sending.',
  },
  {
    color: 'green' as const,
    title: 'Spring Bloom Sale campaign completed',
    sub: 'Reached 6,800 people, 18 new leads. Summary ready.',
  },
]

export const HOT_LEADS = [
  { name: 'Sarah Chen', status: 'New', note: 'Wants to book a corporate breakfast order...', color: '#3b82f6' },
  { name: 'Priya Patel', status: 'Contacted', note: 'Wedding cake inquiry — 80 guests...', color: '#8b5cf6' },
  { name: 'Elena Vasquez', status: 'New', note: 'Asked about gluten-free catering...', color: '#f97316' },
  { name: 'Aisha Khan', status: 'Warm', note: 'Interested in weekly office pastries...', color: '#1e40af' },
  { name: 'Diego Santos', status: 'New', note: 'Film set craft-service pastries...', color: '#ec4899' },
  { name: 'Olivia Brooks', status: 'Contacted', note: 'Weekly breakfast standing order...', color: '#ea580c' },
]

export const STORIES: {
  id: string
  label: string
  image: string | null
  postId?: string
}[] = [
  { id: 'create', label: 'Create', image: null },
  { id: 's1', label: 'Freya', image: BAKERY.breakfastCatering, postId: 'p4' },
  { id: 's2', label: 'You', image: BAKERY.coffeeAndPastry, postId: 'p6' },
  { id: 's3', label: 'Freya', image: BAKERY.cozyCafe, postId: 'p1' },
  { id: 's4', label: 'Freya', image: BAKERY.sourdough, postId: 'p2' },
  { id: 's5', label: 'You', image: BAKERY.laminatedPastry, postId: 'p3' },
  { id: 's6', label: 'Freya', image: BAKERY.berryTart, postId: 'p5' },
  { id: 's7', label: 'Freya', image: BAKERY.bakeryCounter, postId: 'p7' },
]
