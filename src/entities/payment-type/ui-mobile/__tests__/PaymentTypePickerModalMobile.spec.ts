import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import en from '@shared/lib/i18n/locales/en'
import type { PaymentType } from '../../model/types'
import PaymentTypePickerModalMobile from '../PaymentTypePickerModalMobile.vue'

function paymentType(id: string, kind: PaymentType['kind'], active = true): PaymentType {
  return {
    id,
    user_id: 'user-1',
    name: kind === 'custom' ? 'Gift card' : kind,
    color: 'var(--ion-color-primary)',
    kind,
    is_default: kind === 'cash',
    is_active: active,
    sort_order: 0,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  }
}

const passthrough = { template: '<div><slot /></div>' }

describe('PaymentTypePickerModalMobile', () => {
  it('shows the current method and emits one selected active method', async () => {
    const paymentTypes = [
      paymentType('cash', 'cash'),
      paymentType('card', 'card', false),
      paymentType('hidden', 'custom', false),
    ]
    const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })
    const wrapper = mount(PaymentTypePickerModalMobile, {
      props: { isOpen: true, paymentTypes, modelValue: 'card' },
      global: {
        plugins: [i18n],
        stubs: {
          IonButton: { template: '<button><slot name="icon-only" /><slot /></button>' },
          IonButtons: passthrough,
          IonContent: passthrough,
          IonHeader: passthrough,
          IonIcon: passthrough,
          IonItem: {
            template:
              '<button class="payment-item-stub"><slot name="start" /><slot /><slot name="end" /></button>',
          },
          IonLabel: passthrough,
          IonModal: { props: ['isOpen'], template: '<div v-if="isOpen"><slot /></div>' },
          IonNote: passthrough,
          IonRadio: passthrough,
          IonRadioGroup: passthrough,
          IonTitle: passthrough,
          IonToolbar: passthrough,
          InsetList: { template: '<section><slot /></section>' },
        },
      },
    })

    expect(wrapper.text()).toContain('Cash')
    expect(wrapper.text()).toContain('Card')
    expect(wrapper.text()).not.toContain('Gift card')
    expect(
      wrapper.get('[data-testid="payment-type-picker-item-card"]').attributes('aria-pressed'),
    ).toBe('true')

    await wrapper.get('[data-testid="payment-type-picker-item-cash"]').trigger('click')

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['cash'])
    expect(wrapper.emitted('select')?.[0]).toEqual([paymentTypes[0]])
    expect(wrapper.emitted('update:isOpen')?.[0]).toEqual([false])
  })
})
