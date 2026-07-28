import { useId } from 'react'
import type { Platform } from '../data/mockData'
import type { InboxChannel } from '../data/inboxData'
import type { LeadPlatform } from '../data/leadsData'

/** Canonical keys for brand logos */
export type SocialPlatform =
  | 'facebook'
  | 'instagram'
  | 'whatsapp'
  | 'messenger'
  | 'linkedin'

export const PLATFORM_BRAND: Record<
  SocialPlatform,
  { label: string; color: string }
> = {
  facebook: { label: 'Facebook', color: '#1877F2' },
  instagram: { label: 'Instagram', color: '#E4405F' },
  whatsapp: { label: 'WhatsApp', color: '#25D366' },
  messenger: { label: 'Messenger', color: '#0084FF' },
  linkedin: { label: 'LinkedIn', color: '#0A66C2' },
}

export function normalizeSocialPlatform(
  value: string | Platform | InboxChannel | LeadPlatform | undefined | null,
): SocialPlatform | null {
  if (!value) return null
  const key = String(value).trim().toLowerCase()
  if (key === 'facebook' || key === 'fb' || key === 'meta') return 'facebook'
  if (key === 'instagram' || key === 'ig') return 'instagram'
  if (key === 'whatsapp' || key === 'wa') return 'whatsapp'
  if (key === 'messenger' || key === 'msg') return 'messenger'
  if (key === 'linkedin' || key === 'in' || key === 'li') return 'linkedin'
  if (key.includes('facebook')) return 'facebook'
  if (key.includes('instagram')) return 'instagram'
  if (key.includes('whatsapp')) return 'whatsapp'
  if (key.includes('messenger')) return 'messenger'
  if (key.includes('linkedin')) return 'linkedin'
  return null
}

type IconProps = {
  platform: string | Platform | InboxChannel | LeadPlatform
  size?: number
  className?: string
  /** `brand` = official color fill; `current` = inherit text color; `white` = white glyph */
  tone?: 'brand' | 'current' | 'white'
  title?: string
}

/** Official-style brand mark (Simple Icons–compatible paths). */
export function PlatformIcon({
  platform,
  size = 16,
  className = '',
  tone = 'brand',
  title,
}: IconProps) {
  const id = normalizeSocialPlatform(platform)
  const gradId = useId().replace(/:/g, '')
  if (!id) return null

  const brand = PLATFORM_BRAND[id]
  const fill =
    tone === 'white' ? '#fff' : tone === 'current' ? 'currentColor' : brand.color
  const label = title ?? brand.label

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={`shrink-0 ${className}`}
      aria-label={label}
      role="img"
    >
      <title>{label}</title>
      {id === 'instagram' && tone === 'brand' ? (
        <>
          <defs>
            <linearGradient id={gradId} x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#F58529" />
              <stop offset="50%" stopColor="#DD2A7B" />
              <stop offset="100%" stopColor="#8134AF" />
            </linearGradient>
          </defs>
          <path fill={`url(#${gradId})`} d={PATHS.instagram} />
        </>
      ) : (
        <path fill={fill} d={PATHS[id]} />
      )}
    </svg>
  )
}

type ChipProps = {
  platform: string | Platform | InboxChannel | LeadPlatform
  size?: 'sm' | 'md'
  showLabel?: boolean
  className?: string
}

/** Icon + optional label chip for lists and filters. */
export function PlatformChip({
  platform,
  size = 'sm',
  showLabel = true,
  className = '',
}: ChipProps) {
  const id = normalizeSocialPlatform(platform)
  if (!id) {
    const raw = String(platform)
    const label = raw.charAt(0).toUpperCase() + raw.slice(1)
    return showLabel ? (
      <span className={`inline-flex items-center gap-1.5 ${className}`}>{label}</span>
    ) : null
  }
  const brand = PLATFORM_BRAND[id]
  const iconSize = size === 'md' ? 18 : 14
  return (
    <span
      className={`inline-flex items-center gap-1.5 ${className}`}
      title={brand.label}
    >
      <PlatformIcon platform={id} size={iconSize} />
      {showLabel && <span>{brand.label}</span>}
    </span>
  )
}

/** Circular badge for overlaying on avatars (inbox threads, etc.). */
export function PlatformBadge({
  platform,
  className = '',
}: {
  platform: string | Platform | InboxChannel | LeadPlatform
  className?: string
}) {
  const id = normalizeSocialPlatform(platform)
  if (!id) return null
  const brand = PLATFORM_BRAND[id]
  return (
    <span
      className={`absolute -right-0.5 -bottom-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white shadow-sm ${className}`}
      style={{ background: brand.color }}
      title={brand.label}
    >
      <PlatformIcon platform={id} size={9} tone="white" />
    </span>
  )
}

const PATHS: Record<SocialPlatform, string> = {
  facebook:
    'M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047v-2.66c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.971h-1.513c-1.491 0-1.956.93-1.956 1.886v2.264h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073',
  instagram:
    'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z',
  whatsapp:
    'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z',
  messenger:
    'M12 0C5.373 0 0 4.975 0 11.111c0 3.497 1.745 6.616 4.472 8.652V24l4.086-2.242c1.09.301 2.246.464 3.442.464 6.627 0 12-4.974 12-11.111C24 4.975 18.627 0 12 0zm1.193 14.963l-3.056-3.259-5.963 3.259L10.732 8l3.131 3.259L19.752 8l-6.559 6.963z',
  linkedin:
    'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
}
