// --- V2 period model -------------------------------------------------------

/**
 * Which unit the period filter is anchored to. `custom` is a free date range;
 * the rest carry an anchor date and resolve to that calendar unit around it.
 * Not to be confused with `AnalyticsGranularity` (the revenue-chart bucket size).
 */
export type AnalyticsPeriodKind = 'day' | 'week' | 'month' | 'year' | 'custom'

/** A user-picked custom range, expressed as local calendar dates (YYYY-MM-DD). */
export interface AnalyticsCustomRange {
  from: string
  to: string
}

/**
 * The selected period. Anchored kinds carry a `date` (YYYY-MM-DD) that lands
 * anywhere inside the unit — the day/week/month/year is derived from it. `custom`
 * carries an explicit [from, to] range.
 */
export type AnalyticsPeriodV2 =
  | { kind: 'day'; date: string }
  | { kind: 'week'; date: string }
  | { kind: 'month'; date: string }
  | { kind: 'year'; date: string }
  | { kind: 'custom'; range: AnalyticsCustomRange }

/** An anchored (non-custom) period. */
export type AnalyticsAnchoredKind = Exclude<AnalyticsPeriodKind, 'custom'>

/** Granularity used to bucket the revenue time-series for a period. */
export type AnalyticsGranularity = 'hour' | 'day' | 'week' | 'month'

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

/** Filter-driven blocks — follow the dashboard's global period filter. */
export interface AnalyticsResultV2 {
  current: AnalyticsMetrics
  previous: AnalyticsMetrics
  revenue_series: RevenuePoint[]
}

// --- Fixed-window widgets (get_analytics_widgets_v2 RPC) --------------------

/**
 * Rolling windows (in days) for the widgets that do NOT follow the global
 * date filter — short periods make them meaningless (top services over one
 * day is noise; repeat rate and weekday distribution need weeks of data).
 * 56 days = 8 full weeks, so every weekday is sampled exactly 8 times.
 */
export const ANALYTICS_WIDGET_WINDOWS = {
  topServicesDays: 30,
  clientMixDays: 90,
  busiestDaysDays: 56,
} as const

export interface AnalyticsWidgetsV2 {
  top_services: TopServiceV2[]
  client_mix: ClientMix
  /** 7 counts of completed appointments, Monday..Sunday (index 0 = Monday). */
  busiest_days: number[]
  /** Busiest hour-of-day window (local zone); null when no appointments. */
  peak_hour_from: number | null
  peak_hour_to: number | null
}
