import React, { useState } from 'react'
import { ScheduleDay, ScheduleShift } from '../types'
import { ClockPicker } from './ClockPicker'

interface Props {
  days: ScheduleDay[]
  onChange?: (days: ScheduleDay[]) => void // undefined = read-only
}

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function getISOWeek(dateStr: string): number {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDay() || 7
  d.setDate(d.getDate() + 4 - day)
  const yearStart = new Date(d.getFullYear(), 0, 1)
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

const DAY_ABBR = ['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør']
const SHIFT_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6',
  '#06b6d4', '#ec4899', '#f97316', '#84cc16',
]

export function ScheduleView({ days, onChange }: Props) {
  const [editingShift, setEditingShift] = useState<string | null>(null)
  const readonly = !onChange

  // Group by ISO week
  const weekMap = new Map<number, ScheduleDay[]>()
  for (const day of days) {
    const wk = getISOWeek(day.date)
    if (!weekMap.has(wk)) weekMap.set(wk, [])
    weekMap.get(wk)!.push(day)
  }
  const weeks = [...weekMap.entries()].sort((a, b) => a[0] - b[0])

  function updateShift(dateStr: string, shiftId: string, updates: Partial<ScheduleShift>) {
    if (!onChange) return
    onChange(days.map(day =>
      day.date !== dateStr ? day : {
        ...day,
        shifts: day.shifts.map(s => s.id === shiftId ? { ...s, ...updates } : s),
      }
    ))
  }

  function deleteShift(dateStr: string, shiftId: string) {
    if (!onChange) return
    onChange(days.map(day =>
      day.date !== dateStr ? day : {
        ...day,
        shifts: day.shifts.filter(s => s.id !== shiftId),
      }
    ))
  }

  function addShift(dateStr: string) {
    if (!onChange) return
    const newShift: ScheduleShift = {
      id: generateId(),
      employee: '',
      start: '09:00',
      end: '17:00',
    }
    onChange(days.map(day =>
      day.date !== dateStr ? day : {
        ...day,
        shifts: [...day.shifts, newShift],
      }
    ))
    setEditingShift(newShift.id)
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="space-y-8">
      {weeks.map(([weekNum, weekDays]) => (
        <div key={weekNum}>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs font-bold text-text-3 uppercase tracking-widest">Uke {weekNum}</span>
            <div className="flex-1 h-px bg-theme-border" />
          </div>

          <div className="space-y-2">
            {weekDays.map(day => {
              const date = new Date(day.date + 'T00:00:00')
              const dayAbbr = DAY_ABBR[date.getDay()]
              const dayNum = date.getDate()
              const isToday = day.date === today

              return (
                <div key={day.date} className="flex gap-4">
                  {/* Date column */}
                  <div className={`w-11 flex-shrink-0 flex flex-col items-center pt-2.5 ${day.closed ? 'opacity-30' : ''}`}>
                    <span className="text-[11px] text-text-3 font-medium">{dayAbbr}.</span>
                    <span className={`text-xl font-bold leading-tight ${isToday ? 'text-primary' : 'text-text-1'}`}>
                      {dayNum}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 space-y-1.5 pb-2">
                    {day.closed ? (
                      <div className="flex items-center h-10 px-3 rounded-xl border border-dashed border-theme-border text-sm text-text-3 italic">
                        {day.holiday ? `${day.holiday} — stengt` : 'Stengt'}
                      </div>
                    ) : day.shifts.length === 0 ? (
                      <div className="flex items-center h-10 px-3 text-sm text-text-3">
                        Ingen vakter
                        {!readonly && (
                          <button
                            onClick={() => addShift(day.date)}
                            className="ml-2 text-primary hover:text-primary-dark text-xs font-medium"
                          >
                            + legg til
                          </button>
                        )}
                      </div>
                    ) : (
                      <>
                        {day.shifts.map((shift, idx) => {
                          const color = SHIFT_COLORS[idx % SHIFT_COLORS.length]
                          const isEditing = editingShift === shift.id

                          return (
                            <div
                              key={shift.id}
                              className="bg-surface border border-theme-border rounded-xl overflow-hidden flex shadow-card"
                              style={{ borderLeft: `3px solid ${color}` }}
                            >
                              {isEditing ? (
                                <div className="flex-1 px-3 py-2.5 space-y-2">
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="text"
                                      value={shift.employee}
                                      onChange={e => updateShift(day.date, shift.id, { employee: e.target.value })}
                                      placeholder="Ansattnavn"
                                      className="flex-1 border border-theme-border bg-surface text-text-1 placeholder:text-text-3 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                                      autoFocus
                                    />
                                    {shift.role !== undefined && (
                                      <input
                                        type="text"
                                        value={shift.role ?? ''}
                                        onChange={e => updateShift(day.date, shift.id, { role: e.target.value })}
                                        placeholder="Rolle"
                                        className="w-24 border border-theme-border bg-surface text-text-1 placeholder:text-text-3 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                                      />
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1">
                                      <ClockPicker value={shift.start} onChange={v => updateShift(day.date, shift.id, { start: v })} />
                                    </div>
                                    <span className="text-text-3 text-sm">–</span>
                                    <div className="flex-1">
                                      <ClockPicker value={shift.end} onChange={v => updateShift(day.date, shift.id, { end: v })} />
                                    </div>
                                    <button
                                      onClick={() => setEditingShift(null)}
                                      className="px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary-dark transition-colors"
                                    >
                                      Ferdig
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="flex-1 px-3 py-2.5 flex items-center gap-3 min-w-0">
                                    <span className="text-sm font-bold text-text-1 whitespace-nowrap">
                                      {shift.start} – {shift.end}
                                    </span>
                                    <span className="text-sm text-text-2 flex-1 truncate">{shift.employee}</span>
                                    {shift.role && (
                                      <span className="text-xs text-text-3 bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 rounded-full flex-shrink-0">
                                        {shift.role}
                                      </span>
                                    )}
                                  </div>
                                  {!readonly && (
                                    <div className="flex border-l border-theme-border flex-shrink-0">
                                      <button
                                        onClick={() => setEditingShift(shift.id)}
                                        className="px-2.5 text-text-3 hover:text-primary hover:bg-primary/5 transition-colors"
                                        title="Rediger"
                                      >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                        </svg>
                                      </button>
                                      <button
                                        onClick={() => deleteShift(day.date, shift.id)}
                                        className="px-2.5 text-text-3 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border-l border-theme-border"
                                        title="Slett"
                                      >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                      </button>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          )
                        })}

                        {!readonly && (
                          <button
                            onClick={() => addShift(day.date)}
                            className="w-full flex items-center justify-center gap-1.5 border border-dashed border-gray-200 dark:border-slate-700 rounded-xl py-1.5 text-xs text-text-3 hover:border-primary hover:text-primary transition-colors"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Legg til vakt
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
