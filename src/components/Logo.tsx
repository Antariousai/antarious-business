import logoWhite from '../assets/antarious-logo.png'
import logoDark from '../assets/antarious-logo-dark.png'

export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <img
      src={logoWhite}
      alt=""
      width={size}
      height={size}
      className="object-contain object-left"
      style={{ width: size, height: size }}
      aria-hidden
    />
  )
}

/** `light` = white wordmark for dark UI. Default = dark wordmark for light backgrounds. */
export function Logo({
  light = false,
  size = 36,
  className = '',
}: {
  light?: boolean
  size?: number
  className?: string
}) {
  const height = Math.max(24, Math.round(size * 0.9))

  return (
    <img
      src={light ? logoWhite : logoDark}
      alt="Antarious AI"
      height={height}
      className={`w-auto max-w-full object-contain object-left ${className}`.trim()}
      style={{ height }}
    />
  )
}
