import type { ReactNode } from 'react'

export function DataTable({
  headers,
  children,
  renderCards,
  className = '',
}: {
  headers: ReactNode
  children: ReactNode
  /** Stacked card fallback below md */
  renderCards?: ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      {renderCards && <div className="space-y-2 md:hidden">{renderCards}</div>}
      <div className={`overflow-x-auto ${renderCards ? 'hidden md:block' : ''}`}>
        <table className="w-full min-w-[640px] border-collapse text-left text-[13px]">
          <thead className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm">
            <tr className="border-b border-neutral-200 text-[11px] font-bold tracking-wide text-muted uppercase">
              {headers}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  )
}
