<script setup lang="ts">
import { useI18n } from 'vue-i18n'

defineProps<{
  clientName: string
  serviceNames: string[]
  dateLabel: string
  timeLabel: string
  durationMinutes: number
}>()

const price = defineModel<number | null>('price')
const notes = defineModel<string>('notes', { default: '' })
const emit = defineEmits<{ priceInput: [] }>()

const { t } = useI18n()

function onPriceChange(value: string | number) {
  price.value = value === '' || value == null ? null : Number(value)
  emit('priceInput')
}
</script>

<template>
  <div class="space-y-4">
    <dl class="divide-y divide-default rounded-lg bg-elevated px-3">
      <div class="flex items-center justify-between gap-3 py-2">
        <dt class="text-sm text-muted">{{ t('quickCreate.appointment.confirm.client') }}</dt>
        <dd class="text-sm font-medium text-highlighted">{{ clientName }}</dd>
      </div>
      <div class="flex items-start justify-between gap-3 py-2">
        <dt class="text-sm text-muted">{{ t('quickCreate.appointment.confirm.services') }}</dt>
        <dd class="text-right text-sm font-medium text-highlighted">
          {{ serviceNames.join(', ') }}
        </dd>
      </div>
      <div class="flex items-center justify-between gap-3 py-2">
        <dt class="text-sm text-muted">{{ t('quickCreate.appointment.confirm.date') }}</dt>
        <dd class="text-sm font-medium text-highlighted">{{ dateLabel }}</dd>
      </div>
      <div class="flex items-center justify-between gap-3 py-2">
        <dt class="text-sm text-muted">{{ t('quickCreate.appointment.confirm.time') }}</dt>
        <dd class="text-sm font-medium text-highlighted">{{ timeLabel }}</dd>
      </div>
      <div class="flex items-center justify-between gap-3 py-2">
        <dt class="text-sm text-muted">{{ t('quickCreate.appointment.confirm.duration') }}</dt>
        <dd class="text-sm font-medium text-highlighted">
          {{ durationMinutes }} {{ t('appointments.form.minShort') }}
        </dd>
      </div>
    </dl>

    <UFormField :label="t('quickCreate.appointment.confirm.price')">
      <UInput
        :model-value="price ?? undefined"
        type="number"
        :min="0"
        class="w-full"
        @update:model-value="onPriceChange"
      />
    </UFormField>

    <UFormField :label="t('quickCreate.appointment.confirm.notes')">
      <UTextarea
        v-model="notes"
        :rows="2"
        :placeholder="t('quickCreate.appointment.confirm.notesPlaceholder')"
        class="w-full"
      />
    </UFormField>
  </div>
</template>
