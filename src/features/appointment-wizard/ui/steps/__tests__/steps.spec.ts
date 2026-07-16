import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import { CalendarDate } from '@internationalized/date'
import { ClientAvatar, type Client } from '@entities/client'
import type { DayState } from '@entities/master'
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
    emoji: null,
    is_favorite: false,
    source: 'manual',
    created_at: '',
    updated_at: '',
    ...over,
  }
}

describe('StepClient', () => {
  it('renders clients with ClientAvatar and selects a row', async () => {
    const wrapper = mount(StepClient, {
      props: { modelValue: null, clients: [makeClient()] },
      global: makeGlobal(),
    })

    expect(wrapper.text()).toContain('Anna Petrova')
    expect(wrapper.text()).toContain('+1 555 0100')
    expect(wrapper.text()).toContain('AP')
    expect(wrapper.findComponent(ClientAvatar).exists()).toBe(true)

    await wrapper.find('button[aria-pressed="false"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['c1'])
  })

  it('separates favorites from all clients without duplicates', () => {
    const wrapper = mount(StepClient, {
      props: {
        modelValue: null,
        clients: [
          makeClient({ id: 'favorite', is_favorite: true }),
          makeClient({ id: 'other', first_name: 'Marie', is_favorite: false }),
        ],
      },
      global: makeGlobal(),
    })

    const favorites = wrapper.get('[data-testid="client-section-favorites"]')
    const allClients = wrapper.get('[data-testid="client-section-all"]')

    expect(favorites.text()).toContain(en.clients.section.favorites)
    expect(favorites.text()).toContain('Anna Petrova')
    expect(favorites.text()).not.toContain('Marie Petrova')
    expect(allClients.text()).toContain(en.quickCreate.appointment.client.allClients)
    expect(allClients.text()).toContain('Marie Petrova')
    expect(allClients.text()).not.toContain('Anna Petrova')
    expect(wrapper.findAllComponents(ClientAvatar)).toHaveLength(2)
    expect(wrapper.findAll('[data-testid="favorite-indicator"]')).toHaveLength(1)
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

    await wrapper
      .find(`button[aria-label="${en.quickCreate.appointment.client.add}"]`)
      .trigger('click')
    expect(wrapper.emitted('addClient')).toHaveLength(1)
  })
})

describe('StepServices', () => {
  it('renders bordered service cards and supports multiple selection', async () => {
    const wrapper = mount(StepServices, {
      props: {
        modelValue: ['s1'],
        services: [
          makeService({ color: '#ef4444' }),
          makeService({ id: 's2', name: 'Color', color: '#3b82f6' }),
        ],
      },
      global: makeGlobal(),
    })

    expect(wrapper.text()).toContain('Haircut')
    expect(wrapper.text()).toContain('1,000')
    const serviceItems = wrapper.findAll('[data-testid="service-item"]')
    expect(serviceItems).toHaveLength(2)
    const selectedCard = serviceItems[0]!.element.parentElement?.parentElement
    expect(selectedCard?.classList.contains('border-2')).toBe(true)
    expect(
      selectedCard?.querySelector('[data-testid="service-color"]')?.getAttribute('style'),
    ).toContain('background-color')
    expect(serviceItems[0]!.attributes('data-state')).toBe('checked')
    expect(serviceItems[1]!.attributes('data-state')).toBe('unchecked')

    await serviceItems[1]!.trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([['s1', 's2']])
  })

  it('filters by category and combines it with search', async () => {
    const wrapper = mount(StepServices, {
      props: {
        modelValue: [],
        services: [
          makeService({
            name: 'Classic lashes',
            category_id: 'lashes',
            category: { id: 'lashes', name: 'Lashes' },
          }),
          makeService({
            id: 's2',
            name: 'Lash tint',
            category_id: 'lashes',
            category: { id: 'lashes', name: 'Lashes' },
          }),
          makeService({
            id: 's3',
            name: 'Gel manicure',
            category_id: 'nails',
            category: { id: 'nails', name: 'Nails' },
          }),
          makeService({ id: 's4', name: 'Uncategorized', category: null }),
        ],
      },
      global: makeGlobal(),
    })

    expect(wrapper.findAll('[data-testid="service-category-lashes"]')).toHaveLength(1)
    await wrapper.get('[data-testid="service-category-lashes"]').trigger('click')
    expect(wrapper.text()).toContain('Classic lashes')
    expect(wrapper.text()).toContain('Lash tint')
    expect(wrapper.text()).not.toContain('Gel manicure')
    expect(wrapper.text()).not.toContain('Uncategorized')

    await wrapper.get('input').setValue('classic')
    expect(wrapper.findAll('[data-testid="service-item"]')).toHaveLength(1)
    expect(wrapper.text()).toContain('Classic lashes')

    await wrapper.get('input').setValue('')
    await wrapper.get('[data-testid="service-category-all"]').trigger('click')
    expect(wrapper.findAll('[data-testid="service-item"]')).toHaveLength(4)
  })

  it('never renders the duplicate services total', () => {
    const wrapper = mount(StepServices, {
      props: { modelValue: ['s1'], services: [makeService()] },
      global: makeGlobal(),
    })
    expect(wrapper.find('[data-testid="services-total"]').exists()).toBe(false)
  })
})

describe('StepDateTime', () => {
  const baseProps = {
    minDate: new CalendarDate(2026, 7, 1),
    dayState: (): DayState => 'full',
    manualTimeOptions: [
      { value: 600, label: '10:00' },
      { value: 1080, label: '18:00' },
    ],
    timeOffs: [] as { label: string; notes: string | null }[],
    hasConflict: false,
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

  it('groups slots by part of day with section headers', () => {
    const wrapper = mount(StepDateTime, {
      // 09:00 (morning), 14:00 (afternoon), 18:00 (evening)
      props: { ...baseProps, date: '2026-07-08', slotMinutes: null, slots: [540, 840, 1080] },
      global: { ...makeGlobal(), stubs: { UCalendar: true } },
    })
    const text = wrapper.text()
    expect(text).toContain(en.quickCreate.appointment.dateTime.groups.morning)
    expect(text).toContain(en.quickCreate.appointment.dateTime.groups.day)
    expect(text).toContain(en.quickCreate.appointment.dateTime.groups.evening)
  })

  it('shows the no-slots message when a busy day has none', () => {
    const wrapper = mount(StepDateTime, {
      props: { ...baseProps, date: '2026-07-08', slotMinutes: null, slots: [] },
      global: { ...makeGlobal(), stubs: { UCalendar: true } },
    })
    expect(wrapper.text()).toContain(en.quickCreate.appointment.dateTime.noSlots)
  })

  it('shows the day-off message on a non-working day', () => {
    const wrapper = mount(StepDateTime, {
      props: {
        ...baseProps,
        dayState: (): DayState => 'day-off',
        date: '2026-07-05',
        slotMinutes: null,
        slots: [],
      },
      global: { ...makeGlobal(), stubs: { UCalendar: true } },
    })
    expect(wrapper.text()).toContain(en.quickCreate.appointment.dateTime.dayOff)
  })

  it('reveals the manual time picker, which is available even with free slots', async () => {
    const wrapper = mount(StepDateTime, {
      props: { ...baseProps, date: '2026-07-08', slotMinutes: null, slots: [600] },
      global: { ...makeGlobal(), stubs: { UCalendar: true } },
    })
    const manualButton = wrapper
      .findAll('button')
      .find((b) => b.text() === en.quickCreate.appointment.dateTime.manual)
    expect(manualButton).toBeTruthy()

    await manualButton!.trigger('click')
    // The manual link is replaced by the time picker (placeholder visible).
    expect(wrapper.text()).toContain(en.quickCreate.appointment.dateTime.selectTime)
    expect(
      wrapper
        .findAll('button')
        .some((b) => b.text() === en.quickCreate.appointment.dateTime.manual),
    ).toBe(false)
  })

  it('shows the past-day alert instead of slots for a day already passed', () => {
    const wrapper = mount(StepDateTime, {
      // Before minDate (2026-07-01) → past day.
      props: { ...baseProps, date: '2026-06-20', slotMinutes: null, slots: [600, 615] },
      global: { ...makeGlobal(), stubs: { UCalendar: true } },
    })
    expect(wrapper.text()).toContain(en.quickCreate.appointment.dateTime.past.title)
    // Slot buttons are replaced by the alert.
    expect(wrapper.findAll('button').some((b) => b.text() === '10:00')).toBe(false)
  })

  it('lists time offs that touch the selected day', () => {
    const wrapper = mount(StepDateTime, {
      props: {
        ...baseProps,
        date: '2026-07-08',
        slotMinutes: null,
        slots: [],
        timeOffs: [{ label: '13:00 – 14:00', notes: 'Lunch' }],
      },
      global: { ...makeGlobal(), stubs: { UCalendar: true } },
    })
    expect(wrapper.text()).toContain(en.quickCreate.appointment.dateTime.timeOff)
    expect(wrapper.text()).toContain('13:00 – 14:00')
    expect(wrapper.text()).toContain('Lunch')
  })

  it('surfaces a non-blocking conflict warning for the chosen time', () => {
    const wrapper = mount(StepDateTime, {
      props: { ...baseProps, date: '2026-07-08', slotMinutes: 1080, slots: [], hasConflict: true },
      global: { ...makeGlobal(), stubs: { UCalendar: true } },
    })
    expect(wrapper.text()).toContain(en.quickCreate.appointment.dateTime.conflict)
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
