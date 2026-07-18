/** Discover — Freya's trends & signals radar */

export type SignalType = 'Mention' | 'Hashtag' | 'Company' | 'Competitor' | 'Life Event'
export type SignalPlatform = 'linkedin' | 'instagram' | 'facebook' | 'local' | 'web'
export type SignalStrength = 'high' | 'medium' | 'low'
export type SignalAction = 'lead' | 'content' | 'watch' | 'none'
export type TrendDirection = 'up' | 'steady' | 'emerging'
export type InsightTone = 'action' | 'risk' | 'win' | 'info'

export const SIGNAL_TYPE_META: Record<SignalType, { label: string; chip: string }> = {
  Mention: { label: 'Mention', chip: 'bg-slate-100 text-slate-700' },
  Hashtag: { label: 'Hashtag', chip: 'bg-sky-100 text-sky-700' },
  Company: { label: 'Company', chip: 'bg-indigo-100 text-indigo-700' },
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
    headline: 'Marcus Rivera posted asking for bakery recommendations on LinkedIn',
    date: 'Thu 16 Jul',
    type: 'Mention',
    platform: 'linkedin',
    strength: 'high',
    whyItMatters: 'Warm intro opportunity — he’s actively asking peers for a bakery.',
    freyaSuggestion: 'Add Marcus as a lead and I’ll draft a friendly LinkedIn reply.',
    action: 'lead',
    status: 'new',
  },
  {
    id: 's2',
    headline: 'Someone used #LocalBakery near your shop — 3 posts in the last day',
    date: 'Thu 16 Jul',
    type: 'Hashtag',
    platform: 'instagram',
    strength: 'medium',
    whyItMatters: 'Local discovery is heating up; a soft promo post would ride the wave.',
    freyaSuggestion: 'Save a Stories idea highlighting today’s fresh trays.',
    action: 'content',
    status: 'new',
  },
  {
    id: 's3',
    headline: 'Petal Events updated their company page — hiring for wedding season',
    date: 'Wed 15 Jul',
    type: 'Company',
    platform: 'linkedin',
    strength: 'high',
    whyItMatters: 'Wedding planners hiring = more cake & dessert table demand soon.',
    freyaSuggestion: 'Add Petal Events as a lead and offer a tasting partnership.',
    action: 'lead',
    status: 'new',
  },
  {
    id: 's4',
    headline: 'Rival bakery boosted a catering ad targeting your zip code',
    date: 'Wed 15 Jul',
    type: 'Competitor',
    platform: 'facebook',
    strength: 'high',
    whyItMatters: 'They’re spending to win corporate catering in your area.',
    freyaSuggestion: 'Watch them closely and counter with a standing-order offer.',
    action: 'watch',
    status: 'new',
  },
  {
    id: 's5',
    headline: 'Priya Patel changed LinkedIn headline to “Planning my wedding 💍”',
    date: 'Tue 14 Jul',
    type: 'Life Event',
    platform: 'linkedin',
    strength: 'high',
    whyItMatters: 'She’s already chatting in Inbox about custom cakes — life-event signal confirms intent.',
    freyaSuggestion: 'Add as a hot lead if she isn’t already, and send tasting options.',
    action: 'lead',
    status: 'new',
  },
  {
    id: 's6',
    headline: 'Chen Designs tagged a venue that often books local caterers',
    date: 'Tue 14 Jul',
    type: 'Mention',
    platform: 'instagram',
    strength: 'medium',
    whyItMatters: 'Venue + designer combo often needs dessert partners.',
    freyaSuggestion: 'Add as a lead and mention you already work near that venue.',
    action: 'lead',
    status: 'new',
  },
  {
    id: 's7',
    headline: '#FarmersMarketSaturday trending locally — good day to soft-promote',
    date: 'Mon 13 Jul',
    type: 'Hashtag',
    platform: 'local',
    strength: 'medium',
    whyItMatters: 'Weekend foot traffic spike — perfect for pastry-club soft sell.',
    freyaSuggestion: 'Draft a carousel: “See us Saturday — first box half off for new club members.”',
    action: 'content',
    status: 'new',
  },
  {
    id: 's8',
    headline: 'Brooks Law opened a new office 2km from your shop',
    date: 'Mon 13 Jul',
    type: 'Company',
    platform: 'web',
    strength: 'high',
    whyItMatters: 'New office = standing breakfast opportunity (already in CRM/Inbox).',
    freyaSuggestion: 'Keep watching — nudge Olivia with a tasting for the new floor.',
    action: 'watch',
    status: 'new',
  },
  {
    id: 's9',
    headline: 'Gluten-free dessert searches up 28% in your city this week',
    date: 'Sun 12 Jul',
    type: 'Hashtag',
    platform: 'web',
    strength: 'medium',
    whyItMatters: 'Matches Elena’s shoot inquiry — demand is broader than one client.',
    freyaSuggestion: 'Post a GF menu teaser and pin it to Stories highlights.',
    action: 'content',
    status: 'new',
  },
  {
    id: 's10',
    headline: 'Sweet Crumb Co. launched same-day delivery within 5 miles',
    date: 'Sat 11 Jul',
    type: 'Competitor',
    platform: 'instagram',
    strength: 'medium',
    whyItMatters: 'Delivery convenience is becoming table stakes for local bakers.',
    freyaSuggestion: 'Watch their offer; Freya can sketch a limited same-day window.',
    action: 'watch',
    status: 'new',
  },
]

export const SEED_TRENDS: DiscoverTrend[] = [
  {
    id: 'tr1',
    title: 'Wedding dessert tables',
    summary: 'Couples are booking dessert bars alongside cakes — higher AOV than cake alone.',
    direction: 'up',
    changeLabel: '+34% mentions',
    topic: 'Weddings',
    freyaTip: 'Package “cake + 60-piece dessert table” in your next proposal.',
  },
  {
    id: 'tr2',
    title: 'Gluten-free & allergen-friendly',
    summary: 'Local searches and DMs for GF / nut-free options keep climbing.',
    direction: 'up',
    changeLabel: '+28% searches',
    topic: 'Dietary',
    freyaTip: 'Feature GF lemon bars in a short Reel this week.',
  },
  {
    id: 'tr3',
    title: 'Office standing breakfasts',
    summary: 'B2B buyers want predictable Tuesday/Thursday trays, not one-off catering.',
    direction: 'emerging',
    changeLabel: 'New pattern',
    topic: 'B2B',
    freyaTip: 'Publish a simple 3-tier standing-order sheet for law / design firms.',
  },
  {
    id: 'tr4',
    title: 'Farmers market soft launches',
    summary: 'Weekend stalls are being used to test flavors before menu commits.',
    direction: 'steady',
    changeLabel: 'Stable',
    topic: 'Retail',
    freyaTip: 'Bring one experimental flavor each Saturday and poll buyers.',
  },
  {
    id: 'tr5',
    title: 'Pastry subscriptions',
    summary: 'Small monthly clubs outperform one-time promo codes for retention.',
    direction: 'up',
    changeLabel: '+19% interest',
    topic: 'Retention',
    freyaTip: 'Highlight Sam’s pastry club win in a testimonial Story.',
  },
]

export const SEED_IDEAS: ContentIdea[] = [
  {
    id: 'ci1',
    title: '“Ask a baker” LinkedIn reply template',
    angle: 'Respond publicly to Marcus Rivera’s recommendation ask — soft CTA to DM.',
    format: 'Comment + follow-up DM',
    channel: 'LinkedIn',
    fromSignalId: 's1',
    status: 'suggested',
  },
  {
    id: 'ci2',
    title: 'Saturday market Stories takeover',
    angle: 'Ride #FarmersMarketSaturday with behind-the-scenes packing + QR to pastry club.',
    format: 'Stories sequence',
    channel: 'Instagram',
    fromSignalId: 's7',
    status: 'suggested',
  },
  {
    id: 'ci3',
    title: 'GF dessert reel',
    angle: 'Show Elena-style shoot-ready GF box in 15 seconds.',
    format: 'Reel',
    channel: 'Instagram',
    fromSignalId: 's9',
    status: 'suggested',
  },
  {
    id: 'ci4',
    title: 'Standing breakfast one-pager',
    angle: 'PDF carousel for Brooks-style offices: price per person, sample menu.',
    format: 'Carousel / PDF',
    channel: 'LinkedIn',
    fromSignalId: 's8',
    status: 'saved',
  },
  {
    id: 'ci5',
    title: 'Why our boxes are compostable',
    angle: 'Sustainability proof against rival ads — trust builder, not hard sell.',
    format: 'Feed post',
    channel: 'Facebook',
    status: 'suggested',
  },
]

export const SEED_COMPETITORS: CompetitorWatch[] = [
  {
    id: 'cw1',
    name: 'Sweet Crumb Co.',
    note: 'Neighborhood bakery — similar vibe, stronger delivery push.',
    lastMove: 'Launched same-day delivery within 5 miles',
    threat: 'medium',
    freyaTake: 'Don’t copy blindly — offer a 2-hour pickup window instead of full delivery fleet.',
  },
  {
    id: 'cw2',
    name: 'Rise & Whisk',
    note: 'Catering-focused; heavy Facebook ads in your zip.',
    lastMove: 'Boosted catering ad targeting your zip code',
    threat: 'high',
    freyaTake: 'Counter with a “standing Tuesday” offer aimed at offices, not one-off parties.',
  },
  {
    id: 'cw3',
    name: 'Harbor Oven',
    note: 'Wholesale croissants to cafes.',
    lastMove: 'Sampled three new cafes downtown',
    threat: 'low',
    freyaTake: 'Okafor path is still open — keep wholesale samples warm.',
  },
]

export const SEED_INSIGHTS: DiscoverInsight[] = [
  {
    id: 'di1',
    tone: 'action',
    title: '3 high-strength signals ready for leads',
    body: 'Marcus, Petal Events, and Priya’s wedding update are hot. Convert them before the moment cools.',
    actionLabel: 'Open signal feed',
    goTo: 'signals',
  },
  {
    id: 'di2',
    tone: 'risk',
    title: 'Competitor ad spend in your zip',
    body: 'Rise & Whisk is boosting catering ads nearby. A standing-order post this week would blunt it.',
    actionLabel: 'See competitors',
    goTo: 'competitors',
  },
  {
    id: 'di3',
    tone: 'win',
    title: 'Wedding dessert tables are surging',
    body: 'Mentions are up 34%. Your Müller quote is perfectly timed — lean into dessert-table packages.',
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
