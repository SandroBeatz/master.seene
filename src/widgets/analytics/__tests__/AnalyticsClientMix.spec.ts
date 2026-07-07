import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import type { ChartData } from 'chart.js'
import type { ClientMix } from '@entities/analytics'
import AnalyticsClientMix from '../ui/AnalyticsClientMix.vue'
import { MOCK_THEME } from './chart-mock'

vi.mock('@shared/ui/chart', () => import('./chart-mock'))

function mountWidget(mix: ClientMix, loading = false) {
  const i18n = createI18n({
    legacy: false,
    locale: 'en',
    missingWarn: false,
    fallbackWarn: false,
    messages: {
      en: {
        analytics: {
          clientMix: { returning: 'Returning', new: 'New' },
        },
      },
    },
  })

  return mount(AnalyticsClientMix, {
    props: { mix, loading },
    global: { plugins: [i18n] },
  })
}

function chartData(wrapper: ReturnType<typeof mountWidget>): ChartData<'doughnut'> {
  return wrapper.getComponent({ name: 'BaseDoughnutChart' }).props('data')
}

describe('AnalyticsClientMix', () => {
  it('shows the returning share in the doughnut centre', () => {
    const wrapper = mountWidget({ new: 2, returning: 6, total: 8 })
    expect(wrapper.text()).toContain('75%')
  })

  it('renders legend counters for both segments', () => {
    const wrapper = mountWidget({ new: 2, returning: 6, total: 8 })
    const items = wrapper.findAll('li')
    expect(items).toHaveLength(2)
    expect(items[0]!.text()).toContain('Returning')
    expect(items[0]!.text()).toContain('6')
    expect(items[1]!.text()).toContain('New')
    expect(items[1]!.text()).toContain('2')
  })

  it('maps [returning, new] into the doughnut dataset with theme colours', () => {
    const data = chartData(mountWidget({ new: 2, returning: 6, total: 8 }))
    expect(data.datasets[0]!.data).toEqual([6, 2])
    expect(data.datasets[0]!.backgroundColor).toEqual([MOCK_THEME.primary, MOCK_THEME.neutral])
  })

  it('empty mix → 0% centre and a single muted placeholder slice', () => {
    const wrapper = mountWidget({ new: 0, returning: 0, total: 0 })
    expect(wrapper.text()).toContain('0%')

    const data = chartData(wrapper)
    expect(data.datasets[0]!.data).toEqual([1])
    expect(data.datasets[0]!.backgroundColor).toEqual([MOCK_THEME.muted])
  })

  it('loading → skeletons instead of the chart', () => {
    const wrapper = mountWidget({ new: 2, returning: 6, total: 8 }, true)
    expect(wrapper.find('[data-chart-stub]').exists()).toBe(false)
    expect(wrapper.findAll('[class*="animate-pulse"]').length).toBeGreaterThan(0)
  })
})
