<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useFormats } from '@shared/lib/formats'
import { useMediaQuery } from '@shared/lib/media-query'
import { NATIVE_STEP_SECONDS, buildTimeOptions } from './options'

defineOptions({ name: 'TimeField', inheritAttrs: false })

const props = defineProps<{
  /** Bound value as a 24h `'HH:mm'` string. */
  modelValue: string
  /** Inclusive lower bound `'HH:mm'` (e.g. a break cannot start before the day opens). */
  min?: string
  /** Inclusive upper bound `'HH:mm'`. */
  max?: string
  disabled?: boolean
  ariaLabel?: string
}>()

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const { t } = useI18n()
const formats = useFormats()

// Desktop (≥ sm) shows a 15-minute select; below that, the native OS time picker
// (5-minute step) — the best input on touch devices.
const isDesktop = useMediaQuery('(min-width: 640px)')

const options = computed(() =>
  buildTimeOptions({ min: props.min, max: props.max, current: props.modelValue }).map((value) => ({
    value,
    label: formats.time(value),
  })),
)

function onUpdate(value: unknown) {
  if (typeof value === 'string' && value) emit('update:modelValue', value)
}
</script>

<template>
  <USelectMenu
    v-if="isDesktop"
    :model-value="modelValue"
    :items="options"
    value-key="value"
    :disabled="disabled"
    :aria-label="ariaLabel"
    icon="i-lucide-clock"
    :search-input="{ placeholder: t('timeField.searchPlaceholder') }"
    class="w-full"
    @update:model-value="onUpdate"
  />
  <UInput
    v-else
    type="time"
    :model-value="modelValue"
    :min="min"
    :max="max"
    :step="NATIVE_STEP_SECONDS"
    :disabled="disabled"
    :aria-label="ariaLabel"
    class="w-full"
    @update:model-value="onUpdate"
  />
</template>
