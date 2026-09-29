import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import type { Appointment } from '@entities/appointment'
import type { Client } from '@entities/client'
import type { PaymentType } from '@entities/payment-type'
import type { Service } from '@entities/service'
import { formatsPlugin } from '@shared/lib/formats'
import en from '@shared/lib/i18n/locales/en'
import AppointmentCheckoutMobile from '../AppointmentCheckoutMobile.vue'

const appointment: Appointment = {
  id: 'appointment-1',
  user_id: 'user-1',
  client_id: 'client-1',
  service_ids: ['service-1'],
  start_at: '2026-09-29T10:00:00.000Z',
  duration: 60,
  price: 100,
  status: 'confirmed',
  source: 'manual',
  notes: null,
  created_at: '2026-09-29T09:00:00.000Z',
  updated_at: '2026-09-29T09:00:00.000Z',
}

const client: Client = {
  id: 'client-1',
  user_id: 'user-1',
  phone: '+10000000000',
  first_name: 'Jane',
  last_name: 'Doe',
  email: null,
  birthday: null,
  notes: null,
  emoji: '🌿',
  is_favorite: false,
  source: 'manual',
  created_at: '2026-09-01T00:00:00.000Z',
  updated_at: '2026-09-01T00:00:00.000Z',
}

function service(id: string, name: string, price: number): Service {
  return {
    id,
    user_id: 'user-1',
    category_id: null,
    name,
    description: null,
    duration: 30,
    price,
    color: 'var(--ion-color-primary)',
    is_active: true,
    sort_order: 0,
    created_at: '2026-09-01T00:00:00.000Z',
    updated_at: '2026-09-01T00:00:00.000Z',
  }
}

const paymentType: PaymentType = {
  id: 'cash',
  user_id: 'user-1',
  name: 'Cash',
  color: 'var(--ion-color-success)',
  kind: 'cash',
  is_default: true,
  is_active: true,
  sort_order: 0,
  created_at: '2026-09-01T00:00:00.000Z',
  updated_at: '2026-09-01T00:00:00.000Z',
}

const passthrough = { template: '<div><slot /></div>' }

describe('AppointmentCheckoutMobile', () => {
  it('shows the client, edits services, and emits the completed sale payload', async () => {
    const first = service('service-1', 'Consultation', 100)
    const second = service('service-2', 'Treatment', 150)
    const presentingElement = document.createElement('ion-router-outlet')
    const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })
    const wrapper = mount(AppointmentCheckoutMobile, {
      props: {
        isOpen: true,
        appointment,
        client,
        services: [first],
        availableServices: [first, second],
        paymentTypes: [paymentType],
        presentingElement,
      },
      global: {
        plugins: [i18n, formatsPlugin],
        stubs: {
          IonAvatar: passthrough,
          IonButton: {
            props: ['disabled'],
            template:
              '<button :disabled="disabled"><slot name="start" /><slot name="icon-only" /><slot /></button>',
          },
          IonButtons: passthrough,
          IonContent: passthrough,
          IonFooter: passthrough,
          IonHeader: passthrough,
          IonIcon: passthrough,
          IonInput: { props: ['value'], template: '<input :value="value" />' },
          IonItem: {
            template: '<div><slot name="start" /><slot /><slot name="end" /></div>',
          },
          IonLabel: passthrough,
          IonModal: {
            name: 'IonModal',
            props: ['isOpen', 'presentingElement', 'canDismiss'],
            template: '<div v-if="isOpen"><slot /></div>',
          },
          IonNote: passthrough,
          IonRadio: passthrough,
          IonRadioGroup: passthrough,
          IonSpinner: passthrough,
          IonTitle: passthrough,
          IonToolbar: passthrough,
          InsetList: { template: '<section><slot name="header" /><slot /></section>' },
          ServicePickerModalMobile: {
            props: ['isOpen', 'services'],
            emits: ['update:isOpen', 'select'],
            template:
              '<button v-if="isOpen" class="service-picker-stub" @click="$emit(\'select\', services.slice(1)); $emit(\'update:isOpen\', false)">Select</button>',
          },
        },
      },
    })

    expect(wrapper.text()).toContain('Jane Doe')
    expect(wrapper.text()).toContain('🌿')
    expect(wrapper.text()).toContain('Consultation')
    expect(wrapper.text()).toContain('Cash')
    expect(wrapper.getComponent({ name: 'IonModal' }).props('presentingElement')).toBe(
      presentingElement,
    )

    await wrapper.get('.appointment-checkout-mobile__section-header button').trigger('click')
    await wrapper.get('.service-picker-stub').trigger('click')

    expect(wrapper.text()).not.toContain('Consultation')
    expect(wrapper.text()).toContain('Treatment')

    await wrapper.get('.appointment-checkout-mobile__submit').trigger('click')

    expect(wrapper.emitted('confirm')?.[0]).toEqual([
      {
        appointment_id: 'appointment-1',
        amount: 150,
        payment_type_id: 'cash',
        items: [{ service_id: 'service-2', name: 'Treatment', price: 150 }],
      },
    ])
  })

  it('allows controlled dismissal while blocking user dismissal during loading', async () => {
    const first = service('service-1', 'Consultation', 100)
    const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })
    const wrapper = mount(AppointmentCheckoutMobile, {
      props: {
        isOpen: true,
        appointment,
        client,
        services: [first],
        paymentTypes: [paymentType],
        loading: true,
      },
      global: {
        plugins: [i18n, formatsPlugin],
        stubs: {
          IonAvatar: passthrough,
          IonButton: {
            props: ['disabled'],
            template:
              '<button :disabled="disabled"><slot name="start" /><slot name="icon-only" /><slot /></button>',
          },
          IonButtons: passthrough,
          IonContent: passthrough,
          IonFooter: passthrough,
          IonHeader: passthrough,
          IonIcon: passthrough,
          IonInput: passthrough,
          IonItem: passthrough,
          IonLabel: passthrough,
          IonModal: {
            name: 'IonModal',
            props: ['isOpen', 'presentingElement', 'canDismiss'],
            template: '<div v-if="isOpen"><slot /></div>',
          },
          IonNote: passthrough,
          IonRadio: passthrough,
          IonRadioGroup: passthrough,
          IonSpinner: passthrough,
          IonTitle: passthrough,
          IonToolbar: passthrough,
          InsetList: { template: '<section><slot name="header" /><slot /></section>' },
          ServicePickerModalMobile: passthrough,
        },
      },
    })

    const modal = wrapper.getComponent({ name: 'IonModal' })
    const guard = modal.props('canDismiss') as () => Promise<boolean>

    expect(await guard()).toBe(false)

    await wrapper.setProps({ isOpen: false })
    expect(await guard()).toBe(true)

    await wrapper.setProps({ isOpen: true, loading: false })
    await wrapper.get('button[aria-label="Close"]').trigger('click')
    expect(wrapper.emitted('update:isOpen')?.slice(-1)[0]).toEqual([false])
  })
})
