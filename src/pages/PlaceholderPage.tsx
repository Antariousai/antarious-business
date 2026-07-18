import { Construction } from 'lucide-react'

export function PlaceholderPage({ title, blurb }: { title: string; blurb: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-8 py-24 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-soft text-sky-bright">
        <Construction className="h-6 w-6" />
      </div>
      <h2 className="text-[22px] font-bold text-ink">{title}</h2>
      <p className="mt-2 max-w-md text-[14px] text-muted">{blurb}</p>
      <p className="mt-4 text-[13px] font-semibold text-sky">Coming next in the demo build</p>
    </div>
  )
}
