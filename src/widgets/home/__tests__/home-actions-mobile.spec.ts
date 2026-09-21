import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { ref } from 'vue'
import { createI18n } from 'vue-i18n'
import type { Appointment, AppointmentStatus } from '@entities/appointment/model/types'
import type { Client } from '@entities/client/model/types'
import type { Service } from '@entities/service/model/types'
import { formatsPlugin } from '@shared/lib/formats'
import en from '@shared/lib/i18n/locales/en'
import HomeActionsMobile from '../ui-mobile/HomeActionsMobile.vue'

const queryMock = vi.hoisted(() => ({
  appointments: null as Record<string, unknown> | null,
  clients: null as Record<string, unknown> | null,
  services: null as Record<string, unknown> | null,
}))

vi.mock('@entities/appointment', () => ({
  useActionableAppointmentsQuery: () => queryMock.appointments,
  getEffectiveAppointmentStatus: (appointment: Appointment, now: Date) => {
    const end = new Date(appointment.start_at).getTime() + appointment.duration * 60_000
    if (appointment.status === 'confirmed' && end <= now.getTime()) return 'past'
    return appointment.status
  },
}))

vi.mock('@entities/client', () => ({
  useClientsQuery: () => queryMock.clients,
}))

vi.mock('@entities/service', () => ({
  useServicesQuery: () => queryMock.services,
}))

vi.mock('@entities/session', () => ({
  useSessionStore: () => ({ session: { user: { id: 'user-1' } } }),
}))

vi.mock('@shared/lib/now', () => ({
  useNowMinute: () => ref(new Date('2026-06-08T12:00:00.000Z')),
}))

const passthrough = { template: '<div><slot /></div>' }
const stubs = {
  IonAvatar: { template: '<div class="ion-avatar-stub"><slot /></div>' },
  IonBadge: { template: '<span class="ion-badge-stub"><slot /></span>' },
  IonButton: {
    props: ['color'],
    template:
      '<button :data-color="color"><slot name="start" /><slot /><slot name="icon-only" /></button>',
  },
  IonButtons: passthrough,
  IonCard: { template: '<section><slot /></section>' },
  IonContent: passthrough,
  IonHeader: passthrough,
  IonIcon: { template: '<span class="ion-icon-stub" />' },
  IonModal: {
    props: ['isOpen'],
    template: '<div v-if="isOpen" class="ion-modal-stub"><slot /></div>',
  },
  IonSkeletonText: { template: '<span class="ion-skeleton-stub" />' },
  IonSpinner: passthrough,
  IonTitle: passthrough,
  IonToolbar: passthrough,
}

function appointment(
  id: string,
  startAt: string,
  status: AppointmentStatus,
  overrides: Partial<Appointment> = {},
): Appointment {
  return {
    id,
    user_id: 'user-1',
    client_id: `client-${id}`,
    service_ids: [`service-${id}`],
    start_at: startAt,
    duration: 60,
    price: 100,
    status,
    source: 'manual',
    notes: null,
    created_at: '2026-06-08T11:00:00.000Z',
    updated_at: '2026-06-08T11:00:00.000Z',
    ...overrides,
  }
}

function client(id: string, name: string): Client {
  return {
    id: `client-${id}`,
    user_id: 'user-1',
    phone: '+10000000000',
    first_name: name,
    last_name: null,
    email: null,
    birthday: null,
    notes: null,
    emoji: null,
    is_favorite: false,
    source: 'manual',
    created_at: '2026-06-01T00:00:00.000Z',
    updated_at: '2026-06-01T00:00:00.000Z',
  }
}

function service(id: string): Service {
  return {
    id: `service-${id}`,
    user_id: 'user-1',
    category_id: null,
    name: `Service ${id}`,
    description: null,
    duration: 60,
    price: 100,
    color: '#7c3aed',
    is_active: true,
    sort_order: 0,
    created_at: '2026-06-01T00:00:00.000Z',
    updated_at: '2026-06-01T00:00:00.000Z',
    category: null,
  }
}

function mountWidget(
  options: { appointments?: Appointment[]; loading?: boolean; error?: Error } = {},
) {
  const refetch = vi.fn<() => void>()
  const appointmentList = options.appointments ?? []

  queryMock.appointments = {
    data: ref(appointmentList),
    isPending: ref(options.loading ?? false),
    error: ref(options.error ?? null),
    refetch,
  }
  queryMock.clients = {
    data: ref(appointmentList.map((item) => client(item.id, `Client ${item.id}`))),
  }
  queryMock.services = {
    data: ref(appointmentList.map((item) => service(item.id))),
  }

  const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })
  const wrapper = mount(HomeActionsMobile, {
    global: {
      plugins: [i18n, [formatsPlugin, { getCurrency: () => 'USD', getLocale: () => 'en' }]],
      stubs,
    },
  })

  return { wrapper, refetch }
}

describe('HomeActionsMobile', () => {
  let wrapper: VueWrapper | undefined

  beforeEach(() => {
    queryMock.appointments = null
    queryMock.clients = null
    queryMock.services = null
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
  })

  it('hides the complete block when there are no actionable appointments', () => {
    ;({ wrapper } = mountWidget())

    expect(wrapper.find('.actions-block').exists()).toBe(false)
  })

  it('renders a two-card skeleton carousel while loading', () => {
    ;({ wrapper } = mountWidget({ loading: true }))

    expect(wrapper.find('.actions-block').exists()).toBe(true)
    expect(wrapper.findAll('.action-skeleton')).toHaveLength(2)
  })

  it('orders cards by action group and shows attention, online, notes, and checkout states', async () => {
    ;({ wrapper } = mountWidget({
      appointments: [
        appointment('finish', '2026-06-08T10:00:00.000Z', 'confirmed'),
        appointment('decision', '2026-06-08T09:00:00.000Z', 'pending'),
        appointment('request', '2026-06-08T14:00:00.000Z', 'pending', {
          source: 'online_booking',
          created_at: '2026-06-08T11:30:00.000Z',
          notes: 'Please call before the appointment',
        }),
      ],
    }))

    const cards = wrapper.findAll('.action-card')
    expect(cards).toHaveLength(3)
    expect(cards.map((card) => card.find('.action-card__name').text())).toEqual([
      'Client request',
      'Client decision',
      'Client finish',
    ])
    expect(cards[0]?.text()).toContain('Waiting 30m for your reply')
    expect(cards[0]?.text()).not.toContain('Please call before the appointment')
    expect(cards[0]?.find('.action-card__note').exists()).toBe(true)
    expect(cards[0]?.findAll('.ion-badge-stub')).toHaveLength(2)
    expect(cards[0]?.find('.action-card__primary').attributes('data-color')).toBe('secondary')
    expect(cards[1]?.text()).toContain('This request’s time slot has passed')
    expect(cards[2]?.text()).toContain('Complete')
    expect(cards[2]?.find('.action-card__primary').attributes('data-color')).toBe('primary')
    expect(wrapper.find('.action-card__open-icon').exists()).toBe(false)

    await cards[0]?.find('.action-card__note').trigger('click')
    expect(wrapper.find('.ion-modal-stub').text()).toContain('Appointment note')
    expect(wrapper.find('.ion-modal-stub').text()).toContain('Please call before the appointment')
  })

  it('uses full width for one card and forwards typed card events', async () => {
    const item = appointment('request', '2026-06-08T14:00:00.000Z', 'pending')
    ;({ wrapper } = mountWidget({ appointments: [item] }))

    expect(wrapper.find('.actions-carousel--single').exists()).toBe(true)

    await wrapper.find('.action-card__content').trigger('click')
    await wrapper.find('.action-card__primary').trigger('click')
    await wrapper.find('.action-card__more').trigger('click')

    expect(wrapper.emitted('open')?.[0]).toEqual([item])
    expect(wrapper.emitted('primary')?.[0]).toEqual([item])
    expect(wrapper.emitted('more')?.[0]).toEqual([item])
  })

  it('shows a retry state when the actionable query fails', async () => {
    const mounted = mountWidget({ error: new Error('network') })
    wrapper = mounted.wrapper

    expect(wrapper.text()).toContain('Couldn’t load appointments')
    await wrapper.find('.actions-error button').trigger('click')
    expect(mounted.refetch).toHaveBeenCalledOnce()
  })
})
