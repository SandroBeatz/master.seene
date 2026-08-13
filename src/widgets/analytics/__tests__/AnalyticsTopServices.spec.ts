import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { createPinia, setActivePinia } from 'pinia'
import type { TopServiceV2 } from '@entities/analytics'
import { formatsPlugin } from '@shared/lib/formats'
import AnalyticsTopServices from '../ui/AnalyticsTopServices.vue'

const SERVICES: TopServiceV2[] = [
  { name: 'Haircut', revenue: 12000, percentage: 60, count: 8, color: '#ff0000' },
  { name: 'Coloring', revenue: 8000, percentage: 40, count: 3, color: '#00ff00' },
]

function mountWidget(services: TopServiceV2[], loading = false) {
  const i18n = createI18n({
    legacy: false,
    locale: 'en',
    missingWarn: false,
    fallbackWarn: false,
    messages: {
      en: {
        analytics: {
          noTopServices: 'No data for this period',
          serviceAppointments: '{count} appointments',
        },
      },
    },
  })

  const pinia = createPinia()
  setActivePinia(pinia)

  return mount(AnalyticsTopServices, {
    props: { services, loading },
    global: { plugins: [pinia, i18n, formatsPlugin] },
  })
}

describe('AnalyticsTopServices', () => {
  it('renders ranked rows with name, revenue, share and count', () => {
    const wrapper = mountWidget(SERVICES)
    const rows = wrapper.findAll('li')
    expect(rows).toHaveLength(2)

    const first = rows[0]!.text()
    expect(first).toContain('1')
    expect(first).toContain('Haircut')
    expect(first).toContain('12,000')
    expect(first).toContain('60%')
    expect(first).toContain('8 appointments')

    expect(rows[1]!.text()).toContain('Coloring')
  })

  it('paints each progress bar with the service colour and share width', () => {
    const wrapper = mountWidget(SERVICES)
    const bars = wrapper.findAll('.rounded-full > div')
    expect(bars).toHaveLength(2)

    const style = bars[0]!.attributes('style') ?? ''
    expect(style).toContain('width: 60%')
    // jsdom normalises #ff0000 → rgb(255, 0, 0)
    expect(style).toContain('rgb(255, 0, 0)')
    expect(bars[1]!.attributes('style')).toContain('rgb(0, 255, 0)')
  })

  it('shows the empty state when there are no services', () => {
    const wrapper = mountWidget([])
    expect(wrapper.text()).toContain('No data for this period')
    expect(wrapper.findAll('li')).toHaveLength(0)
  })

  it('loading → skeleton rows, no empty state', () => {
    const wrapper = mountWidget([], true)
    expect(wrapper.text()).not.toContain('No data for this period')
    expect(wrapper.findAll('[class*="animate-pulse"]').length).toBeGreaterThan(0)
  })
})
