import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { createPinia, setActivePinia } from 'pinia'
import type { AnalyticsResultV2 } from '@entities/analytics'
import { formatsPlugin } from '@shared/lib/formats'
import AnalyticsStatCards from '../ui/AnalyticsStatCards.vue'

const DATA: AnalyticsResultV2 = {
  current: {
    earned: 15000,
    appointments_count: 12,
    clients_served: 8,
    working_minutes: 150,
    avg_check: 1250,
  },
  previous: {
    earned: 10000,
    appointments_count: 16,
    clients_served: 8,
    working_minutes: 0,
    avg_check: 625,
  },
  revenue_series: [],
}

function mountCards(
  over: {
    data?: AnalyticsResultV2 | null
    loading?: boolean
    compare?: boolean
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
          hoursUnit: 'h',
          minutesUnit: 'min',
          deltaNew: 'new',
          avgCheckInline: 'avg check',
        },
      },
    },
  })

  const pinia = createPinia()
  setActivePinia(pinia)

  return mount(AnalyticsStatCards, {
    props: {
      data: over.data === undefined ? DATA : over.data,
      loading: over.loading ?? false,
      compare: over.compare ?? false,
      compareLabel: 'vs last month',
    },
    global: {
      plugins: [pinia, i18n, formatsPlugin],
    },
  })
}

describe('AnalyticsStatCards', () => {
  it('renders the four metric values', () => {
    const text = mountCards().text()
    expect(text).toContain('15,000') // total earned
    expect(text).toContain('8') // clients served
    expect(text).toContain('2 h 30 min') // 150 working minutes
    expect(text).toContain('12') // appointments
  })

  it('shows the average check as secondary text under Total earned', () => {
    // The formats lib joins symbol and amount with a non-breaking space.
    expect(mountCards().text()).toMatch(/avg check \$\s1,250/)
  })

  it('shows an em dash when avg_check is null', () => {
    const data: AnalyticsResultV2 = {
      ...DATA,
      current: { ...DATA.current, avg_check: null },
    }
    expect(mountCards({ data }).text()).toContain('avg check —')
  })

  it('compare off → no delta badges, secondary text stays', () => {
    const wrapper = mountCards({ compare: false })
    expect(wrapper.text()).not.toContain('%')
    expect(wrapper.text()).not.toContain('vs last month')
  })

  it('compare on → signed % badges per card and the comparison caption', () => {
    const text = mountCards({ compare: true }).text()
    expect(text).toContain('+50%') // earned 15000 vs 10000
    expect(text).toContain('0%') // clients 8 vs 8
    expect(text).toContain('-25%') // appointments 12 vs 16
    expect(text).toContain('vs last month')
  })

  it('compare on with previous = 0 → neutral "new" badge instead of a delta', () => {
    // working_minutes: 150 vs 0 → no baseline
    expect(mountCards({ compare: true }).text()).toContain('new')
  })

  it('loading → skeletons instead of values, no delta badges', () => {
    const wrapper = mountCards({ loading: true, compare: true })
    expect(wrapper.text()).not.toContain('15,000')
    expect(wrapper.text()).not.toContain('%')
    expect(wrapper.findAll('[class*="animate-pulse"]').length).toBeGreaterThan(0)
  })

  it('renders zeros when data is null', () => {
    const wrapper = mountCards({ data: null })
    expect(wrapper.text()).toContain('0 h')
  })
})
