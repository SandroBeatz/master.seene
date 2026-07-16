import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { formatsPlugin } from '@shared/lib/formats'
import TimeField from '../TimeField.vue'

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  missingWarn: false,
  fallbackWarn: false,
  messages: { en: { timeField: { searchPlaceholder: 'Type a time…' } } },
})

function setViewport(isDesktop: boolean) {
  window.matchMedia = vi.fn<typeof window.matchMedia>().mockImplementation((query: string) => ({
    matches: isDesktop,
    media: query,
    onchange: null,
    addEventListener: vi.fn<MediaQueryList['addEventListener']>(),
    removeEventListener: vi.fn<MediaQueryList['removeEventListener']>(),
    addListener: vi.fn<MediaQueryList['addListener']>(),
    removeListener: vi.fn<MediaQueryList['removeListener']>(),
    dispatchEvent: vi.fn<MediaQueryList['dispatchEvent']>(),
  }))
}

function mountField(props: Record<string, unknown> = {}) {
  return mount(TimeField, {
    props: { modelValue: '10:00', ...props },
    global: {
      plugins: [i18n, [formatsPlugin, { getTimeFormat: () => 24 }]],
    },
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('TimeField', () => {
  it('renders the desktop select (not a native time input) and shows the value', () => {
    setViewport(true)
    const wrapper = mountField({ min: '09:00', max: '11:00', modelValue: '10:00' })

    // Closed SelectMenu trigger is a listbox button — no native time input.
    expect(wrapper.find('input[type="time"]').exists()).toBe(false)
    expect(wrapper.find('button[aria-haspopup="listbox"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('10:00')
  })

  it('renders the native time input with a 5-minute step and bounds on mobile', () => {
    setViewport(false)
    const wrapper = mountField({ min: '09:00', max: '18:00', modelValue: '10:00' })

    const input = wrapper.find('input[type="time"]')
    expect(input.exists()).toBe(true)
    expect(input.attributes('step')).toBe('300')
    expect(input.attributes('min')).toBe('09:00')
    expect(input.attributes('max')).toBe('18:00')
    expect(wrapper.find('button[aria-haspopup="listbox"]').exists()).toBe(false)
  })

  it('emits update:modelValue with the chosen time', async () => {
    setViewport(false)
    const wrapper = mountField()

    await wrapper.find('input[type="time"]').setValue('11:30')

    const emitted = wrapper.emitted('update:modelValue') ?? []
    expect(emitted[emitted.length - 1]).toEqual(['11:30'])
  })

  it('does not emit for an empty value (so the field is not cleared)', async () => {
    setViewport(false)
    const wrapper = mountField()

    await wrapper.find('input[type="time"]').setValue('')

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })
})
