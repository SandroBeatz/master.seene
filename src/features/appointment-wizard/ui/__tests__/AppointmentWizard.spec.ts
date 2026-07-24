import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import type { Client } from '@entities/client'
import type { Service } from '@entities/service'
import { ClientFormDialog } from '@features/client-form'
import { formatsPlugin } from '@shared/lib/formats'
import en from '@shared/lib/i18n/locales/en'

const mocks = vi.hoisted(() => {
  // ref-like: `__v_isRef` makes Vue auto-unwrap `.value` in templates, matching
  // how colada's `data` Ref behaves when passed to child props.
  const refLike = <T>(value: T) => ({ __v_isRef: true, value })
  return {
    clients: refLike([] as Client[]),
    services: refLike([] as Service[]),
    appointments: refLike([] as unknown[]),
    timeBlocks: refLike([] as unknown[]),
    createAppointment: vi.fn<(dto: unknown) => Promise<unknown>>(),
  }
})

// ClientFormDialog renders the emoji picker, whose underlying `vue3-emoji-picker`
// library touches `indexedDB` at import time — unavailable under jsdom. Stub it out
// since this suite only exercises the dialog's `saved` event, not emoji selection.
vi.mock('@shared/ui/emoji-picker-modal', () => ({
  EmojiPickerModal: { name: 'EmojiPickerModal', render: () => null },
}))

vi.mock('@entities/appointment', async () => {
  const busyIntervals = await vi.importActual<
    typeof import('@entities/appointment/model/busy-intervals')
  >('@entities/appointment/model/busy-intervals')
  return {
    useAppointmentsQuery: () => ({ data: mocks.appointments }),
    useCreateAppointmentMutation: () => ({
      mutateAsync: mocks.createAppointment,
      isLoading: { value: false },
    }),
    collectDayBusyIntervals: busyIntervals.collectDayBusyIntervals,
    timeBlockToBusyInterval: busyIntervals.timeBlockToBusyInterval,
  }
})
vi.mock('@entities/client', () => ({
  ClientAvatar: { name: 'ClientAvatar', render: () => null },
  useClientsQuery: () => ({ data: mocks.clients }),
  useCreateClientMutation: () => ({
    mutateAsync: vi.fn<() => Promise<unknown>>(),
    isLoading: { value: false },
  }),
  useUpdateClientMutation: () => ({
    mutateAsync: vi.fn<() => Promise<unknown>>(),
    isLoading: { value: false },
  }),
}))
vi.mock('@entities/service', () => ({
  useServicesQuery: () => ({ data: mocks.services }),
}))
vi.mock('@entities/time-block', () => ({
  useTimeBlocksQuery: () => ({ data: mocks.timeBlocks }),
}))
vi.mock('@entities/session', () => ({
  useSessionStore: () => ({ session: { user: { id: 'u1' } } }),
}))
vi.mock('@entities/master', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@entities/master')>()),
  useMasterPreferencesStore: () => ({
    timeZone: 'UTC',
    calendarSlotStepMinutes: 15,
    preferences: { profile: { schedule: null } },
  }),
}))

import AppointmentWizard from '../AppointmentWizard.vue'
import StepClient from '../steps/StepClient.vue'
import StepServices from '../steps/StepServices.vue'
import StepConfirm from '../steps/StepConfirm.vue'

const CLIENT: Client = {
  id: 'c1',
  user_id: 'u1',
  phone: '+100',
  first_name: 'Anna',
  last_name: 'Petrova',
  email: null,
  birthday: null,
  notes: null,
  emoji: null,
  is_favorite: false,
  source: 'manual',
  created_at: '',
  updated_at: '',
}

const SERVICE: Service = {
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
}

function mountWizard(prefillStartAt?: string) {
  const i18n = createI18n({
    legacy: false,
    locale: 'en',
    messages: { en },
    missingWarn: false,
    fallbackWarn: false,
  })
  return mount(AppointmentWizard, {
    props: prefillStartAt ? { prefill: { startAt: prefillStartAt } } : {},
    global: { plugins: [createPinia(), i18n, formatsPlugin], stubs: { UCalendar: true } },
  })
}

function button(wrapper: ReturnType<typeof mountWizard>, label: string) {
  return wrapper.findAll('button').find((b) => b.text() === label)
}

beforeEach(() => {
  mocks.clients.value = [CLIENT]
  mocks.services.value = [SERVICE]
  mocks.appointments.value = []
  mocks.timeBlocks.value = []
  mocks.createAppointment.mockReset()
  mocks.createAppointment.mockResolvedValue({})
})

describe('AppointmentWizard — gating & slot prefill', () => {
  it('gates Next per step, skips date/time on prefill, and writes a manual DTO', async () => {
    // Prefill 10:00 UTC on a future day → skipDateTime, slot = 600, status confirmed.
    const wrapper = mountWizard('2035-06-11T10:00:00Z')
    const next = en.quickCreate.appointment.next

    // The stepper, footer navigation and gating now live in the modal chrome,
    // driven by the wizard's exposed API.
    const vm = wrapper.vm as unknown as {
      canAdvance: boolean
      footerStats: { label: string }[]
      next: () => void
      submit: () => Promise<void>
    }

    // Step 1 has no footer navigation and advances immediately on selection.
    expect(button(wrapper, next)).toBeUndefined()
    expect(button(wrapper, en.quickCreate.actions.back)).toBeUndefined()
    await wrapper.findComponent(StepClient).vm.$emit('update:modelValue', 'c1')

    // Step 2: Next disabled with 0 services.
    expect(wrapper.findComponent(StepServices).exists()).toBe(true)
    expect(vm.canAdvance).toBe(false)
    await wrapper.findComponent(StepServices).vm.$emit('update:modelValue', ['s1'])
    expect(vm.canAdvance).toBe(true)
    expect(vm.footerStats.map((stat) => stat.label)).toEqual(
      expect.arrayContaining(['1 service', '1h', expect.stringContaining('1,000')]),
    )
    vm.next()
    await wrapper.vm.$nextTick()

    // Skipped Step 3 → Confirm summary.
    expect(wrapper.findComponent(StepConfirm).exists()).toBe(true)
    expect(wrapper.text()).toContain('Anna Petrova')
    expect(wrapper.text()).toContain('Haircut')

    await vm.submit()
    expect(mocks.createAppointment).toHaveBeenCalledTimes(1)
    expect(mocks.createAppointment.mock.calls[0]![0]).toEqual({
      client_id: 'c1',
      service_ids: ['s1'],
      start_at: '2035-06-11T10:00:00.000Z',
      duration: 60,
      price: 1000,
      notes: null,
      source: 'manual',
      status: 'confirmed',
    })
  })

  it('creates a booking on a past day as confirmed too', async () => {
    // Prefill 10:00 UTC on a day that has already passed.
    const wrapper = mountWizard('2020-01-06T10:00:00Z')
    const vm = wrapper.vm as unknown as { next: () => void; submit: () => Promise<void> }

    await wrapper.findComponent(StepClient).vm.$emit('update:modelValue', 'c1')
    await wrapper.findComponent(StepServices).vm.$emit('update:modelValue', ['s1'])
    vm.next()
    await wrapper.vm.$nextTick()

    await vm.submit()
    expect(mocks.createAppointment.mock.calls[0]![0]).toMatchObject({
      start_at: '2020-01-06T10:00:00.000Z',
      status: 'confirmed',
    })
  })

  it('restores the earlier selection when navigating back (skip-aware)', async () => {
    const wrapper = mountWizard('2020-01-06T10:00:00Z')

    await wrapper.findComponent(StepClient).vm.$emit('update:modelValue', 'c1')
    await wrapper.findComponent(StepServices).vm.$emit('update:modelValue', ['s1'])
    ;(wrapper.vm as unknown as { next: () => void }).next()
    await wrapper.vm.$nextTick()
    expect(wrapper.findComponent(StepConfirm).exists()).toBe(true)

    // Back from Confirm skips Step 3 → Step 2 with the service still selected.
    // The back control lives in the modal header now, so drive the wizard's
    // exposed `back()` to exercise the same skip-aware navigation.
    ;(wrapper.vm as unknown as { back: () => void }).back()
    await wrapper.vm.$nextTick()
    const services = wrapper.findComponent(StepServices)
    expect(services.exists()).toBe(true)
    expect(services.props('modelValue')).toEqual(['s1'])
  })

  it('auto-selects a client created in-flow and advances', async () => {
    const wrapper = mountWizard()
    expect(wrapper.findComponent(StepClient).exists()).toBe(true)

    const created: Client = { ...CLIENT, id: 'c2', first_name: 'New' }
    await wrapper.findComponent(ClientFormDialog).vm.$emit('saved', created)

    // Advanced to Services (client selected → step 1 gate cleared).
    expect(wrapper.findComponent(StepServices).exists()).toBe(true)
  })
})
