import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

export function Modal({
  title,
  onClose,
  children,
  maxWidth = '440px',
}: {
  title: string
  onClose: () => void
  children: ReactNode
  maxWidth?: string
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl"
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[17px] font-bold text-ink">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-ink"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
