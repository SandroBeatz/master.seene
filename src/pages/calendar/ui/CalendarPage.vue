<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Appointment, AppointmentStatus } from '@entities/appointment'
import { useUpdateAppointmentMutation } from '@entities/appointment'
import type { Client } from '@entities/client'
import { useClientsQuery } from '@entities/client'
import { useMasterPreferencesStore } from '@entities/master'
import { useSessionStore } from '@entities/session'
import type { Service } from '@entities/service'
import { useServicesQuery } from '@entities/service'
import type { TimeBlock } from '@entities/time-block'
import { AppointmentFormDialog } from '@features/appointment-form'
import { TimeBlockFormDialog } from '@features/time-block-form'
import { AppointmentPreviewPanel } from '@widgets/appointment-preview-panel'
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
const toast = useToast()

const userId = computed(() => sessionStore.session?.user.id ?? '')
const unknownClientLabel = computed(() => t('appointments.unknownClient'))
const timeBlockLabel = computed(() => t('timeBlocks.calendarTitle'))
const { data: clients } = useClientsQuery(userId)
const { data: services } = useServicesQuery(userId)
const updateAppointmentMutation = useUpdateAppointmentMutation(userId)
const { calendarEvents, onDatesSet } = useCalendarEvents(
  userId,
  unknownClientLabel,
  timeBlockLabel,
  computed(() => masterPreferencesStore.timeZone),
)
const calendarRef = ref<CalendarWidgetExpose | null>(null)
const calendarRange = ref<CalendarDateRange>()
const calendarViewType = ref<CalendarViewType>('timeGridWeek')
const masterSchedule = computed(() => masterPreferencesStore.preferences.profile?.schedule ?? null)
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
const isPreviewOpen = ref(false)
const isCancelConfirmOpen = ref(false)
const selectedStartAt = ref<string | undefined>(undefined)
const selectedAppointment = ref<Appointment | undefined>(undefined)
const selectedTimeBlock = ref<TimeBlock | undefined>(undefined)
const selectedClient = computed<Client | undefined>(() =>
  selectedAppointment.value
    ? clients.value?.find((client) => client.id === selectedAppointment.value?.client_id)
    : undefined,
)
const selectedServices = computed(() => {
  if (!selectedAppointment.value) return []

  return selectedAppointment.value.service_ids
    .map((id) => services.value?.find((service) => service.id === id))
    .filter((service): service is Service => Boolean(service))
})

function onSlotClick(dateStr: string) {
  selectedAppointment.value = undefined
  selectedTimeBlock.value = undefined
  isPreviewOpen.value = false
  selectedStartAt.value = dateStr
  isFormOpen.value = true
}

function onEventClick(appointment: Appointment) {
  selectedStartAt.value = undefined
  selectedAppointment.value = appointment
  selectedTimeBlock.value = undefined
  isPreviewOpen.value = true
}

function onTimeBlockClick(timeBlock: TimeBlock) {
  selectedStartAt.value = undefined
  selectedAppointment.value = undefined
  isPreviewOpen.value = false
  selectedTimeBlock.value = timeBlock
  isTimeBlockFormOpen.value = true
}

function openAppointmentEdit() {
  if (!selectedAppointment.value) return
  isPreviewOpen.value = false
  isFormOpen.value = true
}

async function updateSelectedAppointmentStatus(status: AppointmentStatus) {
  if (!selectedAppointment.value) return

  try {
    const updated = await updateAppointmentMutation.mutateAsync({
      id: selectedAppointment.value.id,
      status,
    })
    selectedAppointment.value = updated
    toast.add({ title: t('appointments.preview.statusUpdateSuccess'), color: 'success' })
  } catch {
    toast.add({ title: t('appointments.preview.statusUpdateError'), color: 'error' })
  }
}

function requestCancelAppointment() {
  isCancelConfirmOpen.value = true
}

async function confirmCancelAppointment() {
  await updateSelectedAppointmentStatus('cancelled')
  isCancelConfirmOpen.value = false
}

function openCreateMenu() {
  isCreateMenuOpen.value = true
}

function openAppointmentCreate() {
  isCreateMenuOpen.value = false
  isPreviewOpen.value = false
  onSlotClick(new Date().toISOString())
}

function openTimeBlockCreate() {
  isCreateMenuOpen.value = false
  isPreviewOpen.value = false
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
              :schedule="masterSchedule"
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

  <USlideover
    v-model:open="isPreviewOpen"
    side="right"
    :title="$t('appointments.preview.title')"
    :ui="{ body: 'p-0 sm:p-0' }"
  >
    <template #body>
      <AppointmentPreviewPanel
        v-if="selectedAppointment"
        :appointment="selectedAppointment"
        :client="selectedClient"
        :services="selectedServices"
        :time-zone="masterPreferencesStore.timeZone"
        :time-format="masterPreferencesStore.timeFormat"
        :loading="updateAppointmentMutation.isLoading.value"
        @edit="openAppointmentEdit"
        @cancel="requestCancelAppointment"
        @confirm="updateSelectedAppointmentStatus('confirmed')"
        @complete="updateSelectedAppointmentStatus('completed')"
      />
    </template>
  </USlideover>

  <UModal
    v-model:open="isCancelConfirmOpen"
    :title="$t('appointments.preview.cancelConfirmTitle')"
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <p class="text-muted">{{ $t('appointments.preview.cancelConfirmMessage') }}</p>
    </template>
    <template #footer>
      <UButton color="neutral" variant="outline" @click="isCancelConfirmOpen = false">
        {{ $t('appointments.preview.keepAppointment') }}
      </UButton>
      <UButton
        color="error"
        :loading="updateAppointmentMutation.isLoading.value"
        @click="confirmCancelAppointment"
      >
        {{ $t('appointments.preview.cancelAppointment') }}
      </UButton>
    </template>
  </UModal>

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
