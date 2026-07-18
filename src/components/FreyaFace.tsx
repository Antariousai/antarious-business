import { freyaBase, freyaEyelids } from '../data/freyaAssets'
import { useFreyaBlink } from '../hooks/useFreyaBlink'

type FreyaFit = 'face' | 'figure'

/**
 * Single Freya everywhere — login folded pose + eyelids-only blink.
 * `face` crops the head for circular avatars; `figure` shows the half-body.
 */
export function FreyaFace({
  fit = 'face',
  animate = true,
  className = '',
  imgClassName = '',
}: {
  fit?: FreyaFit
  animate?: boolean
  className?: string
  imgClassName?: string
}) {
  const blink = useFreyaBlink(animate)

  const fitClass =
    fit === 'face'
      ? 'h-full w-full object-cover object-[50%_12%]'
      : 'h-full w-full object-contain object-bottom'

  const imgClass = `${fitClass} ${imgClassName}`.trim()

  return (
    <div className={`relative h-full w-full ${className}`.trim()}>
      <img src={freyaBase} alt="" className={imgClass} draggable={false} aria-hidden />
      {animate && (
        <img
          src={freyaEyelids}
          alt=""
          aria-hidden
          className={`pointer-events-none absolute inset-0 ${imgClass} transition-opacity duration-75 ${
            blink ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ filter: 'none' }}
          draggable={false}
        />
      )}
    </div>
  )
}
