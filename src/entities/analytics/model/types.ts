export type AnalyticsPeriod = 'today' | 'week' | 'month'

export interface TopService {
  name: string
  revenue: number
  percentage: number
}

export interface AnalyticsResult {
  earned: number
  completed_count: number
  working_minutes: number
  avg_check: number | null
  top_services: TopService[]
}
