import { Employee, StoreSettings, GeneratedSchedule, AuthUser, VacationPlan } from '../types'

const STORAGE_KEYS = {
  EMPLOYEES: 'employees',
  SETTINGS: 'settings',
  SCHEDULES: 'schedules',
  VACATION_PLANS: 'vacation_plans',
  AUTH_USER: 'auth_user',
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
}

function getItem<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function setItem<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value))
}

export const storage = {
  getEmployees(): Employee[] {
    return getItem<Employee[]>(STORAGE_KEYS.EMPLOYEES, [])
  },
  saveEmployees(employees: Employee[]): void {
    setItem(STORAGE_KEYS.EMPLOYEES, employees)
  },

  getSettings(): StoreSettings {
    const defaults: StoreSettings = {
      storeName: '',
      openTime: '08:00',
      closeTime: '20:00',
      saturdayEnabled: false,
      saturdayOpenTime: '10:00',
      saturdayCloseTime: '16:00',
      saturdayClosed: false,
      sundayClosed: true,
      perDayOverrides: {},
      roleRequirements: [],
      deletedRoleRequirements: [],
      specialDays: [],
      minStaffPerShift: 2,
      maxStaffPerShift: 5,
      minStaffOpening: 2,
      minStaffClosing: 2,
      shiftTypes: [
        { start: '08:00', end: '16:00', label: 'Dagvakt' },
        { start: '14:00', end: '22:00', label: 'Kveldsvakt' },
      ],
      anthropicApiKey: '',
      language: 'no',
      timeFormat: '24h',
      country: 'NO',
      onboardingDone: false,
    }
    const stored = getItem<Partial<StoreSettings>>(STORAGE_KEYS.SETTINGS, {})
    return { ...defaults, ...stored }
  },
  saveSettings(settings: StoreSettings): void {
    setItem(STORAGE_KEYS.SETTINGS, settings)
  },

  getSchedules(): GeneratedSchedule[] {
    return getItem<GeneratedSchedule[]>(STORAGE_KEYS.SCHEDULES, [])
  },
  saveSchedules(schedules: GeneratedSchedule[]): void {
    setItem(STORAGE_KEYS.SCHEDULES, schedules)
  },

  getVacationPlans(): VacationPlan[] {
    return getItem<VacationPlan[]>(STORAGE_KEYS.VACATION_PLANS, [])
  },
  saveVacationPlans(plans: VacationPlan[]): void {
    setItem(STORAGE_KEYS.VACATION_PLANS, plans)
  },

  getAuthUser(): AuthUser | null {
    return getItem<AuthUser | null>(STORAGE_KEYS.AUTH_USER, null)
  },
  saveAuthUser(user: AuthUser | null): void {
    if (user) setItem(STORAGE_KEYS.AUTH_USER, user)
    else localStorage.removeItem(STORAGE_KEYS.AUTH_USER)
  },

  getAccessToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
  },
  saveAccessToken(token: string | null): void {
    if (token) localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token)
    else localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN)
  },

  getRefreshToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)
  },
  saveRefreshToken(token: string | null): void {
    if (token) localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, token)
    else localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN)
  },

  clearAuth(): void {
    localStorage.removeItem(STORAGE_KEYS.AUTH_USER)
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN)
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN)
  },
}
