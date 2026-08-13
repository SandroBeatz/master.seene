<script setup lang="ts">
import NumberFlow, { type Format } from '@number-flow/vue'
import { useLocaleStore } from '@shared/lib/locale'

const props = withDefaults(
  defineProps<{
    value: number
    /** Intl.NumberFormat options — e.g. { minimumFractionDigits, maximumFractionDigits }. */
    format?: Format
    prefix?: string
    suffix?: string
    /** Defaults to the app's active UI locale (same source as useFormats). */
    locales?: Intl.LocalesArgument
  }>(),
  {
    format: () => ({}),
    prefix: undefined,
    suffix: undefined,
    locales: undefined,
  },
)

const localeStore = useLocaleStore()
</script>

<template>
  <NumberFlow
    :value="props.value"
    :format="props.format"
    :locales="props.locales ?? localeStore.current"
    :prefix="props.prefix"
    :suffix="props.suffix"
  />
</template>
