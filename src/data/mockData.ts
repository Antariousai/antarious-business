export type GoalId =
  | 'customers'
  | 'engagement'
  | 'leads'
  | 'replies'
  | 'money'

export type Platform = 'Facebook' | 'Messenger' | 'WhatsApp' | 'Instagram' | 'LinkedIn'

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

export const PLATFORM_OPTIONS: Platform[] = ['Facebook', 'Messenger', 'WhatsApp', 'Instagram']

/** Square product photos for boutique retail demo. */
function igPhoto(id: string) {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&h=800&q=80`
}

const photos = {
  kurtiRack: igPhoto('photo-1483985988355-763728e1935b'),
  sareeDisplay: igPhoto('photo-1594938298603-c8148c4dae35'),
  boutiqueCounter: igPhoto('photo-1441986300917-64674bd600d8'),
  embroidery: igPhoto('photo-1558618666-fcd25c85cd64'),
  shoppingBag: igPhoto('photo-1558171813-4c088753af8f'),
  fittingRoom: igPhoto('photo-1469334031218-e382a71b716b'),
  jewelry: igPhoto('photo-1515562141207-7a88fb7ce338'),
  seasonal: igPhoto('photo-1490481651871-ab68de25d43d'),
  windowDisplay: igPhoto('photo-1445205170230-053b83016050'),
  customerMoment: igPhoto('photo-1487412720507-e7ab37603c6f'),
  eidCollection: igPhoto('photo-1583391733956-3750e0ff4e8b'),
  accessories: igPhoto('photo-1596462502278-27bfdc403348'),
  packaging: igPhoto('photo-1607083206869-4c7672e72a8a'),
  storefront: igPhoto('photo-1523381210434-271e8be1f52b'),
  tailorWork: igPhoto('photo-1558618666-fcd25c85cd64'),
  fabricClose: igPhoto('photo-1558171813-4c088753af8f'),
} as const

export const BOUTIQUE = photos

/** Legacy key names → boutique photos (keeps older page imports working). */
export const BAKERY = {
  croissants: photos.kurtiRack,
  sourdough: photos.sareeDisplay,
  coffeeAndPastry: photos.accessories,
  berryTart: photos.eidCollection,
  bakeryCounter: photos.boutiqueCounter,
  bakerKitchen: photos.tailorWork,
  pastryChef: photos.customerMoment,
  breakfastCatering: photos.shoppingBag,
  seasonalFruit: photos.seasonal,
  cozyCafe: photos.storefront,
  freshBread: photos.windowDisplay,
  laminatedPastry: photos.embroidery,
  berryCake: photos.jewelry,
  cupcakes: photos.packaging,
  cookies: photos.fittingRoom,
  cinnamonRoll: photos.fabricClose,
} as const

/** Fallback pool for generated campaign creatives */
export const DEMO_IMAGES = Object.values(BOUTIQUE)

export const APPROVALS: ApprovalItem[] = [
  {
    id: 'a1',
    type: 'post',
    emoji: '📸',
    tag: 'Freya draft',
    title: 'New Eid collection',
    body: "New Eid collection dropping next week ✨ Can you guess the colour story? Hint: it's jewel-toned.",
    image: BOUTIQUE.seasonal,
    status: 'waiting',
  },
  {
    id: 'a2',
    type: 'post',
    emoji: '🍞',
    tag: 'Freya draft',
    title: 'Flash sale',
    body: 'Flash sale this Friday only — 20% off all kurtis from 3pm to close. Set your reminder ⏰',
    image: BOUTIQUE.windowDisplay,
    status: 'waiting',
  },
  {
    id: 'a3',
    type: 'post',
    emoji: '💻',
    tag: 'Freya draft',
    title: 'Meet the team',
    body: "Meet the team Monday 👋 This is Amina, our in-house tailor — 12 years of perfect fits in Dhanmondi.",
    image: BOUTIQUE.customerMoment,
    status: 'waiting',
  },
  {
    id: 'a4',
    type: 'post',
    emoji: '💼',
    tag: 'Freya draft',
    title: 'Chamber reception',
    body: "Proud to dress the annual Dhaka Chamber reception next month — custom sarees & sherwanis.",
    image: BOUTIQUE.shoppingBag,
    status: 'waiting',
  },
  {
    id: 'a5',
    type: 'message',
    recipient: 'Fahim Ahmed',
    title: 'Bridal lehenga inquiry',
    body: "Hi Fahim! I'd love to help with the bridal lehenga. Could you share the wedding date and preferred colours? Happy to suggest pieces that photograph beautifully too.",
    status: 'waiting',
  },
  {
    id: 'a6',
    type: 'message',
    recipient: 'Sadia Khan',
    title: 'Custom saree options',
    body: "Hi Sadia — thanks for reaching out! Custom jamdani sarees start around ৳12,500. Would Tuesday or Thursday work for a fitting?",
    status: 'waiting',
  },
  {
    id: 'a7',
    type: 'message',
    recipient: 'Karim Hossain',
    title: 'Film-day wardrobe',
    body: "Hey Karim! We can kit a film-day wardrobe box — kurtis, dupattas, and accessories. How many cast members?",
    status: 'waiting',
  },
  {
    id: 'a8',
    type: 'message',
    recipient: 'Rahman Traders',
    title: 'Weekly wholesale',
    body: "Rahman — love the weekly wholesale idea. We can set up a standing Tuesday order with rotating seasonal kurtis. Want me to send a sample pack?",
    status: 'waiting',
  },
]

export const CONTENT_POSTS: ContentPost[] = [
  {
    id: 'p1',
    platform: 'Instagram',
    author: 'Freya',
    status: 'published',
    caption: 'What running a Dhanmondi boutique taught me about community. A short reflection on 3 years of dressing our neighbourhood.',
    image: BOUTIQUE.storefront,
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
    caption: 'Fresh on the rack — our Saturday jamdani drop. Come early, they go fast ✨',
    image: BOUTIQUE.sareeDisplay,
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
    caption: 'Behind the scenes: hand-finishing kurtis at 5am. Worth every stitch.',
    image: BOUTIQUE.embroidery,
    date: 'Mon 6 Jul · 7:15',
    likes: 142,
    views: 3600,
    comments: 19,
  },
  {
    id: 'p4',
    platform: 'Facebook',
    author: 'Freya',
    status: 'scheduled',
    caption: 'How local boutiques can partner with event planners — a few lessons from our Chamber reception.',
    image: BOUTIQUE.shoppingBag,
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
    caption: 'NEW: our summer linen kurtis are here ☀️ Limited colours this weekend only.',
    image: BOUTIQUE.eidCollection,
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
    caption: 'Weekend special: buy any embroidered kurti, get a free dupatta. Tell a friend 💛',
    image: BOUTIQUE.accessories,
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
    image: BOUTIQUE.boutiqueCounter,
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
    caption: 'Close-up of our jamdani weave. Photo tip: natural light + one earring on the side.',
    image: BOUTIQUE.jewelry,
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
  { day: 14, title: 'Fresh saree', color: 'amber' },
  { day: 15, title: 'Weekend special', color: 'coral' },
  { day: 16, title: 'Summer linen drop', color: 'pink' },
  { day: 16, title: 'Rack BTS story', color: 'coral' },
  { day: 16, title: 'Flash sale reminder', color: 'amber' },
  { day: 16, title: 'Closing thank-you', color: 'mint' },
  { day: 18, title: 'Saturday morning', color: 'mint' },
  { day: 21, title: 'Fresh saree', color: 'amber' },
  { day: 21, title: 'Weekend special', color: 'blue' },
  { day: 23, title: 'Meet the team', color: 'coral' },
  { day: 25, title: 'Chamber reception', color: 'mint' },
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
    audience: 'Locals within 5km who love handcrafted fashion.',
    platforms: ['Instagram', 'Facebook'],
    budget: '৳8,000',
    reachProgress: 100,
    report:
      'Your Spring Bloom Sale reached 6,800 people. 512 clicked through to your shop, and 18 of them became new leads. Your weekend special post was the star — it pulled in most of the clicks.',
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
      audience: 'Interest: boutique fashion, 18-45, 5km radius',
      schedule: 'Daily 8-10am',
      budget: 'Organic boosted ৳8,000',
      tone: 'Warm, local, inviting',
    },
    posts: [
      {
        id: 'cp1',
        image: BOUTIQUE.sareeDisplay,
        caption: 'Fresh jamdani just on the rack ✨ Come grab...',
      },
      {
        id: 'cp2',
        image: BOUTIQUE.accessories,
        caption: 'Weekend special: buy any 2 kurtis, get a free dupatta...',
      },
      {
        id: 'cp3',
        image: BOUTIQUE.kurtiRack,
        caption: 'Behind the scenes: how our kurtis get those perfe...',
      },
    ],
  },
  {
    id: 'c2',
    title: 'Eid Collection Teaser',
    description: 'Build buzz for the seasonal drop',
    summary: 'Running across Instagram Stories + feed. 2 drafts waiting for your OK.',
    status: 'running',
    iconColor: '#e0f2fe',
    reach: 2400,
    clicks: 186,
    leads: 7,
    goal: 'Build curiosity for the new Eid collection.',
    audience: 'Existing followers + lookalikes who engage with fashion content.',
    platforms: ['Instagram', 'Facebook'],
    budget: '৳6,000',
    reachProgress: 48,
    report:
      "Eid Collection Teaser is live. You've reached 2,400 people so far — Stories are outperforming feed. Two draft posts are waiting for your OK before the next wave.",
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
      audience: 'Followers + fashion lookalikes, 18-40',
      schedule: 'Tue / Thu / Sat mornings',
      budget: 'Boosted ৳6,000',
      tone: 'Excited, mysterious, playful',
    },
    posts: [
      {
        id: 'cp4',
        image: BOUTIQUE.eidCollection,
        caption: 'Something jewel-toned is coming... can you guess? ✨',
      },
      {
        id: 'cp5',
        image: BOUTIQUE.accessories,
        caption: 'Hint #2: it pairs perfectly with gold jewellery 💛',
      },
    ],
  },
  {
    id: 'c3',
    title: 'Corporate Gift Push',
    description: 'Attract office festive-pack orders',
    summary: 'Draft ready — Freya built the audience and creative. Launch when you approve.',
    status: 'draft',
    iconColor: '#dcfce7',
    reach: 0,
    clicks: 0,
    leads: 0,
    goal: 'Win weekly corporate festive gift-pack deals.',
    audience: 'Office managers and event planners within 10km.',
    platforms: ['Facebook', 'Messenger'],
    budget: '৳10,000',
    reachProgress: 0,
    report:
      "Corporate Gift Push is ready to launch. Freya built the audience, creative, and schedule — tap Launch when you're happy with the setup.",
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
      platform: 'Facebook + Messenger',
      format: 'Carousel + lead form',
      audience: 'Office managers, 25-55, 10km',
      schedule: 'Mon–Wed 7-9am',
      budget: 'Boosted ৳10,000',
      tone: 'Professional, reliable, thoughtful',
    },
    posts: [
      {
        id: 'cp6',
        image: BOUTIQUE.shoppingBag,
        caption: 'Delight your team — festive packs from ৳1,200/person...',
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
    budget: '৳4,000',
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
      budget: 'Boosted ৳4,000',
      tone: 'Friendly, grateful, rewarding',
    },
    posts: [
      {
        id: 'cp7',
        image: BOUTIQUE.fabricClose,
        caption: 'Buy 9, get your 10th embroidery free 💛 Stamp card starts this week...',
      },
    ],
  },
]

export const ICON_COLORS = ['#dbeafe', '#e0f2fe', '#dcfce7', '#ffedd5', '#fce7f3', '#ccfbf1']

export const FREYA_ACTIVITY = [
  {
    color: 'green' as const,
    title: 'Drafted a new Instagram post for the Eid Collection Teaser',
    sub: 'Caption + image ready for your approval.',
  },
  {
    color: 'green' as const,
    title: 'Found a new lead on WhatsApp: Karim Hossain',
    sub: 'Local event planner, matches your ideal customer.',
  },
  {
    color: 'yellow' as const,
    title: 'Drafted a reply to Fahim Ahmed',
    sub: 'Waiting for your approval before sending.',
  },
  {
    color: 'green' as const,
    title: 'Spring Bloom Sale campaign completed',
    sub: 'Reached 6,800 people, 18 new leads. Summary ready.',
  },
]

export const HOT_LEADS = [
  { name: 'Sadia Khan', status: 'New', note: 'Wants to book a corporate gift pack...', color: '#3b82f6' },
  { name: 'Fahim Ahmed', status: 'Contacted', note: 'Bridal lehenga inquiry — 80 guests...', color: '#0ea5e9' },
  { name: 'Nadia Hasan', status: 'New', note: 'Asked about custom saree for a shoot...', color: '#f97316' },
  { name: 'Aisha Khan', status: 'Warm', note: 'Interested in monthly styling box...', color: '#1e40af' },
  { name: 'Karim Hossain', status: 'New', note: 'Film-day wardrobe boxes...', color: '#ec4899' },
  { name: 'Rahman Traders', status: 'Contacted', note: 'Weekly wholesale standing order...', color: '#ea580c' },
]

export const STORIES: {
  id: string
  label: string
  image: string | null
  postId?: string
}[] = [
  { id: 'create', label: 'Create', image: null },
  { id: 's1', label: 'Freya', image: BOUTIQUE.shoppingBag, postId: 'p4' },
  { id: 's2', label: 'You', image: BOUTIQUE.accessories, postId: 'p6' },
  { id: 's3', label: 'Freya', image: BOUTIQUE.storefront, postId: 'p1' },
  { id: 's4', label: 'Freya', image: BOUTIQUE.sareeDisplay, postId: 'p2' },
  { id: 's5', label: 'You', image: BOUTIQUE.embroidery, postId: 'p3' },
  { id: 's6', label: 'Freya', image: BOUTIQUE.eidCollection, postId: 'p5' },
  { id: 's7', label: 'Freya', image: BOUTIQUE.boutiqueCounter, postId: 'p7' },
]
