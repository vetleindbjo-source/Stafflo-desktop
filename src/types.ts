export type LeaveType = 'vacation' | 'sick' | 'paid' | 'selfCertified' | 'other'

export interface Leave {
  id: string
  type: LeaveType
  startDate: string // YYYY-MM-DD
  endDate: string   // YYYY-MM-DD
  note?: string
}

export interface Employee {
  id: string
  name: string
  positionPercent: number // e.g. 37.5, supports up to 2 decimal places
  role: string
  // Which weekdays they can work: 0=Sun,1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat
  availableDays: number[]
  leaves: Leave[]
  phone?: string
  email?: string
  color?: string // for visual identification in schedule
  notes?: string // AI scheduling notes, e.g. "can only work mornings"
  vacationEligible?: boolean  // has statutory vacation rights
  vacationDaysPerYear?: number // e.g. 25 days
  isKeyPersonnel?: boolean    // manager/assistant manager/team leader
  keyPersonnelRole?: string   // e.g. "Butikksjef", "Assisterende leder"
}

export interface ShiftTime {
  start: string // "08:00"
  end: string   // "16:00"
  label: string // "Morgen", "Middag", "Kveld"
}

export interface SpecialDay {
  id: string
  date: string       // YYYY-MM-DD
  note: string       // e.g. "Julaften", "Påskeaften"
  closed: boolean
  openTime?: string  // if not closed
  closeTime?: string
}

export interface DayOverride {
  followGlobal: boolean
  minStaff: number
  maxStaff: number
}

export interface RoleRequirement {
  role: string
  minStaff: number
  maxStaff: number
  saturdayFollowGlobal: boolean
  saturdayMin: number
  saturdayMax: number
}

export interface StoreSettings {
  storeName: string
  openTime: string   // "08:00"
  closeTime: string  // "22:00"
  // Saturday-specific hours
  saturdayEnabled: boolean  // true = saturdays have different hours
  saturdayOpenTime: string
  saturdayCloseTime: string
  saturdayClosed: boolean   // true = closed all saturdays
  // Sunday
  sundayClosed: boolean     // true = closed all sundays (default true in Norway)
  // Per-day staffing overrides: key = day number (1=Mon..6=Sat)
  perDayOverrides: Partial<Record<number, DayOverride>>
  // Role-based staffing requirements
  roleRequirements: RoleRequirement[]
  deletedRoleRequirements: string[]  // roles removed by manager, shown as suggestions
  // Special days (holidays, exceptions)
  specialDays: SpecialDay[]
  minStaffPerShift: number    // minimum staff at any point during the day
  maxStaffPerShift: number    // maximum staff at any point during the day
  minStaffOpening: number     // minimum staff required at opening
  minStaffClosing: number     // minimum staff required at closing
  shiftTypes: ShiftTime[]
  anthropicApiKey: string
  language: 'no' | 'en'
  onboardingDone: boolean     // whether the user has seen the welcome walkthrough
}

export interface AuthUser {
  id: string
  email: string
  name: string
  avatarUrl?: string
  provider: 'google' | 'microsoft'
  gdprConsentAt?: string
  orgId?: string
  orgName?: string
}

export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3001'

export interface LicenseStatus {
  active: boolean
  plan: 'trial' | 'solo' | 'small_chain' | null
  maxSeats: number
  expiresAt: string | null
  key: string | null
}

export interface ScheduleShift {
  id: string
  employee: string
  start: string
  end: string
  role?: string
}

export interface ScheduleDay {
  date: string       // YYYY-MM-DD
  closed: boolean
  holiday?: string
  shifts: ScheduleShift[]
}

export interface GeneratedSchedule {
  id: string
  title: string
  startDate: string
  endDate: string
  rawText: string    // original AI response (JSON string)
  days?: ScheduleDay[] // parsed structured data
  createdAt: string
}

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  vacation: 'Ferie',
  sick: 'Sykefravær',
  paid: 'Betalt permisjon',
  selfCertified: 'Egenmelding',
  other: 'Annet',
}

export const DAY_NAMES = ['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør']
export const DAY_NAMES_FULL = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag']

// ── Vacation planning ────────────────────────────────────────────────────────

export interface VacationPreference {
  startWeek: number  // ISO week number
  duration: number   // number of weeks (1-5) or days (1-6)
  unit: 'weeks' | 'days'
}

export interface VacationRequest {
  employeeId: string
  preferences: VacationPreference[] // up to 3, in priority order
}

export interface VacationAssignment {
  employeeId: string
  weeks: number[]       // week numbers assigned
  preferenceUsed: number // 0=first, 1=second, 2=third, -1=unresolved
}

export interface VacationPlan {
  id: string
  year: number
  startWeek: number
  endWeek: number
  requireKeyPersonnel: boolean
  minStaffPresent: number
  requests: VacationRequest[]
  result?: VacationAssignment[]
  warnings?: string[]
  createdAt: string
}

// Quick-select shortcuts shown in the modal
export const POSITION_SHORTCUTS = [20, 50, 75, 100]

export const EMPLOYEE_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#e11d48', '#7c3aed', '#0ea5e9', '#d97706',
]
