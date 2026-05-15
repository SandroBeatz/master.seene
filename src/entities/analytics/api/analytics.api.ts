import { supabase } from '@shared/lib/supabase'
import type { AnalyticsResult, AnalyticsPeriod } from '../model/types'
import { periodToDateRange } from '../model/period'

export async function getAnalytics(period: AnalyticsPeriod): Promise<AnalyticsResult> {
  const { from, to } = periodToDateRange(period)
  const { data, error } = await supabase.rpc('get_analytics', { p_from: from, p_to: to })
  if (error) throw error
  return data as AnalyticsResult
}
