import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import type { Appointment } from '@entities/appointment'
import type { Client } from '@entities/client'
import type { Service } from '@entities/service'
import { formatsPlugin } from '@shared/lib/formats'
import ScheduleTimeline from '../ui/shared/ScheduleTimeline.vue'

const NOW = new Date(2026, 6, 23, 12, 0, 0) // Thu 2026-07-23 12:00 local
const PAST_DATE = new Date(2020, 0, 6) // Mon 2020-01-06

const SERVICES: Service[] = [
  {
    id: 's1',
    user_id: 'u1',
    category_id: null,
    name: 'Стрижка',
    description: null,
    duration: 60,
    price: 1000,
    color: '#ff0000',
    is_active: true,
    sort_order: 0,
    created_at: '',
    updated_at: '',
  },
]
const CLIENTS: Client[] = [{ id: 'c1', first_name: 'Анна', last_name: 'Петрова' } as Client]

function makeAppointment(over: Partial<Appointment> = {}): Appointment {
  return {
    id: 'a1',
    user_id: 'u1',
    client_id: 'c1',
    service_ids: ['s1'],
    start_at: new Date(2026, 6, 23, 10, 0, 0).toISOString(), // 10:00 local, same day as NOW
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

function mountTimeline(appointments: Appointment[], selectedDate: Date) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const i18n = createI18n({ legacy: false, locale: 'en', missingWarn: false, fallbackWarn: false })
  return mount(ScheduleTimeline, {
    props: { appointments, clients: CLIENTS, services: SERVICES, loading: false, selectedDate },
    global: { plugins: [pinia, i18n, formatsPlugin] },
  })
}

describe('ScheduleTimeline now-line', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows the green now-line with the current time for today when there are appointments', () => {
    const wrapper = mountTimeline([makeAppointment()], NOW)
    const line = wrapper.find('[data-testid="now-line"]')
    expect(line.exists()).toBe(true)
    // Live time chip reflects the current minute.
    expect(line.text()).toContain('12:00')
  })

  it('does not show the now-line on a day that is not today', () => {
    const wrapper = mountTimeline([makeAppointment({ start_at: '2020-01-06T10:00:00.000Z' })], PAST_DATE)
    expect(wrapper.find('[data-testid="now-line"]').exists()).toBe(false)
  })

  it('does not show the now-line on an empty day', () => {
    const wrapper = mountTimeline([], NOW)
    expect(wrapper.find('[data-testid="now-line"]').exists()).toBe(false)
  })
})
