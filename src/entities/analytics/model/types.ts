export type AnalyticsPeriod = 'today' | 'week' | 'month'

// --- V2 period model -------------------------------------------------------
// Parallel to the V1 AnalyticsPeriod above. V1 stays until the Home page is
// migrated off it (task T11); new analytics code uses these types.

export type AnalyticsPeriodPreset =
  | 'today'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'

/** A user-picked custom range, expressed as local calendar dates (YYYY-MM-DD). */
export interface AnalyticsCustomRange {
  from: string
  to: string
}

export type AnalyticsPeriodV2 =
  | AnalyticsPeriodPreset
  | { kind: 'custom'; range: AnalyticsCustomRange }

/** Granularity used to bucket the revenue time-series for a period. */
export type AnalyticsGranularity = 'hour' | 'day' | 'week' | 'month'

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

// --- V2 result shape (get_analytics_v2 RPC) --------------------------------

/** Scalar metrics for a single period. Shared by `current` and `previous`. */
export interface AnalyticsMetrics {
  earned: number
  appointments_count: number
  clients_served: number
  working_minutes: number
  avg_check: number | null
}

export interface TopServiceV2 {
  name: string
  revenue: number
  /** Share of total earned, rounded to an integer percentage. */
  percentage: number
  /** Number of sale items (appointments) for this service in the period. */
  count: number
  /** Service colour at display time; falls back to a neutral grey server-side. */
  color: string
}

export interface ClientMix {
  new: number
  returning: number
  total: number
}

/** One bucket of the revenue time-series. */
export interface RevenuePoint {
  /** Bucket start, ISO timestamp (local-zone aligned). */
  bucket: string
  /** Pre-formatted bucket label from the server (e.g. "W24", "08:00", "05 Mar"). */
  label: string
  current: number
  previous: number
}

export interface AnalyticsResultV2 {
  current: AnalyticsMetrics
  previous: AnalyticsMetrics
  top_services: TopServiceV2[]
  client_mix: ClientMix
  /** 7 counts of completed appointments, Monday..Sunday (index 0 = Monday). */
  busiest_days: number[]
  /** Busiest hour-of-day window (local zone); null when no appointments. */
  peak_hour_from: number | null
  peak_hour_to: number | null
  revenue_series: RevenuePoint[]
}
