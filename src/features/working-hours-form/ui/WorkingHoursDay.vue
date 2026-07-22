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
  <div class="flex flex-col gap-3 py-4">
    <div class="grid gap-3 sm:grid-cols-[10rem_15rem_1fr] sm:items-center">
      <div class="flex min-w-0 items-center gap-3">
        <USwitch
          :model-value="day.enabled"
          :aria-label="dayName"
          @update:model-value="emit('toggle', $event)"
        />
        <span class="truncate font-medium text-highlighted">{{ dayName }}</span>
      </div>

      <div v-if="day.enabled" class="grid grid-cols-[7rem_auto_7rem] items-center gap-2">
        <TimeField
          :model-value="day.start"
          :max="day.end"
          :aria-label="t('settings.workingHours.startAria')"
          class="w-28"
          @update:model-value="emit('update:start', $event)"
        />
        <span class="text-muted">–</span>
        <TimeField
          :model-value="day.end"
          :min="day.start"
          :aria-label="t('settings.workingHours.endAria')"
          class="w-28"
          @update:model-value="emit('update:end', $event)"
        />
      </div>
      <span v-else class="text-muted">{{ t('settings.workingHours.dayOff') }}</span>

      <div v-if="day.enabled" class="flex justify-end gap-3">
        <UTooltip :text="t('settings.workingHours.addBreak')">
          <UButton
            variant="soft"
            color="info"
            leading-icon="i-lucide-plus"
            @click="emit('add-break')"
          />
        </UTooltip>
        <UTooltip :text="t('settings.workingHours.copyToAll')">
          <UButton
            variant="soft"
            color="primary"
            leading-icon="i-lucide-copy"
            @click="emit('copy-to-all')"
          />
        </UTooltip>
      </div>
    </div>

    <template v-if="day.enabled">
      <p v-for="error in dayLevelErrors" :key="error.code" class="text-xs text-error sm:ml-40">
        {{ errorMessage(error) }}
      </p>

      <div class="flex flex-col gap-2">
        <div v-for="(brk, index) in day.breaks" :key="index" class="flex flex-col gap-1">
          <div class="grid gap-2 sm:grid-cols-[10.23rem_15rem_auto] sm:items-center">
            <span class="text-sm font-medium text-toned sm:pl-[5rem]">
              {{ t('settings.workingHours.break') }}
            </span>
            <div class="grid grid-cols-[7rem_auto_7rem] items-center gap-2">
              <TimeField
                :model-value="brk.start"
                :min="day.start"
                :max="day.end"
                :aria-label="t('settings.workingHours.breakStartAria')"
                class="w-28"
                @update:model-value="emit('update:break', index, 'start', $event)"
              />
              <span class="text-muted">–</span>
              <TimeField
                :model-value="brk.end"
                :min="day.start"
                :max="day.end"
                :aria-label="t('settings.workingHours.breakEndAria')"
                class="w-28"
                @update:model-value="emit('update:break', index, 'end', $event)"
              />
            </div>
            <UButton
              icon="i-lucide-trash-2"
              color="error"
              variant="ghost"
              size="sm"
              class="justify-self-start"
              :aria-label="t('settings.workingHours.removeBreak')"
              @click="emit('remove-break', index)"
            />
          </div>
          <p
            v-for="error in breakErrors(index)"
            :key="error.code"
            class="text-xs text-error sm:ml-40"
          >
            {{ errorMessage(error) }}
          </p>
        </div>
      </div>
    </template>
  </div>
</template>
