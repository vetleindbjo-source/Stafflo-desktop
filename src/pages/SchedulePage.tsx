import React, { useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { getHolidaysInRange } from '../utils/holidays'
import { GeneratedSchedule, ScheduleDay } from '../types'
import { ScheduleView } from '../components/ScheduleView'
import { useT } from '../utils/i18n'

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function formatDateNo(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  const months = ['jan','feb','mar','apr','mai','jun','jul','aug','sep','okt','nov','des']
  return `${parseInt(d)}. ${months[parseInt(m) - 1]} ${y}`
}


export function SchedulePage() {
  const { employees, settings, addSchedule, updateScheduleDays, setActivePage, apiFetch } = useAppStore()
  const tr = useT(settings.language ?? 'no')

  function toLocalDateStr(d: Date) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  const now = new Date()
  const nextMonthFirst = toLocalDateStr(new Date(now.getFullYear(), now.getMonth() + 1, 1))
  const nextMonthLast = toLocalDateStr(new Date(now.getFullYear(), now.getMonth() + 2, 0))

  const [startDate, setStartDate] = useState(nextMonthFirst)
  const [endDate, setEndDate] = useState(nextMonthLast)
  const [extraInstructions, setExtraInstructions] = useState('')
  const [periodNotes, setPeriodNotes] = useState<Record<string, string>>({}) // employeeId -> note
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [resultDays, setResultDays] = useState<ScheduleDay[] | null>(null)
  const [currentScheduleId, setCurrentScheduleId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function generate() {
    if (employees.length === 0) {
      setError(tr('schedule_no_employees_desc'))
      return
    }
    if (!startDate || !endDate || startDate > endDate) {
      setError('Ugyldig datoperiode.')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)
    setResultDays(null)

    try {
      const res = await apiFetch('/api/ai/generate-schedule', {
        method: 'POST',
        body: JSON.stringify({ startDate, endDate, extraInstructions, periodNotes, roleRequirements: settings.roleRequirements ?? [] }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `Server feil: ${res.status}`)
      }
      const data = await res.json()
      const text = data.rawText as string
      const days = (data.days ?? null) as ScheduleDay[] | null
      setResult(text)
      setResultDays(days)

      const scheduleId = generateId()
      setCurrentScheduleId(scheduleId)
      const schedule: GeneratedSchedule = {
        id: scheduleId,
        title: `${formatDateNo(startDate)} – ${formatDateNo(endDate)}`,
        startDate, endDate,
        rawText: text,
        days: days ?? undefined,
        createdAt: new Date().toISOString(),
      }
      addSchedule(schedule)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  async function copyToClipboard() {
    if (!result) return
    try {
      await navigator.clipboard.writeText(result)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = result
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const holidaysInRange = getHolidaysInRange(startDate, endDate)
  const specialInRange = (settings.specialDays ?? []).filter((d) => d.date >= startDate && d.date <= endDate)

  return (
    <div className="flex h-full">
      {/* Left panel */}
      <div className="w-80 flex-shrink-0 border-r border-theme-border bg-surface flex flex-col">
        <div className="px-6 py-6 border-b border-theme-border">
          <h1 className="text-xl font-bold text-text-1">{tr('schedule_title')}</h1>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Date range */}
          <div>
            <label className="block text-xs font-semibold text-text-2 uppercase tracking-wider mb-2">Periode</label>
            <div className="space-y-2">
              <div>
                <label className="block text-xs text-text-2 mb-1">{tr('schedule_from')}</label>
                <input type="date" value={startDate} onChange={(e) => {
                  const newStart = e.target.value
                  setStartDate(newStart)
                  if (newStart) {
                    const [y, m] = newStart.split('-').map(Number)
                    setEndDate(toLocalDateStr(new Date(y, m, 0)))
                  }
                }}
                  className="w-full border border-theme-border bg-surface text-text-1 placeholder:text-text-3 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
              </div>
              <div>
                <label className="block text-xs text-text-2 mb-1">{tr('schedule_to')}</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                  className="w-full border border-theme-border bg-surface text-text-1 placeholder:text-text-3 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
              </div>
            </div>
          </div>

          {/* Holidays */}
          {holidaysInRange.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-text-2 uppercase tracking-wider mb-2">
                Helligdager ({holidaysInRange.length})
              </label>
              <div className="space-y-1">
                {holidaysInRange.map((h) => (
                  <div key={h.date} className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                    <span className="text-amber-500 text-sm">🎉</span>
                    <div>
                      <div className="text-xs font-medium text-amber-800">{h.nameNo}</div>
                      <div className="text-xs text-amber-600">{formatDateNo(h.date)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Special days in range */}
          {specialInRange.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-text-2 uppercase tracking-wider mb-2">
                Spesialdager ({specialInRange.length})
              </label>
              <div className="space-y-1">
                {specialInRange.map((d) => (
                  <div key={d.id} className="flex items-center gap-2 bg-purple-50 border border-purple-100 rounded-lg px-3 py-2">
                    <span className="text-purple-500 text-sm">📌</span>
                    <div>
                      <div className="text-xs font-medium text-purple-800">{d.note || formatDateNo(d.date)}</div>
                      <div className="text-xs text-purple-600">{d.closed ? 'Stengt' : `${d.openTime} – ${d.closeTime}`}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Employees */}
          <div>
            <label className="block text-xs font-semibold text-text-2 uppercase tracking-wider mb-2">
              Ansatte ({employees.length})
            </label>
            {employees.length === 0 ? (
              <div className="text-sm text-text-3 bg-slate-50 dark:bg-slate-700/40 rounded-lg px-3 py-3">
                <button onClick={() => setActivePage('employees')} className="text-primary underline">Legg til ansatte</button>
              </div>
            ) : (
              <div className="space-y-1.5">
                {employees.map((e) => {
                  const onLeave = e.leaves.some((l) => l.startDate <= endDate && l.endDate >= startDate)
                  return (
                    <div key={e.id} className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-700/40 rounded-lg px-3 py-2">
                      <div className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: e.color || '#3b82f6' }}>
                        {e.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-text-1 truncate">{e.name}</div>
                        <div className="text-xs text-text-2">{e.positionPercent}%</div>
                      </div>
                      {onLeave && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">Fravær</span>}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Period-specific employee notes */}
          {employees.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-text-2 uppercase tracking-wider mb-2">
                Spesielle notater denne perioden
              </label>
              <div className="space-y-2">
                {employees.map((e) => (
                  <div key={e.id} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded flex-shrink-0 flex items-center justify-center text-white text-[10px] font-bold"
                        style={{ backgroundColor: e.color || '#3b82f6' }}>
                        {e.name.charAt(0)}
                      </div>
                      <span className="text-xs font-medium text-text-2 truncate">{e.name}</span>
                    </div>
                    <textarea
                      value={periodNotes[e.id] ?? ''}
                      onChange={(ev) => setPeriodNotes((prev) => ({ ...prev, [e.id]: ev.target.value }))}
                      rows={1}
                      placeholder="f.eks. Kun tilgjengelig mandag–onsdag denne måneden..."
                      className="w-full border border-theme-border bg-surface text-text-1 placeholder:text-text-3 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-text-3 mt-1">AI leser disse notatene kun for denne planen</p>
            </div>
          )}

          {/* Extra instructions */}
          <div>
            <label className="block text-xs font-semibold text-text-2 uppercase tracking-wider mb-2">
              {tr('schedule_instructions')}
            </label>
            <textarea value={extraInstructions} onChange={(e) => setExtraInstructions(e.target.value)} rows={3}
              placeholder="f.eks. Alltid erfaren ansatt på kveldsvakt, prioriter helger..."
              className="w-full border border-theme-border bg-surface text-text-1 placeholder:text-text-3 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none" />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-theme-border">
          {error && (
            <div className="mb-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>
          )}
          <button onClick={generate} disabled={loading || employees.length === 0}
            className="w-full flex items-center justify-center gap-2 bg-primary text-white py-3 rounded-xl font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {tr('schedule_generating')}
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Generer arbeidsplan med AI
              </>
            )}
          </button>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col bg-page">
        {result ? (
          <>
            <div className="flex items-center justify-between px-6 py-4 bg-header border-b border-theme-border">
              <div className="flex items-center gap-2 text-green-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium text-sm">Plan generert!</span>
              </div>
              <button onClick={copyToClipboard}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${copied ? 'bg-green-100 text-green-700' : 'bg-primary text-white hover:bg-primary-dark'}`}>
                {copied ? tr('schedule_copied') : tr('schedule_copy')}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {resultDays ? (
                <ScheduleView
                  days={resultDays}
                  onChange={(updatedDays) => {
                    setResultDays(updatedDays)
                    if (currentScheduleId) updateScheduleDays(currentScheduleId, updatedDays)
                  }}
                />
              ) : (
                <pre className="bg-surface rounded-xl border border-theme-border shadow-card p-6 text-sm text-text-1 whitespace-pre-wrap font-mono leading-relaxed">
                  {result}
                </pre>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            {loading ? (
              <div className="space-y-4">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8 text-primary animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <p className="text-text-2 font-medium">AI lager arbeidsplanen din...</p>
                <p className="text-text-3 text-sm">Dette tar gjerne 15–30 sekunder</p>
              </div>
            ) : (
              <>
                <div className="w-20 h-20 bg-gray-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center mb-4">
                  <svg className="w-10 h-10 text-text-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-text-2 mb-2">Klar til å lage plan</h3>
                <p className="text-text-3 text-sm max-w-sm">
                  Velg periode og trykk generer — AI tar hensyn til helligdager, lørdagstider, spesialdager og fravær automatisk.
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
