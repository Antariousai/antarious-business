import {
  Home,
  CalendarDays,
  Megaphone,
  Users,
  Telescope,
  Inbox,
  Wallet,
  Compass,
  LayoutTemplate,
  Settings,
  UserPlus,
  type LucideIcon,
} from 'lucide-react'
import type { AppModule } from '../data/planTiers'

export type NavBadgeKey = 'home' | 'inbox' | 'discover'

export interface NavItem {
  to: string
  end?: boolean
  label: string
  shortLabel?: string
  sub: string
  icon: LucideIcon
  module: AppModule
  badgeKey?: NavBadgeKey
  chip: string
  /** Primary mobile bottom tabs */
  mobilePrimary?: boolean
}

export const NAV: NavItem[] = [
  {
    to: '/app',
    end: true,
    label: 'Home',
    sub: 'What needs you',
    icon: Home,
    module: 'today',
    badgeKey: 'home',
    chip: 'bg-sky/25 text-sky-muted',
    mobilePrimary: true,
  },
  {
    to: '/app/inbox',
    label: 'Messages',
    shortLabel: 'Msgs',
    sub: 'Replies & chats',
    icon: Inbox,
    module: 'messages',
    badgeKey: 'inbox',
    chip: 'bg-mint/25 text-mint',
    mobilePrimary: true,
  },
  {
    to: '/app/content',
    label: 'Posts',
    sub: 'Posts & calendar',
    icon: CalendarDays,
    module: 'posts',
    chip: 'bg-coral/25 text-coral',
    mobilePrimary: true,
  },
  {
    to: '/app/leads',
    label: 'Interested people',
    shortLabel: 'Leads',
    sub: 'People to follow up',
    icon: Users,
    module: 'leads',
    chip: 'bg-peach/30 text-peach',
  },
  {
    to: '/app/pipeline',
    label: 'Customers',
    sub: 'People & deals',
    icon: Telescope,
    module: 'customers',
    chip: 'bg-sky/20 text-sky-muted',
  },
  {
    to: '/app/money',
    label: 'Money',
    sub: 'To collect · this week',
    icon: Wallet,
    module: 'money',
    chip: 'bg-sunshine/25 text-sunshine',
    mobilePrimary: true,
  },
  {
    to: '/app/campaigns',
    label: 'Campaigns',
    sub: 'Your next push',
    icon: Megaphone,
    module: 'campaigns',
    chip: 'bg-sunshine/25 text-peach',
  },
  {
    to: '/app/discover',
    label: 'Ideas',
    sub: 'Ideas from Freya',
    icon: Compass,
    module: 'ideas',
    badgeKey: 'discover',
    chip: 'bg-mint/20 text-mint',
  },
  {
    to: '/app/templates',
    label: 'Templates',
    sub: 'Post styles that work',
    icon: LayoutTemplate,
    module: 'templates',
    chip: 'bg-sky-soft text-sky-bright',
  },
  {
    to: '/app/team',
    label: 'Team',
    sub: 'Who can help',
    icon: UserPlus,
    module: 'team',
    chip: 'bg-peach/25 text-peach',
  },
  {
    to: '/app/settings',
    label: 'Settings',
    sub: 'You & Freya',
    icon: Settings,
    module: 'settings',
    chip: 'bg-neutral-400/25 text-neutral-300',
  },
]

export const MOBILE_PRIMARY = NAV.filter((n) => n.mobilePrimary)
export const MOBILE_MORE = NAV.filter((n) => !n.mobilePrimary)

export const PAGE_META: Record<string, { title: string; subtitle?: string }> = {
  '/app': { title: 'Home' },
  '/app/content': { title: 'Posts' },
  '/app/campaigns': { title: 'Campaigns' },
  '/app/leads': { title: 'Interested people' },
  '/app/pipeline': { title: 'Customers' },
  '/app/inbox': { title: 'Messages' },
  '/app/money': { title: 'Money' },
  '/app/discover': { title: 'Ideas' },
  '/app/templates': { title: 'Templates' },
  '/app/team': { title: 'Team', subtitle: 'Who can help with Freya' },
  '/app/profile': { title: 'Profile', subtitle: 'Your account & business' },
  '/app/settings': { title: 'Settings', subtitle: 'You, channels & Freya' },
}

export const SEARCH_ROUTES: { q: string; path: string; label: string }[] = [
  { q: 'inbox', path: '/app/inbox', label: 'Messages' },
  { q: 'message', path: '/app/inbox', label: 'Messages' },
  { q: 'today', path: '/app', label: 'Home' },
  { q: 'home', path: '/app', label: 'Home' },
  { q: 'lead', path: '/app/leads', label: 'Interested people' },
  { q: 'interested', path: '/app/leads', label: 'Interested people' },
  { q: 'crm', path: '/app/pipeline', label: 'Customers' },
  { q: 'customer', path: '/app/pipeline', label: 'Customers' },
  { q: 'pipeline', path: '/app/pipeline', label: 'Customers' },
  { q: 'money', path: '/app/money', label: 'Money' },
  { q: 'invoice', path: '/app/money', label: 'Money' },
  { q: 'content', path: '/app/content', label: 'Posts' },
  { q: 'post', path: '/app/content', label: 'Posts' },
  { q: 'campaign', path: '/app/campaigns', label: 'Campaigns' },
  { q: 'discover', path: '/app/discover', label: 'Ideas' },
  { q: 'idea', path: '/app/discover', label: 'Ideas' },
  { q: 'template', path: '/app/templates', label: 'Templates' },
  { q: 'team', path: '/app/team', label: 'Team' },
  { q: 'setting', path: '/app/settings', label: 'Settings' },
  { q: 'profile', path: '/app/profile', label: 'Profile' },
  { q: 'freya', path: '/app', label: 'Freya' },
]
