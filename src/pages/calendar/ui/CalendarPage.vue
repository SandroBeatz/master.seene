<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Appointment } from '@entities/appointment'
import { useMasterPreferencesStore } from '@entities/master'
import { useSessionStore } from '@entities/session'
import type { TimeBlock } from '@entities/time-block'
import { AppointmentFormDialog } from '@features/appointment-form'
import { TimeBlockFormDialog } from '@features/time-block-form'
import {
  CalendarToolbar,
  CalendarWidget,
  formatCalendarRangeTitle,
  useCalendarEvents,
  type CalendarDateRange,
  type CalendarViewType,
  type CalendarWidgetExpose,
} from '@widgets/calendar'

const { t, locale } = useI18n()
const sessionStore = useSessionStore()
const masterPreferencesStore = useMasterPreferencesStore()

const userId = computed(() => sessionStore.session?.user.id ?? '')
const unknownClientLabel = computed(() => t('appointments.unknownClient'))
const timeBlockLabel = computed(() => t('timeBlocks.calendarTitle'))
const { calendarEvents, onDatesSet } = useCalendarEvents(
  userId,
  unknownClientLabel,
  timeBlockLabel,
  computed(() => masterPreferencesStore.timeZone),
)
const calendarRef = ref<CalendarWidgetExpose | null>(null)
const calendarRange = ref<CalendarDateRange>()
const calendarViewType = ref<CalendarViewType>('timeGridWeek')
const calendarTitle = computed(() =>
  formatCalendarRangeTitle(calendarRange.value, locale.value, masterPreferencesStore.timeZone),
)

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
const selectedAppointment = ref<Appointment | undefined>(undefined)
const selectedTimeBlock = ref<TimeBlock | undefined>(undefined)

function onSlotClick(dateStr: string) {
  selectedAppointment.value = undefined
  selectedTimeBlock.value = undefined
  selectedStartAt.value = dateStr
  isFormOpen.value = true
}

function onEventClick(appointment: Appointment) {
  selectedStartAt.value = undefined
  selectedAppointment.value = appointment
  selectedTimeBlock.value = undefined
  isFormOpen.value = true
}

function onTimeBlockClick(timeBlock: TimeBlock) {
  selectedStartAt.value = undefined
  selectedAppointment.value = undefined
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
  selectedAppointment.value = undefined
  selectedTimeBlock.value = undefined
  isTimeBlockFormOpen.value = true
}
</script>

<template>
  <UTheme
    :ui="{
      page: { root: 'px-12 py-3 w-full max-w-7xl mx-auto' },
      pageHeader: { root: 'border-none pb-2' },
    }"
  >
    <UPage as="main">
      <UPageHeader :title="t('calendar.title')">
        <template #links>
          <UTooltip :text="$t('calendar.create.open')">
            <UButton
              size="xl"
              icon="i-lucide-plus"
              color="neutral"
              :aria-label="$t('calendar.create.open')"
              @click="openCreateMenu"
            />
          </UTooltip>
        </template>
      </UPageHeader>
      <UPageBody>
        <CalendarToolbar
          class="mb-3"
          :title="calendarTitle"
          :view-type="calendarViewType"
          @previous="moveCalendarToPrevious"
          @next="moveCalendarToNext"
          @today="moveCalendarToToday"
          @update:view-type="changeCalendarView"
        />

        <UPageCard>
          <div class="min-h-[700px]">
            <CalendarWidget
              ref="calendarRef"
              :events="calendarEvents"
              :time-format="masterPreferencesStore.timeFormat"
              :time-zone="masterPreferencesStore.timeZone"
              @slot-click="onSlotClick"
              @event-click="onEventClick"
              @time-block-click="onTimeBlockClick"
              @dates-set="handleDatesSet"
            />
          </div>
        </UPageCard>
      </UPageBody>
    </UPage>
  </UTheme>

  <AppointmentFormDialog
    :open="isFormOpen"
    :initial-start-at="selectedStartAt"
    :time-zone="masterPreferencesStore.timeZone"
    :appointment="selectedAppointment"
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
