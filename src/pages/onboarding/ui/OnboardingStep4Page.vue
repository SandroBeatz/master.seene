<script setup lang="ts">
import { reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useOnboardingStore } from '@features/onboarding'
import type { DayKey, ScheduleData } from '@features/onboarding'

const { t } = useI18n()
const router = useRouter()
const toast = useToast()
const store = useOnboardingStore()

const DAY_KEYS: DayKey[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

// Deep copy so we don't mutate the store until submit
const localSchedule = reactive<ScheduleData>(JSON.parse(JSON.stringify(store.schedule)))

const timezones = computed<string[]>(() => {
  try {
    return (Intl as unknown as { supportedValuesOf: (key: string) => string[] }).supportedValuesOf(
      'timeZone',
    )
  } catch {
    return ['UTC', 'Europe/Moscow', 'Europe/Paris', 'America/New_York', 'Asia/Tokyo']
  }
})

function addBreak(day: DayKey) {
  localSchedule.days[day].breaks.push({ start: '13:00', end: '14:00' })
}

function removeBreak(day: DayKey, idx: number) {
  localSchedule.days[day].breaks.splice(idx, 1)
}

function handleSubmit() {
  // Validate: enabled days must have start and end
  const invalid = DAY_KEYS.some((day) => {
    const d = localSchedule.days[day]
    return d.enabled && (!d.start || !d.end)
  })

  if (invalid) {
    toast.add({
      title: t('onboarding.step4.validation.enabledDayMissingTimes'),
      color: 'error',
    })
    return
  }

  store.setSchedule({ ...localSchedule })
  router.push('/onboarding/step5')
}
</script>

<template>
  <div class="py-8 w-full">
    <div class="flex flex-col items-center text-center gap-2 mb-6">
      <h1 class="text-2xl font-bold text-primary">
        {{ $t('onboarding.step4.title') }}
      </h1>
      <p class="text-sm text-muted">
        {{ $t('onboarding.step4.subtitle') }}
      </p>
    </div>

    <div class="space-y-4">
      <!-- Timezone -->
      <div>
        <label class="text-sm font-medium text-default block mb-1.5">
          {{ $t('onboarding.step4.timezone') }}
        </label>
        <USelectMenu
          v-model="localSchedule.timezone"
          :items="timezones"
          class="w-full"
        />
      </div>

      <USeparator />

      <!-- Week schedule -->
      <div class="space-y-3">
        <div
          v-for="day in DAY_KEYS"
          :key="day"
          class="space-y-2"
        >
          <!-- Day row -->
          <div class="flex items-center gap-3 flex-wrap">
            <USwitch v-model="localSchedule.days[day].enabled" />
            <span class="text-sm font-medium w-28">
              {{ $t(`onboarding.step4.days.${day}`) }}
            </span>
            <template v-if="localSchedule.days[day].enabled">
              <div class="flex items-center gap-2">
                <UInput
                  :model-value="localSchedule.days[day].start ?? ''"
                  type="time"
                  size="sm"
                  class="w-28"
                  @update:model-value="(v) => (localSchedule.days[day].start = v || null)"
                />
                <span class="text-muted text-sm">—</span>
                <UInput
                  :model-value="localSchedule.days[day].end ?? ''"
                  type="time"
                  size="sm"
                  class="w-28"
                  @update:model-value="(v) => (localSchedule.days[day].end = v || null)"
                />
              </div>
            </template>
          </div>

          <!-- Breaks -->
          <template v-if="localSchedule.days[day].enabled">
            <div
              v-for="(brk, idx) in localSchedule.days[day].breaks"
              :key="idx"
              class="flex items-center gap-2 ml-11"
            >
              <UInput
                v-model="brk.start"
                type="time"
                size="sm"
                class="w-28"
              />
              <span class="text-muted text-sm">—</span>
              <UInput
                v-model="brk.end"
                type="time"
                size="sm"
                class="w-28"
              />
              <UButton
                type="button"
                icon="i-lucide-trash-2"
                color="error"
                variant="ghost"
                size="sm"
                :aria-label="$t('onboarding.step4.addBreak')"
                @click="removeBreak(day, idx)"
              />
            </div>

            <UButton
              type="button"
              leading-icon="i-lucide-plus"
              color="neutral"
              variant="ghost"
              size="xs"
              class="ml-11"
              @click="addBreak(day)"
            >
              {{ $t('onboarding.step4.addBreak') }}
            </UButton>
          </template>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex gap-3 pt-2">
        <UButton
          type="button"
          color="neutral"
          variant="soft"
          @click="router.push('/onboarding/step3')"
        >
          {{ $t('onboarding.step4.back') }}
        </UButton>
        <UButton color="primary" class="flex-1" @click="handleSubmit">
          {{ $t('onboarding.step4.submit') }}
        </UButton>
      </div>
    </div>
  </div>
</template>
