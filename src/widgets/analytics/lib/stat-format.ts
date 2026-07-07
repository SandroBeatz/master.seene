export type TranslateFn = (key: string, named?: Record<string, unknown>) => string

/**
 * Percentage change vs the previous period, rounded to an integer.
 * `null` when there's no baseline (previous = 0) — the card shows a
 * neutral "new" badge instead of an infinite delta.
 */
export function deltaPct(current: number, previous: number): number | null {
  if (previous === 0) return null
  return Math.round(((current - previous) / previous) * 100)
}

/**
 * Localized "Xh Ym" label for the Hours worked card. Relies on the i18n
 * keys `analytics.hoursUnit` ("h") and `analytics.minutesUnit` ("min"):
 *
 *  - `0`               → "0 h"
 *  - multiple of `60`  → "8 h"
 *  - otherwise         → "7 h 30 min"
 */
export function workingHoursLabel(minutes: number, t: TranslateFn): string {
  if (minutes === 0) return `0 ${t('analytics.hoursUnit')}`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (m === 0) return `${h} ${t('analytics.hoursUnit')}`
  return `${h} ${t('analytics.hoursUnit')} ${m} ${t('analytics.minutesUnit')}`
}
