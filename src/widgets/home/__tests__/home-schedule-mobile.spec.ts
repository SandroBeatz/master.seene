import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import { createI18n } from 'vue-i18n'
import type { Appointment } from '@entities/appointment/model/types'
import type { Client } from '@entities/client/model/types'
import type { Service } from '@entities/service/model/types'
import type { TimeBlock } from '@entities/time-block/model/types'
import { formatsPlugin } from '@shared/lib/formats'
import en from '@shared/lib/i18n/locales/en'
import HomeScheduleMobile from '../ui-mobile/HomeScheduleMobile.vue'

const queryMock = vi.hoisted(() => ({
  appointments: null as Record<string, unknown> | null,
  timeBlocks: null as Record<string, unknown> | null,
  clients: null as Record<string, unknown> | null,
  services: null as Record<string, unknown> | null,
  now: new Date('2026-09-21T12:00:00.000Z'),
}))

vi.mock('@entities/appointment', () => ({
  useAppointmentsQuery: () => queryMock.appointments,
  getAppointmentAccentColor: (appointment: Appointment, services: Map<string, Service>) => {
    if (appointment.service_ids.length !== 1) return null
    return services.get(appointment.service_ids[0] ?? '')?.color ?? null
  },
  getEffectiveAppointmentStatus: (appointment: Appointment, now: Date) => {
    if (!['pending', 'confirmed'].includes(appointment.status)) return appointment.status

    const start = new Date(appointment.start_at).getTime()
    const end = start + appointment.duration * 60_000
    const current = now.getTime()
    if (current >= start && current < end) return 'ongoing'
    if (current >= end && appointment.status === 'confirmed') return 'past'
    return appointment.status
  },
  isGroupAppointment: (appointment: Appointment) => appointment.service_ids.length > 1,
}))

vi.mock('@entities/client', () => ({
  useClientsQuery: () => queryMock.clients,
}))

vi.mock('@entities/service', () => ({
  useServicesQuery: () => queryMock.services,
}))

vi.mock('@entities/time-block', () => ({
  useTimeBlocksQuery: () => queryMock.timeBlocks,
}))

vi.mock('@entities/master', () => ({
  useMasterPreferencesStore: () => ({
    timeZone: 'UTC',
    timeFormat: 24,
    preferences: {
      profile: {
        schedule: {
          days: {
            monday: { enabled: true, start: '09:00', end: '18:00', breaks: [] },
          },
        },
      },
    },
  }),
}))

vi.mock('@entities/session', () => ({
  useSessionStore: () => ({ session: { user: { id: 'user-1' } } }),
}))

vi.mock('@shared/lib/now', () => ({
  useNowMinute: () => ref(queryMock.now),
}))

function appointment(
  id: string,
  startAt: string,
  serviceIds: string[] = ['service-1'],
  overrides: Partial<Appointment> = {},
): Appointment {
  return {
    id,
    user_id: 'user-1',
    client_id: 'client-1',
    service_ids: serviceIds,
    start_at: startAt,
    duration: 60,
    price: 100,
    status: 'confirmed',
    source: 'manual',
    notes: null,
    created_at: '',
    updated_at: '',
    ...overrides,
  }
}

const client: Client = {
  id: 'client-1',
  user_id: 'user-1',
  phone: '+10000000000',
  first_name: 'Anna',
  last_name: 'Smith',
  email: null,
  birthday: null,
  notes: null,
  emoji: null,
  is_favorite: false,
  source: 'manual',
  created_at: '',
  updated_at: '',
}

function service(id: string, name: string, color: string): Service {
  return {
    id,
    user_id: 'user-1',
    category_id: null,
    name,
    description: null,
    duration: 60,
    price: 100,
    color,
    is_active: true,
    sort_order: 0,
    created_at: '',
    updated_at: '',
    category: null,
  }
}

function timeBlock(overrides: Partial<TimeBlock> = {}): TimeBlock {
  return {
    id: 'time-off-1',
    user_id: 'user-1',
    start_at: '2026-09-21T13:00:00.000Z',
    end_at: '2026-09-21T14:00:00.000Z',
    all_day: false,
    notes: 'Lunch',
    created_at: '',
    updated_at: '',
    ...overrides,
  }
}

function query<T>(data: T[], options: { loading?: boolean; error?: Error } = {}) {
  return {
    data: ref(data),
    isPending: ref(options.loading ?? false),
    error: ref(options.error ?? null),
    refetch: vi.fn<() => Promise<void>>(async () => undefined),
  }
}

function mountSchedule(
  options: {
    appointments?: Appointment[]
    timeBlocks?: TimeBlock[]
    loading?: boolean
    error?: Error
  } = {},
) {
  queryMock.appointments = query(options.appointments ?? [], {
    loading: options.loading,
    error: options.error,
  })
  queryMock.timeBlocks = query(options.timeBlocks ?? [], { loading: options.loading })
  queryMock.clients = query([client], { loading: options.loading })
  queryMock.services = query(
    [service('service-1', 'Haircut', '#ff0000'), service('service-2', 'Color', '#00ff00')],
    { loading: options.loading },
  )

  const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })
  return mount(HomeScheduleMobile, {
    global: {
      plugins: [i18n, [formatsPlugin, { getCurrency: () => 'USD', getLocale: () => 'en' }]],
      stubs: {
        IonButton: { template: '<button><slot /></button>' },
        IonCard: { template: '<section><slot /></section>' },
        IonIcon: { template: '<span class="ion-icon-stub" />' },
        IonItem: { template: '<button class="ion-item-stub"><slot /></button>' },
        IonLabel: { template: '<span><slot /></span>' },
        IonList: { template: '<div><slot /></div>' },
        IonPopover: {
          props: ['isOpen'],
          template: '<div v-if="isOpen" class="ion-popover-stub"><slot /></div>',
        },
        IonSkeletonText: { template: '<span class="ion-skeleton-stub" />' },
      },
    },
  })
}

describe('HomeScheduleMobile', () => {
  beforeEach(() => {
    queryMock.now = new Date('2026-09-21T12:00:00.000Z')
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders loading and empty states', () => {
    const loading = mountSchedule({ loading: true })
    expect(loading.findAll('.ion-skeleton-stub')).toHaveLength(3)

    const empty = mountSchedule()
    expect(empty.find('.schedule-empty').exists()).toBe(true)
    expect(empty.text()).toContain('No appointments for this day')
  })

  it('renders event-driven cards, a collapsed long gap, and the current-time line', () => {
    const wrapper = mountSchedule({
      appointments: [
        appointment('a1', '2026-09-21T09:00:00.000Z'),
        appointment('a2', '2026-09-21T14:00:00.000Z'),
      ],
    })

    expect(wrapper.findAll('.schedule-appointment')).toHaveLength(2)
    expect(wrapper.find('.timeline-gap').exists()).toBe(true)
    expect(wrapper.find('[data-testid="mobile-now-line"]').exists()).toBe(true)
  })

  it('renders multi-service dots and both timed and all-day time off', () => {
    const wrapper = mountSchedule({
      appointments: [appointment('a1', '2026-09-21T09:00:00.000Z', ['service-1', 'service-2'])],
      timeBlocks: [
        timeBlock(),
        timeBlock({
          id: 'all-day',
          all_day: true,
          start_at: '2026-09-21T00:00:00.000Z',
          end_at: '2026-09-22T00:00:00.000Z',
          notes: 'Vacation',
        }),
      ],
    })

    expect(wrapper.findAll('.schedule-appointment__services li')).toHaveLength(2)
    expect(wrapper.find('.timed-time-off').text()).toContain('Lunch')
    expect(wrapper.find('.all-day-time-off').text()).toContain('Vacation')
  })

  it('emits the selected appointment when a timeline card is tapped', async () => {
    const item = appointment('a1', '2026-09-21T09:00:00.000Z')
    const wrapper = mountSchedule({ appointments: [item] })

    await wrapper.find('.schedule-appointment').trigger('click')
    await flushPromises()

    expect(wrapper.emitted('select')?.[0]).toEqual([item])
  })

  it('opens the anchored action menu on hold and suppresses the following tap', async () => {
    vi.useFakeTimers()
    const item = appointment('a1', '2026-09-21T09:00:00.000Z')
    const wrapper = mountSchedule({ appointments: [item] })
    const card = wrapper.find('.schedule-appointment')

    await card.trigger('pointerdown')
    await vi.advanceTimersByTimeAsync(550)

    expect(card.classes()).toContain('schedule-appointment--active')
    expect(wrapper.find('.ion-popover-stub').exists()).toBe(true)

    await card.trigger('pointerup')
    await card.trigger('click')
    expect(wrapper.emitted('select')).toBeUndefined()

    await wrapper.findAll('.ion-item-stub')[1]?.trigger('click')
    expect(wrapper.emitted('action')?.[0]).toEqual([item, 'edit'])
  })

  it('shows a retry state for a core query failure', async () => {
    const wrapper = mountSchedule({ error: new Error('network') })
    expect(wrapper.text()).toContain('Couldn’t load the schedule')

    await wrapper.find('.schedule-error button').trigger('click')
    expect(queryMock.appointments?.refetch as ReturnType<typeof vi.fn>).toHaveBeenCalledOnce()
  })
})
