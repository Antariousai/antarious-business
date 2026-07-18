import { useMemo } from 'react'
import type { EngagementPoint } from '../data/mockData'

export function EngagementChart({
  data,
  height = 240,
}: {
  data: EngagementPoint[]
  height?: number
}) {
  const width = 640
  const pad = { top: 20, right: 16, bottom: 36, left: 44 }
  const innerW = width - pad.left - pad.right
  const innerH = height - pad.top - pad.bottom

  const { points, maxY, yTicks, path, area, peak } = useMemo(() => {
    if (!data.length) {
      return {
        points: [] as Array<EngagementPoint & { x: number; y: number }>,
        maxY: 600,
        yTicks: [0, 150, 300, 450, 600],
        path: '',
        area: '',
        peak: null as (EngagementPoint & { x: number; y: number }) | null,
      }
    }
    const maxVal = Math.max(...data.map((d) => d.value), 1)
    const niceMax = Math.ceil(maxVal / 150) * 150 || 600
    const ticks = Array.from({ length: 5 }, (_, i) => Math.round((niceMax / 4) * i))
    const coords = data.map((d, i) => {
      const x = pad.left + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW)
      const y = pad.top + innerH - (d.value / niceMax) * innerH
      return { x, y, ...d }
    })
    const line = coords.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    const areaPath = `${line} L ${coords[coords.length - 1].x} ${pad.top + innerH} L ${coords[0].x} ${pad.top + innerH} Z`
    const peakPoint = coords.reduce((a, b) => (b.value >= a.value ? b : a), coords[0])
    return {
      points: coords,
      maxY: niceMax,
      yTicks: ticks,
      path: line,
      area: areaPath,
      peak: peakPoint,
    }
  }, [data, innerH, innerW, pad.left, pad.top])

  const labelIndexes = useMemo(() => {
    if (data.length <= 5) return data.map((_, i) => i)
    const step = Math.max(1, Math.floor((data.length - 1) / 4))
    const idxs = [0]
    for (let i = step; i < data.length - 1; i += step) idxs.push(i)
    idxs.push(data.length - 1)
    return [...new Set(idxs)]
  }, [data])

  return (
    <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-sky-soft/60 via-white to-rose-50/50 p-3 ring-1 ring-sky/15 sm:p-4">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label="Engagement growth chart"
      >
        <defs>
          <linearGradient id="engFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.45" />
            <stop offset="45%" stopColor="#38bdf8" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.06" />
          </linearGradient>
          <linearGradient id="engStroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#0ea5e9" />
            <stop offset="50%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#f43f5e" />
          </linearGradient>
        </defs>

        {yTicks.map((t) => {
          const y = pad.top + innerH - (t / maxY) * innerH
          return (
            <g key={t}>
              <line
                x1={pad.left}
                x2={width - pad.right}
                y1={y}
                y2={y}
                stroke="#e2e8f0"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text
                x={pad.left - 10}
                y={y + 4}
                textAnchor="end"
                className="fill-slate-400"
                fontSize="11"
                fontWeight="600"
              >
                {t}
              </text>
            </g>
          )
        })}

        {area && <path d={area} fill="url(#engFill)" />}
        {path && (
          <path
            d={path}
            fill="none"
            stroke="url(#engStroke)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {points.map((p) => {
          const isPeak = peak && p.label === peak.label && p.value === peak.value
          return (
            <g key={p.label}>
              <circle
                cx={p.x}
                cy={p.y}
                r={isPeak ? 6 : 4}
                fill={isPeak ? '#f43f5e' : '#0ea5e9'}
                stroke="white"
                strokeWidth="2.5"
              />
              {isPeak && (
                <text
                  x={p.x}
                  y={p.y - 12}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="800"
                  className="fill-rose-500"
                >
                  {p.value}
                </text>
              )}
            </g>
          )
        })}

        {labelIndexes.map((i) => {
          const p = points[i]
          if (!p) return null
          return (
            <text
              key={`lbl-${p.label}`}
              x={p.x}
              y={height - 10}
              textAnchor="middle"
              className="fill-slate-500"
              fontSize="11"
              fontWeight="700"
            >
              {p.label}
            </text>
          )
        })}
      </svg>
    </div>
  )
}
