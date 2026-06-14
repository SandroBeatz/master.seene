import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import type { Appointment } from '@entities/appointment'
import type { Client } from '@entities/client'
import type { Service } from '@entities/service'
import { formatsPlugin } from '@shared/lib/formats'
import ScheduleTimeline from '../ui/ScheduleTimeline.vue'

const SERVICES: Service[] = [
  makeService('s1', 'Стрижка', '#ff0000'),
  makeService('s2', 'Окрашивание', '#00ff00'),
]

const CLIENTS: Client[] = [
  { id: 'c1', first_name: 'Анна', last_name: 'Петрова' } as Client,
]

// A weekday far in the past so "now line" logic never interferes.
const PAST_DATE = new Date(2020, 0, 6) // Mon 2020-01-06

function makeService(id: string, name: string, color: string): Service {
  return {
    id,
    user_id: 'u1',
    category_id: null,
    name,
    description: null,
    duration: 60,
    price: 1000,
    color,
    is_active: true,
    sort_order: 0,
    created_at: '',
    updated_at: '',
  }
}

function makeAppointment(over: Partial<Appointment>): Appointment {
  return {
    id: 'a1',
    user_id: 'u1',
    client_id: 'c1',
    service_ids: ['s1'],
    start_at: '2020-01-06T09:00:00.000Z',
    duration: 60,
    price: 1500,
    status: 'confirmed',
    source: 'manual',
    notes: null,
    created_at: '',
    updated_at: '',
    ...over,
  }
}

function mountTimeline(appointments: Appointment[]) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const i18n = createI18n({ legacy: false, locale: 'en', missingWarn: false, fallbackWarn: false })

  return mount(ScheduleTimeline, {
    props: {
      appointments,
      clients: CLIENTS,
      services: SERVICES,
      loading: false,
      selectedDate: PAST_DATE,
    },
    // Nuxt UI components are auto-imported inside the SFC, so they render for
    // real in jsdom (name-based stubs would not apply anyway).
    global: {
      plugins: [pinia, i18n, formatsPlugin],
    },
  })
}

describe('ScheduleTimeline card', () => {
  it('renders a single-service appointment with the service-colored left border', () => {
    const wrapper = mountTimeline([makeAppointment({ service_ids: ['s1'] })])
    const block = wrapper.get('[data-testid="appointment-block"]')

    // Single → colored left stripe, not the neutral group background.
    expect(block.classes()).toContain('border-l-4')
    expect(block.classes()).not.toContain('bg-elevated')
    const style = block.attributes('style') ?? ''
    expect(style).toContain('border-left-color')
    // jsdom normalises #ff0000 → rgb(255, 0, 0)
    expect(style).toContain('rgb(255, 0, 0)')
    // No service dots on a single card.
    expect(block.findAll('li')).toHaveLength(0)
  })

  it('renders a group appointment with a neutral card and one dot per service', () => {
    const wrapper = mountTimeline([makeAppointment({ service_ids: ['s1', 's2'] })])
    const block = wrapper.get('[data-testid="appointment-block"]')

    // Group → neutral background, no service-colored stripe.
    expect(block.classes()).toContain('bg-elevated')
    expect(block.classes()).not.toContain('border-l-4')

    const dots = block.findAll('li')
    expect(dots).toHaveLength(2)
    expect(dots[0]!.get('span').attributes('style')).toContain('rgb(255, 0, 0)')
    expect(dots[1]!.get('span').attributes('style')).toContain('rgb(0, 255, 0)')
  })

  it('renders a status icon and shows the price, hiding it when null', () => {
    const withPrice = mountTimeline([makeAppointment({ status: 'confirmed', price: 1500 })])
    const block = withPrice.get('[data-testid="appointment-block"]')
    // The status icon (UIcon → svg) is present; its identity is covered by the
    // getAppointmentStatusIcon unit test.
    expect(block.findAll('svg').length).toBeGreaterThanOrEqual(1)
    expect(block.text()).toContain('1,500')

    const noPrice = mountTimeline([makeAppointment({ price: null })])
    expect(noPrice.get('[data-testid="appointment-block"]').text()).not.toContain('1,500')
  })

  it('filters out non-active statuses (cancelled / no_show / expired)', () => {
    const wrapper = mountTimeline([
      makeAppointment({ id: 'a1', status: 'cancelled' }),
      makeAppointment({ id: 'a2', status: 'confirmed' }),
    ])
    expect(wrapper.findAll('[data-testid="appointment-block"]')).toHaveLength(1)
  })
})
