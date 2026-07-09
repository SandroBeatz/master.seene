import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import type { Appointment } from '@entities/appointment'
import { formatsPlugin } from '@shared/lib/formats'
import en from '@shared/lib/i18n/locales/en'

const mocks = vi.hoisted(() => ({
  appointments: { value: [] as Appointment[] },
  timeBlocks: { value: [] as unknown[] },
  createTimeBlock:
    vi.fn<(dto: { start_at: string; end_at: string; all_day: boolean }) => Promise<unknown>>(),
}))

vi.mock('@entities/appointment', async () => {
  const busyIntervals = await vi.importActual<
    typeof import('@entities/appointment/model/busy-intervals')
  >('@entities/appointment/model/busy-intervals')
  return {
    useAppointmentsQuery: () => ({ data: mocks.appointments }),
    collectDayBusyIntervals: busyIntervals.collectDayBusyIntervals,
  }
})
vi.mock('@entities/time-block', () => ({
  useTimeBlocksQuery: () => ({ data: mocks.timeBlocks }),
  useCreateTimeBlockMutation: () => ({
    mutateAsync: mocks.createTimeBlock,
    isLoading: { value: false },
  }),
}))
vi.mock('@entities/session', () => ({
  useSessionStore: () => ({ session: { user: { id: 'u1' } } }),
}))
vi.mock('@entities/master', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@entities/master')>()),
  useMasterPreferencesStore: () => ({
    timeZone: 'UTC',
    calendarSlotStepMinutes: 15,
    preferences: { profile: { schedule: null } },
  }),
}))

import TimeOffWizard from '../TimeOffWizard.vue'

function appointment(over: Partial<Appointment>): Appointment {
  return {
    id: 'a1',
    user_id: 'u1',
    client_id: 'c1',
    service_ids: ['s1'],
    start_at: '2020-01-06T12:00:00Z',
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

function mountWizard() {
  const i18n = createI18n({
    legacy: false,
    locale: 'en',
    messages: { en },
    missingWarn: false,
    fallbackWarn: false,
  })
  return mount(TimeOffWizard, {
    // 2020-01-06 is a Monday → default window 10:00–19:00 in UTC.
    props: { prefill: { date: '2020-01-06' } },
    global: { plugins: [createPinia(), i18n, formatsPlugin], stubs: { UCalendar: true } },
  })
}

function createButton(wrapper: ReturnType<typeof mountWizard>) {
  return wrapper.findAll('button').find((b) => b.text() === en.quickCreate.timeOff.create)!
}

beforeEach(() => {
  mocks.appointments.value = []
  mocks.timeBlocks.value = []
  mocks.createTimeBlock.mockReset()
})

describe('TimeOffWizard branching', () => {
  it('branch A — free day: all-day switch + From/To, no warning', () => {
    const wrapper = mountWizard()
    expect(wrapper.text()).not.toContain(en.quickCreate.timeOff.hasAppointments)
    expect(wrapper.text()).toContain(en.timeBlocks.form.allDay)
    expect(wrapper.find('input[type="time"]').exists()).toBe(true)
    // No times entered yet → Create disabled.
    expect(createButton(wrapper).attributes('disabled')).toBeDefined()
  })

  it('branch B — busy day with gaps: warning + free intervals, Create enabled after pick', async () => {
    mocks.appointments.value = [appointment({ start_at: '2020-01-06T12:00:00Z', duration: 60 })]
    const wrapper = mountWizard()

    expect(wrapper.text()).toContain(en.quickCreate.timeOff.hasAppointments)
    // Free gaps around the 12:00–13:00 appointment.
    const gap = wrapper.findAll('button').find((b) => b.text() === '13:00 – 19:00')
    expect(gap).toBeTruthy()
    expect(createButton(wrapper).attributes('disabled')).toBeDefined()

    await gap!.trigger('click')
    expect(createButton(wrapper).attributes('disabled')).toBeUndefined()
  })

  it('branch C — fully booked: message + Create disabled', () => {
    // One appointment spanning the whole 10:00–19:00 window.
    mocks.appointments.value = [appointment({ start_at: '2020-01-06T10:00:00Z', duration: 540 })]
    const wrapper = mountWizard()

    expect(wrapper.text()).toContain(en.quickCreate.timeOff.noFreeTime)
    expect(createButton(wrapper).attributes('disabled')).toBeDefined()
  })

  it('creates a time_block with the picked interval', async () => {
    mocks.appointments.value = [appointment({ start_at: '2020-01-06T12:00:00Z', duration: 60 })]
    mocks.createTimeBlock.mockResolvedValue({})
    const wrapper = mountWizard()

    await wrapper
      .findAll('button')
      .find((b) => b.text() === '13:00 – 19:00')!
      .trigger('click')
    await createButton(wrapper).trigger('click')

    expect(mocks.createTimeBlock).toHaveBeenCalledTimes(1)
    const dto = mocks.createTimeBlock.mock.calls[0]![0]
    expect(dto.all_day).toBe(false)
    expect(dto.start_at).toBe('2020-01-06T13:00:00.000Z')
    expect(dto.end_at).toBe('2020-01-06T19:00:00.000Z')
  })
})
