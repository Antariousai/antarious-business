export type InboxChannel = 'facebook' | 'instagram' | 'whatsapp' | 'messenger'

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
  whatsapp: { label: 'WhatsApp', color: '#25D366', short: 'wa' },
  messenger: { label: 'Messenger', color: '#0084FF', short: 'm' },
}

export const SEED_THREADS: InboxThread[] = [
  {
    id: 't1',
    name: 'Fahim Ahmed',
    handle: '@fahim.events',
    channel: 'messenger',
    avatarColor: '#0284c7',
    preview: 'Hi! Do you make custom bridal lehengas?',
    unread: true,
    freyaHandling: true,
    updatedAt: '2m',
    messages: [
      {
        id: 'm1',
        kind: 'customer',
        text: 'Hi! Do you make custom bridal lehengas?',
        time: '10:14 AM',
      },
      {
        id: 'm2',
        kind: 'freya-draft',
        text: "Hi Fahim! Yes we absolutely do ✨ What's the date and preferred colour palette? I can send some ideas.",
        time: 'Just now',
      },
    ],
  },
  {
    id: 't2',
    name: 'Maya R.',
    handle: '+880 17…',
    channel: 'whatsapp',
    avatarColor: '#fbbf24',
    preview: 'Is the emerald kurti still available today?',
    unread: true,
    freyaHandling: true,
    updatedAt: '18m',
    messages: [
      {
        id: 'm1',
        kind: 'customer',
        text: 'Hey! Saw your story — is the emerald kurti still available today?',
        time: '9:52 AM',
      },
      {
        id: 'm2',
        kind: 'freya-draft',
        text: "Hey Maya! Yes — we have two left in M and L. Want me to hold one at the Dhanmondi shop until 6pm?",
        time: 'Just now',
      },
    ],
  },
  {
    id: 't3',
    name: 'Sadia K.',
    handle: '@sadia.khan',
    channel: 'instagram',
    avatarColor: '#fb7185',
    preview: 'Need a jamdani saree for a shoot…',
    unread: true,
    freyaHandling: true,
    updatedAt: '1h',
    messages: [
      {
        id: 'm1',
        kind: 'customer',
        text: 'Hi! We need a jamdani saree for a client shoot on Thursday. Can you deliver to Banani?',
        time: 'Yesterday',
      },
      {
        id: 'm2',
        kind: 'you',
        text: "Hi Sadia — yes we can. I'll send options shortly!",
        time: 'Yesterday',
      },
      {
        id: 'm3',
        kind: 'customer',
        text: 'Amazing. Soft pastels preferred?',
        time: '1h ago',
      },
      {
        id: 'm4',
        kind: 'freya-draft',
        text: "Yes — our pastel jamdani set photographs beautifully. Want a quote for Thursday Pathao delivery?",
        time: 'Just now',
      },
    ],
  },
  {
    id: 't4',
    name: 'Rahman Traders',
    handle: 'Rahman Traders',
    channel: 'facebook',
    avatarColor: '#0ea5e9',
    preview: 'Can we confirm next week\'s wholesale pack?',
    unread: false,
    freyaHandling: false,
    updatedAt: '3h',
    messages: [
      {
        id: 'm1',
        kind: 'customer',
        text: "Can we confirm next week's wholesale kurti pack (40 pcs)?",
        time: '3h ago',
      },
      {
        id: 'm2',
        kind: 'you',
        text: "Yes — Freya will send INV-1043. Pay via bKash or Dutch-Bangla when ready.",
        time: '2h ago',
      },
    ],
  },
  {
    id: 't5',
    name: 'Nabila Events',
    handle: '+880 16…',
    channel: 'whatsapp',
    avatarColor: '#34d399',
    preview: 'Guest favours arrived — thank you!',
    unread: false,
    freyaHandling: false,
    updatedAt: 'Yesterday',
    messages: [
      {
        id: 'm1',
        kind: 'customer',
        text: 'Guest favours arrived — thank you! Guests loved the packaging.',
        time: 'Yesterday',
      },
      {
        id: 'm2',
        kind: 'you',
        text: "So glad to hear it, Nabila! We'll keep your palette notes for next time.",
        time: 'Yesterday',
      },
    ],
  },
]
