<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Service } from '@entities/service'
import { useFormats } from '@shared/lib/formats'

const props = defineProps<{
  services: Service[]
  totalDuration: number
  totalPrice: number | null
}>()
const model = defineModel<string[]>({ default: () => [] })

const { t } = useI18n()
const formats = useFormats()

const items = computed(() =>
  props.services.map((service) => ({
    label: `${service.name} (${service.duration} ${t('appointments.form.minShort')})`,
    value: service.id,
  })),
)

const hasSelection = computed(() => model.value.length > 0)
</script>

<template>
  <div class="space-y-3">
    <USelectMenu
      v-model="model"
      :items="items"
      value-key="value"
      multiple
      searchable
      :placeholder="t('quickCreate.appointment.services.placeholder')"
      class="w-full"
    />

    <div
      v-if="hasSelection"
      class="flex items-center justify-between rounded-lg bg-elevated px-3 py-2 text-sm"
    >
      <span class="text-muted"> {{ totalDuration }} {{ t('appointments.form.minShort') }} </span>
      <span class="font-medium text-highlighted">{{ formats.price(totalPrice) }}</span>
    </div>
  </div>
</template>
