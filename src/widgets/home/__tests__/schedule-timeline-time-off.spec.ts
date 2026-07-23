import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import type { Appointment } from '@entities/appointment'
import type { Client } from '@entities/client'
import type { Service } from '@entities/service'
import type { TimeBlock } from '@entities/time-block'
import { formatsPlugin } from '@shared/lib/formats'
import ScheduleTimeline from '../ui/shared/ScheduleTimeline.vue'

const CLIENTS: Client[] = [{ id: 'c1', first_name: 'Анна', last_name: 'Петрова' } as Client]
const PAST_DATE = new Date(2020, 0, 6) // Mon 2020-01-06 (never "today")

function makeAppointment(over: Partial<Appointment> = {}): Appointment {
  return {
    id: 'a1',
    user_id: 'u1',
    client_id: 'c1',
    service_ids: [],
    start_at: new Date(2020, 0, 6, 9, 0, 0).toISOString(),
    duration: 60,
    price: null,
    status: 'confirmed',
    source: 'manual',
    notes: null,
    created_at: '',
    updated_at: '',
    ...over,
  }
}

function makeTimeBlock(over: Partial<TimeBlock> = {}): TimeBlock {
  return {
    id: 'tb1',
    user_id: 'u1',
    start_at: new Date(2020, 0, 6, 13, 0, 0).toISOString(),
    end_at: new Date(2020, 0, 6, 14, 0, 0).toISOString(),
    all_day: false,
    notes: null,
    created_at: '',
    updated_at: '',
    ...over,
  }
}

function mountTimeline(appointments: Appointment[], timeBlocks: TimeBlock[]) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const i18n = createI18n({ legacy: false, locale: 'en', missingWarn: false, fallbackWarn: false })
  return mount(ScheduleTimeline, {
    props: {
      appointments,
      timeBlocks,
      clients: CLIENTS,
      services: [] as Service[],
      loading: false,
      selectedDate: PAST_DATE,
    },
    global: { plugins: [pinia, i18n, formatsPlugin] },
  })
}

describe('ScheduleTimeline time off', () => {
  it('renders a timed time-off block with its label', () => {
    const wrapper = mountTimeline([makeAppointment()], [makeTimeBlock({ notes: 'Lunch' })])
    const block = wrapper.find('[data-testid="time-off-block"]')
    expect(block.exists()).toBe(true)
    expect(block.text()).toContain('Lunch')
  })

  it('renders an all-day time off as a banner, not a timed block', () => {
    const wrapper = mountTimeline(
      [makeAppointment()],
      [makeTimeBlock({ id: 'tb-ad', all_day: true, notes: 'Vacation' })],
    )
    expect(wrapper.find('[data-testid="time-off-block"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Vacation')
  })

  it('shows the schedule (not the empty state) for a day with only time off', () => {
    const wrapper = mountTimeline([], [makeTimeBlock({ notes: 'Break' })])
    expect(wrapper.find('[data-testid="time-off-block"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="appointment-block"]').exists()).toBe(false)
  })
})
