<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { CalendarDate, type DateValue } from '@internationalized/date'
import { useFormats } from '@shared/lib/formats'
import { calendarDateToInput, inputToCalendarDate, minutesToTimeInput } from '@shared/lib/scheduling'

const props = defineProps<{
  /** Selected day, `YYYY-MM-DD`, or '' when none chosen yet. */
  date: string
  slotMinutes: number | null
  slots: number[]
  minDate: CalendarDate
  isDateUnavailable: (date: DateValue) => boolean
}>()

const emit = defineEmits<{
  'update:date': [string]
  'update:slotMinutes': [number]
  'update:month': [CalendarDate]
}>()

const { t } = useI18n()
const formats = useFormats()

const calendarValue = computed(() => inputToCalendarDate(props.date) ?? undefined)
const hasDate = computed(() => Boolean(props.date))

function onDateChange(value: CalendarDate) {
  emit('update:date', calendarDateToInput(value))
}

function slotLabel(minutes: number): string {
  return formats.time(minutesToTimeInput(minutes))
}
</script>

<template>
  <div class="space-y-4">
    <UCalendar
      :model-value="calendarValue"
      :min-value="minDate"
      :is-date-unavailable="isDateUnavailable"
      class="mx-auto"
      @update:model-value="onDateChange($event as CalendarDate)"
      @update:placeholder="emit('update:month', $event as CalendarDate)"
    />

    <div v-if="hasDate">
      <p class="mb-2 text-sm font-medium text-highlighted">
        {{ t('quickCreate.appointment.dateTime.slots') }}
      </p>

      <div v-if="slots.length" class="grid grid-cols-3 gap-2 sm:grid-cols-4">
        <UButton
          v-for="minutes in slots"
          :key="minutes"
          size="sm"
          :color="minutes === slotMinutes ? 'primary' : 'neutral'"
          :variant="minutes === slotMinutes ? 'solid' : 'soft'"
          class="justify-center"
          @click="emit('update:slotMinutes', minutes)"
        >
          {{ slotLabel(minutes) }}
        </UButton>
      </div>

      <p v-else class="text-sm text-muted">
        {{ t('quickCreate.appointment.dateTime.noSlots') }}
      </p>
    </div>
    <p v-else class="text-sm text-muted">
      {{ t('quickCreate.appointment.dateTime.pickDate') }}
    </p>
  </div>
</template>
