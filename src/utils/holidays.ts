// Norwegian public holidays (norske helligdager)
// Easter dates calculated using the Meeus/Jones/Butcher algorithm

export interface Holiday {
  date: string // YYYY-MM-DD
  name: string
  nameNo: string
}

function getEasterDate(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1 // 0-indexed
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month, day)
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function toDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function getNorwegianHolidays(year: number): Holiday[] {
  const easter = getEasterDate(year)
  const holidays: Holiday[] = [
    // Fixed holidays
    { date: `${year}-01-01`, name: "New Year's Day", nameNo: 'Nyttårsdag' },
    { date: `${year}-05-01`, name: 'Labour Day', nameNo: 'Arbeidernes dag' },
    { date: `${year}-05-17`, name: 'Constitution Day', nameNo: 'Grunnlovsdagen' },
    { date: `${year}-12-25`, name: 'Christmas Day', nameNo: '1. juledag' },
    { date: `${year}-12-26`, name: "St. Stephen's Day", nameNo: '2. juledag' },

    // Easter-based holidays
    { date: toDateString(addDays(easter, -3)), name: 'Maundy Thursday', nameNo: 'Skjærtorsdag' },
    { date: toDateString(addDays(easter, -2)), name: 'Good Friday', nameNo: 'Langfredag' },
    { date: toDateString(easter), name: 'Easter Sunday', nameNo: '1. påskedag' },
    { date: toDateString(addDays(easter, 1)), name: 'Easter Monday', nameNo: '2. påskedag' },
    { date: toDateString(addDays(easter, 39)), name: 'Ascension Day', nameNo: 'Kristi himmelfartsdag' },
    { date: toDateString(addDays(easter, 49)), name: 'Whit Sunday', nameNo: '1. pinsedag' },
    { date: toDateString(addDays(easter, 50)), name: 'Whit Monday', nameNo: '2. pinsedag' },
  ]

  return holidays.sort((a, b) => a.date.localeCompare(b.date))
}

export function getHolidaysInRange(startDate: string, endDate: string): Holiday[] {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const years = new Set<number>()

  for (let y = start.getFullYear(); y <= end.getFullYear(); y++) {
    years.add(y)
  }

  const allHolidays: Holiday[] = []
  years.forEach((year) => allHolidays.push(...getNorwegianHolidays(year)))

  return allHolidays.filter((h) => h.date >= startDate && h.date <= endDate)
}

export function isHoliday(date: string, holidays: Holiday[]): Holiday | undefined {
  return holidays.find((h) => h.date === date)
}

export function isWeekend(dateStr: string): boolean {
  const date = new Date(dateStr)
  const day = date.getDay()
  return day === 0 || day === 6
}
