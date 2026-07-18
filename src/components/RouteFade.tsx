import { useEffect, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'

export function RouteFade({ children }: { children: ReactNode }) {
  const location = useLocation()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(false)
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [location.pathname])

  return (
    <div className={`route-fade ${visible ? 'route-fade-in' : ''}`} key={location.pathname}>
      {children}
    </div>
  )
}
