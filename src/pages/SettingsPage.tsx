import React, { useState, useEffect, useRef } from 'react'
import { useAppStore } from '../store/useAppStore'
import { ShiftTime, SpecialDay, RoleRequirement, DayOverride } from '../types'
import { useT, t } from '../utils/i18n'
import type { Lang } from '../utils/i18n'

declare global {
  interface Window {
    electronAPI?: {
      onUpdateAvailable?: (cb: (info: { version: string; releaseNotes: string | null }) => void) => void
      onUpdateCheckResult?: (cb: (result: 'latest') => void) => void
      checkForUpdates?: () => void
      downloadUpdate?: () => void
      installUpdate?: () => void
      getVersion?: () => string
    }
  }
}
const timeInputClass = "w-full border border-theme-border bg-surface text-text-1 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
const selectClass = "border border-theme-border bg-surface text-text-1 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"

function UpdateChecker({ tr }: { tr: ReturnType<typeof useT> }) {
  const [status, setStatus] = useState<'idle' | 'checking' | 'latest' | 'found'>('idle')
  const [foundVersion, setFoundVersion] = useState('')
  const hasElectron = typeof window !== 'undefined' && !!window.electronAPI

  useEffect(() => {
    window.electronAPI?.onUpdateCheckResult((result) => {
      if (result === 'latest') setStatus('latest')
    })
    window.electronAPI?.onUpdateAvailable?.((info) => {
      setFoundVersion(info.version)
      setStatus('found')
    })
  }, [])

  function check() {
    if (!hasElectron) return
    setStatus('checking')
    window.electronAPI!.checkForUpdates()
  }

  return (
    <div className="px-5 py-4 flex items-center justify-between gap-4">
      <div>
        <h3 className="font-medium text-text-1 text-sm">{tr('settings_about_check_updates')}</h3>
        {status === 'latest' && <p className="text-xs text-green-500 mt-0.5">{tr('settings_about_check_updates_latest')}</p>}
        {status === 'found' && <p className="text-xs text-primary mt-0.5">{tr('settings_about_check_updates_found', foundVersion)}</p>}
        {!hasElectron && <p className="text-xs text-text-3 mt-0.5">{tr('settings_about_check_updates_no_electron')}</p>}
      </div>
      <button
        onClick={check}
        disabled={!hasElectron || status === 'checking'}
        className="flex-shrink-0 bg-slate-100 dark:bg-slate-700/60 text-text-2 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {status === 'checking' ? tr('settings_about_check_updates_checking') : tr('settings_about_check_updates_btn')}
      </button>
    </div>
  )
}

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function TimeSelect({ value, onChange, timeFormat, showMinutes = false }: {
  value: string
  onChange: (v: string) => void
  timeFormat: '24h' | '12h'
  showMinutes?: boolean
}) {
  const parts = value.split(':')
  const h = parseInt(parts[0] ?? '0', 10)
  const m = parseInt(parts[1] ?? '0', 10)
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5) // 0,5,10,...,55

  if (timeFormat === '12h') {
    const ampm = h < 12 ? 'AM' : 'PM'
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
    const setHour = (newH12: number) => {
      const newH = ampm === 'AM' ? (newH12 === 12 ? 0 : newH12) : (newH12 === 12 ? 12 : newH12 + 12)
      onChange(`${String(newH).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
    const setAmpm = (newAmpm: string) => {
      const newH = newAmpm === 'AM' ? (h12 === 12 ? 0 : h12) : (h12 === 12 ? 12 : h12 + 12)
      onChange(`${String(newH).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
    const setMin = (newM: number) => {
      onChange(`${String(h).padStart(2, '0')}:${String(newM).padStart(2, '0')}`)
    }
    return (
      <div className="flex items-center gap-1">
        <select value={h12} onChange={e => setHour(parseInt(e.target.value))} className={selectClass}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map(hr => <option key={hr} value={hr}>{hr}</option>)}
        </select>
        {showMinutes && (
          <select value={m} onChange={e => setMin(parseInt(e.target.value))} className={selectClass}>
            {minutes.map(min => <option key={min} value={min}>{String(min).padStart(2, '0')}</option>)}
          </select>
        )}
        <select value={ampm} onChange={e => setAmpm(e.target.value)} className={selectClass}>
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
    )
  }

  const setMin = (newM: number) => {
    onChange(`${String(h).padStart(2, '0')}:${String(newM).padStart(2, '0')}`)
  }

  return (
    <div className="flex items-center gap-1">
      <select value={h} onChange={e => onChange(`${String(parseInt(e.target.value)).padStart(2, '0')}:${String(m).padStart(2, '0')}`)} className={selectClass}>
        {Array.from({ length: 24 }, (_, i) => i).map(hr => (
          <option key={hr} value={hr}>{String(hr).padStart(2, '0')}:00</option>
        ))}
      </select>
      {showMinutes && (
        <select value={m} onChange={e => setMin(parseInt(e.target.value))} className={selectClass}>
          {minutes.map(min => <option key={min} value={min}>{String(min).padStart(2, '0')}</option>)}
        </select>
      )}
    </div>
  )
}

const COUNTRIES = [
  { code: 'NO', label: 'Norge' },
  { code: 'SE', label: 'Sverige' },
  { code: 'DK', label: 'Danmark' },
  { code: 'FI', label: 'Finland' },
  { code: 'GB', label: 'Storbritannia' },
  { code: 'DE', label: 'Tyskland' },
  { code: 'FR', label: 'Frankrike' },
  { code: 'NL', label: 'Nederland' },
  { code: 'PL', label: 'Polen' },
  { code: 'ES', label: 'Spania' },
  { code: 'IT', label: 'Italia' },
  { code: 'US', label: 'USA' },
]

type Tab = 'general' | 'roller' | 'special' | 'shifts' | 'gdpr' | 'om'

const TAB_KEYS: { id: Tab; key: string }[] = [
  { id: 'general', key: 'settings_tab_general' },
  { id: 'roller', key: 'settings_tab_roles' },
  { id: 'special', key: 'settings_tab_special' },
  { id: 'shifts', key: 'settings_tab_shifts' },
  { id: 'gdpr', key: 'settings_tab_gdpr' },
  { id: 'om', key: 'settings_tab_about' },
]


export function SettingsPage() {
  const { settings, updateSettings, logout, authUser, apiFetch, employees, theme, setTheme } = useAppStore()
  const tr = useT(settings.language ?? 'no')
  const [tab, setTab] = useState<Tab>('general')
  const [saved, setSaved] = useState(false)
  const [local, setLocal] = useState({ ...settings })
  const [newSpecial, setNewSpecial] = useState<Omit<SpecialDay, 'id'>>({
    date: '', note: '', closed: false, openTime: '10:00', closeTime: '16:00',
  })
  const [showSpecialForm, setShowSpecialForm] = useState(false)
  const [gdprLoading, setGdprLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [importMessage, setImportMessage] = useState('')
  const [importLoading, setImportLoading] = useState(false)
  const prevCountry = useRef(local.country ?? 'NO')

  // Auto-import holidays when country changes
  useEffect(() => {
    if (local.country && local.country !== prevCountry.current) {
      prevCountry.current = local.country
      importHolidaysForCountry(local.country)
    }
  }, [local.country])

  // Translate default shift names when language changes
  const prevLang = useRef(local.language ?? 'no')
  useEffect(() => {
    const lang = (local.language ?? 'no') as Lang
    if (lang === prevLang.current) return
    prevLang.current = lang
    const langs: Lang[] = ['no', 'en', 'sv']
    const allDayNames = new Set(langs.map(l => t(l, 'settings_shifts_default_day')))
    const allEveningNames = new Set(langs.map(l => t(l, 'settings_shifts_default_evening')))
    const newDay = t(lang, 'settings_shifts_default_day')
    const newEvening = t(lang, 'settings_shifts_default_evening')
    setLocal(prev => ({
      ...prev,
      shiftTypes: prev.shiftTypes.map(s => {
        if (allDayNames.has(s.label)) return { ...s, label: newDay }
        if (allEveningNames.has(s.label)) return { ...s, label: newEvening }
        return s
      }),
    }))
  }, [local.language])

  async function importHolidaysForCountry(country: string) {
    const year = new Date().getFullYear()
    setImportLoading(true)
    setImportMessage('')
    try {
      const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${country}`)
      if (!res.ok) throw new Error('API error')
      const data = await res.json() as Array<{ date: string; localName: string; name: string }>
      // Remove old holidays (days with no custom note — i.e. previously auto-imported)
      // and replace with new country's holidays
      const newDays: SpecialDay[] = data.map(h => ({
        id: generateId(),
        date: h.date,
        note: h.localName,
        closed: true,
        openTime: local.openTime,
        closeTime: local.closeTime,
      }))
      setLocal(prev => {
        // Keep manually added special days (not from holidays API — identified as user-added if no match in new set)
        const newDates = new Set(newDays.map(d => d.date))
        const manual = (prev.specialDays ?? []).filter(d => !newDates.has(d.date))
        const merged = [...manual, ...newDays].sort((a, b) => a.date.localeCompare(b.date))
        return { ...prev, specialDays: merged }
      })
      setImportMessage(tr('settings_holidays_import').replace('{n}', String(newDays.length)).replace('{year}', String(year)))
    } catch {
      setImportMessage(tr('settings_holidays_error'))
    } finally {
      setImportLoading(false)
    }
  }

  function save() {
    updateSettings(local)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  function addShift() {
    const shift: ShiftTime = { start: '08:00', end: '16:00', label: tr('settings_shifts_new_label') }
    setLocal(prev => ({ ...prev, shiftTypes: [...prev.shiftTypes, shift] }))
  }

  function updateShift(index: number, partial: Partial<ShiftTime>) {
    setLocal(prev => ({ ...prev, shiftTypes: prev.shiftTypes.map((s, i) => i === index ? { ...s, ...partial } : s) }))
  }

  function removeShift(index: number) {
    setLocal(prev => ({ ...prev, shiftTypes: prev.shiftTypes.filter((_, i) => i !== index) }))
  }

  function addSpecialDay() {
    if (!newSpecial.date) return
    const day: SpecialDay = { id: generateId(), ...newSpecial }
    setLocal(prev => ({
      ...prev,
      specialDays: [...(prev.specialDays ?? []), day].sort((a, b) => a.date.localeCompare(b.date)),
    }))
    setNewSpecial({ date: '', note: '', closed: false, openTime: '10:00', closeTime: '16:00' })
    setShowSpecialForm(false)
  }

  function removeSpecialDay(id: string) {
    setLocal(prev => ({ ...prev, specialDays: (prev.specialDays ?? []).filter((d) => d.id !== id) }))
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
    setLocal(prev => ({ ...prev, perDayOverrides: { ...(prev.perDayOverrides ?? {}), [day]: override } }))
  }

  function clearDayOverride(day: number) {
    setLocal(prev => {
      const overrides = { ...(prev.perDayOverrides ?? {}) }
      delete overrides[day]
      return { ...prev, perDayOverrides: overrides }
    })
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
    setLocal(prev => ({
      ...prev,
      roleRequirements: [...(prev.roleRequirements ?? []), req],
      deletedRoleRequirements: (prev.deletedRoleRequirements ?? []).filter(r => r !== role),
    }))
  }

  function updateRoleRequirement(index: number, partial: Partial<RoleRequirement>) {
    setLocal(prev => ({ ...prev, roleRequirements: (prev.roleRequirements ?? []).map((r, i) => i === index ? { ...r, ...partial } : r) }))
  }

  function deleteRoleRequirement(index: number) {
    setLocal(prev => {
      const role = (prev.roleRequirements ?? [])[index].role
      return {
        ...prev,
        roleRequirements: (prev.roleRequirements ?? []).filter((_, i) => i !== index),
        deletedRoleRequirements: [...(prev.deletedRoleRequirements ?? []), role],
      }
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
    if (deleteConfirm !== tr('settings_gdpr_delete_confirm_value')) return
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
        <h1 className="text-2xl font-bold text-text-1">{tr('settings_title')}</h1>
        <p className="text-text-2 text-sm mt-0.5">
          {authUser ? tr('settings_subtitle_user', authUser.name, authUser.email) : tr('settings_subtitle_local')}
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-theme-border bg-header px-8 overflow-x-auto">
        {TAB_KEYS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`py-3 px-1 mr-6 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              tab === t.id ? 'border-primary text-primary' : 'border-transparent text-text-2 hover:text-text-1'
            }`}
          >
            {tr(t.key as Parameters<typeof tr>[0])}
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
                <div className="px-5 py-4 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-1 mb-1.5">{tr('settings_store_name')}</label>
                    <input type="text" value={local.storeName} onChange={(e) => setLocal({ ...local, storeName: e.target.value })}
                      className="w-full border border-theme-border bg-surface text-text-1 placeholder:text-text-3 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                      placeholder={tr('settings_store_name_placeholder')} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-1 mb-1.5">{tr('settings_country')}</label>
                    <select value={local.country ?? 'NO'} onChange={(e) => setLocal({ ...local, country: e.target.value })}
                      className="w-full border border-theme-border bg-surface text-text-1 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary">
                      {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                    </select>
                  </div>
                </div>
                {(importMessage || importLoading) && (
                  <div className="px-5 py-2 flex items-center gap-2 text-xs text-text-3">
                    {importLoading && <svg className="w-3 h-3 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
                    <span className={importMessage.includes('ikke') || importMessage.includes('not') || importMessage.includes('Kunde') ? 'text-red-400' : 'text-primary'}>{importMessage}</span>
                  </div>
                )}
                <div className="px-5 py-4 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-1 mb-1.5">{tr('settings_open_weekdays')}</label>
                    <TimeSelect value={local.openTime} onChange={(v) => setLocal({ ...local, openTime: v })} timeFormat={local.timeFormat ?? '24h'} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-1 mb-1.5">{tr('settings_close_weekdays')}</label>
                    <TimeSelect value={local.closeTime} onChange={(v) => setLocal({ ...local, closeTime: v })} timeFormat={local.timeFormat ?? '24h'} />
                  </div>
                </div>

                {/* Sunday closed */}
                <div className="px-5 py-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={local.sundayClosed ?? true}
                      onChange={(e) => setLocal({ ...local, sundayClosed: e.target.checked })}
                      className="w-4 h-4 accent-primary" />
                    <div>
                      <span className="text-sm font-medium text-text-1">{tr('settings_sunday_closed')}</span>
                      <p className="text-xs text-text-3 mt-0.5">{tr('settings_sunday_closed_desc')}</p>
                    </div>
                  </label>
                </div>

                {/* Saturday hours */}
                <div className="px-5 py-4 space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={local.saturdayEnabled ?? false}
                      onChange={(e) => setLocal({ ...local, saturdayEnabled: e.target.checked })}
                      className="w-4 h-4 accent-primary" />
                    <span className="text-sm font-medium text-text-1">{tr('settings_saturday_different')}</span>
                  </label>

                  {local.saturdayEnabled && (
                    <div className="ml-7 space-y-3">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={local.saturdayClosed ?? false}
                          onChange={(e) => setLocal({ ...local, saturdayClosed: e.target.checked })}
                          className="w-4 h-4 accent-primary" />
                        <span className="text-sm text-text-1">{tr('settings_saturday_closed')}</span>
                      </label>
                      {!local.saturdayClosed && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-text-2 mb-1.5">{tr('settings_saturday_open')}</label>
                            <TimeSelect value={local.saturdayOpenTime} onChange={(v) => setLocal({ ...local, saturdayOpenTime: v })} timeFormat={local.timeFormat ?? '24h'} />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-text-2 mb-1.5">{tr('settings_saturday_close')}</label>
                            <TimeSelect value={local.saturdayCloseTime} onChange={(v) => setLocal({ ...local, saturdayCloseTime: v })} timeFormat={local.timeFormat ?? '24h'} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Global staffing */}
              <div className="bg-surface rounded-xl border border-theme-border shadow-card px-5 py-4 space-y-3">
                <p className="text-xs font-semibold text-text-2 uppercase tracking-wider">{tr('settings_global_staffing')}</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-1 mb-1.5">{tr('settings_min_staff')}</label>
                    <input type="number" min={1} max={20} value={local.minStaffPerShift}
                      onChange={(e) => setLocal({ ...local, minStaffPerShift: parseInt(e.target.value) || 1 })}
                      className="w-full border border-theme-border bg-surface text-text-1 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-1 mb-1.5">{tr('settings_max_staff')}</label>
                    <input type="number" min={1} max={30} value={local.maxStaffPerShift}
                      onChange={(e) => setLocal({ ...local, maxStaffPerShift: parseInt(e.target.value) || 5 })}
                      className="w-full border border-theme-border bg-surface text-text-1 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-1 mb-1">{tr('settings_min_opening')}</label>
                    <p className="text-xs text-text-3 mb-1.5">{tr('settings_min_opening_desc')}</p>
                    <input type="number" min={1} max={20} value={local.minStaffOpening ?? 2}
                      onChange={(e) => setLocal({ ...local, minStaffOpening: parseInt(e.target.value) || 1 })}
                      className="w-full border border-theme-border bg-surface text-text-1 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-1 mb-1">{tr('settings_min_closing')}</label>
                    <p className="text-xs text-text-3 mb-1.5">{tr('settings_min_closing_desc')}</p>
                    <input type="number" min={1} max={20} value={local.minStaffClosing ?? 2}
                      onChange={(e) => setLocal({ ...local, minStaffClosing: parseInt(e.target.value) || 1 })}
                      className="w-full border border-theme-border bg-surface text-text-1 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                  </div>
                </div>
              </div>

              {/* Per-day overrides */}
              <div className="bg-surface rounded-xl border border-theme-border shadow-card px-5 py-4 space-y-3">
                <div>
                  <p className="text-xs font-semibold text-text-2 uppercase tracking-wider">{tr('settings_per_day_overrides')}</p>
                  <p className="text-xs text-text-3 mt-0.5">{tr('settings_per_day_overrides_desc')}</p>
                </div>
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5, 6].map((day) => {
                    const override = getDayOverride(day)
                    const hasCustom = !!(local.perDayOverrides ?? {})[day]
                    const isActive = hasCustom && !override.followGlobal
                    if (day === 6 && !local.saturdayEnabled) return null
                    return (
                      <div key={day} className="flex items-center gap-3">
                        <span className="text-sm text-text-1 w-20 flex-shrink-0">{tr(`weekday_${day}` as Parameters<typeof tr>[0])}</span>
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
                          <span className="text-xs text-text-2">{tr('settings_customize')}</span>
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
                            <span className="text-xs text-text-3">{tr('settings_staff_unit')}</span>
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
                {tr('settings_roles_desc')}
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
                            ({employees.filter(e => e.role === req.role || e.keyPersonnelRole === req.role).length} {tr('settings_staff_unit')})
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
                          <label className="block text-xs font-medium text-text-2 mb-1">{tr('settings_roles_min_day')}</label>
                          <input type="number" min={0} max={20} value={req.minStaff}
                            onChange={(e) => updateRoleRequirement(i, { minStaff: parseInt(e.target.value) || 0 })}
                            className="w-full border border-theme-border bg-surface text-text-1 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-text-2 mb-1">{tr('settings_roles_max_day')}</label>
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
                            <span className="text-xs text-text-2">{tr('settings_roles_sat_follow')}</span>
                          </label>
                          {!req.saturdayFollowGlobal && (
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-text-2 mb-1">{tr('settings_roles_sat_min')}</label>
                                <input type="number" min={0} max={20} value={req.saturdayMin}
                                  onChange={(e) => updateRoleRequirement(i, { saturdayMin: parseInt(e.target.value) || 0 })}
                                  className="w-full border border-theme-border bg-surface text-text-1 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-text-2 mb-1">{tr('settings_roles_sat_max')}</label>
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
                  <p className="text-xs font-semibold text-text-2 uppercase tracking-wider">{tr('settings_roles_discovered')}</p>
                  {pendingSuggestions.map((role) => (
                    <div key={role} className="flex items-center justify-between bg-surface rounded-xl border border-dashed border-gray-300 dark:border-slate-600 px-4 py-3">
                      <div>
                        <span className="text-sm text-text-1">{role}</span>
                        <span className="ml-2 text-xs text-text-3">({roleCounts[role]} {tr('settings_staff_unit')})</span>
                      </div>
                      <button onClick={() => addRoleRequirement(role)}
                        className="text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-colors font-medium">
                        {tr('settings_roles_add_req')}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Deleted / re-add */}
              {deletedRoles.filter(r => suggestedRoles.includes(r)).length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-text-2 uppercase tracking-wider">{tr('settings_roles_removed_title')}</p>
                  {deletedRoles.filter(r => suggestedRoles.includes(r)).map((role) => (
                    <div key={role} className="flex items-center justify-between bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-theme-border px-4 py-3 opacity-60">
                      <span className="text-sm text-text-2">{role}</span>
                      <button onClick={() => addRoleRequirement(role)}
                        className="text-xs bg-slate-100 dark:bg-slate-700 text-text-2 px-3 py-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors font-medium">
                        {tr('settings_roles_readd')}
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
                  <p className="text-sm">{tr('settings_roles_empty')}</p>
                  <p className="text-xs mt-1">{tr('settings_roles_empty_desc')}</p>
                </div>
              )}
            </div>
          )}

          {/* ─── SPECIAL DAYS ─── */}
          {tab === 'special' && (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-800 rounded-xl px-4 py-3 text-sm text-blue-700 dark:text-blue-300">
                {tr('settings_special_desc')}
              </div>

              <div className="space-y-2">
                {(local.specialDays ?? []).length === 0 && !showSpecialForm && (
                  <div className="text-center py-8 bg-surface rounded-xl border border-theme-border text-text-3">
                    <p className="text-sm">{tr('settings_special_empty')}</p>
                  </div>
                )}

                {(local.specialDays ?? []).map((day) => (
                  <div key={day.id} className="bg-surface rounded-xl border border-theme-border shadow-card px-4 py-3 flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-text-1 text-sm">{formatDateNo(day.date)}</span>
                        {day.closed && <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">{tr('settings_special_closed_badge')}</span>}
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
                        <label className="block text-xs font-medium text-text-2 mb-1.5">{tr('settings_special_date')}</label>
                        <input type="date" value={newSpecial.date} onChange={(e) => setNewSpecial({ ...newSpecial, date: e.target.value })}
                          className="w-full border border-theme-border bg-surface text-text-1 placeholder:text-text-3 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-text-2 mb-1.5">{tr('settings_special_description')}</label>
                        <input type="text" value={newSpecial.note} onChange={(e) => setNewSpecial({ ...newSpecial, note: e.target.value })}
                          placeholder={tr('settings_special_note_placeholder')} className="w-full border border-theme-border bg-surface text-text-1 placeholder:text-text-3 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                      </div>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={newSpecial.closed} onChange={(e) => setNewSpecial({ ...newSpecial, closed: e.target.checked })} className="w-4 h-4 accent-primary" />
                      <span className="text-sm text-text-1">{tr('settings_special_closed_day')}</span>
                    </label>

                    {!newSpecial.closed && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-text-2 mb-1.5">{tr('settings_special_opens')}</label>
                          <TimeSelect value={newSpecial.openTime ?? '10:00'} onChange={(v) => setNewSpecial({ ...newSpecial, openTime: v })} timeFormat={local.timeFormat ?? '24h'} />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-text-2 mb-1.5">{tr('settings_special_closes')}</label>
                          <TimeSelect value={newSpecial.closeTime ?? '16:00'} onChange={(v) => setNewSpecial({ ...newSpecial, closeTime: v })} timeFormat={local.timeFormat ?? '24h'} />
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button onClick={addSpecialDay} className="flex-1 bg-primary text-white py-2 rounded-lg text-sm font-medium hover:bg-primary-dark">{tr('add')}</button>
                      <button onClick={() => setShowSpecialForm(false)} className="flex-1 bg-slate-100 dark:bg-slate-700/60 text-text-2 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-slate-600">{tr('cancel')}</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setShowSpecialForm(true)}
                    className="w-full flex items-center justify-center gap-2 border border-dashed border-gray-300 dark:border-slate-600 rounded-xl py-3 text-sm text-text-2 hover:border-primary hover:text-primary transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    {tr('settings_special_add_btn')}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ─── SHIFTS ─── */}
          {tab === 'shifts' && (
            <div className="space-y-3">
              {local.shiftTypes.map((shift, i) => (
                <div key={i} className="bg-surface rounded-xl border border-theme-border shadow-card px-4 py-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <input type="text" value={shift.label} onChange={(e) => updateShift(i, { label: e.target.value })}
                      className="flex-1 border border-theme-border bg-surface text-text-1 placeholder:text-text-3 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" placeholder={tr('settings_shifts_name_placeholder')} />
                    <button onClick={() => removeShift(i)} className="text-text-3 hover:text-red-500 p-1 transition-colors flex-shrink-0">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-3 w-12 flex-shrink-0">{tr('settings_shifts_start')}</span>
                    <TimeSelect value={shift.start} onChange={(v) => updateShift(i, { start: v })} timeFormat={local.timeFormat ?? '24h'} showMinutes />
                    <span className="text-text-3 px-1">–</span>
                    <span className="text-xs text-text-3 w-12 flex-shrink-0">{tr('settings_shifts_end')}</span>
                    <TimeSelect value={shift.end} onChange={(v) => updateShift(i, { end: v })} timeFormat={local.timeFormat ?? '24h'} showMinutes />
                  </div>
                </div>
              ))}
              {local.shiftTypes.length === 0 && (
                <div className="text-center py-6 text-text-3 border border-dashed border-gray-200 dark:border-slate-600 rounded-xl text-sm">{tr('settings_shifts_empty')}</div>
              )}
              <button onClick={addShift} className="w-full flex items-center justify-center gap-2 border border-dashed border-gray-300 dark:border-slate-600 rounded-xl py-3 text-sm text-text-2 hover:border-primary hover:text-primary transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {tr('settings_shifts_add')}
              </button>
            </div>
          )}

          {/* ─── GDPR ─── */}
          {tab === 'gdpr' && (
            <div className="space-y-4">
              <div className="bg-surface rounded-xl border border-theme-border shadow-card divide-y divide-theme-border">
                <div className="px-5 py-4">
                  <h3 className="font-medium text-text-1 mb-1">{tr('settings_gdpr_data_title')}</h3>
                  <p className="text-sm text-text-2 mb-3">{tr('settings_gdpr_data_desc')}</p>
                  <button onClick={exportGdpr} disabled={gdprLoading}
                    className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700/60 text-text-2 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    {gdprLoading ? tr('settings_gdpr_exporting') : tr('settings_gdpr_export')}
                  </button>
                </div>

                <div className="px-5 py-4">
                  <h3 className="font-medium text-text-1 mb-1">{tr('settings_gdpr_delete_title')}</h3>
                  <p className="text-sm text-text-2 mb-3">{tr('settings_gdpr_delete_desc')}</p>
                  <div className="space-y-2">
                    <input type="text" value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)}
                      placeholder={tr('settings_gdpr_delete_confirm_placeholder')}
                      className="w-full border border-theme-border bg-surface text-text-1 placeholder:text-text-3 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400" />
                    <button onClick={deleteAccount} disabled={deleteConfirm !== tr('settings_gdpr_delete_confirm_value') || gdprLoading}
                      className="flex items-center gap-2 bg-red-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      {tr('settings_gdpr_delete_btn')}
                    </button>
                  </div>
                </div>

                <div className="px-5 py-4">
                  <h3 className="font-medium text-text-1 mb-2">{tr('settings_gdpr_privacy_title')}</h3>
                  <div className="space-y-1.5 text-sm text-text-2">
                    <p>{tr('settings_gdpr_controller')}: <span className="font-medium">{local.storeName || 'Din bedrift'}</span></p>
                    <p>{tr('settings_gdpr_processor')}: <span className="font-medium">Anthropic, PBC (USA)</span></p>
                    <p>{tr('settings_gdpr_authority')}: <span className="font-medium">Datatilsynet</span> (<span className="font-mono text-xs">www.datatilsynet.no</span>)</p>
                    {authUser?.gdprConsentAt && (
                      <p>{tr('settings_gdpr_consent_given')}: <span className="font-medium">{new Date(authUser.gdprConsentAt).toLocaleDateString('nb-NO')}</span></p>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-700 rounded-xl px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
                <p className="font-medium mb-1">{tr('settings_gdpr_employees_notice_title')}</p>
                <p className="text-amber-700 dark:text-amber-400">{tr('settings_gdpr_employees_notice_desc')}</p>
              </div>
            </div>
          )}

          {/* ─── OM ─── */}
          {tab === 'om' && (
            <div className="space-y-4">
              <div className="bg-surface rounded-xl border border-theme-border shadow-card divide-y divide-theme-border">
                <div className="px-5 py-5">
                  <h3 className="font-medium text-text-1 mb-1">{tr('settings_about_guide')}</h3>
                  <p className="text-sm text-text-2 mb-4">{tr('settings_about_guide_desc')}</p>
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
                    {tr('settings_about_guide_btn')}
                  </button>
                </div>

                <div className="px-5 py-4">
                  <h3 className="font-medium text-text-1 mb-3">{tr('settings_about_app')}</h3>
                  <div className="space-y-1.5 text-sm text-text-2">
                    <p>{tr('settings_about_version')}: <span className="font-medium">{window.electronAPI?.getVersion?.() ?? '—'}</span></p>
                    <p>{tr('settings_about_platform')}: <span className="font-medium">Web / Electron</span></p>
                    <p>{tr('settings_about_ai')}: <span className="font-medium">Claude (Anthropic)</span></p>
                  </div>
                </div>

                <UpdateChecker tr={tr} />
              </div>

              <div className="bg-surface rounded-xl border border-theme-border shadow-card divide-y divide-theme-border">
                <div className="px-5 py-4">
                  <h3 className="font-medium text-text-1 mb-1">{tr('settings_language')}</h3>
                  <p className="text-sm text-text-2 mb-3">{tr('settings_language_desc')}</p>
                  <div className="flex gap-2">
                    {([
                      { code: 'no', label: '🇳🇴 Norsk' },
                      { code: 'sv', label: '🇸🇪 Svenska' },
                      { code: 'en', label: '🇬🇧 English' },
                    ] as const).map(lang => (
                      <button key={lang.code}
                        onClick={() => setLocal({ ...local, language: lang.code })}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${local.language === lang.code ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-700/60 text-text-2 hover:bg-gray-200 dark:hover:bg-slate-600'}`}>
                        {lang.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="px-5 py-4">
                  <h3 className="font-medium text-text-1 mb-1">{tr('settings_timeformat')}</h3>
                  <p className="text-sm text-text-2 mb-3">{tr('settings_timeformat_desc')}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setLocal({ ...local, timeFormat: '24h' })}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${(local.timeFormat ?? '24h') === '24h' ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-700/60 text-text-2 hover:bg-gray-200 dark:hover:bg-slate-600'}`}>
                      24t (14:30)
                    </button>
                    <button
                      onClick={() => setLocal({ ...local, timeFormat: '12h' })}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${(local.timeFormat ?? '24h') === '12h' ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-700/60 text-text-2 hover:bg-gray-200 dark:hover:bg-slate-600'}`}>
                      AM/PM (2:30 PM)
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-surface rounded-xl border border-theme-border shadow-card px-5 py-4">
                <h3 className="font-medium text-text-1 mb-1">{tr('settings_theme')}</h3>
                <p className="text-sm text-text-2 mb-3">{tr('settings_theme_desc')}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTheme('light')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${theme === 'light' ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-700/60 text-text-2 hover:bg-gray-200 dark:hover:bg-slate-600'}`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    {tr('settings_theme_light')}
                  </button>
                  <button
                    onClick={() => setTheme('dark')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${theme === 'dark' ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-700/60 text-text-2 hover:bg-gray-200 dark:hover:bg-slate-600'}`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                    {tr('settings_theme_dark')}
                  </button>
                </div>
              </div>

              <div className="bg-surface rounded-xl border border-theme-border shadow-card px-5 py-4">
                <h3 className="font-medium text-text-1 mb-1">{tr('settings_logout_title')}</h3>
                <p className="text-sm text-text-2 mb-3">{tr('settings_logout_desc', authUser?.name ?? '')}</p>
                <button onClick={logout}
                  className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700/60 text-text-2 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  {tr('logout')}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Save footer */}
      {tab !== 'gdpr' && (
        <div className="px-8 py-4 border-t border-theme-border bg-header flex items-center justify-between">
          <span className={`text-sm transition-opacity ${saved ? 'text-green-600 opacity-100' : 'opacity-0'}`}>
            {tr('save')} ✓
          </span>
          <div className="flex gap-3">
            <button onClick={logout} className="px-4 py-2.5 text-sm text-text-2 hover:text-text-1 transition-colors">
              {tr('logout')}
            </button>
            <button onClick={save}
              className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors shadow-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {tr('save')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
