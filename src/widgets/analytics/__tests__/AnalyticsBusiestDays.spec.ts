import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import type { ChartData } from 'chart.js'
import { formatsPlugin } from '@shared/lib/formats'
import AnalyticsBusiestDays from '../ui/AnalyticsBusiestDays.vue'
import { MOCK_THEME } from './chart-mock'

vi.mock('@shared/ui/chart', () => import('./chart-mock'))

function mountWidget(
  over: {
    days?: number[]
    peakFrom?: number | null
    peakTo?: number | null
    loading?: boolean
  } = {},
) {
  const i18n = createI18n({
    legacy: false,
    locale: 'en',
    missingWarn: false,
    fallbackWarn: false,
    messages: {
      en: {
        analytics: {
          weekdaysShort: {
            mon: 'Mon',
            tue: 'Tue',
            wed: 'Wed',
            thu: 'Thu',
            fri: 'Fri',
            sat: 'Sat',
            sun: 'Sun',
          },
        },
      },
    },
  })

  return mount(AnalyticsBusiestDays, {
    props: {
      days: over.days ?? [2, 4, 1, 8, 5, 3, 0],
      peakFrom: over.peakFrom === undefined ? 10 : over.peakFrom,
      peakTo: over.peakTo === undefined ? 14 : over.peakTo,
      loading: over.loading ?? false,
    },
    global: { plugins: [i18n, formatsPlugin] },
  })
}

function chartData(wrapper: ReturnType<typeof mountWidget>): ChartData<'bar'> {
  return wrapper.getComponent({ name: 'BaseBarChart' }).props('data')
}

describe('AnalyticsBusiestDays', () => {
  it('highlights only the busiest day, the rest stay muted', () => {
    const data = chartData(mountWidget({ days: [2, 4, 1, 8, 5, 3, 0] }))
    const colors = data.datasets[0]!.backgroundColor as string[]
    expect(colors[3]).toBe(MOCK_THEME.highlight) // Thu = max
    expect(colors.filter((c) => c === MOCK_THEME.highlight)).toHaveLength(1)
    expect(colors[0]).toBe(MOCK_THEME.muted)
  })

  it('labels the bars Monday..Sunday and maps counts in order', () => {
    const data = chartData(mountWidget({ days: [2, 4, 1, 8, 5, 3, 0] }))
    expect(data.labels).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
    expect(data.datasets[0]!.data).toEqual([2, 4, 1, 8, 5, 3, 0])
  })

  it('all-zero week → no highlighted bar', () => {
    const data = chartData(mountWidget({ days: [0, 0, 0, 0, 0, 0, 0] }))
    const colors = data.datasets[0]!.backgroundColor as string[]
    expect(colors.every((c) => c === MOCK_THEME.muted)).toBe(true)
  })

  it('renders the peak-hours range in 24h format by default', () => {
    expect(mountWidget({ peakFrom: 10, peakTo: 14 }).text()).toContain('10:00 – 14:00')
  })

  it('shows an em dash when the peak hours are unknown', () => {
    const text = mountWidget({ peakFrom: null, peakTo: null }).text()
    expect(text).toContain('—')
    expect(text).not.toContain(':00')
  })

  it('loading → skeleton bars instead of the chart', () => {
    const wrapper = mountWidget({ loading: true })
    expect(wrapper.find('[data-chart-stub]').exists()).toBe(false)
    expect(wrapper.findAll('[class*="animate-pulse"]').length).toBeGreaterThan(0)
  })
})
