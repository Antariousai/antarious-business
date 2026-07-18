import { FreyaFace } from './FreyaFace'

type FreyaMood = 'happy' | 'thinking' | 'excited'
type FreyaVariant = 'hero' | 'avatar'

/** Freya — same login character; hero = half-body, avatar = face crop. */
export function FreyaCharacter({
  size = 120,
  variant = 'hero',
  mood: _mood = 'happy',
  animate = true,
  online,
  className = '',
}: {
  size?: number
  variant?: FreyaVariant
  mood?: FreyaMood
  animate?: boolean
  online?: boolean
  className?: string
}) {
  const isAvatar = variant === 'avatar'

  const rootClass = [
    'freya-char',
    isAvatar ? 'freya-char-avatar' : 'freya-char-hero',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={rootClass}
      style={{ width: size, height: isAvatar ? size : Math.round(size * 1.2) }}
      role="img"
      aria-label="Freya, your AI teammate"
    >
      <div
        className={
          isAvatar
            ? 'relative h-full w-full overflow-hidden rounded-full bg-gradient-to-br from-sky-soft/80 to-amber-50/90 ring-1 ring-sky/15'
            : 'relative flex h-full w-full items-end justify-center'
        }
      >
        <FreyaFace
          fit={isAvatar ? 'face' : 'figure'}
          animate={animate}
          imgClassName={isAvatar ? '' : 'drop-shadow-md'}
        />
      </div>

      {online && (
        <span
          className="freya-char-online absolute z-[1] rounded-full border-2 border-white bg-online"
          style={{
            width: Math.max(10, size * 0.16),
            height: Math.max(10, size * 0.16),
          }}
        />
      )}
    </div>
  )
}
