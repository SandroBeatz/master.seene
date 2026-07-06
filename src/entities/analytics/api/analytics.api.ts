import { supabase } from '@shared/lib/supabase'
import type { AnalyticsResultV2, AnalyticsPeriodV2, AnalyticsWidgetsV2 } from '../model/types'
import { ANALYTICS_WIDGET_WINDOWS } from '../model/types'
import {
  periodGranularity,
  periodToDateRangeV2,
  previousPeriodRange,
  rollingWindowRange,
} from '../model/period-v2'

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

/**
 * Fixed-window widget blocks (top services / client mix / busiest days).
 * Windows are rolling and independent of the dashboard's period filter.
 */
export async function getAnalyticsWidgetsV2(now = new Date()): Promise<AnalyticsWidgetsV2> {
  const top = rollingWindowRange(ANALYTICS_WIDGET_WINDOWS.topServicesDays, now)
  const mix = rollingWindowRange(ANALYTICS_WIDGET_WINDOWS.clientMixDays, now)
  const days = rollingWindowRange(ANALYTICS_WIDGET_WINDOWS.busiestDaysDays, now)
  const { data, error } = await supabase.rpc('get_analytics_widgets_v2', {
    p_top_from: top.from,
    p_top_to: top.to,
    p_mix_from: mix.from,
    p_mix_to: mix.to,
    p_days_from: days.from,
    p_days_to: days.to,
    p_tz: localTimeZone(),
  })
  if (error) throw error
  return data as AnalyticsWidgetsV2
}
