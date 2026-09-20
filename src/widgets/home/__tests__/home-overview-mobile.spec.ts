import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { ref, type Ref } from 'vue'
import { createI18n } from 'vue-i18n'
import type { AnalyticsPeriodV2, AnalyticsResultV2 } from '@entities/analytics/model/types'
import { formatsPlugin } from '@shared/lib/formats'
import en from '@shared/lib/i18n/locales/en'
import HomeOverviewMobile from '../ui-mobile/HomeOverviewMobile.vue'

const analyticsMock = vi.hoisted(() => ({
  period: null as Readonly<Ref<AnalyticsPeriodV2>> | null,
  result: null as Record<string, unknown> | null,
}))

vi.mock('@entities/analytics', () => ({
  useAnalyticsQueryV2: (period: Readonly<Ref<AnalyticsPeriodV2>>) => {
    analyticsMock.period = period
    return analyticsMock.result
  },
}))

const passthroughStub = { template: '<div><slot /></div>' }
const stubs = {
  IonButton: { template: '<button><slot /><slot name="end" /></button>' },
  IonCard: { template: '<section><slot /></section>' },
  IonCardContent: passthroughStub,
  IonContent: passthroughStub,
  IonIcon: { template: '<span class="ion-icon-stub" />' },
  IonItem: { template: '<button class="ion-item-stub"><slot /><slot name="end" /></button>' },
  IonLabel: { template: '<span><slot /></span>' },
  IonList: passthroughStub,
  IonListHeader: { template: '<h3><slot /></h3>' },
  IonModal: {
    props: ['isOpen'],
    template: '<div v-if="isOpen" class="ion-modal-stub"><slot /></div>',
  },
  IonSkeletonText: { template: '<span class="ion-skeleton-text-stub" />' },
}

function analyticsData(overrides: Partial<AnalyticsResultV2['current']> = {}): AnalyticsResultV2 {
  const current = {
    earned: 1234.5,
    appointments_count: 7,
    clients_served: 4,
    working_minutes: 90,
    avg_check: null,
    ...overrides,
  }
  return { current, previous: current, revenue_series: [] }
}

function mountWidget(
  options: {
    data?: AnalyticsResultV2
    loading?: boolean
    error?: Error
    currency?: 'USD' | 'KGS'
  } = {},
) {
  const refetch = vi.fn<() => void>()
  analyticsMock.result = {
    data: ref(options.data),
    isPending: ref(options.loading ?? false),
    isPlaceholderData: ref(false),
    error: ref(options.error ?? null),
    refetch,
  }

  const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })
  const wrapper = mount(HomeOverviewMobile, {
    global: {
      plugins: [
        i18n,
        [formatsPlugin, { getCurrency: () => options.currency ?? 'USD', getLocale: () => 'en' }],
      ],
      stubs,
    },
  })

  return { wrapper, refetch }
}

describe('HomeOverviewMobile', () => {
  let wrapper: VueWrapper | undefined

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 8, 12))
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    analyticsMock.period = null
    analyticsMock.result = null
    vi.useRealTimers()
  })

  it('selects today by default and renders all three real metrics', () => {
    ;({ wrapper } = mountWidget({ data: analyticsData() }))

    expect(analyticsMock.period?.value).toEqual({ kind: 'day', date: '2026-06-08' })
    expect(wrapper.text()).toContain('Monday Jun 8')
    expect(wrapper.text()).toContain('Today')
    expect(wrapper.text()).toContain('$ 1,234.50')
    expect(wrapper.text()).toContain('7')
    expect(wrapper.text()).toContain('1 h 30 min')
  })

  it('opens the Ionic period sheet and switches the query to week and month', async () => {
    ;({ wrapper } = mountWidget({ data: analyticsData() }))

    await wrapper
      .findAll('button')
      .find((button) => button.text().includes('Today'))
      ?.trigger('click')
    const week = wrapper.findAll('.ion-item-stub').find((item) => item.text() === 'This week')
    expect(week).toBeTruthy()

    await week?.trigger('click')
    expect(analyticsMock.period?.value).toEqual({ kind: 'week', date: '2026-06-08' })
    expect(wrapper.text()).toContain('Mon Jun 8 – Sun Jun 14')

    await wrapper
      .findAll('button')
      .find((button) => button.text().includes('This week'))
      ?.trigger('click')
    const month = wrapper.findAll('.ion-item-stub').find((item) => item.text() === 'This month')
    await month?.trigger('click')

    expect(analyticsMock.period?.value).toEqual({ kind: 'month', date: '2026-06-08' })
    expect(wrapper.text()).toContain('June')
  })

  it('renders zero values and respects a suffix currency', () => {
    ;({ wrapper } = mountWidget({
      data: analyticsData({ earned: 0, appointments_count: 0, working_minutes: 0 }),
      currency: 'KGS',
    }))

    expect(wrapper.text()).toContain('0 сом')
    expect(wrapper.text()).toContain('0 h')
  })

  it('keeps the metric layout while the first request is loading', () => {
    ;({ wrapper } = mountWidget({ loading: true }))

    expect(wrapper.findAll('.metric-card')).toHaveLength(3)
    expect(wrapper.findAll('.ion-skeleton-text-stub')).toHaveLength(3)
  })

  it('shows a compact retry state when the initial request fails', async () => {
    const mounted = mountWidget({ error: new Error('network') })
    wrapper = mounted.wrapper

    expect(wrapper.text()).toContain('Couldn’t load analytics')
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Try again')
      ?.trigger('click')
    expect(mounted.refetch).toHaveBeenCalledOnce()
  })
})
