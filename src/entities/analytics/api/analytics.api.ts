import { supabase } from '@shared/lib/supabase'
import type { AnalyticsResult, AnalyticsResultV2, AnalyticsPeriod, AnalyticsPeriodV2 } from '../model/types'
import { periodToDateRange } from '../model/period'
import { periodGranularity, periodToDateRangeV2, previousPeriodRange } from '../model/period-v2'

export async function getAnalytics(period: AnalyticsPeriod): Promise<AnalyticsResult> {
  const { from, to } = periodToDateRange(period)
  const { data, error } = await supabase.rpc('get_analytics', { p_from: from, p_to: to })
  if (error) throw error
  return data as AnalyticsResult
}

/** The master's local IANA timezone — drives weekday/hour/bucket alignment server-side. */
function localTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

export async function getAnalyticsV2(period: AnalyticsPeriodV2): Promise<AnalyticsResultV2> {
  const { from, to } = periodToDateRangeV2(period)
  const { from: prevFrom, to: prevTo } = previousPeriodRange(period)
  const { data, error } = await supabase.rpc('get_analytics_v2', {
    p_from: from,
    p_to: to,
    p_prev_from: prevFrom,
    p_prev_to: prevTo,
    p_granularity: periodGranularity(period),
    p_tz: localTimeZone(),
  })
  if (error) throw error
  return data as AnalyticsResultV2
}
