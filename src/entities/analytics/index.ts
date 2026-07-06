// V2 period model
export type {
  AnalyticsPeriodV2,
  AnalyticsPeriodPreset,
  AnalyticsCustomRange,
  AnalyticsGranularity,
} from './model/types'
export {
  periodToDateRangeV2,
  previousPeriodRange,
  periodGranularity,
  rollingWindowRange,
} from './model/period-v2'

// V2 result shape + data access
export type {
  AnalyticsResultV2,
  AnalyticsWidgetsV2,
  AnalyticsMetrics,
  TopServiceV2,
  ClientMix,
  RevenuePoint,
} from './model/types'
export { ANALYTICS_WIDGET_WINDOWS } from './model/types'
export { getAnalyticsV2, getAnalyticsWidgetsV2 } from './api/analytics.api'
export { useAnalyticsQueryV2, useAnalyticsWidgetsQueryV2 } from './model/analytics.queries'
