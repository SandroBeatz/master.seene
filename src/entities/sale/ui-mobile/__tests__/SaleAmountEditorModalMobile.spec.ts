import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { formatsPlugin } from '@shared/lib/formats'
import en from '@shared/lib/i18n/locales/en'
import type { Sale } from '../../model/types'
import SaleAmountEditorModalMobile from '../SaleAmountEditorModalMobile.vue'

function sale(prices: number[]): Sale {
  return {
    id: 'sale-1',
    user_id: 'user-1',
    appointment_id: 'appointment-1',
    client_id: 'client-1',
    payment_type_id: 'cash',
    amount: prices.reduce((sum, price) => sum + price, 0),
    paid_at: '2026-01-01T00:00:00.000Z',
    created_at: '2026-01-01T00:00:00.000Z',
    items: prices.map((price, index) => ({
      id: `item-${index + 1}`,
      sale_id: 'sale-1',
      service_id: `service-${index + 1}`,
      name_snapshot: `Service ${index + 1}`,
      price_snapshot: price,
    })),
  }
}

const passthrough = { template: '<div><slot /></div>' }

function mountEditor(value: Sale) {
  const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })
  return mount(SaleAmountEditorModalMobile, {
    props: { isOpen: true, sale: value },
    global: {
      plugins: [i18n, [formatsPlugin, { getCurrency: () => 'USD', getLocale: () => 'en' }]],
      stubs: {
        IonButton: {
          props: ['disabled'],
          template: '<button :disabled="disabled"><slot name="icon-only" /><slot /></button>',
        },
        IonButtons: passthrough,
        IonContent: passthrough,
        IonFooter: passthrough,
        IonHeader: passthrough,
        IonIcon: passthrough,
        IonInput: {
          props: ['value'],
          emits: ['ionInput'],
          template:
            '<input :value="value" @input="$emit(\'ionInput\', { detail: { value: $event.target.value } })" />',
        },
        IonItem: { template: '<div><slot /><slot name="end" /></div>' },
        IonLabel: passthrough,
        IonModal: { props: ['isOpen'], template: '<div v-if="isOpen"><slot /></div>' },
        IonTitle: passthrough,
        IonToolbar: passthrough,
        InsetList: { template: '<section><slot /></section>' },
      },
    },
  })
}

describe('SaleAmountEditorModalMobile', () => {
  it('edits service amounts and redistributes an edited total', async () => {
    const wrapper = mountEditor(sale([50, 100]))

    await wrapper.get('[data-testid="sale-item-amount-item-1"]').setValue('80')
    expect(
      (wrapper.get('[data-testid="sale-total-amount"]').element as HTMLInputElement).value,
    ).toBe('180')

    await wrapper.get('[data-testid="sale-total-amount"]').setValue('90')
    const save = wrapper.findAll('button').find((button) => button.text().includes('Save'))
    await save!.trigger('click')

    expect(wrapper.emitted('save')?.[0]).toEqual([
      {
        amount: 90,
        items: [
          { id: 'item-1', price: 40 },
          { id: 'item-2', price: 50 },
        ],
      },
    ])
  })

  it('shows only the total input for one service and keeps its snapshot in sync', async () => {
    const wrapper = mountEditor(sale([50]))

    expect(wrapper.find('[data-testid="sale-item-amount-item-1"]').exists()).toBe(false)
    await wrapper.get('[data-testid="sale-total-amount"]').setValue('65')
    const save = wrapper.findAll('button').find((button) => button.text().includes('Save'))
    await save!.trigger('click')

    expect(wrapper.emitted('save')?.[0]).toEqual([
      { amount: 65, items: [{ id: 'item-1', price: 65 }] },
    ])
  })
})
