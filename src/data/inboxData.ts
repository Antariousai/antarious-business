export type InboxChannel = 'facebook' | 'instagram' | 'linkedin'

export type MessageKind = 'customer' | 'you' | 'freya-draft'

export interface InboxMessage {
  id: string
  kind: MessageKind
  text: string
  time: string
}

export interface InboxThread {
  id: string
  name: string
  handle: string
  channel: InboxChannel
  avatarColor: string
  preview: string
  unread: boolean
  freyaHandling: boolean
  updatedAt: string
  messages: InboxMessage[]
}

export const CHANNEL_META: Record<
  InboxChannel,
  { label: string; color: string; short: string }
> = {
  facebook: { label: 'Facebook', color: '#1877F2', short: 'f' },
  instagram: { label: 'Instagram', color: '#E1306C', short: 'ig' },
  linkedin: { label: 'LinkedIn', color: '#0A66C2', short: 'in' },
}

export const SEED_THREADS: InboxThread[] = [
  {
    id: 't1',
    name: 'Priya Patel',
    handle: '@priya.events',
    channel: 'facebook',
    avatarColor: '#8b5cf6',
    preview: 'Hi! Do you make custom wedding cakes?',
    unread: true,
    freyaHandling: true,
    updatedAt: '2m',
    messages: [
      {
        id: 'm1',
        kind: 'customer',
        text: 'Hi! Do you make custom wedding cakes?',
        time: '10:14 AM',
      },
      {
        id: 'm2',
        kind: 'freya-draft',
        text: "Hi Priya! Yes we absolutely do 🎂 What's the date and rough guest count? I can send some ideas.",
        time: 'Just now',
      },
    ],
  },
  {
    id: 't2',
    name: 'Mike T.',
    handle: '@mike.tastes',
    channel: 'instagram',
    avatarColor: '#f97316',
    preview: 'Is the sourdough still available today?',
    unread: true,
    freyaHandling: true,
    updatedAt: '18m',
    messages: [
      {
        id: 'm1',
        kind: 'customer',
        text: 'Hey! Saw your story — is the sourdough still available today?',
        time: '9:52 AM',
      },
      {
        id: 'm2',
        kind: 'freya-draft',
        text: "Hey Mike! Yes — we have about a dozen left. Want me to hold one for you until 4pm?",
        time: 'Just now',
      },
    ],
  },
  {
    id: 't3',
    name: 'Elena V.',
    handle: '@elena.vasquez',
    channel: 'instagram',
    avatarColor: '#ea580c',
    preview: 'Need gluten-free options for a shoot…',
    unread: true,
    freyaHandling: true,
    updatedAt: '1h',
    messages: [
      {
        id: 'm1',
        kind: 'customer',
        text: 'Hi! We need gluten-free options for a client shoot on Thursday. Can you cater ~20 people?',
        time: 'Yesterday',
      },
      {
        id: 'm2',
        kind: 'you',
        text: "Hi Elena — yes we can. I'll send a GF menu shortly!",
        time: 'Yesterday',
      },
      {
        id: 'm3',
        kind: 'customer',
        text: 'Amazing. Also any nut-free options?',
        time: '1h ago',
      },
      {
        id: 'm4',
        kind: 'freya-draft',
        text: "Yes — our GF lemon bars and fruit tarts are also nut-free. Want a quote for Thursday delivery?",
        time: 'Just now',
      },
    ],
  },
  {
    id: 't4',
    name: 'Brooks Law',
    handle: 'Corporate · LinkedIn',
    channel: 'linkedin',
    avatarColor: '#3b82f6',
    preview: 'Interested in weekly office breakfast…',
    unread: true,
    freyaHandling: true,
    updatedAt: '3h',
    messages: [
      {
        id: 'm1',
        kind: 'customer',
        text: "Hi Joy — Olivia from Brooks Law. We're interested in a weekly office breakfast for ~40 people. Do you offer standing orders?",
        time: '3h ago',
      },
      {
        id: 'm2',
        kind: 'freya-draft',
        text: "Hi Olivia! Yes — we run standing Tuesday breakfasts for local offices. Happy to send packages starting at $12/person. Want a tasting for your team?",
        time: 'Just now',
      },
    ],
  },
  {
    id: 't5',
    name: 'Sam Rivera',
    handle: '@sam.eats',
    channel: 'instagram',
    avatarColor: '#14b8a6',
    preview: 'Thanks for the pastry club invite!',
    unread: false,
    freyaHandling: false,
    updatedAt: 'Yesterday',
    messages: [
      {
        id: 'm1',
        kind: 'you',
        text: 'Hey Sam — want to join our weekend pastry club? $24/month 🥐',
        time: 'Yesterday',
      },
      {
        id: 'm2',
        kind: 'customer',
        text: 'Thanks for the pastry club invite! Just signed up 🙌',
        time: 'Yesterday',
      },
      {
        id: 'm3',
        kind: 'you',
        text: "You're in! First box is this Saturday — we'll text when it's ready.",
        time: 'Yesterday',
      },
    ],
  },
  {
    id: 't6',
    name: 'Hannah Müller',
    handle: 'Müller Events',
    channel: 'facebook',
    avatarColor: '#ef4444',
    preview: 'Garden party dessert table quote?',
    unread: false,
    freyaHandling: true,
    updatedAt: '2d',
    messages: [
      {
        id: 'm1',
        kind: 'customer',
        text: 'Hi — planning a summer garden party. Could you quote a dessert table for 60?',
        time: '2d ago',
      },
      {
        id: 'm2',
        kind: 'freya-draft',
        text: "Hi Hannah! Absolutely. For 60 guests we'd suggest a mix of tarts, mini cakes, and macarons — packages from $1,800. Want me to send a full menu PDF?",
        time: 'Just now',
      },
    ],
  },
  {
    id: 't7',
    name: 'James Okafor',
    handle: 'Okafor Cafe · LinkedIn',
    channel: 'linkedin',
    avatarColor: '#f59e0b',
    preview: 'Sample croissants were excellent…',
    unread: false,
    freyaHandling: false,
    updatedAt: '3d',
    messages: [
      {
        id: 'm1',
        kind: 'you',
        text: 'James — samples are on the way. Let me know how the team likes them!',
        time: '4d ago',
      },
      {
        id: 'm2',
        kind: 'customer',
        text: 'Sample croissants were excellent. Can we talk wholesale pricing for Mon–Sat?',
        time: '3d ago',
      },
      {
        id: 'm3',
        kind: 'you',
        text: "Thrilled to hear that! I'll send a wholesale sheet today.",
        time: '3d ago',
      },
    ],
  },
]
