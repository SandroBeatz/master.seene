import { useQuery } from '@pinia/colada'
import type { Ref } from 'vue'
import type { AnalyticsPeriod, AnalyticsPeriodV2 } from './types'
import { getAnalytics, getAnalyticsV2 } from '../api/analytics.api'

export const useAnalyticsQuery = (period: Ref<AnalyticsPeriod>) =>
  useQuery({
    key: () => ['analytics', period.value],
    query: () => getAnalytics(period.value),
  })

/** Stable cache-key fragment for a V2 period (custom ranges vary by from/to). */
function periodKey(period: AnalyticsPeriodV2): string {
  return typeof period === 'string' ? period : `custom:${period.range.from}:${period.range.to}`
}

export const useAnalyticsQueryV2 = (period: Ref<AnalyticsPeriodV2>) =>
  useQuery({
    key: () => ['analytics-v2', periodKey(period.value)],
    query: () => getAnalyticsV2(period.value),
  })
