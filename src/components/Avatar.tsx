const COLORS: Record<string, string> = {
  F: '#38bdf8',
  J: '#64748b',
  S: '#3b82f6',
  P: '#8b5cf6',
  E: '#f97316',
  A: '#1e40af',
  D: '#ec4899',
  O: '#ea580c',
  M: '#0ea5e9',
}

export function Avatar({
  letter,
  size = 40,
  online,
  color,
}: {
  letter: string
  size?: number
  online?: boolean
  color?: string
}) {
  const bg = color || COLORS[letter.toUpperCase()] || '#38bdf8'
  const fontSize = Math.round(size * 0.42)

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className="flex h-full w-full items-center justify-center rounded-full font-bold text-white"
        style={{ background: bg, fontSize }}
      >
        {letter.toUpperCase()}
      </div>
      {online && (
        <span
          className="absolute bottom-0 right-0 rounded-full border-2 border-white bg-online"
          style={{ width: size * 0.28, height: size * 0.28 }}
        />
      )}
    </div>
  )
}
