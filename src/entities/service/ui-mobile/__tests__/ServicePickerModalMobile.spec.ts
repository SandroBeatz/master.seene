import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { formatsPlugin } from '@shared/lib/formats'
import en from '@shared/lib/i18n/locales/en'
import type { Service } from '../../model/types'
import ServicePickerModalMobile from '../ServicePickerModalMobile.vue'

function service(
  id: string,
  name: string,
  category: { id: string; name: string },
  duration: number,
  price: number,
): Service {
  return {
    id,
    user_id: 'user-1',
    category_id: category.id,
    name,
    description: null,
    duration,
    price,
    color: 'var(--ion-color-primary)',
    is_active: true,
    sort_order: 0,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    category,
  }
}

const passthrough = { template: '<div><slot /></div>' }

function mountPicker() {
  const services = [
    service('cut', 'Haircut', { id: 'hair', name: 'Hair' }, 45, 50),
    service('color', 'Hair color', { id: 'hair', name: 'Hair' }, 90, 120),
    service('nails', 'Manicure', { id: 'nails', name: 'Nails' }, 60, 70),
  ]
  const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })

  const wrapper = mount(ServicePickerModalMobile, {
    props: {
      isOpen: true,
      services,
      modelValue: ['cut'],
    },
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
        IonIcon: { template: '<span class="icon-stub" />' },
        IonItem: {
          props: ['disabled'],
          template:
            '<button class="service-item-stub" :disabled="disabled"><slot name="start" /><slot /><slot name="end" /></button>',
        },
        IonLabel: passthrough,
        IonModal: {
          props: ['isOpen'],
          template: '<div v-if="isOpen"><slot /></div>',
        },
        IonSearchbar: {
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template:
            '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
        },
        IonSegment: {
          name: 'IonSegment',
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template: '<div class="segment-stub"><slot /></div>',
        },
        IonSegmentButton: passthrough,
        IonTitle: passthrough,
        IonToolbar: passthrough,
        InsetList: { template: '<section><slot /></section>' },
      },
    },
  })

  return { wrapper, services }
}

describe('ServicePickerModalMobile', () => {
  it('keeps a draft multi-selection and confirms it from the footer', async () => {
    const { wrapper, services } = mountPicker()

    expect(wrapper.get('[data-testid="service-picker-item-cut"]').attributes('aria-pressed')).toBe(
      'true',
    )
    expect(wrapper.text()).toContain('Selected: 1')
    expect(wrapper.text()).toContain('45 min')
    expect(wrapper.text()).toContain('50.00')

    await wrapper.get('[data-testid="service-picker-item-color"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.text()).toContain('Selected: 2')
    expect(wrapper.text()).toContain('2 h 15 min')
    expect(wrapper.text()).toContain('170.00')

    const done = wrapper.findAll('button').find((button) => button.text().includes('Done'))
    expect(done).toBeDefined()
    await done!.trigger('click')

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([['cut', 'color']])
    expect(wrapper.emitted('select')?.[0]).toEqual([[services[0], services[1]]])
    expect(wrapper.emitted('update:isOpen')?.[0]).toEqual([false])
  })

  it('combines search with the category filter', async () => {
    const { wrapper } = mountPicker()

    wrapper.findComponent({ name: 'IonSegment' }).vm.$emit('update:modelValue', 'nails')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Manicure')
    expect(wrapper.text()).not.toContain('Haircut')

    await wrapper.get('input').setValue('missing')
    expect(wrapper.text()).toContain('No services found')
  })
})
