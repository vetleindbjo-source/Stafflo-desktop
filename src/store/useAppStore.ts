import { create } from 'zustand'
import { Employee, StoreSettings, GeneratedSchedule, AuthUser, BACKEND_URL, ScheduleDay, VacationPlan, LicenseStatus } from '../types'
import { storage } from '../utils/storage'

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
    const employees = [...get().employees, employee]
    set({ employees })
    storage.saveEmployees(employees)
  },

  updateEmployee: (employee) => {
    const employees = get().employees.map((e) => (e.id === employee.id ? employee : e))
    set({ employees })
    storage.saveEmployees(employees)
  },

  deleteEmployee: (id) => {
    const employees = get().employees.filter((e) => e.id !== id)
    set({ employees })
    storage.saveEmployees(employees)
  },

  updateSettings: (partial) => {
    const settings = { ...get().settings, ...partial }
    set({ settings })
    storage.saveSettings(settings)
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
    const { apiFetch, authUser } = get()
    // Local/dev users bypass the license gate
    if (!authUser || authUser.id === 'local' || authUser.email === 'dev@arbeidsplan.local') {
      set({ licenseStatus: { active: true, plan: 'trial', maxSeats: 999, expiresAt: null, key: null }, licenseChecked: true })
      return
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
    const { apiFetch } = get()
    try {
      const res = await apiFetch('/api/licenses/activate', {
        method: 'POST',
        body: JSON.stringify({ key }),
      })
      const data = await res.json() as LicenseStatus & { error?: string }
      if (!res.ok) return { success: false, error: data.error ?? 'Aktivering feilet' }
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
