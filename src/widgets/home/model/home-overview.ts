import { periodToDateRangeV2 } from '@entities/analytics/model/period-v2'
import type { AnalyticsPeriodV2 } from '@entities/analytics/model/types'
import type { Formats } from '@shared/lib/formats'

export type HomeOverviewPeriod = 'day' | 'week' | 'month'

export const HOME_OVERVIEW_PERIODS: readonly HomeOverviewPeriod[] = ['day', 'week', 'month']

export function toLocalISODate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`
}

export function createHomeOverviewPeriod(
  kind: HomeOverviewPeriod,
  anchorDate: Date,
): AnalyticsPeriodV2 {
  return { kind, date: toLocalISODate(anchorDate) }
}

export function formatHomeOverviewPeriodLabel(
  kind: HomeOverviewPeriod,
  anchorDate: Date,
  formats: Pick<Formats, 'weekdayDate' | 'weekdayDateShort' | 'monthName'>,
): string {
  if (kind === 'day') return formats.weekdayDate(anchorDate)
  if (kind === 'month') return formats.monthName(anchorDate)

  const range = periodToDateRangeV2(createHomeOverviewPeriod('week', anchorDate))
  return `${formats.weekdayDateShort(range.from)} – ${formats.weekdayDateShort(range.to)}`
}
