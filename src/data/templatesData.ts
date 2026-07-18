/** Post style templates Freya reuses for consistent content */

export type TemplateIcon =
  | 'spotlight'
  | 'heart'
  | 'camera'
  | 'flash'
  | 'team'
  | 'pov'
  | 'custom'

export interface PostTemplate {
  id: string
  name: string
  structure: string
  visual: string
  usedCount: number
  lastUsed: string
  icon: TemplateIcon
  exampleCaption?: string
  freyaNote?: string
  createdAt: string
}

export const SEED_TEMPLATES: PostTemplate[] = [
  {
    id: 'tpl1',
    name: 'Product Spotlight',
    structure: '[Hook question] + [Product detail] + [Soft CTA] + 2 emojis',
    visual: 'Close-up hero shot, soft natural light',
    usedCount: 12,
    lastUsed: '15 Jul',
    icon: 'spotlight',
    exampleCaption:
      'Craving something flaky? Our butter croissants are baked fresh every morning — swing by before noon 🥐✨',
    freyaNote: 'Best for feed posts when you have a hero product photo.',
    createdAt: '2026-05-01',
  },
  {
    id: 'tpl2',
    name: 'Customer Love',
    structure: '[Customer quote] + [Your reaction] + [Invite to share]',
    visual: 'Repost-style customer photo',
    usedCount: 8,
    lastUsed: '12 Jul',
    icon: 'heart',
    exampleCaption:
      '"Best birthday cake we\'ve ever had." — Priya. Moments like this are why we bake. Tag us in your celebrations 💛',
    freyaNote: 'Use when a customer leaves a glowing review or tags you.',
    createdAt: '2026-05-08',
  },
  {
    id: 'tpl3',
    name: 'Behind the Scenes',
    structure: '[Short process] + [Human moment] + [Question]',
    visual: 'Action shot in the kitchen',
    usedCount: 15,
    lastUsed: '14 Jul',
    icon: 'camera',
    exampleCaption:
      '6am laminating dough before the city wakes up. What\'s the first thing you bake (or buy) on a Saturday?',
    freyaNote: 'Great for Stories and Reels — keeps the brand human.',
    createdAt: '2026-04-20',
  },
  {
    id: 'tpl4',
    name: 'Flash Sale',
    structure: '[Urgency] + [Offer] + [Deadline] + emoji',
    visual: 'Bold product shot + price badge',
    usedCount: 5,
    lastUsed: '8 Jul',
    icon: 'flash',
    exampleCaption:
      'Today only: buy 6 pastries, get 2 free. Ends at 4pm — don’t sleep on it ⏰',
    freyaNote: 'Keep urgency honest — Freya won’t overuse this style.',
    createdAt: '2026-06-01',
  },
  {
    id: 'tpl5',
    name: 'Meet the Team',
    structure: '[Name] + [Fun fact] + [Warm invite]',
    visual: 'Candid portrait',
    usedCount: 3,
    lastUsed: '2 Jul',
    icon: 'team',
    exampleCaption:
      'Meet Maya — our pastry lead who can score a baguette by sound alone. Come say hi next time you\'re in.',
    freyaNote: 'Builds trust for B2B buyers and local regulars.',
    createdAt: '2026-06-15',
  },
  {
    id: 'tpl6',
    name: 'POV / Relatable',
    structure: '[Scenario] + [Punchline] + [Tag prompt]',
    visual: 'Atmospheric / lifestyle shot',
    usedCount: 9,
    lastUsed: '13 Jul',
    icon: 'pov',
    exampleCaption:
      'POV: you said you\'d only grab a coffee… and somehow left with a box of kouign-amann. Tag your enabler 👀',
    freyaNote: 'High share rate on Instagram — Freya loves this for weekends.',
    createdAt: '2026-05-22',
  },
]
