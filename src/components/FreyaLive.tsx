import type { FreyaLoginMood } from '../data/freyaExpressions'
import { FreyaFace } from './FreyaFace'

type FreyaLiveVariant = 'hero' | 'avatar'

/** Live Freya — same login character + eyelids-only blink. */
export function FreyaLive({
  mood = 'welcome',
  size = 120,
  variant = 'hero',
  online,
  animate = true,
  className = '',
}: {
  mood?: FreyaLoginMood
  size?: number
  variant?: FreyaLiveVariant
  online?: boolean
  animate?: boolean
  className?: string
}) {
  const isAvatar = variant === 'avatar'

  const rootClass = [
    'freya-live',
    isAvatar ? 'freya-live-avatar' : 'freya-live-hero',
    animate ? 'freya-live-animated' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={rootClass}
      style={{ width: size, height: isAvatar ? size : Math.round(size * 1.15) }}
      role="img"
      aria-label={`Freya — ${mood}`}
    >
      <div className="freya-live-frame relative h-full w-full overflow-hidden">
        <FreyaFace fit={isAvatar ? 'face' : 'figure'} animate={animate} />
      </div>
      {online && (
        <span
          className="freya-live-online"
          style={{
            width: Math.max(10, size * 0.16),
            height: Math.max(10, size * 0.16),
          }}
        />
      )}
    </div>
  )
}
