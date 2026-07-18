import { useEffect, useState } from 'react'

/** Natural blink loop — closed briefly every few seconds. */
export function useFreyaBlink(enabled = true) {
  const [blink, setBlink] = useState(false)

  useEffect(() => {
    if (!enabled) {
      setBlink(false)
      return
    }

    let timeoutId = 0
    let cancelled = false

    function schedule() {
      const wait = 2800 + Math.random() * 3200
      timeoutId = window.setTimeout(() => {
        if (cancelled) return
        setBlink(true)
        timeoutId = window.setTimeout(() => {
          if (cancelled) return
          setBlink(false)
          // occasional double-blink
          if (Math.random() < 0.22) {
            timeoutId = window.setTimeout(() => {
              if (cancelled) return
              setBlink(true)
              timeoutId = window.setTimeout(() => {
                if (cancelled) return
                setBlink(false)
                schedule()
              }, 110)
            }, 160)
          } else {
            schedule()
          }
        }, 130)
      }, wait)
    }

    schedule()
    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [enabled])

  return blink
}
