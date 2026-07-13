<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useFormats } from '@shared/lib/formats'
import { priceToNumber, sanitizePrice } from './parse'

const props = withDefaults(
  defineProps<{
    modelValue: number | null
    /** ISO currency code to override the master's active currency. */
    currency?: string
    disabled?: boolean
    placeholder?: string
  }>(),
  {
    modelValue: null,
    currency: undefined,
    disabled: false,
    placeholder: '0',
  },
)

const emit = defineEmits<{ 'update:modelValue': [number | null] }>()

const f = useFormats()
const currency = computed(() => f.currency(props.currency))

// Local text mirror so the field can hold intermediate states like "12." while
// the parent only ever sees a clean number | null.
const text = ref(props.modelValue == null ? '' : String(props.modelValue))

watch(
  () => props.modelValue,
  (val) => {
    if (val !== priceToNumber(text.value)) {
      text.value = val == null ? '' : String(val)
    }
  },
)

function onInput(value: string | number) {
  const cleaned = sanitizePrice(String(value ?? ''), currency.value.decimals)
  text.value = cleaned
  emit('update:modelValue', priceToNumber(cleaned))
}
</script>

<template>
  <UInput
    :model-value="text"
    type="tel"
    :inputmode="currency.decimals > 0 ? 'decimal' : 'numeric'"
    :placeholder="placeholder"
    :disabled="disabled"
    @update:model-value="onInput"
  >
    <template v-if="currency.position === 'prefix'" #leading>
      <span class="text-sm text-muted">{{ currency.symbol }}</span>
    </template>
    <template v-else #trailing>
      <span class="text-sm text-muted">{{ currency.symbol }}</span>
    </template>
  </UInput>
</template>
