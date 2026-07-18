import { useEffect, useState } from 'react'
import { freyaBase, freyaEyelids } from '../data/freyaAssets'
import { useFreyaBlink } from '../hooks/useFreyaBlink'

/** Still half-body Freya — base stays put; only eyelids fade in for a blink. */
export function FreyaLoginFigure({
  className = '',
}: {
  engaged?: boolean
  className?: string
}) {
  const [appeared, setAppeared] = useState(false)
  const blink = useFreyaBlink(appeared)

  useEffect(() => {
    const id = window.setTimeout(() => setAppeared(true), 80)
    return () => window.clearTimeout(id)
  }, [])

  return (
    <div
      className={`login-freya-live ${appeared ? 'is-appeared' : ''} ${className}`.trim()}
      role="img"
      aria-label="Freya, your AI teammate"
    >
      <div className="login-freya-ground" aria-hidden />
      <div className="login-freya-glow" aria-hidden />
      <div className="login-freya-stage-clip">
        <img
          src={freyaBase}
          alt=""
          draggable={false}
          className="login-freya-frame is-active"
        />
        <img
          src={freyaEyelids}
          alt=""
          aria-hidden
          draggable={false}
          className={`login-freya-frame login-freya-eyelids ${blink ? 'is-active' : ''}`}
        />
      </div>
    </div>
  )
}
