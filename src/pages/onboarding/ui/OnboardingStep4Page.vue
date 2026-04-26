<script setup lang="ts">
import { reactive, ref, shallowReactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Time } from '@internationalized/date'
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

// --- Time helpers ---

function toTime(str: string | null): Time {
  if (!str) return new Time(9, 0)
  const parts = str.split(':')
  const h = parseInt(parts[0] ?? '9', 10)
  const m = parseInt(parts[1] ?? '0', 10)
  return new Time(isNaN(h) ? 9 : h, isNaN(m) ? 0 : m)
}

function fromTime(t: { hour: number; minute: number }): string {
  return `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`
}

function displayTime(day: DayKey): string {
  const d = localSchedule.days[day]
  if (!d.start || !d.end) return '—'
  return `${d.start} — ${d.end}`
}

// --- Day dialog ---

const dialogOpen = ref(false)
const editingDay = ref<DayKey | null>(null)
const editStart = ref<Time>(new Time(9, 0))
const editEnd = ref<Time>(new Time(18, 0))

interface EditBreak {
  start: Time
  end: Time
}
const editBreaks = shallowReactive<EditBreak[]>([])

function openDayDialog(day: DayKey) {
  editingDay.value = day
  const d = localSchedule.days[day]
  editStart.value = toTime(d.start)
  editEnd.value = toTime(d.end)
  editBreaks.splice(
    0,
    editBreaks.length,
    ...d.breaks.map((b) => ({ start: toTime(b.start), end: toTime(b.end) })),
  )
  dialogOpen.value = true
}

function addBreakEdit() {
  editBreaks.push({ start: new Time(13, 0), end: new Time(14, 0) })
}

function removeBreakEdit(idx: number) {
  editBreaks.splice(idx, 1)
}

function saveDay() {
  const day = editingDay.value
  if (!day) return
  const d = localSchedule.days[day]
  d.start = fromTime(editStart.value)
  d.end = fromTime(editEnd.value)
  d.breaks = editBreaks.map((b) => ({ start: fromTime(b.start), end: fromTime(b.end) }))
  dialogOpen.value = false
}

// When a day is toggled on, set default times if empty
function onDayToggle(day: DayKey) {
  const d = localSchedule.days[day]
  if (d.enabled && !d.start) {
    d.start = '09:00'
    d.end = '18:00'
  }
}

// --- Submit ---

function handleSubmit() {
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

const editingDayLabel = computed(() =>
  editingDay.value ? t(`onboarding.step4.days.${editingDay.value}`) : '',
)
</script>

<template>
  <div class="w-full">
    <div class="flex flex-col items-center text-center gap-2 pt-4 mb-6">
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
        <USelectMenu v-model="localSchedule.timezone" :items="timezones" class="w-full" />
      </div>

      <UFieldGroup orientation="horizontal">
        <UButton color="neutral" variant="subtle" label="12HR" />
        <UButton color="neutral" variant="outline" label="24HR" />
      </UFieldGroup>

      <USeparator />

      <!-- Week schedule -->
      <div class="space-y-2">
        <div v-for="day in DAY_KEYS" :key="day" class="flex items-center gap-3 py-1">
          <!-- Toggle -->
          <USwitch
            v-model="localSchedule.days[day].enabled"
            @update:model-value="onDayToggle(day)"
          />

          <div class="flex flex-col flex-1">
            <div class="flex items-baseline">
              <!-- Day name -->
              <span
                class="text-sm font-medium w-32 shrink-0"
                :class="localSchedule.days[day].enabled ? 'text-default' : 'text-muted'"
              >
                {{ $t(`onboarding.step4.days.${day}`) }}
              </span>

              <!-- Time summary or day-off -->
              <span
                class="text-sm flex-1"
                :class="localSchedule.days[day].enabled ? 'text-default' : 'text-muted'"
              >
                {{
                  localSchedule.days[day].enabled ? displayTime(day) : $t('onboarding.step4.dayOff')
                }}
              </span>
            </div>
            <div class="flex flex-col">
              <div v-for="(brk, idx) in localSchedule.days[day].breaks" :key="idx">
                <div class="flex items-center gap-2">
                  <div class="text-xs text-muted">
                    {{ $t('onboarding.step4.breakLabel') }}
                  </div>
                  <div class="flex items-center gap-1">
                    <span class="block text-xs text-muted">
                      {{ brk.start }}
                    </span>
                    <div>-</div>
                    <span class="block text-xs text-muted">
                      {{ brk.end }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Edit button -->
          <UButton
            v-if="localSchedule.days[day].enabled"
            icon="i-lucide-chevron-right"
            color="neutral"
            variant="ghost"
            size="sm"
            :aria-label="$t(`onboarding.step4.days.${day}`)"
            @click="openDayDialog(day)"
          />
        </div>
      </div>

      <!-- Actions -->
      <div class="flex justify-between gap-3 pt-2">
        <UButton
          type="button"
          color="neutral"
          variant="subtle"
          @click="router.push('/onboarding/step3')"
        >
          {{ $t('onboarding.step4.back') }}
        </UButton>
        <UButton color="primary" @click="handleSubmit">
          {{ $t('onboarding.step4.submit') }}
        </UButton>
      </div>
    </div>
  </div>

  <!-- Day edit dialog -->
  <UModal v-model:open="dialogOpen" :title="editingDayLabel" :ui="{ footer: 'justify-end' }">
    <template #body>
      <div class="space-y-4">
        <!-- Working hours -->
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2">
            <label class="block text-xs font-medium text-muted">
              {{ $t('onboarding.step4.from') }}
            </label>
            <UInputTime v-model="editStart" :hour-cycle="store.timeFormat" />
          </div>
          <div>-</div>
          <div class="flex items-center gap-2">
            <label class="block text-xs font-medium text-muted">
              {{ $t('onboarding.step4.to') }}
            </label>
            <UInputTime v-model="editEnd" :hour-cycle="store.timeFormat" />
          </div>
        </div>

        <!-- Breaks -->
        <template v-if="editBreaks.length > 0">
          <USeparator />
          <div class="space-y-2">
            <div v-for="(brk, idx) in editBreaks" :key="idx">
              <div class="text-xs text-muted mb-1.5">
                {{ $t('onboarding.step4.breakLabel') }} {{ idx + 1 }}
              </div>

              <div class="flex items-center gap-3">
                <div class="flex items-center gap-2">
                  <label class="block text-xs text-muted">
                    {{ $t('onboarding.step4.from') }}
                  </label>
                  <UInputTime v-model="brk.start" :hour-cycle="store.timeFormat" />
                </div>
                <div>-</div>
                <div class="flex items-center gap-2">
                  <label class="block text-xs text-muted">
                    {{ $t('onboarding.step4.to') }}
                  </label>
                  <UInputTime v-model="brk.end" :hour-cycle="store.timeFormat" />
                </div>
                <UButton
                  icon="i-lucide-trash-2"
                  color="error"
                  variant="ghost"
                  size="sm"
                  class="mb-0.5 self-end"
                  @click="removeBreakEdit(idx)"
                />
              </div>
            </div>
          </div>
        </template>

        <!-- Add break -->
        <UButton
          leading-icon="i-lucide-plus"
          color="neutral"
          variant="ghost"
          size="sm"
          @click="addBreakEdit"
        >
          {{ $t('onboarding.step4.addBreak') }}
        </UButton>
      </div>
    </template>

    <template #footer="{ close }">
      <UButton
        color="primary"
        @click="
          () => {
            saveDay()
            close()
          }
        "
      >
        {{ $t('onboarding.step4.done') }}
      </UButton>
    </template>
  </UModal>
</template>
