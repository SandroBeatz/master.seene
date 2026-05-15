import type { AnalyticsPeriod } from './types'

export function periodToDateRange(
  period: AnalyticsPeriod,
  now = new Date(),
): { from: string; to: string } {
  const y = now.getFullYear()
  const mo = now.getMonth()
  const d = now.getDate()

  let from: Date
  let to: Date

  if (period === 'today') {
    from = new Date(y, mo, d, 0, 0, 0, 0)
    to = new Date(y, mo, d, 23, 59, 59, 999)
  } else if (period === 'week') {
    const day = now.getDay() // 0 = Sun, 1 = Mon, …, 6 = Sat
    const toMonday = day === 0 ? -6 : 1 - day
    from = new Date(y, mo, d + toMonday, 0, 0, 0, 0)
    to = new Date(y, mo, d + toMonday + 6, 23, 59, 59, 999)
  } else {
    // month
    from = new Date(y, mo, 1, 0, 0, 0, 0)
    to = new Date(y, mo + 1, 0, 23, 59, 59, 999) // day 0 of next month = last day of this month
  }

  return { from: from.toISOString(), to: to.toISOString() }
}
