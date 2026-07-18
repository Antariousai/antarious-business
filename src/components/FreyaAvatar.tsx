import { FreyaFace } from './FreyaFace'

/** Freya’s face in chat / sidebar — same character as the login page. */
export function FreyaAvatar({
  size = 40,
  online,
  animate = true,
  className = '',
}: {
  size?: number
  online?: boolean
  animate?: boolean
  className?: string
}) {
  const canBlink = animate && size >= 24

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-sky-soft/80 to-amber-50/90 ring-1 ring-sky/20 ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label="Freya"
    >
      <FreyaFace fit="face" animate={canBlink} />
      {online && (
        <span
          className="absolute bottom-0 right-0 z-[1] rounded-full border-2 border-white bg-online"
          style={{ width: Math.max(8, size * 0.28), height: Math.max(8, size * 0.28) }}
        />
      )}
    </div>
  )
}
