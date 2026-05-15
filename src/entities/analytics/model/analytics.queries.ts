import { useQuery } from '@pinia/colada'
import type { Ref } from 'vue'
import type { AnalyticsPeriod } from './types'
import { getAnalytics } from '../api/analytics.api'

export const useAnalyticsQuery = (period: Ref<AnalyticsPeriod>) =>
  useQuery({
    key: () => ['analytics', period.value],
    query: () => getAnalytics(period.value),
  })
