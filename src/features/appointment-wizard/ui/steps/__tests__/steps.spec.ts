import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import { CalendarDate } from '@internationalized/date'
import type { Client } from '@entities/client'
import type { Service } from '@entities/service'
import { formatsPlugin } from '@shared/lib/formats'
import en from '@shared/lib/i18n/locales/en'
import StepClient from '../StepClient.vue'
import StepServices from '../StepServices.vue'
import StepDateTime from '../StepDateTime.vue'
import StepConfirm from '../StepConfirm.vue'

function makeGlobal() {
  const i18n = createI18n({
    legacy: false,
    locale: 'en',
    messages: { en },
    missingWarn: false,
    fallbackWarn: false,
  })
  return { plugins: [createPinia(), i18n, formatsPlugin] }
}

function makeService(over: Partial<Service> = {}): Service {
  return {
    id: 's1',
    user_id: 'u1',
    category_id: null,
    name: 'Haircut',
    description: null,
    duration: 60,
    price: 1000,
    color: '#000',
    is_active: true,
    sort_order: 0,
    created_at: '',
    updated_at: '',
    ...over,
  }
}

function makeClient(over: Partial<Client> = {}): Client {
  return {
    id: 'c1',
    user_id: 'u1',
    first_name: 'Anna',
    last_name: 'Petrova',
    phone: '+1 555 0100',
    email: null,
    birthday: null,
    notes: null,
    source: 'manual',
    created_at: '',
    updated_at: '',
    ...over,
  }
}

describe('StepClient', () => {
  it('renders clients with name, phone and initials and selects a row', async () => {
    const wrapper = mount(StepClient, {
      props: { modelValue: null, clients: [makeClient()] },
      global: makeGlobal(),
    })

    expect(wrapper.text()).toContain('Anna Petrova')
    expect(wrapper.text()).toContain('+1 555 0100')
    expect(wrapper.text()).toContain('AP')

    await wrapper.find('button[aria-pressed="false"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['c1'])
  })

  it('filters by phone and emits addClient from the plus button', async () => {
    const wrapper = mount(StepClient, {
      props: {
        modelValue: null,
        clients: [makeClient(), makeClient({ id: 'c2', first_name: 'Marie', phone: '+33 123' })],
      },
      global: makeGlobal(),
    })

    await wrapper.find('input').setValue('+33')
    expect(wrapper.text()).toContain('Marie Petrova')
    expect(wrapper.text()).not.toContain('Anna Petrova')

    await wrapper.find(`button[aria-label="${en.quickCreate.appointment.client.add}"]`).trigger('click')
    expect(wrapper.emitted('addClient')).toHaveLength(1)
  })
})

describe('StepServices', () => {
  it('renders service details and color and supports multiple selection', async () => {
    const wrapper = mount(StepServices, {
      props: {
        modelValue: ['s1'],
        services: [
          makeService({ color: '#ef4444' }),
          makeService({ id: 's2', name: 'Color', color: '#3b82f6' }),
        ],
        totalDuration: 0,
        totalPrice: null,
      },
      global: makeGlobal(),
    })

    expect(wrapper.text()).toContain('Haircut')
    expect(wrapper.text()).toContain('1,000')
    expect(wrapper.findAll('button[aria-pressed]')[0]!.attributes('style')).toContain(
      'border-left-color',
    )

    await wrapper.find('button[aria-pressed="false"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([['s1', 's2']])
  })

  it('shows the running duration/price total once services are selected', () => {
    const wrapper = mount(StepServices, {
      props: {
        modelValue: ['s1'],
        services: [makeService()],
        totalDuration: 90,
        totalPrice: 1500,
      },
      global: makeGlobal(),
    })
    expect(wrapper.text()).toContain('90')
    expect(wrapper.text()).toContain('1,500')
  })

  it('hides the total when nothing is selected', () => {
    const wrapper = mount(StepServices, {
      props: { modelValue: [], services: [makeService()], totalDuration: 0, totalPrice: null },
      global: makeGlobal(),
    })
    expect(wrapper.find('[data-testid="services-total"]').exists()).toBe(false)
  })
})

describe('StepDateTime', () => {
  const baseProps = {
    minDate: new CalendarDate(2026, 7, 1),
    isDateUnavailable: () => false,
  }

  it('renders a button per free slot and emits the picked minute', async () => {
    const wrapper = mount(StepDateTime, {
      props: { ...baseProps, date: '2026-07-08', slotMinutes: null, slots: [600, 615] },
      global: { ...makeGlobal(), stubs: { UCalendar: true } },
    })
    const buttons = wrapper.findAll('button')
    expect(wrapper.text()).toContain('10:00')
    expect(wrapper.text()).toContain('10:15')

    await buttons.find((b) => b.text() === '10:00')!.trigger('click')
    expect(wrapper.emitted('update:slotMinutes')?.[0]).toEqual([600])
  })

  it('shows the no-slots message when a busy day has none', () => {
    const wrapper = mount(StepDateTime, {
      props: { ...baseProps, date: '2026-07-08', slotMinutes: null, slots: [] },
      global: { ...makeGlobal(), stubs: { UCalendar: true } },
    })
    expect(wrapper.text()).toContain(en.quickCreate.appointment.dateTime.noSlots)
  })

  it('prompts to pick a date when none is chosen', () => {
    const wrapper = mount(StepDateTime, {
      props: { ...baseProps, date: '', slotMinutes: null, slots: [] },
      global: { ...makeGlobal(), stubs: { UCalendar: true } },
    })
    expect(wrapper.text()).toContain(en.quickCreate.appointment.dateTime.pickDate)
  })
})

describe('StepConfirm', () => {
  function mountConfirm() {
    return mount(StepConfirm, {
      props: {
        clientName: 'Anna Petrova',
        serviceNames: ['Haircut', 'Color'],
        dateLabel: 'Jul 8, 2026',
        timeLabel: '10:00',
        durationMinutes: 90,
        price: 1500,
        notes: '',
      },
      global: makeGlobal(),
    })
  }

  it('renders the full summary', () => {
    const text = mountConfirm().text()
    expect(text).toContain('Anna Petrova')
    expect(text).toContain('Haircut, Color')
    expect(text).toContain('Jul 8, 2026')
    expect(text).toContain('10:00')
    expect(text).toContain('90')
  })

  it('emits price updates and flags the override', async () => {
    const wrapper = mountConfirm()
    await wrapper.find('input[type="number"]').setValue(500)

    expect(wrapper.emitted('update:price')?.[0]).toEqual([500])
    expect(wrapper.emitted('priceInput')).toBeTruthy()
  })
})
