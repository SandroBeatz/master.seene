import {
  AsYouType,
  getCountryCallingCode,
  isSupportedCountry,
  type CountryCode,
} from 'libphonenumber-js'

export interface PhoneFieldState {
  country?: CountryCode
  displayValue: string
  modelValue: string
  nationalDigits: string
  valid: boolean
}

export function toSupportedCountry(value?: string | null): CountryCode | undefined {
  const code = value?.trim().toUpperCase()
  return code && isSupportedCountry(code) ? code : undefined
}

function normalizedInternationalInput(value: string): string {
  const digits = value.replace(/\D/g, '')
  return digits ? `+${digits}` : ''
}

function selectedCountryMatchesCallingCode(value: string, country?: CountryCode): boolean {
  if (!country || !value.startsWith('+')) return false
  const callingCode = getCountryCallingCode(country)
  return value === `+${callingCode}` || value.startsWith(`+${callingCode}`)
}

/**
 * Normalizes a phone-field edit without guessing a country for shared calling codes.
 * Invalid and incomplete input remains visible, while only international values are
 * exposed through v-model.
 */
export function resolvePhoneInput(
  value: string,
  selectedCountry?: CountryCode,
): PhoneFieldState {
  const trimmed = value.trim()

  if (!trimmed) {
    return {
      country: selectedCountry,
      displayValue: '',
      modelValue: '',
      nationalDigits: '',
      valid: false,
    }
  }

  if (trimmed.startsWith('+')) {
    const normalized = normalizedInternationalInput(trimmed)
    if (!normalized) {
      return {
        displayValue: '+',
        modelValue: '',
        nationalDigits: '',
        valid: false,
      }
    }

    const typer = new AsYouType()
    const displayValue = typer.input(normalized)
    const phoneNumber = typer.getNumber()
    const detectedCountry = typer.getCountry()
    const compatibleSelectedCountry = selectedCountryMatchesCallingCode(
      normalized,
      selectedCountry,
    )
      ? selectedCountry
      : undefined

    return {
      country: detectedCountry ?? compatibleSelectedCountry,
      displayValue,
      modelValue: phoneNumber?.number ?? normalized,
      nationalDigits: typer.getNationalNumber(),
      valid: phoneNumber?.isValid() ?? false,
    }
  }

  const nationalDigits = trimmed.replace(/\D/g, '')
  if (!selectedCountry) {
    return {
      displayValue: nationalDigits,
      modelValue: '',
      nationalDigits,
      valid: false,
    }
  }

  const normalized = nationalDigits
    ? `+${getCountryCallingCode(selectedCountry)}${nationalDigits}`
    : ''
  const typer = new AsYouType()
  const displayValue = normalized ? typer.input(normalized) : ''
  const phoneNumber = typer.getNumber()

  return {
    country: typer.getCountry() ?? selectedCountry,
    displayValue,
    modelValue: phoneNumber?.number ?? normalized,
    nationalDigits,
    valid: phoneNumber?.isValid() ?? false,
  }
}

/** Existing E.164 value wins, then an explicit profile country, then locale. */
export function resolveInitialCountry(
  value: string,
  preferredCountry?: string | null,
  localeCountry?: string | null,
): CountryCode | undefined {
  if (value.trim().startsWith('+')) return resolvePhoneInput(value).country

  return toSupportedCountry(preferredCountry) ?? toSupportedCountry(localeCountry)
}

/** Keeps the national digits when the user deliberately changes the picker. */
export function applyCountrySelection(
  currentValue: string,
  currentCountry: CountryCode | undefined,
  nextCountry: CountryCode,
): PhoneFieldState {
  const current = resolvePhoneInput(currentValue, currentCountry)
  return resolvePhoneInput(current.nationalDigits, nextCountry)
}
