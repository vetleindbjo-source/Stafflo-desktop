import React, { useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { ShiftTime, SpecialDay, RoleRequirement, DayOverride } from '../types'
import { ClockPicker } from '../components/ClockPicker'

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

type Tab = 'general' | 'roller' | 'special' | 'shifts' | 'gdpr' | 'om'

const TABS: { id: Tab; label: string }[] = [
  { id: 'general', label: 'Generelt' },
  { id: 'roller', label: 'Roller' },
  { id: 'special', label: 'Spesialdager' },
  { id: 'shifts', label: 'Vakttyper' },
  { id: 'gdpr', label: 'GDPR' },
  { id: 'om', label: 'Om' },
]

const WEEKDAY_LABELS: Record<number, string> = {
  1: 'Mandag', 2: 'Tirsdag', 3: 'Onsdag', 4: 'Torsdag', 5: 'Fredag', 6: 'Lørdag',
}

export function SettingsPage() {
  const { settings, updateSettings, logout, authUser, apiFetch, employees } = useAppStore()
  const [tab, setTab] = useState<Tab>('general')
  const [saved, setSaved] = useState(false)
  const [local, setLocal] = useState({ ...settings })
  const [newSpecial, setNewSpecial] = useState<Omit<SpecialDay, 'id'>>({
    date: '', note: '', closed: false, openTime: '10:00', closeTime: '16:00',
  })
  const [showSpecialForm, setShowSpecialForm] = useState(false)
  const [gdprLoading, setGdprLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')

  function save() {
    updateSettings(local)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  function addShift() {
    const shift: ShiftTime = { start: '08:00', end: '16:00', label: 'Ny vakt' }
    setLocal({ ...local, shiftTypes: [...local.shiftTypes, shift] })
  }

  function updateShift(index: number, partial: Partial<ShiftTime>) {
    const updated = local.shiftTypes.map((s, i) => i === index ? { ...s, ...partial } : s)
    setLocal({ ...local, shiftTypes: updated })
  }

  function removeShift(index: number) {
    setLocal({ ...local, shiftTypes: local.shiftTypes.filter((_, i) => i !== index) })
  }

  function addSpecialDay() {
    if (!newSpecial.date) return
    const day: SpecialDay = { id: generateId(), ...newSpecial }
    const sorted = [...(local.specialDays ?? []), day].sort((a, b) => a.date.localeCompare(b.date))
    setLocal({ ...local, specialDays: sorted })
    setNewSpecial({ date: '', note: '', closed: false, openTime: '10:00', closeTime: '16:00' })
    setShowSpecialForm(false)
  }

  function removeSpecialDay(id: string) {
    setLocal({ ...local, specialDays: (local.specialDays ?? []).filter((d) => d.id !== id) })
  }

  function formatDateNo(dateStr: string) {
    if (!dateStr) return ''
    const [y, m, d] = dateStr.split('-')
    const months = ['jan','feb','mar','apr','mai','jun','jul','aug','sep','okt','nov','des']
    return `${parseInt(d)}. ${months[parseInt(m) - 1]} ${y}`
  }

  // ── Per-day overrides ──────────────────────────────────────────────────────

  function getDayOverride(day: number): DayOverride {
    return (local.perDayOverrides ?? {})[day] ?? { followGlobal: true, minStaff: local.minStaffPerShift, maxStaff: local.maxStaffPerShift }
  }

  function setDayOverride(day: number, override: DayOverride) {
    setLocal({ ...local, perDayOverrides: { ...(local.perDayOverrides ?? {}), [day]: override } })
  }

  function clearDayOverride(day: number) {
    const overrides = { ...(local.perDayOverrides ?? {}) }
    delete overrides[day]
    setLocal({ ...local, perDayOverrides: overrides })
  }

  // ── Role requirements ──────────────────────────────────────────────────────

  // Collect all unique roles from employees (both role and keyPersonnelRole)
  const allRoles = Array.from(new Set([
    ...employees.map(e => e.role).filter(Boolean),
    ...employees.filter(e => e.isKeyPersonnel && e.keyPersonnelRole).map(e => e.keyPersonnelRole!),
  ]))

  // Roles with 2+ employees
  const roleCounts: Record<string, number> = {}
  for (const emp of employees) {
    if (emp.role) roleCounts[emp.role] = (roleCounts[emp.role] ?? 0) + 1
    if (emp.isKeyPersonnel && emp.keyPersonnelRole) {
      roleCounts[emp.keyPersonnelRole] = (roleCounts[emp.keyPersonnelRole] ?? 0) + 1
    }
  }

  const suggestedRoles = allRoles.filter(r => roleCounts[r] >= 2)
  const activeRoles = (local.roleRequirements ?? []).map(r => r.role)
  const deletedRoles = local.deletedRoleRequirements ?? []

  // Roles that are suggested but not yet added (and not deleted)
  const pendingSuggestions = suggestedRoles.filter(r => !activeRoles.includes(r) && !deletedRoles.includes(r))

  function addRoleRequirement(role: string) {
    const req: RoleRequirement = {
      role,
      minStaff: 1,
      maxStaff: 3,
      saturdayFollowGlobal: true,
      saturdayMin: 1,
      saturdayMax: 2,
    }
    const updatedDeleted = deletedRoles.filter(r => r !== role)
    setLocal({
      ...local,
      roleRequirements: [...(local.roleRequirements ?? []), req],
      deletedRoleRequirements: updatedDeleted,
    })
  }

  function updateRoleRequirement(index: number, partial: Partial<RoleRequirement>) {
    const updated = (local.roleRequirements ?? []).map((r, i) => i === index ? { ...r, ...partial } : r)
    setLocal({ ...local, roleRequirements: updated })
  }

  function deleteRoleRequirement(index: number) {
    const role = (local.roleRequirements ?? [])[index].role
    const updated = (local.roleRequirements ?? []).filter((_, i) => i !== index)
    setLocal({
      ...local,
      roleRequirements: updated,
      deletedRoleRequirements: [...deletedRoles, role],
    })
  }

  // ── GDPR ──────────────────────────────────────────────────────────────────

  async function exportGdpr() {
    setGdprLoading(true)
    try {
      const res = await apiFetch('/api/gdpr/export')
      if (!res.ok) throw new Error('Eksport feilet')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `arbeidsplan-data-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Eksport feilet. Er du koblet til serveren?')
    } finally {
      setGdprLoading(false)
    }
  }

  async function deleteAccount() {
    if (deleteConfirm !== 'SLETT KONTO') return
    setGdprLoading(true)
    try {
      const res = await apiFetch('/api/gdpr/delete-account', {
        method: 'DELETE',
        body: JSON.stringify({ confirm: 'SLETT KONTO' }),
      })
      if (!res.ok) throw new Error()
      logout()
    } catch {
      alert('Sletting feilet. Prøv igjen.')
    } finally {
      setGdprLoading(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 py-6 border-b border-theme-border bg-header">
        <h1 className="text-2xl font-bold text-text-1">Innstillinger</h1>
        <p className="text-text-2 text-sm mt-0.5">
          {authUser ? `${authUser.name} · ${authUser.email}` : 'Konfigurer butikken din'}
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-theme-border bg-header px-8 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`py-3 px-1 mr-6 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              tab === t.id ? 'border-primary text-primary' : 'border-transparent text-text-2 hover:text-text-1'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="max-w-2xl">

          {/* ─── GENERAL ─── */}
          {tab === 'general' && (
            <div className="space-y-4">
              {/* Store name + hours */}
              <div className="bg-surface rounded-xl border border-theme-border shadow-card divide-y divide-theme-border">
                <div className="px-5 py-4">
                  <label className="block text-sm font-medium text-text-1 mb-1.5">Butikknavn</label>
                  <input type="text" value={local.storeName} onChange={(e) => setLocal({ ...local, storeName: e.target.value })}
                    className="w-full border border-theme-border bg-surface text-text-1 placeholder:text-text-3 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    placeholder="f.eks. Rema 1000 Storgata" />
                </div>
                <div className="px-5 py-4 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-1 mb-1.5">Åpner (man–fre)</label>
                    <ClockPicker value={local.openTime} onChange={(v) => setLocal({ ...local, openTime: v })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-1 mb-1.5">Stenger (man–fre)</label>
                    <ClockPicker value={local.closeTime} onChange={(v) => setLocal({ ...local, closeTime: v })} />
                  </div>
                </div>

                {/* Sunday closed */}
                <div className="px-5 py-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={local.sundayClosed ?? true}
                      onChange={(e) => setLocal({ ...local, sundayClosed: e.target.checked })}
                      className="w-4 h-4 accent-primary" />
                    <div>
                      <span className="text-sm font-medium text-text-1">Stengt på søndager</span>
                      <p className="text-xs text-text-3 mt-0.5">Standard i Norge. Spesialdager kan overstyre.</p>
                    </div>
                  </label>
                </div>

                {/* Saturday hours */}
                <div className="px-5 py-4 space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={local.saturdayEnabled ?? false}
                      onChange={(e) => setLocal({ ...local, saturdayEnabled: e.target.checked })}
                      className="w-4 h-4 accent-primary" />
                    <span className="text-sm font-medium text-text-1">Ulike åpningstider på lørdag</span>
                  </label>

                  {local.saturdayEnabled && (
                    <div className="ml-7 space-y-3">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={local.saturdayClosed ?? false}
                          onChange={(e) => setLocal({ ...local, saturdayClosed: e.target.checked })}
                          className="w-4 h-4 accent-primary" />
                        <span className="text-sm text-text-1">Stengt alle lørdager</span>
                      </label>
                      {!local.saturdayClosed && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-text-2 mb-1.5">Åpner lørdag</label>
                            <ClockPicker value={local.saturdayOpenTime} onChange={(v) => setLocal({ ...local, saturdayOpenTime: v })} />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-text-2 mb-1.5">Stenger lørdag</label>
                            <ClockPicker value={local.saturdayCloseTime} onChange={(v) => setLocal({ ...local, saturdayCloseTime: v })} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Global staffing */}
              <div className="bg-surface rounded-xl border border-theme-border shadow-card px-5 py-4 space-y-3">
                <p className="text-xs font-semibold text-text-2 uppercase tracking-wider">Globale bemanningskrav</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-1 mb-1.5">Min. ansatte totalt</label>
                    <input type="number" min={1} max={20} value={local.minStaffPerShift}
                      onChange={(e) => setLocal({ ...local, minStaffPerShift: parseInt(e.target.value) || 1 })}
                      className="w-full border border-theme-border bg-surface text-text-1 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-1 mb-1.5">Maks. ansatte totalt</label>
                    <input type="number" min={1} max={30} value={local.maxStaffPerShift}
                      onChange={(e) => setLocal({ ...local, maxStaffPerShift: parseInt(e.target.value) || 5 })}
                      className="w-full border border-theme-border bg-surface text-text-1 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-1 mb-1">Min. ved åpning</label>
                    <p className="text-xs text-text-3 mb-1.5">Ansatte som må være til stede ved åpning</p>
                    <input type="number" min={1} max={20} value={local.minStaffOpening ?? 2}
                      onChange={(e) => setLocal({ ...local, minStaffOpening: parseInt(e.target.value) || 1 })}
                      className="w-full border border-theme-border bg-surface text-text-1 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-1 mb-1">Min. ved stenging</label>
                    <p className="text-xs text-text-3 mb-1.5">Ansatte som må være til stede ved stenging</p>
                    <input type="number" min={1} max={20} value={local.minStaffClosing ?? 2}
                      onChange={(e) => setLocal({ ...local, minStaffClosing: parseInt(e.target.value) || 1 })}
                      className="w-full border border-theme-border bg-surface text-text-1 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                  </div>
                </div>
              </div>

              {/* Per-day overrides */}
              <div className="bg-surface rounded-xl border border-theme-border shadow-card px-5 py-4 space-y-3">
                <div>
                  <p className="text-xs font-semibold text-text-2 uppercase tracking-wider">Bemanningskrav per ukedag</p>
                  <p className="text-xs text-text-3 mt-0.5">Overstyrer de globale kravene for spesifikke dager</p>
                </div>
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5, 6].map((day) => {
                    const override = getDayOverride(day)
                    const hasCustom = !!(local.perDayOverrides ?? {})[day]
                    const isActive = hasCustom && !override.followGlobal
                    if (day === 6 && !local.saturdayEnabled) return null
                    return (
                      <div key={day} className="flex items-center gap-3">
                        <span className="text-sm text-text-1 w-20 flex-shrink-0">{WEEKDAY_LABELS[day]}</span>
                        <label className="flex items-center gap-2 cursor-pointer flex-shrink-0">
                          <input type="checkbox" checked={isActive}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setDayOverride(day, { followGlobal: false, minStaff: local.minStaffPerShift, maxStaff: local.maxStaffPerShift })
                              } else {
                                clearDayOverride(day)
                              }
                            }}
                            className="w-3.5 h-3.5 accent-primary" />
                          <span className="text-xs text-text-2">Tilpass</span>
                        </label>
                        {isActive ? (
                          <div className="flex items-center gap-2 flex-1">
                            <input type="number" min={1} max={20} value={override.minStaff}
                              onChange={(e) => setDayOverride(day, { ...override, minStaff: parseInt(e.target.value) || 1 })}
                              className="w-16 border border-theme-border bg-surface text-text-1 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30" />
                            <span className="text-xs text-text-3">–</span>
                            <input type="number" min={1} max={30} value={override.maxStaff}
                              onChange={(e) => setDayOverride(day, { ...override, maxStaff: parseInt(e.target.value) || 1 })}
                              className="w-16 border border-theme-border bg-surface text-text-1 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30" />
                            <span className="text-xs text-text-3">ansatte</span>
                          </div>
                        ) : (
                          <span className="text-xs text-text-3 italic">{local.minStaffPerShift}–{local.maxStaffPerShift} (global)</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ─── ROLLER ─── */}
          {tab === 'roller' && (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-800 rounded-xl px-4 py-3 text-sm text-blue-700 dark:text-blue-300">
                Sett minimums- og maksimumskrav for ansatte med spesifikke roller. AI bruker dette når den lager arbeidsplanen.
              </div>

              {/* Active role requirements */}
              {(local.roleRequirements ?? []).length > 0 && (
                <div className="space-y-3">
                  {(local.roleRequirements ?? []).map((req, i) => (
                    <div key={req.role} className="bg-surface rounded-xl border border-theme-border shadow-card px-5 py-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium text-text-1">{req.role}</span>
                          <span className="ml-2 text-xs text-text-3">
                            ({employees.filter(e => e.role === req.role || e.keyPersonnelRole === req.role).length} ansatte)
                          </span>
                        </div>
                        <button onClick={() => deleteRoleRequirement(i)}
                          className="text-text-3 hover:text-red-500 p-1 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-text-2 mb-1">Min. per dag</label>
                          <input type="number" min={0} max={20} value={req.minStaff}
                            onChange={(e) => updateRoleRequirement(i, { minStaff: parseInt(e.target.value) || 0 })}
                            className="w-full border border-theme-border bg-surface text-text-1 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-text-2 mb-1">Maks. per dag</label>
                          <input type="number" min={0} max={20} value={req.maxStaff}
                            onChange={(e) => updateRoleRequirement(i, { maxStaff: parseInt(e.target.value) || 0 })}
                            className="w-full border border-theme-border bg-surface text-text-1 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                        </div>
                      </div>

                      {local.saturdayEnabled && !local.saturdayClosed && (
                        <div className="space-y-2 pt-1 border-t border-theme-border">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={req.saturdayFollowGlobal}
                              onChange={(e) => updateRoleRequirement(i, { saturdayFollowGlobal: e.target.checked })}
                              className="w-3.5 h-3.5 accent-primary" />
                            <span className="text-xs text-text-2">Lørdag følger ukekrav</span>
                          </label>
                          {!req.saturdayFollowGlobal && (
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-text-2 mb-1">Min. lørdag</label>
                                <input type="number" min={0} max={20} value={req.saturdayMin}
                                  onChange={(e) => updateRoleRequirement(i, { saturdayMin: parseInt(e.target.value) || 0 })}
                                  className="w-full border border-theme-border bg-surface text-text-1 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-text-2 mb-1">Maks. lørdag</label>
                                <input type="number" min={0} max={20} value={req.saturdayMax}
                                  onChange={(e) => updateRoleRequirement(i, { saturdayMax: parseInt(e.target.value) || 0 })}
                                  className="w-full border border-theme-border bg-surface text-text-1 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Suggestions */}
              {pendingSuggestions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-text-2 uppercase tracking-wider">Oppdagede roller</p>
                  {pendingSuggestions.map((role) => (
                    <div key={role} className="flex items-center justify-between bg-surface rounded-xl border border-dashed border-gray-300 dark:border-slate-600 px-4 py-3">
                      <div>
                        <span className="text-sm text-text-1">{role}</span>
                        <span className="ml-2 text-xs text-text-3">({roleCounts[role]} ansatte)</span>
                      </div>
                      <button onClick={() => addRoleRequirement(role)}
                        className="text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-colors font-medium">
                        Legg til krav
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Deleted / re-add */}
              {deletedRoles.filter(r => suggestedRoles.includes(r)).length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-text-2 uppercase tracking-wider">Fjernede forslag</p>
                  {deletedRoles.filter(r => suggestedRoles.includes(r)).map((role) => (
                    <div key={role} className="flex items-center justify-between bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-theme-border px-4 py-3 opacity-60">
                      <span className="text-sm text-text-2">{role}</span>
                      <button onClick={() => addRoleRequirement(role)}
                        className="text-xs bg-slate-100 dark:bg-slate-700 text-text-2 px-3 py-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors font-medium">
                        Legg til igjen
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {(local.roleRequirements ?? []).length === 0 && pendingSuggestions.length === 0 && deletedRoles.length === 0 && (
                <div className="text-center py-10 bg-surface rounded-xl border border-theme-border text-text-3">
                  <svg className="w-10 h-10 mx-auto mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
                  </svg>
                  <p className="text-sm">Ingen roller oppdaget enda.</p>
                  <p className="text-xs mt-1">Legg til roller på ansatte — roller med 2+ ansatte vises som forslag her.</p>
                </div>
              )}
            </div>
          )}

          {/* ─── SPECIAL DAYS ─── */}
          {tab === 'special' && (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-800 rounded-xl px-4 py-3 text-sm text-blue-700 dark:text-blue-300">
                Legg til dager med avvikende åpningstider — som julaften, nyttårsaften, eller lokale arrangementer. Disse tas automatisk hensyn til i turnusgenereringen.
              </div>

              <div className="space-y-2">
                {(local.specialDays ?? []).length === 0 && !showSpecialForm && (
                  <div className="text-center py-8 bg-surface rounded-xl border border-theme-border text-text-3">
                    <p className="text-sm">Ingen spesialdager lagt til enda</p>
                  </div>
                )}

                {(local.specialDays ?? []).map((day) => (
                  <div key={day.id} className="bg-surface rounded-xl border border-theme-border shadow-card px-4 py-3 flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-text-1 text-sm">{formatDateNo(day.date)}</span>
                        {day.closed && <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">Stengt</span>}
                      </div>
                      {day.note && <div className="text-xs text-text-2 mt-0.5">{day.note}</div>}
                      {!day.closed && day.openTime && (
                        <div className="text-xs text-text-2 mt-0.5">{day.openTime} – {day.closeTime}</div>
                      )}
                    </div>
                    <button onClick={() => removeSpecialDay(day.id)} className="text-text-3 hover:text-red-500 p-1 transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}

                {showSpecialForm ? (
                  <div className="bg-surface rounded-xl border border-theme-border p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-text-2 mb-1.5">Dato</label>
                        <input type="date" value={newSpecial.date} onChange={(e) => setNewSpecial({ ...newSpecial, date: e.target.value })}
                          className="w-full border border-theme-border bg-surface text-text-1 placeholder:text-text-3 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-text-2 mb-1.5">Beskrivelse</label>
                        <input type="text" value={newSpecial.note} onChange={(e) => setNewSpecial({ ...newSpecial, note: e.target.value })}
                          placeholder="f.eks. Julaften" className="w-full border border-theme-border bg-surface text-text-1 placeholder:text-text-3 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                      </div>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={newSpecial.closed} onChange={(e) => setNewSpecial({ ...newSpecial, closed: e.target.checked })} className="w-4 h-4 accent-primary" />
                      <span className="text-sm text-text-1">Stengt denne dagen</span>
                    </label>

                    {!newSpecial.closed && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-text-2 mb-1.5">Åpner</label>
                          <ClockPicker value={newSpecial.openTime} onChange={(v) => setNewSpecial({ ...newSpecial, openTime: v })} />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-text-2 mb-1.5">Stenger</label>
                          <ClockPicker value={newSpecial.closeTime} onChange={(v) => setNewSpecial({ ...newSpecial, closeTime: v })} />
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button onClick={addSpecialDay} className="flex-1 bg-primary text-white py-2 rounded-lg text-sm font-medium hover:bg-primary-dark">Legg til</button>
                      <button onClick={() => setShowSpecialForm(false)} className="flex-1 bg-slate-100 dark:bg-slate-700/60 text-text-2 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-slate-600">Avbryt</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setShowSpecialForm(true)}
                    className="w-full flex items-center justify-center gap-2 border border-dashed border-gray-300 dark:border-slate-600 rounded-xl py-3 text-sm text-text-2 hover:border-primary hover:text-primary transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Legg til spesialdag
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ─── SHIFTS ─── */}
          {tab === 'shifts' && (
            <div className="space-y-3">
              {local.shiftTypes.map((shift, i) => (
                <div key={i} className="bg-surface rounded-xl border border-theme-border shadow-card px-4 py-3 flex items-center gap-3">
                  <input type="text" value={shift.label} onChange={(e) => updateShift(i, { label: e.target.value })}
                    className="flex-1 border border-theme-border bg-surface text-text-1 placeholder:text-text-3 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" placeholder="Vaktnavn" />
                  <div className="w-28">
                    <ClockPicker value={shift.start} onChange={(v) => updateShift(i, { start: v })} />
                  </div>
                  <span className="text-text-3">–</span>
                  <div className="w-28">
                    <ClockPicker value={shift.end} onChange={(v) => updateShift(i, { end: v })} />
                  </div>
                  <button onClick={() => removeShift(i)} className="text-text-3 hover:text-red-500 p-1 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
              {local.shiftTypes.length === 0 && (
                <div className="text-center py-6 text-text-3 border border-dashed border-gray-200 dark:border-slate-600 rounded-xl text-sm">Ingen vakttyper</div>
              )}
              <button onClick={addShift} className="w-full flex items-center justify-center gap-2 border border-dashed border-gray-300 dark:border-slate-600 rounded-xl py-3 text-sm text-text-2 hover:border-primary hover:text-primary transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Legg til vakttype
              </button>
            </div>
          )}

          {/* ─── GDPR ─── */}
          {tab === 'gdpr' && (
            <div className="space-y-4">
              <div className="bg-surface rounded-xl border border-theme-border shadow-card divide-y divide-theme-border">
                <div className="px-5 py-4">
                  <h3 className="font-medium text-text-1 mb-1">Dine personopplysninger</h3>
                  <p className="text-sm text-text-2 mb-3">I henhold til GDPR artikkel 15 har du rett til innsyn i alle data vi behandler om deg.</p>
                  <button onClick={exportGdpr} disabled={gdprLoading}
                    className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700/60 text-text-2 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    {gdprLoading ? 'Eksporterer...' : 'Eksporter alle mine data (JSON)'}
                  </button>
                </div>

                <div className="px-5 py-4">
                  <h3 className="font-medium text-text-1 mb-1">Slett konto og alle data</h3>
                  <p className="text-sm text-text-2 mb-3">
                    I henhold til GDPR artikkel 17 (retten til sletting) kan du permanent slette all data knyttet til din konto. Dette kan ikke angres.
                  </p>
                  <div className="space-y-2">
                    <input type="text" value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)}
                      placeholder='Skriv "SLETT KONTO" for å bekrefte'
                      className="w-full border border-theme-border bg-surface text-text-1 placeholder:text-text-3 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400" />
                    <button onClick={deleteAccount} disabled={deleteConfirm !== 'SLETT KONTO' || gdprLoading}
                      className="flex items-center gap-2 bg-red-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Slett konto permanent
                    </button>
                  </div>
                </div>

                <div className="px-5 py-4">
                  <h3 className="font-medium text-text-1 mb-2">Personverninformasjon</h3>
                  <div className="space-y-1.5 text-sm text-text-2">
                    <p>Behandlingsansvarlig: <span className="font-medium">{local.storeName || 'Din bedrift'}</span></p>
                    <p>Databehandler for AI: <span className="font-medium">Anthropic, PBC (USA)</span></p>
                    <p>Tilsynsmyndighet: <span className="font-medium">Datatilsynet</span> (<span className="font-mono text-xs">www.datatilsynet.no</span>)</p>
                    {authUser?.gdprConsentAt && (
                      <p>GDPR-samtykke gitt: <span className="font-medium">{new Date(authUser.gdprConsentAt).toLocaleDateString('nb-NO')}</span></p>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-700 rounded-xl px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
                <p className="font-medium mb-1">Husk å informere dine ansatte</p>
                <p className="text-amber-700 dark:text-amber-400">Norsk personopplysningslov krever at du informerer ansatte om at data om dem behandles i dette systemet. Fornavn + forbokstav i etternavn sendes til Anthropic ved AI-generering.</p>
              </div>
            </div>
          )}

          {/* ─── OM ─── */}
          {tab === 'om' && (
            <div className="space-y-4">
              <div className="bg-surface rounded-xl border border-theme-border shadow-card divide-y divide-theme-border">
                <div className="px-5 py-5">
                  <h3 className="font-medium text-text-1 mb-1">Kom i gang-guide</h3>
                  <p className="text-sm text-text-2 mb-4">Vis den interaktive opplæringen som hjelper deg å sette opp arbeidsplanleggingen.</p>
                  <button
                    onClick={() => {
                      updateSettings({ ...local, onboardingDone: false })
                      save()
                      setTimeout(() => window.location.reload(), 100)
                    }}
                    className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Vis opplæring på nytt
                  </button>
                </div>

                <div className="px-5 py-4">
                  <h3 className="font-medium text-text-1 mb-3">Om appen</h3>
                  <div className="space-y-1.5 text-sm text-text-2">
                    <p>Versjon: <span className="font-medium">1.0.0</span></p>
                    <p>Plattform: <span className="font-medium">Web / Electron</span></p>
                    <p>AI-modell: <span className="font-medium">Claude (Anthropic)</span></p>
                  </div>
                </div>
              </div>

              <div className="bg-surface rounded-xl border border-theme-border shadow-card px-5 py-4">
                <h3 className="font-medium text-text-1 mb-1">Logg ut</h3>
                <p className="text-sm text-text-2 mb-3">Du er innlogget som <span className="font-medium">{authUser?.name}</span>.</p>
                <button onClick={logout}
                  className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700/60 text-text-2 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logg ut
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Save footer */}
      {tab !== 'gdpr' && tab !== 'om' && (
        <div className="px-8 py-4 border-t border-theme-border bg-header flex items-center justify-between">
          <span className={`text-sm transition-opacity ${saved ? 'text-green-600 opacity-100' : 'opacity-0'}`}>
            Innstillinger lagret!
          </span>
          <div className="flex gap-3">
            <button onClick={logout} className="px-4 py-2.5 text-sm text-text-2 hover:text-text-1 transition-colors">
              Logg ut
            </button>
            <button onClick={save}
              className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors shadow-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Lagre
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
