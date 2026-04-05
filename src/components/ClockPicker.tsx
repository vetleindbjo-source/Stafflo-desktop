import React, { useState, useRef, useEffect } from 'react'

interface Props {
  value: string // "HH:MM"
  onChange: (value: string) => void
  label?: string
}

const SIZE = 232
const CX = SIZE / 2
const CY = SIZE / 2
const OUTER_R = 84
const INNER_R = 54
const PRIMARY = '#3b82f6'

function toXY(angleDeg: number, r: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) }
}

function toAngle(x: number, y: number) {
  const a = (Math.atan2(y - CY, x - CX) * 180) / Math.PI + 90
  return ((a % 360) + 360) % 360
}

function toDist(x: number, y: number) {
  return Math.sqrt((x - CX) ** 2 + (y - CY) ** 2)
}

const OUTER_HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
const INNER_HOURS = [0, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]

export function ClockPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'hour' | 'minute'>('hour')
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const modeRef = useRef<'hour' | 'minute'>('hour')
  const valueRef = useRef(value)

  useEffect(() => { valueRef.current = value }, [value])
  useEffect(() => { modeRef.current = mode }, [mode])

  function parseValue(v: string): [number, number] {
    const p = v.match(/^(\d{1,2}):(\d{2})$/)
    return p ? [parseInt(p[1]), parseInt(p[2])] : [0, 0]
  }

  const [h, m] = parseValue(value)

  function getSVGXY(e: MouseEvent | TouchEvent): { x: number; y: number } | null {
    const svg = svgRef.current
    if (!svg) return null
    const rect = svg.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY
    return {
      x: ((clientX - rect.left) / rect.width) * SIZE,
      y: ((clientY - rect.top) / rect.height) * SIZE,
    }
  }

  function applyPointer(x: number, y: number, finalize = false) {
    const angle = toAngle(x, y)
    const dist = toDist(x, y)
    const [curH, curM] = parseValue(valueRef.current)

    if (modeRef.current === 'hour') {
      const isInner = dist < (INNER_R + OUTER_R) / 2
      const idx = Math.round(angle / 30) % 12
      const newH = isInner ? INNER_HOURS[idx] : OUTER_HOURS[idx]
      onChange(`${String(newH).padStart(2, '0')}:${String(curM).padStart(2, '0')}`)
      if (finalize) {
        setMode('minute')
        modeRef.current = 'minute'
      }
    } else {
      const idx = Math.round(angle / 30) % 12
      const newM = MINUTES[idx]
      onChange(`${String(curH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`)
      if (finalize) {
        setTimeout(() => {
          setOpen(false)
          setMode('hour')
          modeRef.current = 'hour'
        }, 120)
      }
    }
  }

  useEffect(() => {
    function onMove(e: MouseEvent | TouchEvent) {
      if (!dragging.current) return
      const pt = getSVGXY(e)
      if (pt) applyPointer(pt.x, pt.y)
    }
    function onUp(e: MouseEvent | TouchEvent) {
      if (!dragging.current) return
      dragging.current = false
      const pt = getSVGXY(e instanceof MouseEvent ? e : (e as TouchEvent))
      if (pt) applyPointer(pt.x, pt.y, true)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setMode('hour')
        modeRef.current = 'hour'
      }
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [open])

  const handAngle = mode === 'hour' ? (h % 12) * 30 : (m / 5) * 30
  const handR = mode === 'hour' ? (h >= 13 || h === 0 ? INNER_R : OUTER_R) : OUTER_R
  const handEnd = toXY(handAngle, handR)

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setMode('hour'); modeRef.current = 'hour' }}
        className="w-full border border-theme-border bg-surface text-text-1 rounded-lg px-3 py-2 text-sm font-medium text-left focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary flex items-center gap-2"
      >
        <svg className="w-4 h-4 text-text-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {value}
      </button>

      {open && (
        <div
          className="absolute z-[200] mt-1 bg-surface border border-theme-border rounded-2xl shadow-2xl p-4"
          style={{ width: SIZE + 32, left: 0 }}
        >
          {/* HH : MM header */}
          <div className="flex items-center justify-center gap-1 mb-4">
            <button
              onClick={() => { setMode('hour'); modeRef.current = 'hour' }}
              className={`text-3xl font-bold px-2 py-1 rounded-lg transition-colors ${mode === 'hour' ? 'bg-primary/10 text-primary' : 'text-text-2 hover:text-text-1'}`}
            >
              {String(h).padStart(2, '0')}
            </button>
            <span className="text-3xl font-bold text-text-3 select-none">:</span>
            <button
              onClick={() => { setMode('minute'); modeRef.current = 'minute' }}
              className={`text-3xl font-bold px-2 py-1 rounded-lg transition-colors ${mode === 'minute' ? 'bg-primary/10 text-primary' : 'text-text-2 hover:text-text-1'}`}
            >
              {String(m).padStart(2, '0')}
            </button>
          </div>

          {/* Clock face */}
          <svg
            ref={svgRef}
            width={SIZE}
            height={SIZE}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            className="cursor-pointer select-none block"
            onMouseDown={(e) => {
              dragging.current = true
              const rect = svgRef.current!.getBoundingClientRect()
              const x = ((e.clientX - rect.left) / rect.width) * SIZE
              const y = ((e.clientY - rect.top) / rect.height) * SIZE
              applyPointer(x, y)
            }}
            onTouchStart={(e) => {
              dragging.current = true
              const rect = svgRef.current!.getBoundingClientRect()
              const t = e.touches[0]
              const x = ((t.clientX - rect.left) / rect.width) * SIZE
              const y = ((t.clientY - rect.top) / rect.height) * SIZE
              applyPointer(x, y)
            }}
          >
            {/* Face background */}
            <circle cx={CX} cy={CY} r={CX - 2} fill="var(--bg-page)" />

            {/* Hand */}
            <line x1={CX} y1={CY} x2={handEnd.x} y2={handEnd.y}
              stroke={PRIMARY} strokeWidth={2} strokeLinecap="round" />
            <circle cx={CX} cy={CY} r={4} fill={PRIMARY} />
            <circle cx={handEnd.x} cy={handEnd.y} r={18} fill={PRIMARY} opacity={0.15} />
            <circle cx={handEnd.x} cy={handEnd.y} r={9} fill={PRIMARY} />

            {mode === 'hour' ? (
              <>
                {OUTER_HOURS.map((hr, i) => {
                  const pos = toXY(i * 30, OUTER_R)
                  const sel = h === hr
                  return (
                    <g key={hr}>
                      {sel && <circle cx={pos.x} cy={pos.y} r={16} fill={PRIMARY} />}
                      <text x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="central"
                        fontSize={13} fontWeight={sel ? 700 : 400}
                        fill={sel ? 'white' : 'var(--text-1)'}>
                        {hr}
                      </text>
                    </g>
                  )
                })}
                {INNER_HOURS.map((hr, i) => {
                  const pos = toXY(i * 30, INNER_R)
                  const sel = h === hr
                  return (
                    <g key={`i${hr}`}>
                      {sel && <circle cx={pos.x} cy={pos.y} r={14} fill={PRIMARY} />}
                      <text x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="central"
                        fontSize={10} fontWeight={sel ? 700 : 400}
                        fill={sel ? 'white' : 'var(--text-2)'}>
                        {String(hr).padStart(2, '0')}
                      </text>
                    </g>
                  )
                })}
              </>
            ) : (
              MINUTES.map((min, i) => {
                const pos = toXY(i * 30, OUTER_R)
                const sel = m === min
                return (
                  <g key={min}>
                    {sel && <circle cx={pos.x} cy={pos.y} r={16} fill={PRIMARY} />}
                    <text x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="central"
                      fontSize={13} fontWeight={sel ? 700 : 400}
                      fill={sel ? 'white' : 'var(--text-1)'}>
                      {String(min).padStart(2, '0')}
                    </text>
                  </g>
                )
              })
            )}
          </svg>

          <button
            onClick={() => { setOpen(false); setMode('hour'); modeRef.current = 'hour' }}
            className="mt-3 w-full bg-primary text-white py-2 rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors"
          >
            Ferdig
          </button>
        </div>
      )}
    </div>
  )
}
