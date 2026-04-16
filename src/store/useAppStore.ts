import { create } from 'zustand'
import { Employee, Leave, StoreSettings, GeneratedSchedule, AuthUser, BACKEND_URL, ScheduleDay, VacationPlan, LicenseStatus } from '../types'
import { storage } from '../utils/storage'

// ── Cloud sync helpers ────────────────────────────────────────────────────────

function isCloudUser(authUser: AuthUser | null): boolean {
  return !!authUser && authUser.id !== 'local' && authUser.email !== 'dev@arbeidsplan.local'
}

// Fields stored in backend
type BackendEmployeeFields = Pick<Employee, 'name' | 'positionPercent' | 'role' | 'availableDays' | 'phone' | 'email' | 'color' | 'notes'>
// Fields kept only in localStorage (not in backend schema)
type ExtendedEmployeeFields = Omit<Employee, keyof BackendEmployeeFields | 'id' | 'leaves'>

function getEmployeeExtensions(): Record<string, Partial<ExtendedEmployeeFields>> {
  try { return JSON.parse(localStorage.getItem('employee_extensions') ?? '{}') } catch { return {} }
}
function saveEmployeeExtensions(exts: Record<string, Partial<ExtendedEmployeeFields>>) {
  localStorage.setItem('employee_extensions', JSON.stringify(exts))
}
function pickExtendedFields(emp: Employee): Partial<ExtendedEmployeeFields> {
  const ext: Partial<ExtendedEmployeeFields> = {}
  if (emp.vacationEligible !== undefined) ext.vacationEligible = emp.vacationEligible
  if (emp.vacationDaysPerYear !== undefined) ext.vacationDaysPerYear = emp.vacationDaysPerYear
  if (emp.isKeyPersonnel !== undefined) ext.isKeyPersonnel = emp.isKeyPersonnel
  if (emp.keyPersonnelRole !== undefined) ext.keyPersonnelRole = emp.keyPersonnelRole
  if (emp.allowedShiftTypes !== undefined) ext.allowedShiftTypes = emp.allowedShiftTypes
  if (emp.birthday !== undefined) ext.birthday = emp.birthday
  return ext
}

function backendToEmployee(data: Record<string, unknown>, ext: Partial<ExtendedEmployeeFields> = {}): Employee {
  const leaves = ((data.leaves as Record<string, unknown>[]) ?? []).map((l) => ({
    id: l.id as string,
    type: l.type as Leave['type'],
    startDate: l.startDate as string,
    endDate: l.endDate as string,
    note: l.note as string | undefined,
  }))
  return {
    id: data.id as string,
    name: data.name as string,
    positionPercent: data.positionPercent as number,
    role: (data.role as string) ?? '',
    availableDays: (data.availableDays as number[]) ?? [1, 2, 3, 4, 5],
    leaves,
    phone: (data.phone as string) ?? undefined,
    email: (data.email as string) ?? undefined,
    color: (data.color as string) ?? undefined,
    notes: (data.notes as string) ?? undefined,
    ...ext,
  }
}

function employeeToBackend(emp: Employee): BackendEmployeeFields {
  return {
    name: emp.name,
    positionPercent: emp.positionPercent,
    role: emp.role,
    availableDays: emp.availableDays,
    phone: emp.phone ?? null as unknown as undefined,
    email: emp.email ?? null as unknown as undefined,
    color: emp.color ?? null as unknown as undefined,
    notes: emp.notes ?? null as unknown as undefined,
  }
}

export type Theme = 'light' | 'dark'

function getSavedTheme(): Theme {
  return (localStorage.getItem('theme') as Theme) ?? 'light'
}

function applyTheme(theme: Theme) {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
  localStorage.setItem('theme', theme)
}

interface AppStore {
  employees: Employee[]
  settings: StoreSettings
  schedules: GeneratedSchedule[]
  vacationPlans: VacationPlan[]
  activePage: 'employees' | 'schedule' | 'history' | 'settings' | 'gdpr' | 'vacation'
  authUser: AuthUser | null
  accessToken: string | null
  backendAvailable: boolean
  theme: Theme
  licenseStatus: LicenseStatus | null
  licenseChecked: boolean

  setActivePage: (page: AppStore['activePage']) => void
  setTheme: (theme: Theme) => void

  // Auth
  setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => void
  logout: () => void
  setGdprConsent: () => void

  // License
  checkLicense: () => Promise<void>
  activateLicense: (key: string) => Promise<{ success: boolean; error?: string }>

  // Employees
  addEmployee: (employee: Employee) => void
  updateEmployee: (employee: Employee) => void
  deleteEmployee: (id: string) => void

  // Settings
  updateSettings: (settings: Partial<StoreSettings>) => void

  // Schedules
  addSchedule: (schedule: GeneratedSchedule) => void
  deleteSchedule: (id: string) => void
  updateScheduleDays: (id: string, days: ScheduleDay[]) => void

  // Vacation plans
  addVacationPlan: (plan: VacationPlan) => void
  updateVacationPlan: (plan: VacationPlan) => void
  deleteVacationPlan: (id: string) => void

  // Backend health
  checkBackend: () => Promise<boolean>

  // Cloud sync
  syncFromBackend: () => Promise<void>

  // API helper
  apiFetch: (path: string, options?: RequestInit) => Promise<Response>
}

export const useAppStore = create<AppStore>((set, get) => ({
  employees: storage.getEmployees(),
  settings: storage.getSettings(),
  schedules: storage.getSchedules(),
  vacationPlans: storage.getVacationPlans(),
  activePage: 'employees',
  authUser: storage.getAuthUser(),
  accessToken: storage.getAccessToken(),
  backendAvailable: false,
  theme: getSavedTheme(),
  licenseStatus: null,
  licenseChecked: false,

  setActivePage: (page) => set({ activePage: page }),

  setTheme: (theme) => {
    applyTheme(theme)
    set({ theme })
  },

  setAuth: (user, accessToken, refreshToken) => {
    storage.saveAuthUser(user)
    storage.saveAccessToken(accessToken)
    storage.saveRefreshToken(refreshToken)
    set({ authUser: user, accessToken })
    if (isCloudUser(user)) {
      setTimeout(() => get().syncFromBackend(), 100)
    }
  },

  logout: async () => {
    const refreshToken = storage.getRefreshToken()
    if (refreshToken) {
      try {
        await fetch(`${BACKEND_URL}/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        })
      } catch { /* ignore */ }
    }
    storage.clearAuth()
    set({ authUser: null, accessToken: null })
  },

  setGdprConsent: async () => {
    const { apiFetch, authUser } = get()
    try {
      await apiFetch('/auth/gdpr-consent', { method: 'POST' })
      if (authUser) {
        const updated = { ...authUser, gdprConsentAt: new Date().toISOString() }
        storage.saveAuthUser(updated)
        set({ authUser: updated })
      }
    } catch { /* ignore */ }
  },

  addEmployee: (employee) => {
    const { apiFetch, authUser } = get()
    if (isCloudUser(authUser)) {
      const ext = pickExtendedFields(employee)
      apiFetch('/api/employees', { method: 'POST', body: JSON.stringify(employeeToBackend(employee)) })
        .then(async (res) => {
          if (!res.ok) return
          const data = await res.json()
          if (Object.keys(ext).length > 0) {
            const extensions = getEmployeeExtensions()
            extensions[data.id] = ext
            saveEmployeeExtensions(extensions)
          }
          const newEmp = backendToEmployee(data, ext)
          const employees = [...get().employees.filter(e => e.id !== employee.id), newEmp]
          set({ employees })
          storage.saveEmployees(employees)
        })
        .catch(() => {})
    }
    // Optimistic local update (replaced by server response for cloud users)
    const employees = [...get().employees, employee]
    set({ employees })
    storage.saveEmployees(employees)
  },

  updateEmployee: (employee) => {
    const { apiFetch, authUser } = get()
    // Optimistic update
    const employees = get().employees.map((e) => (e.id === employee.id ? employee : e))
    set({ employees })
    storage.saveEmployees(employees)
    if (isCloudUser(authUser)) {
      const ext = pickExtendedFields(employee)
      if (Object.keys(ext).length > 0) {
        const extensions = getEmployeeExtensions()
        extensions[employee.id] = ext
        saveEmployeeExtensions(extensions)
      }
      apiFetch(`/api/employees/${employee.id}`, { method: 'PUT', body: JSON.stringify(employeeToBackend(employee)) })
        .catch(() => {})
    }
  },

  deleteEmployee: (id) => {
    const { apiFetch, authUser } = get()
    const employees = get().employees.filter((e) => e.id !== id)
    set({ employees })
    storage.saveEmployees(employees)
    if (isCloudUser(authUser)) {
      const extensions = getEmployeeExtensions()
      delete extensions[id]
      saveEmployeeExtensions(extensions)
      apiFetch(`/api/employees/${id}`, { method: 'DELETE' }).catch(() => {})
    }
  },

  updateSettings: (partial) => {
    const { apiFetch, authUser } = get()
    const settings = { ...get().settings, ...partial }
    set({ settings })
    storage.saveSettings(settings)
    if (isCloudUser(authUser)) {
      apiFetch('/api/settings', {
        method: 'PUT',
        body: JSON.stringify({
          storeName: settings.storeName,
          openTime: settings.openTime,
          closeTime: settings.closeTime,
          saturdayOpenTime: settings.saturdayOpenTime ?? null,
          saturdayCloseTime: settings.saturdayCloseTime ?? null,
          saturdayClosed: settings.saturdayClosed,
          minStaffPerShift: settings.minStaffPerShift,
          maxStaffPerShift: settings.maxStaffPerShift,
          shiftTypes: settings.shiftTypes,
          specialDays: settings.specialDays,
        }),
      }).catch(() => {})
    }
  },

  addSchedule: (schedule) => {
    const schedules = [schedule, ...get().schedules]
    set({ schedules })
    storage.saveSchedules(schedules)
  },

  deleteSchedule: (id) => {
    const schedules = get().schedules.filter((s) => s.id !== id)
    set({ schedules })
    storage.saveSchedules(schedules)
  },

  updateScheduleDays: (id, days) => {
    const schedules = get().schedules.map((s) => s.id === id ? { ...s, days } : s)
    set({ schedules })
    storage.saveSchedules(schedules)
  },

  addVacationPlan: (plan) => {
    const vacationPlans = [plan, ...get().vacationPlans]
    set({ vacationPlans })
    storage.saveVacationPlans(vacationPlans)
  },

  updateVacationPlan: (plan) => {
    const vacationPlans = get().vacationPlans.map((p) => p.id === plan.id ? plan : p)
    set({ vacationPlans })
    storage.saveVacationPlans(vacationPlans)
  },

  deleteVacationPlan: (id) => {
    const vacationPlans = get().vacationPlans.filter((p) => p.id !== id)
    set({ vacationPlans })
    storage.saveVacationPlans(vacationPlans)
  },

  syncFromBackend: async () => {
    const { apiFetch } = get()
    try {
      const [empRes, settRes] = await Promise.all([
        apiFetch('/api/employees'),
        apiFetch('/api/settings'),
      ])
      if (empRes.ok) {
        const data = await empRes.json() as Record<string, unknown>[]
        const extensions = getEmployeeExtensions()
        if (data.length > 0) {
          // Backend has employees — use as source of truth
          const employees = data.map((e) => backendToEmployee(e, extensions[e.id as string] ?? {}))
          set({ employees })
          storage.saveEmployees(employees)
        } else {
          // Backend is empty — push local employees up (first-time sync)
          const localEmployees = get().employees
          for (const emp of localEmployees) {
            apiFetch('/api/employees', { method: 'POST', body: JSON.stringify(employeeToBackend(emp)) })
              .then(async (res) => {
                if (!res.ok) return
                const saved = await res.json()
                const ext = pickExtendedFields(emp)
                if (Object.keys(ext).length > 0) {
                  const exts = getEmployeeExtensions()
                  exts[saved.id] = ext
                  saveEmployeeExtensions(exts)
                }
              })
              .catch(() => {})
          }
        }
      }
      if (settRes.ok) {
        const data = await settRes.json() as Record<string, unknown>
        const current = get().settings
        const merged: StoreSettings = {
          ...current,
          storeName: data.storeName as string,
          openTime: data.openTime as string,
          closeTime: data.closeTime as string,
          saturdayOpenTime: (data.saturdayOpenTime as string) ?? current.saturdayOpenTime,
          saturdayCloseTime: (data.saturdayCloseTime as string) ?? current.saturdayCloseTime,
          saturdayClosed: data.saturdayClosed as boolean,
          minStaffPerShift: data.minStaffPerShift as number,
          maxStaffPerShift: data.maxStaffPerShift as number,
          shiftTypes: data.shiftTypes as StoreSettings['shiftTypes'],
          specialDays: data.specialDays as StoreSettings['specialDays'],
        }
        set({ settings: merged })
        storage.saveSettings(merged)
      }
    } catch { /* silent fail */ }
  },

  checkBackend: async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/health`, { signal: AbortSignal.timeout(3000) })
      const available = res.ok
      set({ backendAvailable: available })
      return available
    } catch {
      set({ backendAvailable: false })
      return false
    }
  },

  // License
  checkLicense: async () => {
    const { apiFetch, authUser, activateLicense } = get()
    // Local/dev users bypass the license gate
    if (!authUser || authUser.id === 'local' || authUser.email === 'dev@arbeidsplan.local') {
      set({ licenseStatus: { active: true, plan: 'trial', maxSeats: 999, expiresAt: null, key: null }, licenseChecked: true })
      return
    }
    // Auto-restore saved license key (e.g. dev master key)
    const savedKey = localStorage.getItem('stafflo_license_key')
    if (savedKey) {
      const result = await activateLicense(savedKey)
      if (result.success) return
    }
    try {
      const res = await apiFetch('/api/licenses/status')
      if (res.ok) {
        const data = await res.json() as LicenseStatus
        set({ licenseStatus: data, licenseChecked: true })
      } else {
        set({ licenseStatus: { active: false, plan: null, maxSeats: 0, expiresAt: null, key: null }, licenseChecked: true })
      }
    } catch {
      set({ licenseStatus: { active: false, plan: null, maxSeats: 0, expiresAt: null, key: null }, licenseChecked: true })
    }
  },

  activateLicense: async (key: string) => {
    // Developer master key — always works, never expires
    if (key.trim().toUpperCase() === 'STAFFLO-DEV-MASTER-KEY-2025') {
      localStorage.setItem('stafflo_license_key', key.trim().toUpperCase())
      set({
        licenseStatus: { active: true, plan: 'small_chain', maxSeats: 9999, expiresAt: null, key },
        licenseChecked: true,
      })
      return { success: true }
    }

    // Free trial — 7 days from now, stored locally
    if (key === 'TRIAL-START') {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      set({
        licenseStatus: { active: true, plan: 'trial', maxSeats: 1, expiresAt, key: 'TRIAL' },
        licenseChecked: true,
      })
      return { success: true }
    }

    const { apiFetch } = get()
    try {
      const res = await apiFetch('/api/licenses/activate', {
        method: 'POST',
        body: JSON.stringify({ key }),
      })
      const data = await res.json() as LicenseStatus & { error?: string }
      if (!res.ok) return { success: false, error: data.error ?? 'Aktivering feilet' }
      localStorage.setItem('stafflo_license_key', key)
      set({ licenseStatus: { ...data, key }, licenseChecked: true })
      return { success: true }
    } catch {
      return { success: false, error: 'Nettverksfeil. Prøv igjen.' }
    }
  },

  apiFetch: async (path, options = {}) => {
    const { accessToken } = get()
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> ?? {}),
    }
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`

    const res = await fetch(`${BACKEND_URL}${path}`, { ...options, headers })

    // Auto-refresh on 401
    if (res.status === 401) {
      const refreshToken = storage.getRefreshToken()
      if (refreshToken) {
        try {
          const refreshRes = await fetch(`${BACKEND_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          })
          if (refreshRes.ok) {
            const data = await refreshRes.json()
            storage.saveAccessToken(data.accessToken)
            storage.saveRefreshToken(data.refreshToken)
            set({ accessToken: data.accessToken })
            // Retry original request
            headers['Authorization'] = `Bearer ${data.accessToken}`
            return fetch(`${BACKEND_URL}${path}`, { ...options, headers })
          }
        } catch { /* fall through */ }
      }
      // Refresh failed — log out
      storage.clearAuth()
      set({ authUser: null, accessToken: null })
    }

    return res
  },
}))
