const COLORS: Record<string, string> = {
  F: '#38bdf8', // sky
  N: '#0284c7', // sky-bright
  J: '#5b6b7c', // muted
  S: '#34d399', // mint
  P: '#fdba74', // peach
  E: '#fbbf24', // sunshine
  A: '#0f1724', // navy
  D: '#fb7185', // coral
  O: '#fb923c', // orange/peach
  M: '#0ea5e9', // sky
  R: '#14b8a6', // teal
  F2: '#7dd3fc',
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
  const key = letter.toUpperCase()
  const bg = color || COLORS[key] || '#38bdf8'
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
