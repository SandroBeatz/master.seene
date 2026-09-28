import { describe, expect, it } from 'vitest'
import {
  applyCountrySelection,
  resolveInitialCountry,
  resolvePhoneInput,
} from '../model/phone-field'

describe('phone field model', () => {
  it('uses an existing E.164 number before profile and locale countries', () => {
    expect(resolveInitialCountry('+996555123456', 'FR', 'US')).toBe('KG')
    expect(resolveInitialCountry('+33612345678', 'KG', 'US')).toBe('FR')
  })

  it('falls back from profile country to locale and then to neutral', () => {
    expect(resolveInitialCountry('', 'KG', 'US')).toBe('KG')
    expect(resolveInitialCountry('', undefined, 'fr-FR')).toBeUndefined()
    expect(resolveInitialCountry('', undefined, 'FR')).toBe('FR')
    expect(resolveInitialCountry('', undefined, undefined)).toBeUndefined()
  })

  it('normalizes a pasted number, formats it and detects its country', () => {
    const state = resolvePhoneInput('+996 (555) 123-456')

    expect(state.country).toBe('KG')
    expect(state.modelValue).toBe('+996555123456')
    expect(state.displayValue).toBe('+996 555 123 456')
    expect(state.valid).toBe(true)
  })

  it('switches country as soon as an international calling code is unambiguous', () => {
    expect(resolvePhoneInput('+33').country).toBe('FR')
    expect(resolvePhoneInput('+996').country).toBe('KG')
  })

  it('does not guess countries for shared calling codes', () => {
    expect(resolvePhoneInput('+7').country).toBeUndefined()
    expect(resolvePhoneInput('+1').country).toBeUndefined()
    expect(resolveInitialCountry('+7', 'RU', 'KZ')).toBeUndefined()
    expect(resolveInitialCountry('+1', 'US', 'CA')).toBeUndefined()
    expect(resolvePhoneInput('+7', 'KZ').country).toBe('KZ')
    expect(resolvePhoneInput('+1', 'CA').country).toBe('CA')
  })

  it('refines shared calling codes when enough digits are available', () => {
    expect(resolvePhoneInput('+79991234567', 'KZ').country).toBe('RU')
    expect(resolvePhoneInput('+77001234567', 'RU').country).toBe('KZ')
    expect(resolvePhoneInput('+12025550123', 'CA').country).toBe('US')
  })

  it('preserves incomplete digits without exposing a non-international model value', () => {
    const neutral = resolvePhoneInput('555')
    expect(neutral.displayValue).toBe('555')
    expect(neutral.modelValue).toBe('')
    expect(neutral.nationalDigits).toBe('555')
    expect(neutral.valid).toBe(false)

    const incomplete = resolvePhoneInput('+996 55')
    expect(incomplete.modelValue).toBe('+99655')
    expect(incomplete.nationalDigits).toBe('55')
    expect(incomplete.valid).toBe(false)
  })

  it('keeps national digits when the country is changed manually', () => {
    const state = applyCountrySelection('+33 6 12 34 56 78', 'FR', 'KG')

    expect(state.country).toBe('KG')
    expect(state.modelValue).toBe('+996612345678')
    expect(state.nationalDigits).toBe('612345678')
  })
})
