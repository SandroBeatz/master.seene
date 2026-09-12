<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { IonItem, IonLabel, IonInput, IonIcon } from '@ionic/vue'
import { chevronDownOutline } from 'ionicons/icons'
import {
  AsYouType,
  getCountryCallingCode,
  isSupportedCountry,
  parsePhoneNumber,
  type CountryCode,
} from 'libphonenumber-js'
import { COUNTRIES } from '@shared/lib/countries'
import { ListPickerModal } from '@shared/ui/list-picker-modal/index.mobile'

// Native Ionic phone field. Uses `ion-input` for the UI (so it inherits the
// list/theme/keyboard exactly like every other row) while the phone *logic* —
// live "as-you-type" formatting, validation and E.164 normalization — comes
// straight from `libphonenumber-js` (the same engine vue-tel-input wraps).
//
// v-model is the stored E.164 string ('+79991234567'); the field keeps the
// national number + selected country internally and rebuilds E.164 from them.
// A leading button opens a country picker (reusing ListPickerModal), which sets
// the dial code used for formatting/validation.
//
// Mobile-only: exposed via @shared/ui/phone-field/index.mobile — never import
// the plain index from the desktop (Nuxt UI) build.
const props = withDefaults(
  defineProps<{
    /** Stored value in E.164 form, e.g. '+79991234567'. */
    modelValue: string
    /** Country used to format/validate a number typed without a '+' prefix. */
    defaultCountry?: CountryCode
    placeholder?: string
    /** Optional label rendered on the left, matching the other list rows. */
    label?: string
    /** Paints the row in the invalid (danger) state — drive it from the parent. */
    invalid?: boolean
    /** Card modal presenting element; auto-resolved to ion-router-outlet if omitted. */
    presentingElement?: HTMLElement | null
  }>(),
  { defaultCountry: 'RU', placeholder: '', label: '', invalid: false, presentingElement: null },
)

const emit = defineEmits<{
  'update:modelValue': [string]
  validate: [{ valid: boolean }]
}>()

const { t } = useI18n()

// Source of truth held by the field: selected country + the raw national digits.
const country = ref<CountryCode>(props.defaultCountry)
const nationalDigits = ref('')

const callingCode = computed(() => getCountryCallingCode(country.value))

// flag-icons class for the selected country, e.g. 'fi-ru' (codes are lowercase).
const flagClass = computed(() => `fi-${country.value.toLowerCase()}`)

// International number rebuilt from the two pieces, e.g. '+79991234567'.
const e164 = computed(() =>
  nationalDigits.value ? `+${callingCode.value}${nationalDigits.value}` : '',
)

// What the input shows: the full international number, formatted as-you-type,
// e.g. '+7 999 123 45 67'. The calling code is part of the value so the number
// always reads complete (the flag button on the left only picks the country).
const display = computed(() => {
  if (!nationalDigits.value) return ''
  return new AsYouType(country.value).input(e164.value)
})

function isValid(): boolean {
  if (!e164.value) return false
  try {
    return parsePhoneNumber(e164.value)?.isValid() ?? false
  } catch {
    return false
  }
}

// Guards the modelValue watcher against echoing our own emit back into a reseed.
let lastEmitted = ''

function emitChange() {
  lastEmitted = e164.value
  emit('update:modelValue', e164.value)
  emit('validate', { valid: isValid() })
}

function onInput(event: CustomEvent) {
  const value = (event.detail as { value?: string | null }).value ?? ''
  // The field shows the full international number, so what comes back carries the
  // calling code. Let AsYouType parse it: it detects the country from the '+code'
  // prefix and yields the national digits, keeping country + number in sync.
  const typer = new AsYouType(country.value)
  typer.input(value)
  const number = typer.getNumber()
  if (number) {
    if (number.country) country.value = number.country
    nationalDigits.value = number.nationalNumber
    emitChange()
    return
  }
  // Incomplete number: fall back to raw digits, dropping a leading calling code
  // so we don't fold it into the national part.
  let digits = value.replace(/\D/g, '')
  if (digits.startsWith(callingCode.value)) digits = digits.slice(callingCode.value.length)
  nationalDigits.value = digits
  emitChange()
}

// --- Country picker -----------------------------------------------------------
const isPickerOpen = ref(false)

// COUNTRIES restricted to codes libphonenumber can dial, labelled with their
// calling code, e.g. "Russia (+7)".
const countryItems = computed(() =>
  COUNTRIES.filter((c) => isSupportedCountry(c.value)).map((c) => ({
    value: c.value,
    label: `${c.label} (+${getCountryCallingCode(c.value as CountryCode)})`,
  })),
)

function onCountrySelected(value: string | number) {
  country.value = String(value) as CountryCode
  // Dial code changed, so the E.164 changed even if the digits didn't.
  emitChange()
}

// The tab's router outlet makes the picker animate as an iOS card modal.
const resolvedPresenting = ref<HTMLElement | null>(props.presentingElement)
onMounted(() => {
  if (!resolvedPresenting.value) {
    resolvedPresenting.value = document.querySelector('ion-router-outlet')
  }
})

// --- Seed from the bound value (no emit, so it can't dirty the form) ----------
watch(
  () => props.modelValue,
  (value) => {
    if (value === lastEmitted) return
    if (!value) {
      nationalDigits.value = ''
      return
    }
    try {
      const parsed = parsePhoneNumber(value)
      if (parsed) {
        country.value = parsed.country ?? country.value
        nationalDigits.value = parsed.nationalNumber
        return
      }
    } catch {
      /* fall through to raw digits */
    }
    nationalDigits.value = value.replace(/\D/g, '')
  },
  { immediate: true },
)
</script>

<template>
  <ion-item :class="{ 'pf-invalid': invalid, 'ion-invalid': invalid, 'ion-touched': invalid }">
    <ion-label v-if="label" class="pf-label">{{ label }}</ion-label>

    <button
      type="button"
      class="pf-flag"
      :aria-label="t('settings.contacts.address.country')"
      @click="isPickerOpen = true"
    >
      <span class="fi fis pf-flag-icon" :class="flagClass" />
      <ion-icon :icon="chevronDownOutline" aria-hidden="true" />
    </button>

    <ion-input
      class="pf-input"
      type="tel"
      inputmode="tel"
      autocomplete="tel"
      :value="display"
      :placeholder="placeholder"
      @ion-input="onInput"
    />

    <list-picker-modal
      v-model:is-open="isPickerOpen"
      :title="t('settings.contacts.address.country')"
      :items="countryItems"
      :model-value="country"
      searchable
      :presenting-element="resolvedPresenting"
      @update:model-value="onCountrySelected"
    />
  </ion-item>
</template>

<style scoped>
.pf-label {
  flex: 0 0 auto;
  margin-inline-end: 12px;
  color: var(--ion-color-medium);
  font-size: 0.95rem;
  white-space: nowrap;
}

/* Flag button — sits right after the label and opens the country picker. */
.pf-flag {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  margin-inline-end: 8px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
}

/* Circular flag: `.fis` makes flag-icons render a square (1:1) flag, which we
   then clip to a circle so every country reads as a round badge. */
.pf-flag-icon {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  box-shadow: inset 0 0 0 1px rgb(0 0 0 / 10%);
}

.pf-flag ion-icon {
  font-size: 13px;
  color: var(--ion-color-medium);
}

.pf-flag:active {
  opacity: 0.6;
}

/* Full international number, right-aligned like the other value rows. */
.pf-input {
  flex: 1 1 auto;
  text-align: end;
  --color: var(--ion-text-color);
  --padding-start: 0;
  --padding-end: 0;
  --placeholder-color: var(--ion-color-medium);
  --placeholder-opacity: 1;
}

/* Invalid state: tint the number danger so the row reads as errored. */
.pf-invalid .pf-input {
  --color: var(--ion-color-danger);
}
</style>
