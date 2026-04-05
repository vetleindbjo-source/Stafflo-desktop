import React, { useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { Employee, VacationPlan, VacationRequest, VacationAssignment, VacationPreference } from '../types'

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// Get all ISO week numbers for a year
function getWeeksInYear(year: number): number[] {
  // ISO week 1 is the week containing the first Thursday
  const dec28 = new Date(year, 11, 28)
  const lastWeek = getISOWeek(dec28)
  const weeks: number[] = []
  for (let w = 1; w <= lastWeek; w++) weeks.push(w)
  return weeks
}

function getISOWeek(date: Date): number {
  const d = new Date(date)
  const day = d.getDay() || 7
  d.setDate(d.getDate() + 4 - day)
  const yearStart = new Date(d.getFullYear(), 0, 1)
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

// Get Monday of a given ISO week in a year
function getMondayOfWeek(year: number, week: number): Date {
  const jan4 = new Date(year, 0, 4)
  const startOfWeek1 = new Date(jan4)
  startOfWeek1.setDate(jan4.getDate() - (jan4.getDay() || 7) + 1)
  const monday = new Date(startOfWeek1)
  monday.setDate(startOfWeek1.getDate() + (week - 1) * 7)
  return monday
}

function formatWeekRange(year: number, week: number, duration: number, unit: 'weeks' | 'days'): string {
  const start = getMondayOfWeek(year, week)
  const end = new Date(start)
  if (unit === 'weeks') {
    end.setDate(start.getDate() + duration * 7 - 1)
  } else {
    end.setDate(start.getDate() + duration - 1)
  }
  const fmt = (d: Date) => `${d.getDate()}. ${['jan','feb','mar','apr','mai','jun','jul','aug','sep','okt','nov','des'][d.getMonth()]}`
  return `${fmt(start)} – ${fmt(end)}`
}

// Core greedy vacation planning algorithm
function planVacations(
  requests: VacationRequest[],
  startWeek: number,
  endWeek: number,
  totalEligible: number,
  minStaffPresent: number,
  requireKeyPersonnel: boolean,
  keyPersonnelIds: Set<string>,
): { result: VacationAssignment[]; warnings: string[] } {
  const maxConcurrent = Math.max(0, totalEligible - minStaffPresent)
  const result: VacationAssignment[] = requests.map((r) => ({
    employeeId: r.employeeId,
    weeks: [],
    preferenceUsed: -1,
  }))
  const warnings: string[] = []

  // Track who is on vacation each week: week -> Set<employeeId>
  const weekOccupancy = new Map<number, Set<string>>()
  for (let w = startWeek; w <= endWeek; w++) weekOccupancy.set(w, new Set())

  function weeksForBlock(pref: VacationPreference): number[] {
    const weeks: number[] = []
    // Days count as occupying their start week only
    const numWeeks = pref.unit === 'days' ? 1 : pref.duration
    for (let i = 0; i < numWeeks; i++) {
      const w = pref.startWeek + i
      if (w >= startWeek && w <= endWeek) weeks.push(w)
    }
    return weeks
  }

  function canAssign(empId: string, weeks: number[]): boolean {
    for (const w of weeks) {
      const occ = weekOccupancy.get(w)
      if (!occ) return false
      if (occ.has(empId)) continue // already counted
      if (occ.size >= maxConcurrent) return false
      // Key personnel constraint: if this employee is key personnel, ensure another key person is still present
      if (requireKeyPersonnel && keyPersonnelIds.has(empId)) {
        const keyOnVacation = [...occ].filter((id) => keyPersonnelIds.has(id)).length
        if (keyOnVacation + 1 >= keyPersonnelIds.size) return false
      }
    }
    return true
  }

  function assign(empId: string, weeks: number[]) {
    for (const w of weeks) weekOccupancy.get(w)?.add(empId)
  }

  // Three passes: preference 0, 1, 2
  for (let pass = 0; pass < 3; pass++) {
    for (const req of requests) {
      const assignment = result.find((r) => r.employeeId === req.employeeId)!
      if (assignment.preferenceUsed !== -1) continue // already scheduled
      const pref = req.preferences[pass]
      if (!pref) continue
      const weeks = weeksForBlock(pref)
      if (weeks.length === 0) continue
      if (canAssign(req.employeeId, weeks)) {
        assignment.weeks = weeks
        assignment.preferenceUsed = pass
        assign(req.employeeId, weeks)
      }
    }
  }

  // Warn about unresolved
  for (const assignment of result) {
    if (assignment.preferenceUsed === -1) {
      const req = requests.find((r) => r.employeeId === assignment.employeeId)
      if (req && req.preferences.length > 0) {
        warnings.push(`${assignment.employeeId}: Ingen av preferansene kunne innvilges`)
      }
    }
  }

  return { result, warnings }
}

const WEEK_COLORS = [
  'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300',
  'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300',
  'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
]

export function VacationPage() {
  const { employees, vacationPlans, addVacationPlan, updateVacationPlan, deleteVacationPlan, updateEmployee } = useAppStore()

  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [startWeek, setStartWeek] = useState(22)
  const [endWeek, setEndWeek] = useState(33)
  const [minStaffPresent, setMinStaffPresent] = useState(2)
  const [requireKeyPersonnel, setRequireKeyPersonnel] = useState(true)
  const [viewingPlan, setViewingPlan] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const eligibleEmployees = employees.filter((e) => e.vacationEligible)
  const keyPersonnelIds = new Set(employees.filter((e) => e.isKeyPersonnel).map((e) => e.id))

  // Per-employee preference state: employeeId -> preferences
  const [preferences, setPreferences] = useState<Record<string, VacationPreference[]>>({})

  function getPrefs(empId: string): VacationPreference[] {
    return preferences[empId] ?? [{ startWeek: startWeek, duration: 2, unit: 'weeks' }]
  }

  function setPrefs(empId: string, prefs: VacationPreference[]) {
    setPreferences((prev) => ({ ...prev, [empId]: prefs }))
  }

  function addPref(empId: string) {
    const current = getPrefs(empId)
    if (current.length >= 3) return
    setPrefs(empId, [...current, { startWeek: startWeek, duration: 2, unit: 'weeks' as const }])
  }

  function removePref(empId: string, idx: number) {
    const current = getPrefs(empId)
    setPrefs(empId, current.filter((_, i) => i !== idx))
  }

  function updatePref(empId: string, idx: number, update: Partial<VacationPreference>) {
    const current = getPrefs(empId)
    setPrefs(empId, current.map((p, i) => i === idx ? { ...p, ...update } : p))
  }

  function generatePlan() {
    const requests: VacationRequest[] = eligibleEmployees.map((e) => ({
      employeeId: e.id,
      preferences: getPrefs(e.id).filter((p) => p.startWeek >= startWeek && p.startWeek <= endWeek),
    }))

    const { result, warnings } = planVacations(
      requests,
      startWeek,
      endWeek,
      eligibleEmployees.length,
      minStaffPresent,
      requireKeyPersonnel,
      keyPersonnelIds,
    )

    // Replace warnings' employeeId with names
    const namedWarnings = warnings.map((w) => {
      const emp = employees.find((e) => e.id === w.split(':')[0])
      return emp ? w.replace(w.split(':')[0], emp.name) : w
    })

    const plan: VacationPlan = {
      id: generateId(),
      year,
      startWeek,
      endWeek,
      requireKeyPersonnel,
      minStaffPresent,
      requests,
      result,
      warnings: namedWarnings,
      createdAt: new Date().toISOString(),
    }
    addVacationPlan(plan)

    // Automatically add vacation leaves to each employee for their assigned weeks
    for (const assignment of result) {
      if (assignment.weeks.length === 0) continue
      const emp = employees.find((e) => e.id === assignment.employeeId)
      if (!emp) continue

      const sortedWeeks = [...assignment.weeks].sort((a, b) => a - b)
      const firstWeek = sortedWeeks[0]
      const lastWeek = sortedWeeks[sortedWeeks.length - 1]

      // Find the matching preference to know if it was days or weeks
      const matchedPref = plan.requests
        .find((r) => r.employeeId === assignment.employeeId)
        ?.preferences[assignment.preferenceUsed >= 0 ? assignment.preferenceUsed : 0]

      const startDate = getMondayOfWeek(year, firstWeek)
      const endDate = getMondayOfWeek(year, lastWeek)
      if (matchedPref?.unit === 'days') {
        endDate.setDate(endDate.getDate() + (matchedPref.duration - 1))
      } else {
        endDate.setDate(endDate.getDate() + 6) // Sunday of last week
      }

      const toDateStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const startDateStr = toDateStr(startDate)
      const endDateStr = toDateStr(endDate)

      // Skip if a vacation leave already exists for this exact period
      const alreadyExists = emp.leaves.some(
        (l) => l.type === 'vacation' && l.startDate === startDateStr && l.endDate === endDateStr
      )
      if (alreadyExists) continue

      const newLeave = {
        id: generateId(),
        type: 'vacation' as const,
        startDate: startDateStr,
        endDate: endDateStr,
        note: `Ferieplan ${year}`,
      }
      updateEmployee({ ...emp, leaves: [...emp.leaves, newLeave] })
    }

    setViewingPlan(plan.id)
  }

  const viewedPlan = vacationPlans.find((p) => p.id === viewingPlan)

  if (viewingPlan && viewedPlan) {
    return <PlanView
      plan={viewedPlan}
      employees={employees}
      onBack={() => setViewingPlan(null)}
    />
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 py-6 border-b border-theme-border bg-header">
        <h1 className="text-2xl font-bold text-text-1">Ferieplanlegging</h1>
        <p className="text-text-2 text-sm mt-0.5">{eligibleEmployees.length} ansatte med ferierettigheter</p>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
        {/* Settings row */}
        <div className="bg-surface rounded-xl border border-theme-border shadow-card p-5 space-y-4">
          <h2 className="font-semibold text-text-1">Innstillinger</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-2 uppercase tracking-wider mb-1.5">År</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full border border-theme-border bg-surface text-text-1 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-2 uppercase tracking-wider mb-1.5">Fra uke</label>
              <input
                type="number"
                min={1}
                max={52}
                value={startWeek}
                onChange={(e) => setStartWeek(Number(e.target.value))}
                className="w-full border border-theme-border bg-surface text-text-1 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-2 uppercase tracking-wider mb-1.5">Til uke</label>
              <input
                type="number"
                min={1}
                max={52}
                value={endWeek}
                onChange={(e) => setEndWeek(Number(e.target.value))}
                className="w-full border border-theme-border bg-surface text-text-1 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-2 uppercase tracking-wider mb-1.5">Min. tilstede</label>
              <input
                type="number"
                min={0}
                value={minStaffPresent}
                onChange={(e) => setMinStaffPresent(Number(e.target.value))}
                className="w-full border border-theme-border bg-surface text-text-1 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
          </div>
          {keyPersonnelIds.size > 0 && (
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={requireKeyPersonnel}
                onChange={(e) => setRequireKeyPersonnel(e.target.checked)}
                className="w-4 h-4 accent-primary"
              />
              <span className="text-sm text-text-1">Nøkkelpersonell må alltid være til stede</span>
              <span className="text-xs text-text-3">({keyPersonnelIds.size} nøkkelpersoner)</span>
            </label>
          )}
        </div>

        {/* Employee preferences */}
        {eligibleEmployees.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-text-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-text-2 font-medium">Ingen ansatte med ferierettigheter</p>
            <p className="text-text-3 text-sm mt-1">Gå til Ansatte og huk av "Ferierettigheter" for de aktuelle ansatte.</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <h2 className="font-semibold text-text-1">Ferieønsker</h2>
              {eligibleEmployees.map((emp) => {
                const prefs = getPrefs(emp.id)
                return (
                  <div key={emp.id} className="bg-surface rounded-xl border border-theme-border shadow-card p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-white text-sm font-bold"
                        style={{ backgroundColor: emp.color || '#3b82f6' }}
                      >
                        {emp.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-text-1">{emp.name}</div>
                        {emp.isKeyPersonnel && (
                          <span className="text-xs text-amber-600 dark:text-amber-400">Nøkkelpersonell</span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      {prefs.map((pref, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-xs font-medium text-text-3 w-16 flex-shrink-0">
                            {idx === 0 ? '1. ønske' : idx === 1 ? '2. ønske' : '3. ønske'}
                          </span>
                          <div className="flex items-center gap-1.5 flex-1 flex-wrap">
                            <span className="text-xs text-text-3">Uke</span>
                            <input
                              type="number"
                              min={startWeek}
                              max={endWeek}
                              value={pref.startWeek}
                              onChange={(e) => updatePref(emp.id, idx, { startWeek: Number(e.target.value) })}
                              className="w-16 border border-theme-border bg-surface text-text-1 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-center"
                            />
                            <select
                              value={pref.unit}
                              onChange={(e) => updatePref(emp.id, idx, { unit: e.target.value as 'weeks' | 'days', duration: 1 })}
                              className="border border-theme-border bg-surface text-text-1 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                            >
                              <option value="weeks">uker</option>
                              <option value="days">dager</option>
                            </select>
                            <input
                              type="number"
                              min={1}
                              max={pref.unit === 'weeks' ? 5 : 6}
                              value={pref.duration}
                              onChange={(e) => updatePref(emp.id, idx, { duration: Math.min(Number(e.target.value), pref.unit === 'weeks' ? 5 : 6) })}
                              className="w-14 border border-theme-border bg-surface text-text-1 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-center"
                            />
                            <span className="text-xs text-text-3 hidden sm:inline">
                              ({formatWeekRange(year, pref.startWeek, pref.duration, pref.unit)})
                            </span>
                          </div>
                          <button
                            onClick={() => removePref(emp.id, idx)}
                            className="text-text-3 hover:text-red-500 p-1 transition-colors flex-shrink-0"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                      {prefs.length < 3 && (
                        <button
                          onClick={() => addPref(emp.id)}
                          className="text-xs text-primary hover:text-primary-dark font-medium transition-colors"
                        >
                          + Legg til alternativt ønske
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <button
              onClick={generatePlan}
              className="w-full flex items-center justify-center gap-2 bg-primary text-white py-3 rounded-xl font-medium hover:bg-primary-dark transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              Generer ferieplan
            </button>
          </>
        )}

        {/* Past plans */}
        {vacationPlans.length > 0 && (
          <div>
            <h2 className="font-semibold text-text-1 mb-3">Tidligere planer</h2>
            <div className="space-y-2">
              {vacationPlans.map((plan) => (
                <div key={plan.id} className="bg-surface rounded-xl border border-theme-border shadow-card p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-text-1">
                      {plan.year} — uke {plan.startWeek}–{plan.endWeek}
                    </div>
                    <div className="text-xs text-text-3">
                      {plan.result?.filter((r) => r.weeks.length > 0).length ?? 0}/{plan.requests.length} innvilget
                      {plan.warnings && plan.warnings.length > 0 && (
                        <span className="ml-2 text-amber-500">{plan.warnings.length} advarsel{plan.warnings.length !== 1 ? 'er' : ''}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setViewingPlan(plan.id)}
                      className="px-3 py-1.5 text-sm text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors font-medium"
                    >
                      Vis
                    </button>
                    {deleteConfirm === plan.id ? (
                      <>
                        <button onClick={() => { deleteVacationPlan(plan.id); setDeleteConfirm(null) }} className="px-3 py-1.5 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 transition-colors font-medium">Slett</button>
                        <button onClick={() => setDeleteConfirm(null)} className="px-3 py-1.5 text-sm text-text-2 bg-slate-100 dark:bg-slate-700/60 rounded-lg hover:bg-gray-200 transition-colors">Nei</button>
                      </>
                    ) : (
                      <button onClick={() => setDeleteConfirm(plan.id)} className="p-1.5 text-text-3 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

interface PlanViewProps {
  plan: VacationPlan
  employees: Employee[]
  onBack: () => void
}

function PlanView({ plan, employees, onBack }: PlanViewProps) {
  const allWeeks = Array.from({ length: plan.endWeek - plan.startWeek + 1 }, (_, i) => plan.startWeek + i)
  const eligibleEmployees = employees.filter((e) => e.vacationEligible)

  // Map employeeId -> assignment
  const assignmentMap = new Map((plan.result ?? []).map((a) => [a.employeeId, a]))

  const prefLabels = ['1. ønske', '2. ønske', '3. ønske', 'Ikke innvilget']

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-8 py-5 border-b border-theme-border bg-header">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 text-text-3 hover:text-text-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="font-semibold text-text-1">{plan.year} — uke {plan.startWeek}–{plan.endWeek}</h1>
            <p className="text-xs text-text-3">
              {plan.result?.filter((r) => r.weeks.length > 0).length ?? 0}/{plan.requests.length} innvilget
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-8 space-y-6">
        {/* Warnings */}
        {plan.warnings && plan.warnings.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-sm font-medium text-amber-800 dark:text-amber-300">Advarsler</span>
            </div>
            <ul className="space-y-1">
              {plan.warnings.map((w, i) => (
                <li key={i} className="text-sm text-amber-700 dark:text-amber-400">{w}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Week grid */}
        <div className="bg-surface rounded-xl border border-theme-border shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-theme-border bg-slate-50 dark:bg-slate-700/40">
                  <th className="text-left px-4 py-3 font-medium text-text-2 w-40">Ansatt</th>
                  {allWeeks.map((w) => (
                    <th key={w} className="px-2 py-3 font-medium text-text-2 text-center min-w-[52px]">
                      {w}
                    </th>
                  ))}
                  <th className="text-left px-4 py-3 font-medium text-text-2">Resultat</th>
                </tr>
              </thead>
              <tbody>
                {eligibleEmployees.map((emp, empIdx) => {
                  const assignment = assignmentMap.get(emp.id)
                  const assignedWeeks = new Set(assignment?.weeks ?? [])
                  const prefUsed = assignment?.preferenceUsed ?? -1

                  return (
                    <tr key={emp.id} className={`border-b border-theme-border ${empIdx % 2 === 0 ? '' : 'bg-slate-50/50 dark:bg-slate-700/20'}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded-md flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                            style={{ backgroundColor: emp.color || '#3b82f6' }}
                          >
                            {emp.name.charAt(0)}
                          </div>
                          <span className="font-medium text-text-1 truncate max-w-[96px]">{emp.name}</span>
                        </div>
                      </td>
                      {allWeeks.map((w) => (
                        <td key={w} className="px-1 py-2 text-center">
                          {assignedWeeks.has(w) ? (
                            <div
                              className="w-8 h-8 rounded-lg mx-auto flex items-center justify-center text-white text-xs font-bold"
                              style={{ backgroundColor: emp.color || '#3b82f6' }}
                              title={emp.name}
                            >
                              {emp.name.charAt(0)}
                            </div>
                          ) : (
                            <div className="w-8 h-8 mx-auto" />
                          )}
                        </td>
                      ))}
                      <td className="px-4 py-3">
                        {prefUsed >= 0 ? (
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${WEEK_COLORS[prefUsed % WEEK_COLORS.length]}`}>
                            {prefLabels[prefUsed]}
                          </span>
                        ) : assignment && assignment.weeks.length === 0 ? (
                          <span className="text-xs text-red-500 font-medium">Ikke innvilget</span>
                        ) : null}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary: staff present per week */}
        <div className="bg-surface rounded-xl border border-theme-border shadow-card p-4">
          <h3 className="font-medium text-text-1 mb-3">Tilgjengelige per uke</h3>
          <div className="flex flex-wrap gap-2">
            {allWeeks.map((w) => {
              const onVacation = (plan.result ?? []).filter((a) => a.weeks.includes(w)).length
              const available = eligibleEmployees.length - onVacation
              const ok = available >= plan.minStaffPresent
              return (
                <div
                  key={w}
                  className={`flex flex-col items-center px-3 py-2 rounded-lg border text-xs ${
                    ok
                      ? 'border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800'
                      : 'border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800'
                  }`}
                >
                  <span className={`font-bold ${ok ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                    {available}
                  </span>
                  <span className={ok ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}>
                    uke {w}
                  </span>
                </div>
              )
            })}
          </div>
          <p className="text-xs text-text-3 mt-2">Min. {plan.minStaffPresent} kreves — rød = under minimum</p>
        </div>
      </div>
    </div>
  )
}

