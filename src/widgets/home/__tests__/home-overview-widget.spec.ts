import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import { formatsPlugin } from '@shared/lib/formats'
import en from '@shared/lib/i18n/locales/en'
import HomeOverviewWidget from '../ui/HomeOverviewWidget.vue'

vi.mock('@entities/analytics', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@entities/analytics')>()),
  useAnalyticsQueryV2: () => ({
    data: {
      value: {
        current: { earned: 0, appointments_count: 0, clients_served: 0, working_minutes: 0, avg_check: null },
      },
    },
    isPending: { value: false },
  }),
}))

function mountWidget() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const i18n = createI18n({ legacy: false, locale: 'en', missingWarn: false, messages: { en } })
  return mount(HomeOverviewWidget, {
    global: { plugins: [pinia, i18n, formatsPlugin] },
  })
}

describe('HomeOverviewWidget — mobile header & period drawer', () => {
  let wrapper: VueWrapper

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 8, 12)) // Mon Jun 8 2026
  })

  afterEach(() => {
    // UDrawer teleports to document.body — unmount so it doesn't leak into the next test.
    wrapper?.unmount()
    vi.useRealTimers()
  })

  it('shows the day date as the mobile header by default, and the period button', () => {
    wrapper = mountWidget()

    expect(wrapper.text()).toContain('Monday Jun 8')
    expect(wrapper.findAll('button').some((b) => b.text() === 'Today')).toBe(true)
  })

  it('opens the drawer on tap and switches period, updating the mobile header', async () => {
    wrapper = mountWidget()

    const trigger = wrapper.findAll('button').find((b) => b.text() === 'Today')
    await trigger?.trigger('click')

    // UDrawer teleports its content to document.body.
    const weekOption = Array.from(document.body.querySelectorAll('button')).find(
      (b) => b.textContent === 'This week',
    )
    expect(weekOption).toBeTruthy()

    weekOption?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Mon Jun 8 - Sun Jun 14')
  })

  it('shows the month name for the month period', async () => {
    wrapper = mountWidget()
    const trigger = wrapper.findAll('button').find((b) => b.text() === 'Today')
    await trigger?.trigger('click')

    const monthOption = Array.from(document.body.querySelectorAll('button')).find(
      (b) => b.textContent === 'This month',
    )
    monthOption?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('June')
  })
})
