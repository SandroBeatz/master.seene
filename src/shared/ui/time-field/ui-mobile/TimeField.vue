<script setup lang="ts">
import { computed } from 'vue'
import { IonButton, IonDatetime, IonPopover } from '@ionic/vue'
import { useFormats } from '@shared/lib/formats'

// Native Ionic counterpart of the desktop TimeField (shared/ui/time-field). A
// compact trigger button showing the formatted time that opens an ion-datetime
// time wheel in a popover. Same 'HH:mm' contract as the desktop control, so the
// working-hours model logic is reused verbatim. Kept out of shared/ui/index.ts
// (Nuxt UI) — import via @shared/ui/time-field/index.mobile in the mobile bundle.
defineOptions({ name: 'TimeFieldMobile', inheritAttrs: false })

const props = defineProps<{
  /** Bound value as a 24h `'HH:mm'` string. */
  modelValue: string
  /** Inclusive lower bound `'HH:mm'`. */
  min?: string
  /** Inclusive upper bound `'HH:mm'`. */
  max?: string
  disabled?: boolean
  ariaLabel?: string
}>()

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const formats = useFormats()

// ion-datetime works in ISO; we pin every value to one reference date so only the
// time portion matters. 'HH:mm' <-> ISO conversion lives entirely at this edge.
const REF_DATE = '2000-01-01'
const toIso = (hhmm: string) => `${REF_DATE}T${hhmm}:00`
const fromIso = (iso: string) => iso.slice(11, 16)

const label = computed(() => formats.time(props.modelValue))
const isoValue = computed(() => toIso(props.modelValue))
const isoMin = computed(() => (props.min ? toIso(props.min) : undefined))
const isoMax = computed(() => (props.max ? toIso(props.max) : undefined))

// The wheel's hour cycle should follow the master's 12/24h preference. Probing a
// formatted sample avoids importing the preferences store into the shared layer.
const hourCycle = computed(() => (/[AaPp][Mm]/.test(formats.time('13:00')) ? 'h12' : 'h23'))

// 5-minute grid, matching the desktop native <input type="time"> step.
const minuteValues = '0,5,10,15,20,25,30,35,40,45,50,55'

// Each instance needs a stable, unique id to anchor its own popover.
const triggerId = `time-field-${Math.random().toString(36).slice(2)}`

function onChange(event: CustomEvent) {
  const value = event.detail.value
  if (typeof value === 'string' && value.length >= 16) {
    emit('update:modelValue', fromIso(value))
  }
}
</script>

<template>
  <ion-button
    :id="triggerId"
    class="time-trigger"
    fill="clear"
    size="small"
    :disabled="disabled"
    :aria-label="ariaLabel"
  >
    {{ label }}
  </ion-button>
  <ion-popover :trigger="triggerId" trigger-action="click" :keep-contents-mounted="true">
    <ion-datetime
      presentation="time"
      :prefer-wheel="true"
      :hour-cycle="hourCycle"
      :minute-values="minuteValues"
      :value="isoValue"
      :min="isoMin"
      :max="isoMax"
      @ion-change="onChange"
    />
  </ion-popover>
</template>

<style scoped>
.time-trigger {
  margin: 0;
  --padding-start: 8px;
  --padding-end: 8px;
  --color: var(--ion-text-color);
  font-size: 0.95rem;
  font-variant-numeric: tabular-nums;
}
</style>
