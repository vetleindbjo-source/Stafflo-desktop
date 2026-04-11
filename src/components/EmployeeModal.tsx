import React, { useState, useEffect, useRef } from 'react'
import { Employee, Leave, LeaveType, DAY_NAMES, POSITION_SHORTCUTS, EMPLOYEE_COLORS, LEAVE_TYPE_LABELS } from '../types'
import { useAppStore } from '../store/useAppStore'

interface Props {
  employee?: Employee | null
  onSave: (employee: Employee) => void
  onClose: () => void
}

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

const defaultEmployee = (): Employee => ({
  id: generateId(),
  name: '',
  positionPercent: 100,
  role: '',
  availableDays: [1, 2, 3, 4, 5],
  leaves: [],
  phone: '',
  email: '',
  color: EMPLOYEE_COLORS[Math.floor(Math.random() * EMPLOYEE_COLORS.length)],
})

type Tab = 'info' | 'leave'

export function EmployeeModal({ employee, onSave, onClose }: Props) {
  const { employees, settings } = useAppStore()
  const [tab, setTab] = useState<Tab>('info')
  const [data, setData] = useState<Employee>(employee ? { ...employee } : defaultEmployee())
  const [positionInput, setPositionInput] = useState<string>(
    employee ? String(employee.positionPercent) : '100'
  )
  const [showLeaveForm, setShowLeaveForm] = useState(false)
  const [leaveForm, setLeaveForm] = useState<Omit<Leave, 'id'>>({
    type: 'vacation',
    startDate: '',
    endDate: '',
    note: '',
  })
  const [roleOpen, setRoleOpen] = useState(false)
  const roleRef = useRef<HTMLDivElement>(null)

  // Collect unique roles from other employees for autocomplete
  const existingRoles = Array.from(new Set(
    employees
      .filter(e => e.id !== data.id && e.role)
      .map(e => e.role)
  )).sort()

  const roleMatches = data.role
    ? existingRoles.filter(r => r.toLowerCase().includes(data.role.toLowerCase()) && r !== data.role)
    : existingRoles

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (roleRef.current && !roleRef.current.contains(e.target as Node)) {
        setRoleOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    const emp = employee ? { ...employee } : defaultEmployee()
    setData(emp)
    setPositionInput(String(emp.positionPercent))
  }, [employee])

  function toggleDay(day: number) {
    const days = data.availableDays.includes(day)
      ? data.availableDays.filter((d) => d !== day)
      : [...data.availableDays, day].sort()
    setData({ ...data, availableDays: days })
  }

  function addLeave() {
    if (!leaveForm.startDate || !leaveForm.endDate) return
    const leave: Leave = { id: generateId(), ...leaveForm }
    setData({ ...data, leaves: [...data.leaves, leave] })
    setLeaveForm({ type: 'vacation', startDate: '', endDate: '', note: '' })
    setShowLeaveForm(false)
  }

  function removeLeave(id: string) {
    setData({ ...data, leaves: data.leaves.filter((l) => l.id !== id) })
  }

  function handleSave() {
    if (!data.name.trim()) return
    onSave(data)
  }

  const isNew = !employee

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-theme-border">
          <div>
            <h2 className="text-lg font-semibold text-text-1">
              {isNew ? 'Legg til ansatt' : 'Rediger ansatt'}
            </h2>
          </div>
          <button onClick={onClose} className="text-text-3 hover:text-text-2 transition-colors p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-theme-border px-6">
          {(['info', 'leave'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`py-3 px-1 mr-6 text-sm font-medium border-b-2 transition-colors ${
                tab === t ? 'border-primary text-primary' : 'border-transparent text-text-2 hover:text-text-1'
              }`}
            >
              {t === 'info' ? 'Informasjon' : `Fravær (${data.leaves.length})`}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {tab === 'info' && (
            <div className="space-y-4">
              {/* Color picker */}
              <div>
                <label className="block text-xs font-medium text-text-2 uppercase tracking-wider mb-2">Farge</label>
                <div className="flex gap-2 flex-wrap">
                  {EMPLOYEE_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setData({ ...data, color: c })}
                      className={`w-7 h-7 rounded-full transition-transform ${data.color === c ? 'scale-125 ring-2 ring-offset-2 ring-gray-400 dark:ring-slate-500 dark:ring-offset-slate-800' : 'hover:scale-110'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-text-2 uppercase tracking-wider mb-1.5">Navn *</label>
                <input
                  type="text"
                  value={data.name}
                  onChange={(e) => setData({ ...data, name: e.target.value })}
                  className="w-full border border-theme-border bg-surface text-text-1 placeholder:text-text-3 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  placeholder="Fullt navn"
                />
              </div>

              {/* Role with autocomplete */}
              <div ref={roleRef} className="relative">
                <label className="block text-xs font-medium text-text-2 uppercase tracking-wider mb-1.5">Stilling / Rolle</label>
                <input
                  type="text"
                  value={data.role}
                  onChange={(e) => { setData({ ...data, role: e.target.value }); setRoleOpen(true) }}
                  onFocus={() => setRoleOpen(true)}
                  className="w-full border border-theme-border bg-surface text-text-1 placeholder:text-text-3 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  placeholder="f.eks. Kokk, Servitør, Kasseansvarlig"
                />
                {roleOpen && roleMatches.length > 0 && (
                  <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-surface border border-theme-border rounded-lg shadow-lg overflow-hidden">
                    {roleMatches.map((r) => (
                      <button key={r} type="button"
                        onMouseDown={(e) => { e.preventDefault(); setData({ ...data, role: r }); setRoleOpen(false) }}
                        className="w-full text-left px-3 py-2 text-sm text-text-1 hover:bg-primary/10 hover:text-primary transition-colors">
                        {r}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Position % */}
              <div>
                <label className="block text-xs font-medium text-text-2 uppercase tracking-wider mb-1.5">
                  Stillingsprosent
                  {data.positionPercent === 0 && (
                    <span className="ml-2 text-xs font-normal text-amber-600 dark:text-amber-400 normal-case tracking-normal">· Tilkalling</span>
                  )}
                </label>
                <div className="flex items-center gap-2">
                  {/* Free input */}
                  <div className="relative flex-1">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={positionInput}
                      onChange={(e) => setPositionInput(e.target.value)}
                      onBlur={() => {
                        const val = parseFloat(positionInput.replace(',', '.'))
                        if (!isNaN(val) && val >= 0 && val <= 100) {
                          const rounded = Math.round(val * 100) / 100
                          setData({ ...data, positionPercent: rounded })
                          setPositionInput(String(rounded))
                        } else {
                          setPositionInput(String(data.positionPercent))
                        }
                      }}
                      className="w-full border border-theme-border bg-surface text-text-1 rounded-lg pl-3 pr-8 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-text-3 pointer-events-none">%</span>
                  </div>
                  {/* Quick shortcuts */}
                  {([0, ...POSITION_SHORTCUTS] as number[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => {
                        setData({ ...data, positionPercent: p })
                        setPositionInput(String(p))
                      }}
                      className={`px-2.5 py-2 rounded-lg text-sm font-medium transition-colors border flex-shrink-0 ${
                        data.positionPercent === p
                          ? 'bg-primary text-white border-primary'
                          : 'bg-surface text-text-2 border-theme-border hover:border-primary hover:text-primary'
                      }`}
                    >
                      {p === 0 ? 'Tilk.' : `${p}%`}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-text-3 mt-1">Skriv inn ønsket prosent, f.eks. 37.5 — bruk 0% for tilkalling</p>
              </div>

              {/* Available days */}
              <div>
                <label className="block text-xs font-medium text-text-2 uppercase tracking-wider mb-1.5">Tilgjengelige dager</label>
                <div className="flex gap-2">
                  {DAY_NAMES.map((name, i) => (
                    <button
                      key={i}
                      onClick={() => toggleDay(i)}
                      className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors border ${
                        data.availableDays.includes(i)
                          ? 'bg-primary text-white border-primary'
                          : 'bg-surface text-text-2 border-theme-border hover:border-primary'
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Shift types */}
              {settings.shiftTypes.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-text-2 uppercase tracking-wider mb-1.5">
                    Vakttyper
                  </label>
                  <p className="text-xs text-text-3 mb-2">Ingen valgt = kan jobbe alle vakter</p>
                  <div className="flex flex-wrap gap-2">
                    {settings.shiftTypes.map((shift) => {
                      const selected = data.allowedShiftTypes?.includes(shift.label) ?? false
                      return (
                        <button
                          key={shift.label}
                          type="button"
                          onClick={() => {
                            const current = data.allowedShiftTypes ?? []
                            const next = selected
                              ? current.filter((s) => s !== shift.label)
                              : [...current, shift.label]
                            setData({ ...data, allowedShiftTypes: next })
                          }}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                            selected
                              ? 'bg-primary text-white border-primary'
                              : 'bg-surface text-text-2 border-theme-border hover:border-primary hover:text-primary'
                          }`}
                        >
                          {shift.label}
                          <span className="ml-1.5 text-xs opacity-70">{shift.start}–{shift.end}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* AI Notes */}
              <div>
                <label className="block text-xs font-medium text-text-2 uppercase tracking-wider mb-1.5">
                  Notater til AI
                </label>
                <textarea
                  value={data.notes ?? ''}
                  onChange={(e) => setData({ ...data, notes: e.target.value })}
                  rows={2}
                  placeholder="f.eks. Kan bare jobbe morgen, foretrekker ikke fredager, alltid åpningsvakt"
                  className="w-full border border-theme-border bg-surface text-text-1 placeholder:text-text-3 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                />
                <p className="text-xs text-text-3 mt-1">AI leser disse notatene når arbeidsplanen genereres</p>
              </div>

              {/* Flags */}
              <div className="space-y-3">
                <label className="block text-xs font-medium text-text-2 uppercase tracking-wider">Rettigheter</label>

                {/* Vacation eligible */}
                <div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={data.vacationEligible ?? false}
                      onChange={(e) => setData({ ...data, vacationEligible: e.target.checked })}
                      className="w-4 h-4 rounded text-primary accent-primary"
                    />
                    <span className="text-sm text-text-1">Ferierettigheter</span>
                    <span className="text-xs text-text-3">(vises i ferieplanlegging)</span>
                  </label>
                  {data.vacationEligible && (
                    <div className="mt-2 ml-7 flex items-center gap-2">
                      <label className="text-xs text-text-2 whitespace-nowrap">Feriedager per år:</label>
                      <input
                        type="number"
                        min={0}
                        max={365}
                        value={data.vacationDaysPerYear ?? 25}
                        onChange={(e) => setData({ ...data, vacationDaysPerYear: Number(e.target.value) })}
                        className="w-20 border border-theme-border bg-surface text-text-1 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                      />
                    </div>
                  )}
                </div>

                {/* Key personnel */}
                <div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={data.isKeyPersonnel ?? false}
                      onChange={(e) => setData({ ...data, isKeyPersonnel: e.target.checked })}
                      className="w-4 h-4 rounded text-primary accent-primary"
                    />
                    <span className="text-sm text-text-1">Nøkkelpersonell</span>
                    <span className="text-xs text-text-3">(leder / ass. leder / teamleder)</span>
                  </label>
                  {data.isKeyPersonnel && (
                    <div className="mt-2 ml-7">
                      <input
                        type="text"
                        value={data.keyPersonnelRole ?? ''}
                        onChange={(e) => setData({ ...data, keyPersonnelRole: e.target.value })}
                        placeholder="f.eks. Butikksjef, Assisterende leder, Teamleder"
                        className="w-full border border-theme-border bg-surface text-text-1 placeholder:text-text-3 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Phone / Email / Birthday */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-2 uppercase tracking-wider mb-1.5">Telefon</label>
                  <input
                    type="tel"
                    value={data.phone}
                    onChange={(e) => setData({ ...data, phone: e.target.value })}
                    className="w-full border border-theme-border bg-surface text-text-1 placeholder:text-text-3 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    placeholder="+47 000 00 000"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-2 uppercase tracking-wider mb-1.5">E-post</label>
                  <input
                    type="email"
                    value={data.email}
                    onChange={(e) => setData({ ...data, email: e.target.value })}
                    className="w-full border border-theme-border bg-surface text-text-1 placeholder:text-text-3 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    placeholder="ansatt@butikk.no"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-2 uppercase tracking-wider mb-1.5">Bursdag</label>
                <input
                  type="date"
                  value={data.birthday ? `2000-${data.birthday}` : ''}
                  onChange={(e) => {
                    const val = e.target.value
                    if (!val) { setData({ ...data, birthday: undefined }); return }
                    const mmdd = val.slice(5) // extract MM-DD from YYYY-MM-DD
                    setData({ ...data, birthday: mmdd })
                  }}
                  className="w-full border border-theme-border bg-surface text-text-1 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                <p className="text-xs text-text-3 mt-1">Kun dag og måned lagres — ikke fødselsåret</p>
              </div>
            </div>
          )}

          {tab === 'leave' && (
            <div className="space-y-3">
              {data.leaves.length === 0 && !showLeaveForm && (
                <div className="text-center py-8 text-text-3">
                  <svg className="w-10 h-10 mx-auto mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm">Ingen registrert fravær</p>
                </div>
              )}

              {data.leaves.map((leave) => (
                <div key={leave.id} className="flex items-center justify-between bg-slate-50 dark:bg-slate-700/40 rounded-lg px-3 py-2.5 border border-theme-border">
                  <div>
                    <span className="text-sm font-medium text-text-1">{LEAVE_TYPE_LABELS[leave.type]}</span>
                    <div className="text-xs text-text-2">{leave.startDate} → {leave.endDate}</div>
                    {leave.note && <div className="text-xs text-text-3 italic">{leave.note}</div>}
                  </div>
                  <button onClick={() => removeLeave(leave.id)} className="text-red-400 hover:text-red-600 p-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}

              {showLeaveForm ? (
                <div className="border border-theme-border rounded-xl p-4 space-y-3 bg-surface">
                  <div>
                    <label className="block text-xs font-medium text-text-2 uppercase tracking-wider mb-1.5">Type fravær</label>
                    <select
                      value={leaveForm.type}
                      onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value as LeaveType })}
                      className="w-full border border-theme-border bg-surface text-text-1 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    >
                      {(Object.entries(LEAVE_TYPE_LABELS) as [LeaveType, string][]).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-text-2 uppercase tracking-wider mb-1.5">Fra dato</label>
                      <input
                        type="date"
                        value={leaveForm.startDate}
                        onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                        className="w-full border border-theme-border bg-surface text-text-1 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text-2 uppercase tracking-wider mb-1.5">Til dato</label>
                      <input
                        type="date"
                        value={leaveForm.endDate}
                        onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                        className="w-full border border-theme-border bg-surface text-text-1 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-2 uppercase tracking-wider mb-1.5">Notat (valgfritt)</label>
                    <input
                      type="text"
                      value={leaveForm.note}
                      onChange={(e) => setLeaveForm({ ...leaveForm, note: e.target.value })}
                      className="w-full border border-theme-border bg-surface text-text-1 placeholder:text-text-3 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                      placeholder="Valgfritt notat..."
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={addLeave} className="flex-1 bg-primary text-white text-sm font-medium py-2 rounded-lg hover:bg-primary-dark transition-colors">
                      Legg til
                    </button>
                    <button onClick={() => setShowLeaveForm(false)} className="flex-1 bg-slate-100 dark:bg-slate-700/60 text-text-2 text-sm font-medium py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">
                      Avbryt
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowLeaveForm(true)}
                  className="w-full flex items-center justify-center gap-2 border border-dashed border-gray-300 dark:border-slate-600 rounded-xl py-3 text-sm text-text-2 hover:border-primary hover:text-primary transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Legg til fravær
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-theme-border">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-theme-border text-sm font-medium text-text-2 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
            Avbryt
          </button>
          <button
            onClick={handleSave}
            disabled={!data.name.trim()}
            className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isNew ? 'Legg til' : 'Lagre'}
          </button>
        </div>
      </div>
    </div>
  )
}
