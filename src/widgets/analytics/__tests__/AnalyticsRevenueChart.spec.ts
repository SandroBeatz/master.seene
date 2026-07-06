import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import type { ChartData } from 'chart.js'
import type { RevenuePoint } from '@entities/analytics'
import { formatsPlugin } from '@shared/lib/formats'
import AnalyticsRevenueChart from '../ui/AnalyticsRevenueChart.vue'
import { MOCK_THEME } from './chart-mock'

vi.mock('@shared/ui/chart', () => import('./chart-mock'))

const SERIES: RevenuePoint[] = [
  { bucket: '2026-05-11T00:00:00.000Z', label: 'Mon', current: 1000, previous: 800 },
  { bucket: '2026-05-12T00:00:00.000Z', label: 'Tue', current: 0, previous: 1200 },
  { bucket: '2026-05-13T00:00:00.000Z', label: 'Wed', current: 2500, previous: 0 },
]

function mountWidget(over: { compare?: boolean; loading?: boolean } = {}) {
  const i18n = createI18n({
    legacy: false,
    locale: 'en',
    missingWarn: false,
    fallbackWarn: false,
    messages: {
      en: {
        analytics: {
          revenue: { title: 'Revenue over time', thisPeriod: 'This period', previous: 'Previous' },
        },
      },
    },
  })

  return mount(AnalyticsRevenueChart, {
    props: {
      series: SERIES,
      earned: 3500,
      periodLabel: 'May 11 – May 17',
      compare: over.compare ?? false,
      loading: over.loading ?? false,
    },
    global: { plugins: [i18n, formatsPlugin] },
  })
}

function chartData(wrapper: ReturnType<typeof mountWidget>): ChartData<'bar'> {
  return wrapper.getComponent({ name: 'BaseBarChart' }).props('data')
}

describe('AnalyticsRevenueChart', () => {
  it('maps bucket labels and current values into the primary dataset', () => {
    const data = chartData(mountWidget())
    expect(data.labels).toEqual(['Mon', 'Tue', 'Wed'])
    expect(data.datasets).toHaveLength(1)
    expect(data.datasets[0]!.data).toEqual([1000, 0, 2500])
    expect(data.datasets[0]!.backgroundColor).toBe(MOCK_THEME.primary)
  })

  it('compare on → adds the previous-period dataset', () => {
    const data = chartData(mountWidget({ compare: true }))
    expect(data.datasets).toHaveLength(2)
    expect(data.datasets[1]!.data).toEqual([800, 1200, 0])
    expect(data.datasets[1]!.backgroundColor).toBe(MOCK_THEME.neutralSoft)
  })

  it('shows the earned total and the period caption', () => {
    const text = mountWidget().text()
    expect(text).toContain('3,500')
    expect(text).toContain('May 11 – May 17')
  })

  it('legend shows the previous-period chip only when comparing', () => {
    expect(mountWidget({ compare: false }).text()).not.toContain('Previous')
    expect(mountWidget({ compare: true }).text()).toContain('Previous')
  })

  it('loading → skeletons instead of the chart and the total', () => {
    const wrapper = mountWidget({ loading: true })
    expect(wrapper.find('[data-chart-stub]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('3,500')
    expect(wrapper.findAll('[class*="animate-pulse"]').length).toBeGreaterThan(0)
  })
})
