<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Appointment } from '@entities/appointment'
import { useMasterPreferencesStore } from '@entities/master'
import { useSessionStore } from '@entities/session'
import type { TimeBlock } from '@entities/time-block'
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
import { useQuickCreate } from '@widgets/quick-create'
import { Page, Typography } from '@shared/ui'

const { t, locale } = useI18n()
const sessionStore = useSessionStore()
const masterPreferencesStore = useMasterPreferencesStore()
const preview = useAppointmentPreview()
const quickCreate = useQuickCreate()

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

// --- Time-off edit form (all create paths now go through quick-create) ---
const isTimeBlockFormOpen = ref(false)
const selectedTimeBlock = ref<TimeBlock | undefined>(undefined)

// Slot click → appointment wizard with Step 3 prefilled to the clicked time.
function onSlotClick(dateStr: string) {
  quickCreate.openAppointment({ startAt: dateStr })
}

function onEventClick(appointment: Appointment) {
  preview.open({ appointment })
}

function onTimeBlockClick(timeBlock: TimeBlock) {
  selectedTimeBlock.value = timeBlock
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
          @click="quickCreate.openMenu()"
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
              @click="quickCreate.openAppointment()"
            >
              {{ $t('calendar.create.appointment') }}
            </UButton>
          </UEmpty>
        </div>
      </div>
    </UCard>
  </Page>

  <TimeBlockFormDialog
    :open="isTimeBlockFormOpen"
    :time-zone="masterPreferencesStore.timeZone"
    :time-block="selectedTimeBlock"
    @update:open="isTimeBlockFormOpen = $event"
    @saved="isTimeBlockFormOpen = false"
  />
</template>
