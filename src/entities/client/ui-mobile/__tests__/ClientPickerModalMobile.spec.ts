import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import en from '@shared/lib/i18n/locales/en'
import type { Client } from '../../model/types'
import ClientPickerModalMobile from '../ClientPickerModalMobile.vue'

function client(id: string, firstName: string, favorite = false): Client {
  return {
    id,
    user_id: 'user-1',
    phone: `+1000000000${id}`,
    first_name: firstName,
    last_name: null,
    email: null,
    birthday: null,
    notes: null,
    emoji: null,
    is_favorite: favorite,
    source: 'manual',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  }
}

const passthrough = { template: '<div><slot /></div>' }

function mountPicker() {
  const clients = [client('1', 'Zoe'), client('2', 'Anna', true), client('3', 'Marie')]
  const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })

  const wrapper = mount(ClientPickerModalMobile, {
    props: {
      isOpen: true,
      clients,
      modelValue: '3',
    },
    global: {
      plugins: [i18n],
      stubs: {
        IonAvatar: passthrough,
        IonButton: { template: '<button><slot name="icon-only" /><slot /></button>' },
        IonButtons: passthrough,
        IonContent: passthrough,
        IonHeader: passthrough,
        IonIcon: { template: '<span class="icon-stub" />' },
        IonItem: {
          template:
            '<button class="client-item-stub"><slot name="start" /><slot /><slot name="end" /></button>',
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
        IonTitle: passthrough,
        IonToolbar: passthrough,
        InsetList: {
          props: ['header'],
          template: '<section class="inset-list-stub"><h2>{{ header }}</h2><slot /></section>',
        },
      },
    },
  })

  return { wrapper, clients }
}

describe('ClientPickerModalMobile', () => {
  it('groups clients and marks the current selection', () => {
    const { wrapper } = mountPicker()

    const favorites = wrapper.get('[data-testid="client-picker-section-favorites"]')
    const others = wrapper.get('[data-testid="client-picker-section-others"]')

    expect(favorites.text()).toContain('Anna')
    expect(favorites.text()).not.toContain('Marie')
    expect(others.text()).toContain('Marie')
    expect(others.text()).toContain('Zoe')
    expect(wrapper.get('[aria-pressed="true"]').text()).toContain('Marie')
  })

  it('filters by name and emits the selected client', async () => {
    const { wrapper, clients } = mountPicker()

    await wrapper.get('input').setValue('Anna')
    expect(wrapper.text()).toContain('Anna')
    expect(wrapper.text()).not.toContain('Marie')

    await wrapper.get('.client-item-stub').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['2'])
    expect(wrapper.emitted('select')?.[0]).toEqual([clients[1]])
    expect(wrapper.emitted('update:isOpen')?.[0]).toEqual([false])
  })
})
