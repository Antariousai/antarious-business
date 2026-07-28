/** Discover — Freya's trends & signals radar */

export type SignalType = 'Mention' | 'Hashtag' | 'Company' | 'Competitor' | 'Life Event'
export type SignalPlatform = 'whatsapp' | 'instagram' | 'facebook' | 'messenger' | 'local' | 'web'
export type SignalStrength = 'high' | 'medium' | 'low'
export type SignalAction = 'lead' | 'content' | 'watch' | 'none'
export type TrendDirection = 'up' | 'steady' | 'emerging'
export type InsightTone = 'action' | 'risk' | 'win' | 'info'

export const SIGNAL_TYPE_META: Record<SignalType, { label: string; chip: string }> = {
  Mention: { label: 'Mention', chip: 'bg-slate-100 text-slate-700' },
  Hashtag: { label: 'Hashtag', chip: 'bg-sky-100 text-sky-700' },
  Company: { label: 'Company', chip: 'bg-sky-soft text-sky-bright' },
  Competitor: { label: 'Competitor', chip: 'bg-orange-100 text-orange-700' },
  'Life Event': { label: 'Life event', chip: 'bg-rose-100 text-rose-700' },
}

export interface DiscoverSignal {
  id: string
  headline: string
  date: string
  type: SignalType
  platform: SignalPlatform
  strength: SignalStrength
  whyItMatters: string
  freyaSuggestion: string
  action: SignalAction
  /** Set when user added as lead or dismissed */
  status: 'new' | 'saved' | 'converted' | 'dismissed'
}

export interface DiscoverTrend {
  id: string
  title: string
  summary: string
  direction: TrendDirection
  changeLabel: string
  topic: string
  freyaTip: string
}

export interface ContentIdea {
  id: string
  title: string
  angle: string
  format: string
  channel: string
  fromSignalId?: string
  status: 'suggested' | 'saved' | 'used'
}

export interface CompetitorWatch {
  id: string
  name: string
  note: string
  lastMove: string
  threat: 'low' | 'medium' | 'high'
  freyaTake: string
}

export interface DiscoverInsight {
  id: string
  tone: InsightTone
  title: string
  body: string
  actionLabel?: string
  goTo?: 'signals' | 'trends' | 'ideas' | 'competitors'
}

export const SEED_SIGNALS: DiscoverSignal[] = [
  {
    id: 's1',
    headline: 'Karim Hossain asked for boutique recommendations in a WhatsApp group',
    date: 'Thu 16 Jul',
    type: 'Mention',
    platform: 'whatsapp',
    strength: 'high',
    whyItMatters: 'Warm intro opportunity — he’s actively asking peers for a boutique.',
    freyaSuggestion: 'Add Karim as a lead and I’ll draft a friendly WhatsApp reply.',
    action: 'lead',
    status: 'new',
  },
  {
    id: 's2',
    headline: 'Someone used #DhanmondiBoutique near your shop — 3 posts in the last day',
    date: 'Thu 16 Jul',
    type: 'Hashtag',
    platform: 'instagram',
    strength: 'medium',
    whyItMatters: 'Local discovery is heating up; a soft promo post would ride the wave.',
    freyaSuggestion: 'Save a Stories idea highlighting today’s new kurtis.',
    action: 'content',
    status: 'new',
  },
  {
    id: 's3',
    headline: 'Petal Events updated their page — hiring for wedding season',
    date: 'Wed 15 Jul',
    type: 'Company',
    platform: 'facebook',
    strength: 'high',
    whyItMatters: 'Wedding planners hiring = more bridal & guest-favour demand soon.',
    freyaSuggestion: 'Add Petal Events as a lead and offer a fitting partnership.',
    action: 'lead',
    status: 'new',
  },
  {
    id: 's4',
    headline: 'Rival boutique boosted a corporate-gifting ad targeting Dhanmondi',
    date: 'Wed 15 Jul',
    type: 'Competitor',
    platform: 'facebook',
    strength: 'high',
    whyItMatters: 'They’re spending to win corporate festive packs in your area.',
    freyaSuggestion: 'Watch them closely and counter with a standing-order offer.',
    action: 'watch',
    status: 'new',
  },
  {
    id: 's5',
    headline: 'Fahim Ahmed changed status to “Planning wedding wardrobe 💍”',
    date: 'Tue 14 Jul',
    type: 'Life Event',
    platform: 'messenger',
    strength: 'high',
    whyItMatters: 'He’s already chatting in Inbox about bridal lehenga — life-event signal confirms intent.',
    freyaSuggestion: 'Add as a hot lead if he isn’t already, and send fitting options.',
    action: 'lead',
    status: 'new',
  },
  {
    id: 's6',
    headline: 'Khan Studio tagged a Gulshan venue that often books local boutiques',
    date: 'Tue 14 Jul',
    type: 'Mention',
    platform: 'instagram',
    strength: 'medium',
    whyItMatters: 'Venue + studio combo often needs wardrobe partners.',
    freyaSuggestion: 'Add as a lead and mention you already dress clients near that venue.',
    action: 'lead',
    status: 'new',
  },
  {
    id: 's7',
    headline: '#DhanmondiSaturday trending locally — good day to soft-promote',
    date: 'Mon 13 Jul',
    type: 'Hashtag',
    platform: 'local',
    strength: 'medium',
    whyItMatters: 'Weekend foot traffic spike — perfect for styling-club soft sell.',
    freyaSuggestion: 'Draft a carousel: “See us Saturday — first box half off for new club members.”',
    action: 'content',
    status: 'new',
  },
  {
    id: 's8',
    headline: 'Horizon Chambers opened a new floor 2km from your shop',
    date: 'Mon 13 Jul',
    type: 'Company',
    platform: 'web',
    strength: 'high',
    whyItMatters: 'New office = standing gift-pack opportunity (already in CRM/Inbox).',
    freyaSuggestion: 'Keep watching — nudge Farhana with a tasting of festive packs for the new floor.',
    action: 'watch',
    status: 'new',
  },
  {
    id: 's9',
    headline: 'Hand-embroidered kurti searches up 28% in Dhaka this week',
    date: 'Sun 12 Jul',
    type: 'Hashtag',
    platform: 'web',
    strength: 'medium',
    whyItMatters: 'Matches Nadia’s shoot inquiry — demand is broader than one client.',
    freyaSuggestion: 'Post an embroidery close-up Reel and pin it to Stories highlights.',
    action: 'content',
    status: 'new',
  },
  {
    id: 's10',
    headline: 'Thread & Loom launched same-day delivery within 5 km',
    date: 'Sat 11 Jul',
    type: 'Competitor',
    platform: 'instagram',
    strength: 'medium',
    whyItMatters: 'Delivery convenience is becoming table stakes for local boutiques.',
    freyaSuggestion: 'Watch their offer; Freya can sketch a limited same-day pickup window.',
    action: 'watch',
    status: 'new',
  },
]

export const SEED_TRENDS: DiscoverTrend[] = [
  {
    id: 'tr1',
    title: 'Bridal guest favours',
    summary: 'Couples are booking small gift sets alongside lehengas — higher AOV than dress alone.',
    direction: 'up',
    changeLabel: '+34% mentions',
    topic: 'Weddings',
    freyaTip: 'Package “lehenga + 60 guest favours” in your next proposal.',
  },
  {
    id: 'tr2',
    title: 'Hand embroidery close-ups',
    summary: 'Local searches and DMs for jamdani & kantha detail keep climbing.',
    direction: 'up',
    changeLabel: '+28% searches',
    topic: 'Product',
    freyaTip: 'Feature a 15s embroidery Reel this week.',
  },
  {
    id: 'tr3',
    title: 'Corporate festive packs',
    summary: 'B2B buyers want predictable Eid/Pohela Boishakh gifts, not one-off orders.',
    direction: 'emerging',
    changeLabel: 'New pattern',
    topic: 'B2B',
    freyaTip: 'Publish a simple 3-tier standing-order sheet for chambers & firms.',
  },
  {
    id: 'tr4',
    title: 'Weekend soft launches',
    summary: 'Saturday drops are being used to test colours before full collection commits.',
    direction: 'steady',
    changeLabel: 'Stable',
    topic: 'Retail',
    freyaTip: 'Bring one experimental colourway each Saturday and poll buyers.',
  },
  {
    id: 'tr5',
    title: 'Styling subscriptions',
    summary: 'Small monthly clubs outperform one-time promo codes for retention.',
    direction: 'up',
    changeLabel: '+19% interest',
    topic: 'Retention',
    freyaTip: 'Highlight Rafi’s styling-club win in a testimonial Story.',
  },
]

export const SEED_IDEAS: ContentIdea[] = [
  {
    id: 'ci1',
    title: '“Ask a boutique” WhatsApp reply template',
    angle: 'Respond warmly to Karim Hossain’s recommendation ask — soft CTA to visit.',
    format: 'Comment + follow-up DM',
    channel: 'WhatsApp',
    fromSignalId: 's1',
    status: 'suggested',
  },
  {
    id: 'ci2',
    title: 'Saturday Dhanmondi Stories takeover',
    angle: 'Ride #DhanmondiSaturday with behind-the-scenes packing + QR to styling club.',
    format: 'Stories sequence',
    channel: 'Instagram',
    fromSignalId: 's7',
    status: 'suggested',
  },
  {
    id: 'ci3',
    title: 'Embroidery detail reel',
    angle: 'Show Nadia-style shoot-ready saree in 15 seconds.',
    format: 'Reel',
    channel: 'Instagram',
    fromSignalId: 's9',
    status: 'suggested',
  },
  {
    id: 'ci4',
    title: 'Standing gift-pack one-pager',
    angle: 'PDF carousel for Horizon-style offices: price per person, sample pack.',
    format: 'Carousel / PDF',
    channel: 'Messenger',
    fromSignalId: 's8',
    status: 'saved',
  },
  {
    id: 'ci5',
    title: 'Why our packaging is recyclable',
    angle: 'Sustainability proof against rival ads — trust builder, not hard sell.',
    format: 'Feed post',
    channel: 'Facebook',
    status: 'suggested',
  },
]

export const SEED_COMPETITORS: CompetitorWatch[] = [
  {
    id: 'cw1',
    name: 'Thread & Loom',
    note: 'Neighborhood boutique — similar vibe, stronger delivery push.',
    lastMove: 'Launched same-day delivery within 5 km',
    threat: 'medium',
    freyaTake: 'Don’t copy blindly — offer a 2-hour pickup window instead of full delivery fleet.',
  },
  {
    id: 'cw2',
    name: 'Aarong Lane',
    note: 'Corporate-gifting focused; heavy Facebook ads in your area.',
    lastMove: 'Boosted festive-pack ad targeting Dhanmondi',
    threat: 'high',
    freyaTake: 'Counter with a “standing Tuesday” offer aimed at offices, not one-off parties.',
  },
  {
    id: 'cw3',
    name: 'Banani Stitch',
    note: 'Wholesale kurtis to multi-brand shops.',
    lastMove: 'Sampled three new shops in Gulshan',
    threat: 'low',
    freyaTake: 'Rahman Traders path is still open — keep wholesale samples warm.',
  },
]

export const SEED_INSIGHTS: DiscoverInsight[] = [
  {
    id: 'di1',
    tone: 'action',
    title: '3 high-strength signals ready for leads',
    body: 'Karim, Petal Events, and Fahim’s wedding update are hot. Convert them before the moment cools.',
    actionLabel: 'Open signal feed',
    goTo: 'signals',
  },
  {
    id: 'di2',
    tone: 'risk',
    title: 'Competitor ad spend in your area',
    body: 'Aarong Lane is boosting corporate-gifting ads nearby. A standing-order post this week would blunt it.',
    actionLabel: 'See competitors',
    goTo: 'competitors',
  },
  {
    id: 'di3',
    tone: 'win',
    title: 'Bridal guest favours are surging',
    body: 'Mentions are up 34%. Your Müller quote is perfectly timed — lean into favour packages.',
    actionLabel: 'View trends',
    goTo: 'trends',
  },
  {
    id: 'di4',
    tone: 'info',
    title: '5 content ideas queued',
    body: 'I drafted angles from this week’s signals — save the ones you like and I’ll move them toward Content.',
    actionLabel: 'Browse ideas',
    goTo: 'ideas',
  },
]
