<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Appointment } from '@entities/appointment'
import { useMasterPreferencesStore } from '@entities/master'
import { useSessionStore } from '@entities/session'
import type { TimeBlock } from '@entities/time-block'
import { AppointmentFormDialog } from '@features/appointment-form'
import { TimeBlockFormDialog } from '@features/time-block-form'
import { useAppointmentPreview } from '@widgets/appointment-preview-panel'
import {
  CalendarToolbar,
  CalendarWidget,
  formatCalendarRangeTitle,
  useCalendarEvents,
  type CalendarDateRange,
  type CalendarViewType,
  type CalendarWidgetExpose,
} from '@widgets/calendar'
import { Page, Typography } from '@shared/ui'

const { t, locale } = useI18n()
const sessionStore = useSessionStore()
const masterPreferencesStore = useMasterPreferencesStore()
const preview = useAppointmentPreview()

const userId = computed(() => sessionStore.session?.user.id ?? '')
const unknownClientLabel = computed(() => t('appointments.unknownClient'))
const timeBlockLabel = computed(() => t('timeBlocks.calendarTitle'))

const { calendarEvents, onDatesSet, isPending, isEmpty } = useCalendarEvents(
  userId,
  unknownClientLabel,
  timeBlockLabel,
  computed(() => masterPreferencesStore.timeZone),
)
const calendarRef = ref<CalendarWidgetExpose | null>(null)
const calendarRange = ref<CalendarDateRange>()
const defaultCalendarView = computed(() => masterPreferencesStore.defaultCalendarView)
const calendarViewType = ref<CalendarViewType>(defaultCalendarView.value)
const masterSchedule = computed(() => masterPreferencesStore.preferences.profile?.schedule ?? null)
const calendarTitle = computed(() =>
  formatCalendarRangeTitle(calendarRange.value, locale.value, masterPreferencesStore.timeZone),
)

watch(defaultCalendarView, (nextViewType, previousViewType) => {
  if (calendarViewType.value !== previousViewType) return

  changeCalendarView(nextViewType)
})

function handleDatesSet(range: CalendarDateRange) {
  calendarRange.value = range
  calendarViewType.value = range.viewType
  onDatesSet(range)
}

function moveCalendarToPrevious() {
  calendarRef.value?.moveToPrevious()
}

function moveCalendarToNext() {
  calendarRef.value?.moveToNext()
}

function moveCalendarToToday() {
  calendarRef.value?.moveToToday()
}

function changeCalendarView(viewType: CalendarViewType) {
  calendarViewType.value = viewType
  calendarRef.value?.changeView(viewType)
}

// --- Form state ---
const isCreateMenuOpen = ref(false)
const isFormOpen = ref(false)
const isTimeBlockFormOpen = ref(false)
const selectedStartAt = ref<string | undefined>(undefined)
const selectedTimeBlock = ref<TimeBlock | undefined>(undefined)

function onSlotClick(dateStr: string) {
  selectedTimeBlock.value = undefined
  selectedStartAt.value = dateStr
  isFormOpen.value = true
}

function onEventClick(appointment: Appointment) {
  preview.open({ appointment })
}

function onTimeBlockClick(timeBlock: TimeBlock) {
  selectedStartAt.value = undefined
  selectedTimeBlock.value = timeBlock
  isTimeBlockFormOpen.value = true
}

function openCreateMenu() {
  isCreateMenuOpen.value = true
}

function openAppointmentCreate() {
  isCreateMenuOpen.value = false
  onSlotClick(new Date().toISOString())
}

function openTimeBlockCreate() {
  isCreateMenuOpen.value = false
  selectedStartAt.value = new Date().toISOString()
  selectedTimeBlock.value = undefined
  isTimeBlockFormOpen.value = true
}

// Nuxt UI overrides
const hostUI = {
  root: 'flex flex-1 min-h-0 flex-col rounded-xl shadow-panel ring-0 divide-y-0',
  header: 'pb-0',
  body: 'flex flex-1 min-h-0 flex-col overflow-hidden',
}
</script>

<template>
  <Page :title="t('calendar.title')" fill>
    <template #header-left>
      <Typography as="h1" variant="h2" class="font-bold text-highlighted">
        {{ t('calendar.title') }}
      </Typography>
    </template>
    <template #header-right>
      <UTooltip :text="$t('calendar.create.open')">
        <UButton
          size="xl"
          icon="i-lucide-plus"
          color="neutral"
          variant="solid"
          class="rounded-full"
          :aria-label="$t('calendar.create.open')"
          @click="openCreateMenu"
        />
      </UTooltip>
    </template>

    <UCard :ui="hostUI">
      <template #header>
        <CalendarToolbar
          :title="calendarTitle"
          :view-type="calendarViewType"
          @previous="moveCalendarToPrevious"
          @next="moveCalendarToNext"
          @today="moveCalendarToToday"
          @update:view-type="changeCalendarView"
        />
      </template>
      <div class="relative flex flex-1 flex-col min-h-0">
        <CalendarWidget
          ref="calendarRef"
          :events="calendarEvents"
          :schedule="masterSchedule"
          :time-format="masterPreferencesStore.timeFormat"
          :time-zone="masterPreferencesStore.timeZone"
          :first-day="masterPreferencesStore.calendarFirstDay"
          :slot-step-minutes="masterPreferencesStore.calendarSlotStepMinutes"
          :default-view="defaultCalendarView"
          @slot-click="onSlotClick"
          @event-click="onEventClick"
          @time-block-click="onTimeBlockClick"
          @dates-set="handleDatesSet"
        />

        <!-- Loading overlay -->
        <div
          v-if="isPending"
          class="absolute inset-0 z-10 flex flex-col gap-2 bg-default/70 p-4 backdrop-blur-sm"
          role="status"
          :aria-label="$t('calendar.loading')"
        >
          <USkeleton v-for="i in 8" :key="i" class="h-10 w-full rounded-lg" />
        </div>

        <!-- Empty overlay: grid stays clickable, only the CTA card captures pointer events -->
        <div
          v-else-if="isEmpty"
          class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-4"
        >
          <UEmpty
            variant="naked"
            icon="i-lucide-calendar-plus"
            :title="$t('calendar.empty.title')"
            :description="$t('calendar.empty.description')"
            class="pointer-events-auto rounded-xl bg-default/90 p-6 shadow-panel backdrop-blur-sm"
          >
            <UButton
              leading-icon="i-lucide-plus"
              color="primary"
              class="mt-4"
              @click="openAppointmentCreate"
            >
              {{ $t('calendar.create.appointment') }}
            </UButton>
          </UEmpty>
        </div>
      </div>
    </UCard>
  </Page>

  <AppointmentFormDialog
    :open="isFormOpen"
    :initial-start-at="selectedStartAt"
    :time-zone="masterPreferencesStore.timeZone"
    @update:open="isFormOpen = $event"
    @saved="isFormOpen = false"
  />

  <TimeBlockFormDialog
    :open="isTimeBlockFormOpen"
    :initial-start-at="selectedStartAt"
    :time-zone="masterPreferencesStore.timeZone"
    :time-block="selectedTimeBlock"
    @update:open="isTimeBlockFormOpen = $event"
    @saved="isTimeBlockFormOpen = false"
  />

  <UModal
    v-model:open="isCreateMenuOpen"
    :title="$t('calendar.create.title')"
    :description="$t('calendar.create.description')"
  >
    <template #body>
      <div class="grid gap-2">
        <UButton
          color="primary"
          variant="solid"
          leading-icon="i-lucide-calendar-plus"
          class="justify-start"
          @click="openAppointmentCreate"
        >
          {{ $t('calendar.create.appointment') }}
        </UButton>
        <UButton
          color="neutral"
          variant="solid"
          leading-icon="i-lucide-ban"
          class="justify-start"
          @click="openTimeBlockCreate"
        >
          {{ $t('calendar.create.timeBlock') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
