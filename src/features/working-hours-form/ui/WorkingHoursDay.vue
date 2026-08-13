<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type {
  MasterScheduleDayKey,
  NormalizedScheduleDay,
  ScheduleDayError,
} from '@entities/master'
import { TimeField } from '@shared/ui'

defineOptions({ name: 'WorkingHoursDay' })

const props = defineProps<{
  dayKey: MasterScheduleDayKey
  day: NormalizedScheduleDay
  errors: ScheduleDayError[]
  /** Whether this day differs from the saved value — gates the copy action. */
  dirty?: boolean
}>()

const emit = defineEmits<{
  toggle: [enabled: boolean]
  'update:start': [value: string]
  'update:end': [value: string]
  'update:break': [index: number, field: 'start' | 'end', value: string]
  'add-break': []
  'remove-break': [index: number]
  'copy-to-all': []
}>()

const { t } = useI18n()

const dayName = computed(() => t(`settings.workingHours.days.${props.dayKey}`))

// Day-level errors (e.g. end before start) carry no break index.
const dayLevelErrors = computed(() =>
  props.errors.filter((error) => error.breakIndex === undefined),
)

function breakErrors(index: number): ScheduleDayError[] {
  return props.errors.filter((error) => error.breakIndex === index)
}

function errorMessage(error: ScheduleDayError): string {
  return t(`settings.workingHours.errors.${error.code}`)
}
</script>

<template>
  <div class="flex flex-col gap-4 py-4">
    <!-- Top: switch + weekday -->
    <div class="flex items-center gap-3">
      <USwitch
        :model-value="day.enabled"
        :aria-label="dayName"
        @update:model-value="emit('toggle', $event)"
      />
      <span class="font-medium text-highlighted">{{ dayName }}</span>
      <span v-if="!day.enabled" class="ml-auto text-sm text-muted">
        {{ t('settings.workingHours.dayOff') }}
      </span>
    </div>

    <template v-if="day.enabled">
      <!-- Main hours: From / To with inline labels. The trailing spacer (present
      only when breaks exist) reserves the delete-button column so these fields
      stay the exact same width as the break rows below. -->
      <div class="flex items-center gap-2">
        <div class="grid flex-1 grid-cols-2 gap-3">
          <div class="flex items-center gap-2">
            <label class="shrink-0 text-sm text-muted">
              {{ t('settings.workingHours.from') }}
            </label>
            <div class="min-w-0 flex-1">
              <TimeField
                :model-value="day.start"
                :max="day.end"
                :aria-label="t('settings.workingHours.startAria')"
                @update:model-value="emit('update:start', $event)"
              />
            </div>
          </div>
          <div class="flex items-center gap-2">
            <label class="shrink-0 text-sm text-muted">
              {{ t('settings.workingHours.to') }}
            </label>
            <div class="min-w-0 flex-1">
              <TimeField
                :model-value="day.end"
                :min="day.start"
                :aria-label="t('settings.workingHours.endAria')"
                @update:model-value="emit('update:end', $event)"
              />
            </div>
          </div>
        </div>
        <div v-if="day.breaks.length" class="size-10 shrink-0" aria-hidden="true" />
      </div>

      <p v-for="error in dayLevelErrors" :key="error.code" class="text-xs text-error">
        {{ errorMessage(error) }}
      </p>

      <!-- Breaks: each sits above the "Add break" action, mirroring the main
      hours layout with a trailing delete button on the same line as the fields. -->
      <div v-for="(brk, index) in day.breaks" :key="index" class="flex flex-col gap-1">
        <span class="text-xs font-medium text-toned">{{ t('settings.workingHours.break') }}</span>
        <div class="flex items-center gap-2">
          <div class="grid flex-1 grid-cols-2 gap-3">
            <div class="flex items-center gap-2">
              <label class="shrink-0 text-sm text-muted">
                {{ t('settings.workingHours.from') }}
              </label>
              <div class="min-w-0 flex-1">
                <TimeField
                  :model-value="brk.start"
                  :min="day.start"
                  :max="day.end"
                  :aria-label="t('settings.workingHours.breakStartAria')"
                  @update:model-value="emit('update:break', index, 'start', $event)"
                />
              </div>
            </div>
            <div class="flex items-center gap-2">
              <label class="shrink-0 text-sm text-muted">
                {{ t('settings.workingHours.to') }}
              </label>
              <div class="min-w-0 flex-1">
                <TimeField
                  :model-value="brk.end"
                  :min="day.start"
                  :max="day.end"
                  :aria-label="t('settings.workingHours.breakEndAria')"
                  @update:model-value="emit('update:break', index, 'end', $event)"
                />
              </div>
            </div>
          </div>
          <UButton
            icon="i-lucide-trash-2"
            color="error"
            variant="ghost"
            class="size-10 shrink-0 justify-center p-0"
            :aria-label="t('settings.workingHours.removeBreak')"
            @click="emit('remove-break', index)"
          />
        </div>
        <p v-for="error in breakErrors(index)" :key="error.code" class="text-xs text-error">
          {{ errorMessage(error) }}
        </p>
      </div>

      <!-- Add break — always the last item under the times. -->
      <UButton
        variant="link"
        color="accent"
        size="sm"
        leading-icon="i-lucide-plus"
        class="w-fit px-0"
        @click="emit('add-break')"
      >
        {{ t('settings.workingHours.addBreak') }}
      </UButton>

      <!-- Copy to all — only once the day has unsaved changes. -->
      <UButton
        v-if="dirty"
        variant="link"
        color="info"
        size="sm"
        leading-icon="i-lucide-copy"
        class="w-fit px-0"
        @click="emit('copy-to-all')"
      >
        {{ t('settings.workingHours.copyToAll') }}
      </UButton>
    </template>
  </div>
</template>
