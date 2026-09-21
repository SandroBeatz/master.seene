import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
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
  paymentTypes: null as Record<string, unknown> | null,
  update: vi.fn<(payload: unknown) => Promise<unknown>>(),
  remove: vi.fn<(id: string) => Promise<unknown>>(),
  complete: vi.fn<(payload: unknown) => Promise<unknown>>(),
  alertRole: 'cancel' as 'cancel' | 'destructive',
  alertCreate: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  toastCreate: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  toastPresent: vi.fn<() => Promise<void>>(),
}))

vi.mock('@ionic/vue', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ionic/vue')>()
  return {
    ...actual,
    alertController: {
      create: queryMock.alertCreate,
    },
    toastController: {
      create: queryMock.toastCreate,
    },
  }
})

vi.mock('@entities/appointment', () => ({
  useActionableAppointmentsQuery: () => queryMock.appointments,
  useUpdateAppointmentMutation: () => ({
    isLoading: ref(false),
    mutateAsync: queryMock.update,
  }),
  useRemoveAppointmentMutation: () => ({
    isLoading: ref(false),
    mutateAsync: queryMock.remove,
  }),
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

vi.mock('@entities/payment-type', () => ({
  usePaymentTypesQuery: () => queryMock.paymentTypes,
}))

vi.mock('@entities/sale', () => ({
  useCompleteSaleMutation: () => ({
    isLoading: ref(false),
    mutateAsync: queryMock.complete,
  }),
}))

vi.mock('@entities/master', () => ({
  useMasterPreferencesStore: () => ({ timeZone: 'UTC' }),
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
  IonFooter: passthrough,
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
  AppointmentDetailsMobile: {
    name: 'AppointmentDetailsMobile',
    props: ['isOpen'],
    emits: ['more', 'primary', 'update:isOpen', 'did-dismiss'],
    template:
      '<div v-if="isOpen" class="details-wrapper-stub"><button class="details-mobile-stub" @click="$emit(\'more\'); $emit(\'did-dismiss\')">Actions</button><button class="details-close-stub" @click="$emit(\'update:isOpen\', false); $emit(\'did-dismiss\')">Close</button><button class="details-primary-stub" @click="$emit(\'primary\')">Primary</button></div>',
  },
  AppointmentEditMobile: { template: '<div class="edit-mobile-stub" />' },
  AppointmentActionsDrawerMobile: {
    props: ['isOpen'],
    emits: ['select', 'update:isOpen'],
    template:
      '<div v-if="isOpen" class="actions-drawer-stub"><button class="drawer-edit" @click="$emit(\'select\', \'edit\')">Edit</button><button class="drawer-decline" @click="$emit(\'select\', \'decline\')">Decline</button><button class="drawer-no-show" @click="$emit(\'select\', \'no_show\')">No-show</button></div>',
  },
  AppointmentCheckoutMobile: {
    props: ['isOpen'],
    emits: ['confirm', 'update:isOpen', 'did-dismiss'],
    data: () => ({
      payload: {
        appointment_id: 'finish',
        amount: 100,
        payment_type_id: 'cash',
        items: [{ service_id: 'service-finish', name: 'Service finish', price: 100 }],
      },
    }),
    template:
      '<div v-if="isOpen"><button class="checkout-mobile-stub" @click="$emit(\'confirm\', payload)">Checkout</button><button class="checkout-close-stub" @click="$emit(\'update:isOpen\', false); $emit(\'did-dismiss\')">Close</button></div>',
  },
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
    queryMock.paymentTypes = { data: ref([]) }
    queryMock.update.mockReset()
    queryMock.update.mockImplementation(async (payload) => payload)
    queryMock.remove.mockReset()
    queryMock.remove.mockResolvedValue(undefined)
    queryMock.complete.mockReset()
    queryMock.complete.mockResolvedValue('sale-1')
    queryMock.alertRole = 'cancel'
    queryMock.alertCreate.mockReset()
    queryMock.alertCreate.mockImplementation(async () => ({
      present: vi.fn<() => Promise<void>>(),
      onDidDismiss: vi.fn<() => Promise<{ role: typeof queryMock.alertRole }>>(async () => ({
        role: queryMock.alertRole,
      })),
    }))
    queryMock.toastCreate.mockReset()
    queryMock.toastCreate.mockImplementation(async () => ({ present: queryMock.toastPresent }))
    queryMock.toastPresent.mockReset()
    queryMock.toastPresent.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
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
    expect(wrapper.find('.action-card__more').exists()).toBe(false)

    await cards[0]?.find('.action-card__note').trigger('click')
    expect(wrapper.find('.ion-modal-stub').text()).toContain('Appointment note')
    expect(wrapper.find('.ion-modal-stub').text()).toContain('Please call before the appointment')
  })

  it('uses full width, opens preview, and forwards primary card events', async () => {
    const item = appointment('request', '2026-06-08T14:00:00.000Z', 'pending')
    ;({ wrapper } = mountWidget({ appointments: [item] }))

    expect(wrapper.find('.actions-carousel--single').exists()).toBe(true)

    await wrapper.find('.action-card__content').trigger('click')
    expect(wrapper.find('.details-mobile-stub').exists()).toBe(true)
    await wrapper.find('.action-card__primary').trigger('click')
    await flushPromises()

    expect(wrapper.emitted('open')?.[0]).toEqual([item])
    expect(wrapper.emitted('primary')?.[0]).toEqual([item])
  })

  it('can dismiss and reopen appointment details repeatedly', async () => {
    const item = appointment('request', '2026-06-08T14:00:00.000Z', 'pending')
    ;({ wrapper } = mountWidget({ appointments: [item] }))

    const exposed = wrapper.vm as unknown as {
      openAppointment: (appointment: Appointment) => Promise<void>
    }
    await exposed.openAppointment(item)
    expect(wrapper.find('.details-mobile-stub').exists()).toBe(true)

    await wrapper.find('.details-close-stub').trigger('click')
    await flushPromises()
    expect(wrapper.find('.details-mobile-stub').exists()).toBe(false)

    await exposed.openAppointment(item)
    expect(wrapper.find('.details-mobile-stub').exists()).toBe(true)
  })

  it('waits for details to dismiss before opening checkout and can reopen it', async () => {
    const item = appointment('finish', '2026-06-08T10:00:00.000Z', 'confirmed')
    ;({ wrapper } = mountWidget({ appointments: [item] }))

    await wrapper.find('.action-card__content').trigger('click')
    const details = wrapper.findComponent({ name: 'AppointmentDetailsMobile' })
    await wrapper.find('.details-primary-stub').trigger('click')
    details.vm.$emit('did-dismiss')
    await flushPromises()
    expect(wrapper.find('.details-mobile-stub').exists()).toBe(false)
    expect(wrapper.find('.checkout-mobile-stub').exists()).toBe(true)

    await wrapper.find('.checkout-close-stub').trigger('click')
    await flushPromises()
    await wrapper.find('.action-card__primary').trigger('click')
    await flushPromises()
    expect(wrapper.find('.checkout-mobile-stub').exists()).toBe(true)
  })

  it('confirms a pending appointment once', async () => {
    const item = appointment('request', '2026-06-08T14:00:00.000Z', 'pending')
    ;({ wrapper } = mountWidget({ appointments: [item] }))

    const button = wrapper.find('.action-card__primary')
    await button.trigger('click')
    await button.trigger('click')
    await flushPromises()

    expect(queryMock.update).toHaveBeenCalledTimes(1)
    expect(queryMock.update).toHaveBeenCalledWith({ id: 'request', status: 'confirmed' })
  })

  it('opens the Ionic options drawer when the card is held', async () => {
    vi.useFakeTimers()
    const item = appointment('request', '2026-06-08T14:00:00.000Z', 'pending')
    ;({ wrapper } = mountWidget({ appointments: [item] }))

    await wrapper.find('.action-card__content').trigger('pointerdown')
    vi.advanceTimersByTime(550)
    await flushPromises()

    expect(wrapper.find('.actions-drawer-stub').exists()).toBe(true)
    expect(wrapper.find('.details-mobile-stub').exists()).toBe(false)
  })

  it('declines a pending appointment only after destructive confirmation', async () => {
    queryMock.alertRole = 'destructive'
    const item = appointment('request', '2026-06-08T14:00:00.000Z', 'pending')
    ;({ wrapper } = mountWidget({ appointments: [item] }))

    await wrapper.find('.action-card__content').trigger('click')
    await wrapper.find('.details-mobile-stub').trigger('click')
    await flushPromises()
    await wrapper.find('.drawer-decline').trigger('click')
    await flushPromises()

    expect(queryMock.alertCreate).toHaveBeenCalledOnce()
    expect(queryMock.update).toHaveBeenCalledWith({ id: 'request', status: 'cancelled' })
  })

  it('opens the reusable Ionic edit flow from the options drawer', async () => {
    const item = appointment('request', '2026-06-08T14:00:00.000Z', 'pending')
    ;({ wrapper } = mountWidget({ appointments: [item] }))

    await wrapper.find('.action-card__content').trigger('click')
    await wrapper.find('.details-mobile-stub').trigger('click')
    await flushPromises()
    await wrapper.find('.drawer-edit').trigger('click')
    await flushPromises()

    expect(wrapper.find('.edit-mobile-stub').exists()).toBe(true)
  })

  it('exposes deletion for schedule events with destructive confirmation', async () => {
    queryMock.alertRole = 'destructive'
    const item = appointment('request', '2026-06-08T14:00:00.000Z', 'pending')
    ;({ wrapper } = mountWidget({ appointments: [item] }))

    const exposed = wrapper.vm as unknown as {
      deleteAppointment: (appointment: Appointment) => Promise<void>
    }
    await exposed.deleteAppointment(item)

    expect(queryMock.alertCreate).toHaveBeenCalledOnce()
    expect(queryMock.remove).toHaveBeenCalledWith('request')
  })

  it('marks a confirmed appointment as no-show after confirmation', async () => {
    queryMock.alertRole = 'destructive'
    const item = appointment('finish', '2026-06-08T10:00:00.000Z', 'confirmed')
    ;({ wrapper } = mountWidget({ appointments: [item] }))

    await wrapper.find('.action-card__content').trigger('click')
    await wrapper.find('.details-mobile-stub').trigger('click')
    await flushPromises()
    await wrapper.find('.drawer-no-show').trigger('click')
    await flushPromises()

    expect(queryMock.update).toHaveBeenCalledWith({ id: 'finish', status: 'no_show' })
  })

  it('opens Ionic checkout for a past confirmed appointment and submits its payload', async () => {
    const item = appointment('finish', '2026-06-08T10:00:00.000Z', 'confirmed')
    ;({ wrapper } = mountWidget({ appointments: [item] }))

    await wrapper.find('.action-card__primary').trigger('click')
    await flushPromises()
    expect(wrapper.find('.checkout-mobile-stub').exists()).toBe(true)
    await wrapper.find('.checkout-mobile-stub').trigger('click')
    await flushPromises()

    expect(queryMock.complete).toHaveBeenCalledWith({
      appointment_id: 'finish',
      amount: 100,
      payment_type_id: 'cash',
      items: [{ service_id: 'service-finish', name: 'Service finish', price: 100 }],
    })
  })

  it('keeps the card available and shows an Ionic error toast when a mutation fails', async () => {
    queryMock.update.mockRejectedValueOnce(new Error('network'))
    const item = appointment('request', '2026-06-08T14:00:00.000Z', 'pending')
    ;({ wrapper } = mountWidget({ appointments: [item] }))

    await wrapper.find('.action-card__primary').trigger('click')
    await flushPromises()

    expect(wrapper.find('.action-card').exists()).toBe(true)
    expect(queryMock.toastCreate).toHaveBeenCalledWith(
      expect.objectContaining({ color: 'danger', position: 'top' }),
    )
  })

  it('shows a retry state when the actionable query fails', async () => {
    const mounted = mountWidget({ error: new Error('network') })
    wrapper = mounted.wrapper

    expect(wrapper.text()).toContain('Couldn’t load appointments')
    await wrapper.find('.actions-error button').trigger('click')
    expect(mounted.refetch).toHaveBeenCalledOnce()
  })
})
