import { useQuery } from '@pinia/colada'
import type { Ref } from 'vue'
import type { AnalyticsPeriodV2 } from './types'
import { getAnalyticsV2, getAnalyticsWidgetsV2 } from '../api/analytics.api'

/** Stable cache-key fragment for a V2 period (anchor or custom range). */
function periodKey(period: AnalyticsPeriodV2): string {
  return period.kind === 'custom'
    ? `custom:${period.range.from}:${period.range.to}`
    : `${period.kind}:${period.date}`
}

export const useAnalyticsQueryV2 = (period: Ref<AnalyticsPeriodV2>) =>
  useQuery({
    key: () => ['analytics-v2', periodKey(period.value)],
    query: () => getAnalyticsV2(period.value),
    // Keep the previous period's data on screen while the new one loads —
    // skeletons only appear on the very first visit (isPending).
    placeholderData: (previousData) => previousData,
  })

/** Local calendar day, e.g. '2026-07-06' — the widgets' rolling windows move once a day. */
function localDayKey(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

/**
 * Fixed-window widgets (top services / client mix / busiest days). Keyed by
 * the local day only, so switching the dashboard period never refetches them.
 */
export const useAnalyticsWidgetsQueryV2 = () =>
  useQuery({
    key: () => ['analytics-widgets-v2', localDayKey()],
    query: () => getAnalyticsWidgetsV2(),
  })
