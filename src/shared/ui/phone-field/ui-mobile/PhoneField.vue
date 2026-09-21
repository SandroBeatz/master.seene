<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { IonItem, IonLabel, IonInput, IonIcon } from '@ionic/vue'
import { chevronDownOutline, globeOutline } from 'ionicons/icons'
import { getCountryCallingCode, isSupportedCountry, type CountryCode } from 'libphonenumber-js'
import { COUNTRIES, detectCountry } from '@shared/lib/countries'
import { ListPickerModal } from '@shared/ui/list-picker-modal/index.mobile'
import {
  applyCountrySelection,
  resolveInitialCountry,
  resolvePhoneInput,
  toSupportedCountry,
  type PhoneFieldState,
} from '../model/phone-field'

// Native Ionic phone field. Uses `ion-input` for the UI (so it inherits the
// list/theme/keyboard exactly like every other row) while the phone *logic* —
// live "as-you-type" formatting, validation and E.164 normalization — comes
// straight from `libphonenumber-js` (the same engine vue-tel-input wraps).
//
// v-model is the normalized international string ('+79991234567'). The field
// also keeps the formatted draft locally so incomplete input is never lost.
// A leading button opens a country picker (reusing ListPickerModal); when no
// country can be derived from the value, profile country, or locale it shows a
// neutral globe instead of guessing.
//
// Mobile-only: exposed via @shared/ui/phone-field/index.mobile — never import
// the plain index from the desktop (Nuxt UI) build.
const props = withDefaults(
  defineProps<{
    /** Stored value in E.164 form, e.g. '+79991234567'. */
    modelValue: string
    /** Country used to format/validate a number typed without a '+' prefix. */
    defaultCountry?: string
    placeholder?: string
    /** Optional label rendered on the left, matching the other list rows. */
    label?: string
    /** Paints the row in the invalid (danger) state — drive it from the parent. */
    invalid?: boolean
    /** Card modal presenting element; auto-resolved to ion-router-outlet if omitted. */
    presentingElement?: HTMLElement | null
  }>(),
  { placeholder: '', label: '', invalid: false, presentingElement: null },
)

const emit = defineEmits<{
  'update:modelValue': [string]
  validate: [{ valid: boolean }]
}>()

const { t } = useI18n()

const localeCountry = detectCountry()
const country = ref<CountryCode | undefined>(
  resolveInitialCountry(props.modelValue, props.defaultCountry, localeCountry),
)
const display = ref('')
const hasUserSelectedCountry = ref(false)

// flag-icons class for the selected country, e.g. 'fi-ru' (codes are lowercase).
const flagClass = computed(() => (country.value ? `fi-${country.value.toLowerCase()}` : ''))

// Guards the modelValue watcher against echoing our own emit back into a reseed.
let lastEmitted = ''

function applyState(state: PhoneFieldState, shouldEmit = true) {
  country.value = state.country
  display.value = state.displayValue

  if (!shouldEmit) {
    emit('validate', { valid: state.valid })
    return
  }

  lastEmitted = state.modelValue
  emit('update:modelValue', state.modelValue)
  emit('validate', { valid: state.valid })
}

function onInput(event: CustomEvent) {
  const value = (event.detail as { value?: string | null }).value ?? ''
  applyState(resolvePhoneInput(value, country.value))
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
  const nextCountry = toSupportedCountry(String(value))
  if (!nextCountry) return
  hasUserSelectedCountry.value = true
  applyState(applyCountrySelection(display.value, country.value, nextCountry))
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
    hasUserSelectedCountry.value = false
    const initialCountry = resolveInitialCountry(value, props.defaultCountry, localeCountry)
    applyState(resolvePhoneInput(value, initialCountry), false)
  },
  { immediate: true },
)

watch(
  () => props.defaultCountry,
  (value) => {
    if (props.modelValue || display.value || hasUserSelectedCountry.value) return
    country.value = resolveInitialCountry('', value, localeCountry)
  },
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
      <span v-if="country" class="fi fis pf-flag-icon" :class="flagClass" />
      <ion-icon v-else class="pf-neutral-icon" :icon="globeOutline" aria-hidden="true" />
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
      :model-value="country ?? ''"
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

.pf-flag .pf-neutral-icon {
  width: 24px;
  height: 24px;
  font-size: 22px;
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
