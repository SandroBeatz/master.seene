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
  sale: null as Record<string, unknown> | null,
  update: vi.fn<(payload: unknown) => Promise<unknown>>(),
  remove: vi.fn<(id: string) => Promise<unknown>>(),
  complete: vi.fn<(payload: unknown) => Promise<unknown>>(),
  updateSale: vi.fn<(payload: unknown) => Promise<unknown>>(),
  updateSaleDetails: vi.fn<(payload: unknown) => Promise<unknown>>(),
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
  useClientAppointmentsCountQuery: () => ({
    data: ref(2),
    isPending: ref(false),
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

vi.mock('@entities/service/index.mobile', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@entities/service/index.mobile')>()
  return {
    ...actual,
    useServicesQuery: () => queryMock.services,
  }
})

vi.mock('@entities/payment-type/index.mobile', () => ({
  usePaymentTypesQuery: () => queryMock.paymentTypes,
}))

vi.mock('@entities/sale', () => ({
  useCompleteSaleMutation: () => ({
    isLoading: ref(false),
    mutateAsync: queryMock.complete,
  }),
  useSaleByAppointmentQuery: () => ({
    ...(queryMock.sale ?? { data: ref(null), isPending: ref(false) }),
  }),
  useUpdateSaleMutation: () => ({ mutateAsync: queryMock.updateSale }),
  useUpdateSaleDetailsMutation: () => ({ mutateAsync: queryMock.updateSaleDetails }),
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
    props: ['isOpen', 'appointment', 'client', 'clients', 'services', 'paymentTypes'],
    emits: [
      'action',
      'primary',
      'select-client',
      'select-services',
      'select-payment-type',
      'save-sale-amount',
      'update:isOpen',
      'did-dismiss',
    ],
    template:
      '<div v-if="isOpen" class="details-wrapper-stub"><button class="details-mobile-stub">Details</button><span class="details-client-name">{{ client && client.first_name }}</span><span class="details-service-ids">{{ appointment.service_ids.join(\',\') }}</span><button class="details-client-stub" @click="$emit(\'select-client\', clients[1])">Select client</button><button class="details-services-stub" @click="$emit(\'select-services\', services.slice(-2))">Select services</button><button v-if="paymentTypes[0]" class="details-payment-stub" @click="$emit(\'select-payment-type\', paymentTypes[0])">Select payment</button><button class="details-amount-stub" @click="$emit(\'save-sale-amount\', { amount: 90, items: [{ id: \'item-1\', price: 90 }] })">Save amount</button><button class="details-decline-stub" @click="$emit(\'action\', \'decline\')">Decline</button><button class="details-no-show-stub" @click="$emit(\'action\', \'no_show\')">No-show</button><button class="details-close-stub" @click="$emit(\'update:isOpen\', false); $emit(\'did-dismiss\')">Close</button><button class="details-primary-stub" @click="$emit(\'primary\')">Primary</button><button class="details-delete-stub" @click="$emit(\'action\', \'delete\')">Delete</button></div>',
  },
  AppointmentEditMobile: { template: '<div class="edit-mobile-stub" />' },
  AppointmentActionsDrawerMobile: {
    props: ['isOpen'],
    emits: ['select', 'update:isOpen'],
    template:
      '<div v-if="isOpen" class="actions-drawer-stub"><button class="drawer-decline" @click="$emit(\'select\', \'decline\')">Decline</button><button class="drawer-cancel" @click="$emit(\'select\', \'cancel\')">Cancel</button><button class="drawer-no-show" @click="$emit(\'select\', \'no_show\')">No-show</button></div>',
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
  options: {
    appointments?: Appointment[]
    clients?: Client[]
    services?: Service[]
    loading?: boolean
    error?: Error
  } = {},
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
    data: ref(
      options.clients ?? appointmentList.map((item) => client(item.id, `Client ${item.id}`)),
    ),
  }
  queryMock.services = {
    data: ref(options.services ?? appointmentList.map((item) => service(item.id))),
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
    queryMock.sale = null
    queryMock.update.mockReset()
    queryMock.update.mockImplementation(async (payload) => payload)
    queryMock.remove.mockReset()
    queryMock.remove.mockResolvedValue(undefined)
    queryMock.complete.mockReset()
    queryMock.complete.mockResolvedValue('sale-1')
    queryMock.updateSale.mockReset()
    queryMock.updateSale.mockResolvedValue(undefined)
    queryMock.updateSaleDetails.mockReset()
    queryMock.updateSaleDetails.mockResolvedValue(undefined)
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

  it('updates the appointment client selected from the preview', async () => {
    const item = appointment('request', '2026-06-08T14:00:00.000Z', 'pending')
    const currentClient = client('request', 'Current client')
    const replacementClient = client('replacement', 'Replacement client')
    ;({ wrapper } = mountWidget({
      appointments: [item],
      clients: [currentClient, replacementClient],
    }))

    await wrapper.find('.action-card__content').trigger('click')
    expect(wrapper.get('.details-client-name').text()).toBe('Current client')

    await wrapper.get('.details-client-stub').trigger('click')
    await flushPromises()

    expect(queryMock.update).toHaveBeenCalledWith({
      id: 'request',
      client_id: 'client-replacement',
    })
    expect(wrapper.get('.details-client-name').text()).toBe('Replacement client')
  })

  it('updates services, duration, and price selected from the preview', async () => {
    const item = appointment('request', '2026-06-08T14:00:00.000Z', 'pending')
    const currentService = service('request')
    const haircut = { ...service('haircut'), duration: 45, price: 50 }
    const coloring = { ...service('coloring'), duration: 90, price: 120 }
    ;({ wrapper } = mountWidget({
      appointments: [item],
      services: [currentService, haircut, coloring],
    }))

    await wrapper.find('.action-card__content').trigger('click')
    await wrapper.get('.details-services-stub').trigger('click')
    await flushPromises()

    expect(queryMock.update).toHaveBeenCalledWith({
      id: 'request',
      service_ids: ['service-haircut', 'service-coloring'],
      duration: 135,
      price: 170,
    })
    expect(wrapper.get('.details-service-ids').text()).toBe('service-haircut,service-coloring')
  })

  it('updates payment method and received amount from completed appointment details', async () => {
    const item = appointment('completed', '2026-06-08T10:00:00.000Z', 'completed')
    const paymentType = {
      id: 'payment-card',
      user_id: 'user-1',
      name: 'Card',
      color: '#7c3aed',
      kind: 'card' as const,
      is_default: true,
      is_active: true,
      sort_order: 0,
      created_at: '2026-06-01T00:00:00.000Z',
      updated_at: '2026-06-01T00:00:00.000Z',
    }
    queryMock.paymentTypes = { data: ref([paymentType]) }
    queryMock.sale = {
      data: ref({
        id: 'sale-1',
        user_id: 'user-1',
        appointment_id: item.id,
        client_id: item.client_id,
        payment_type_id: 'payment-cash',
        amount: 100,
        paid_at: '2026-06-08T11:00:00.000Z',
        created_at: '2026-06-08T11:00:00.000Z',
        items: [],
      }),
      isPending: ref(false),
    }
    ;({ wrapper } = mountWidget())

    const exposed = wrapper.vm as unknown as {
      openAppointment: (appointment: Appointment) => Promise<void>
    }
    await exposed.openAppointment(item)
    await wrapper.get('.details-payment-stub').trigger('click')
    await flushPromises()

    expect(queryMock.updateSale).toHaveBeenCalledWith({
      id: 'sale-1',
      appointmentId: 'completed',
      patch: { payment_type_id: 'payment-card' },
    })

    await wrapper.get('.details-amount-stub').trigger('click')
    await flushPromises()

    expect(queryMock.updateSaleDetails).toHaveBeenCalledWith({
      id: 'sale-1',
      appointmentId: 'completed',
      details: { amount: 90, items: [{ id: 'item-1', price: 90 }] },
    })
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
    await wrapper.find('.details-decline-stub').trigger('click')
    await flushPromises()

    expect(queryMock.alertCreate).toHaveBeenCalledOnce()
    expect(queryMock.update).toHaveBeenCalledWith({ id: 'request', status: 'cancelled' })
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
    await wrapper.find('.details-no-show-stub').trigger('click')
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
