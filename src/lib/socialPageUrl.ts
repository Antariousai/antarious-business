import type { Platform } from '@/data/mockData'

export type ConnectedChannel = {
  platform: Platform
  pageUrl: string
}

/** Ensure https:// and a parseable URL. Returns null if empty/invalid. */
export function normalizeSocialPageUrl(raw: string): string | null {
  const t = raw.trim()
  if (!t) return null
  let candidate = t
  if (!/^https?:\/\//i.test(candidate)) candidate = `https://${candidate}`
  try {
    const u = new URL(candidate)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    return u.toString()
  } catch {
    return null
  }
}

export function platformsFromChannels(channels: ConnectedChannel[]): Platform[] {
  return channels.map((c) => c.platform)
}
