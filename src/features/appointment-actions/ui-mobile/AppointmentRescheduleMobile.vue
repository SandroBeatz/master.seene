<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonModal,
  IonTitle,
  IonToolbar,
} from '@ionic/vue'
import { checkmarkOutline, closeOutline } from 'ionicons/icons'
import type { Appointment } from '@entities/appointment'
import { AppointmentSlotPickerMobile } from '@entities/appointment/index.mobile'
import { useMasterPreferencesStore } from '@entities/master'
import { useSessionStore } from '@entities/session'
import { useFormats } from '@shared/lib/formats'
import { minutesToTimeInput, timeInputToMinutes } from '@shared/lib/scheduling'
import { getDateTimeInputValue, toUtcIsoFromZonedDateTime } from '@shared/lib/time-zone'
import { ActionFooterMobile } from '@shared/ui/action-footer/index.mobile'

// Date & slot sheet opened from the appointment preview — the same week strip
// and slot grid as the wizard's date/time step, applied to an existing booking.
// Closes on save like the preview's other pickers; the parent persists it.
const props = defineProps<{
  isOpen: boolean
  appointment: Appointment
  timeZone: string
  presentingElement?: HTMLElement | null
}>()

const emit = defineEmits<{
  'update:isOpen': [value: boolean]
  /** New start as a UTC ISO string. */
  save: [startAt: string]
}>()

const { t } = useI18n()
const formats = useFormats()
const sessionStore = useSessionStore()
const masterPreferencesStore = useMasterPreferencesStore()
const userId = computed(() => sessionStore.session?.user.id ?? '')

const draft = reactive<{ date: string; slotMinutes: number | null }>({
  date: '',
  slotMinutes: null,
})
const initial = reactive<{ date: string; slotMinutes: number | null }>({
  date: '',
  slotMinutes: null,
})

watch(
  () => props.isOpen,
  (open) => {
    if (!open) return
    const parts = getDateTimeInputValue(props.appointment.start_at, props.timeZone)
    initial.date = parts.date
    initial.slotMinutes = parts.time ? timeInputToMinutes(parts.time) : null
    draft.date = initial.date
    draft.slotMinutes = initial.slotMinutes
  },
  { immediate: true },
)

const isChanged = computed(
  () => draft.date !== initial.date || draft.slotMinutes !== initial.slotMinutes,
)
const canSave = computed(() => Boolean(draft.date) && draft.slotMinutes != null && isChanged.value)

const selectionLabel = computed(() => {
  if (!draft.date || draft.slotMinutes == null) return ''
  const [year = 1970, month = 1, day = 1] = draft.date.split('-').map(Number)
  const date = formats.weekdayDateShort(new Date(year, month - 1, day))
  return `${date} · ${formats.time(minutesToTimeInput(draft.slotMinutes))}`
})

function save() {
  if (!canSave.value || draft.slotMinutes == null) return
  emit(
    'save',
    toUtcIsoFromZonedDateTime(draft.date, minutesToTimeInput(draft.slotMinutes), props.timeZone),
  )
  emit('update:isOpen', false)
}
</script>

<template>
  <ion-modal
    :is-open="isOpen"
    :presenting-element="presentingElement ?? undefined"
    @did-dismiss="emit('update:isOpen', false)"
  >
    <ion-header class="appointment-reschedule__header ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button
            fill="clear"
            color="dark"
            :aria-label="t('common.close')"
            @click="emit('update:isOpen', false)"
          >
            <ion-icon slot="icon-only" :icon="closeOutline" aria-hidden="true" />
          </ion-button>
        </ion-buttons>
        <ion-title>{{ t('appointments.preview.dateTimeTitle') }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="appointment-reschedule">
      <appointment-slot-picker-mobile
        v-model:date="draft.date"
        v-model:slot-minutes="draft.slotMinutes"
        :user-id="userId"
        :time-zone="timeZone"
        :schedule="masterPreferencesStore.preferences.profile?.schedule ?? null"
        :step-minutes="masterPreferencesStore.calendarSlotStepMinutes"
        :duration-minutes="appointment.duration"
        :first-day-of-week="masterPreferencesStore.calendarFirstDay"
        :hour-cycle="masterPreferencesStore.timeFormat === 12 ? 'h12' : 'h23'"
        :exclude-appointment-id="appointment.id"
      />
    </ion-content>

    <action-footer-mobile>
      <span>{{ formats.duration(appointment.duration) }}</span>
      <strong v-if="selectionLabel">{{ selectionLabel }}</strong>
      <strong v-else class="appointment-reschedule__pending">
        {{ t('quickCreate.appointment.dateTime.selectTime') }}
      </strong>
      <template #action>
        <ion-button :disabled="!canSave" @click="save">
          <ion-icon slot="start" :icon="checkmarkOutline" aria-hidden="true" />
          {{ t('appointments.preview.save') }}
        </ion-button>
      </template>
    </action-footer-mobile>
  </ion-modal>
</template>

<style scoped>
.appointment-reschedule__header ion-toolbar,
.appointment-reschedule {
  --background: var(--se-surface-page, var(--ion-background-color));
}

.appointment-reschedule {
  --padding-top: 24px;
}

.appointment-reschedule__pending {
  color: var(--ion-color-medium);
  font-weight: 500;
}
</style>
