<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Appointment } from '@entities/appointment'
import { useMasterPreferencesStore } from '@entities/master'
import { useSessionStore } from '@entities/session'
import { AppointmentFormDialog } from '@features/appointment-form'
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
const { calendarEvents, onDatesSet } = useCalendarEvents(userId, unknownClientLabel)
const calendarRef = ref<CalendarWidgetExpose | null>(null)
const calendarRange = ref<CalendarDateRange>()
const calendarViewType = ref<CalendarViewType>('timeGridWeek')
const calendarTitle = computed(() => formatCalendarRangeTitle(calendarRange.value, locale.value))

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
const isFormOpen = ref(false)
const selectedStartAt = ref<string | undefined>(undefined)
const selectedAppointment = ref<Appointment | undefined>(undefined)

function onSlotClick(dateStr: string) {
  selectedAppointment.value = undefined
  selectedStartAt.value = dateStr
  isFormOpen.value = true
}

function onEventClick(appointment: Appointment) {
  selectedStartAt.value = undefined
  selectedAppointment.value = appointment
  isFormOpen.value = true
}

function openCreate() {
  onSlotClick(new Date().toISOString())
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
          <UButton leading-icon="i-lucide-user-plus" color="neutral" @click="openCreate">
            {{ $t('clients.addButton') }}
          </UButton>
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
    :appointment="selectedAppointment"
    @update:open="isFormOpen = $event"
    @saved="isFormOpen = false"
  />
</template>
