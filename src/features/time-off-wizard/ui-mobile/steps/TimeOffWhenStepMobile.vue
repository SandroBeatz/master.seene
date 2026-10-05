<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  IonButton,
  IonButtons,
  IonContent,
  IonDatetime,
  IonHeader,
  IonIcon,
  IonItem,
  IonModal,
  IonTitle,
  IonToggle,
  IonToolbar,
} from '@ionic/vue'
import {
  alertCircleOutline,
  arrowForwardOutline,
  closeOutline,
  sunnyOutline,
  timeOutline,
} from 'ionicons/icons'
import { AppointmentSlotPickerMobile } from '@entities/appointment/index.mobile'
import { useFormats } from '@shared/lib/formats'
import { minutesToTimeInput, timeInputToMinutes } from '@shared/lib/scheduling'
import { ActionFooterMobile } from '@shared/ui/action-footer/index.mobile'
import { InsetList } from '@shared/ui/inset-list/index.mobile'
import { TIME_OFF_DURATIONS } from '../../model/time-off-wizard-mobile'
import { useTimeOffWizardMobile } from '../../model/time-off-wizard-mobile-context'
import TimeOffStepHeaderMobile from '../TimeOffStepHeaderMobile.vue'

const { t, locale } = useI18n()
const formats = useFormats()
const { wizard, scheduling, summary, next } = useTimeOffWizardMobile()
const { state } = wizard

// --- Duration chips ---
const isCustomDuration = computed(
  () => !(TIME_OFF_DURATIONS as readonly number[]).includes(state.durationMinutes),
)

// --- Manual range sheet ("from" / "to" wheels) ---
const isRangeOpen = ref(false)
const draftStart = ref(0)
const draftEnd = ref(0)
const rangeError = ref('')

const minuteValues = computed(() => {
  const step = scheduling.stepMinutes.value
  const safeStep = step > 0 && step <= 60 ? step : 5
  return Array.from({ length: Math.ceil(60 / safeStep) }, (_, index) => index * safeStep).join(',')
})

function toWheelValue(minutes: number): string {
  return `${state.date}T${minutesToTimeInput(Math.min(minutes, 23 * 60 + 59))}:00`
}

function openRange() {
  const start = state.startMinutes ?? 13 * 60
  draftStart.value = start
  draftEnd.value = Math.min(start + state.durationMinutes, 23 * 60 + 59)
  rangeError.value = ''
  isRangeOpen.value = true
}

function readWheel(event: CustomEvent<{ value?: string | string[] | null }>): number | null {
  const value = event.detail.value
  return typeof value === 'string' ? timeInputToMinutes(value.slice(11, 16)) : null
}

function onStartChange(event: CustomEvent<{ value?: string | string[] | null }>) {
  const minutes = readWheel(event)
  if (minutes != null) draftStart.value = minutes
  rangeError.value = ''
}

function onEndChange(event: CustomEvent<{ value?: string | string[] | null }>) {
  const minutes = readWheel(event)
  if (minutes != null) draftEnd.value = minutes
  rangeError.value = ''
}

function applyRange() {
  const result = wizard.setRange(draftStart.value, draftEnd.value)
  if (result === 'invalid') rangeError.value = t('quickCreate.timeOff.rangeInvalid')
  else if (result === 'overlap') rangeError.value = t('quickCreate.timeOff.overlap')
  else isRangeOpen.value = false
}

/** Picked range that isn't a grid start + preset duration (i.e. set manually). */
const manualSelection = computed(() => {
  if (!isCustomDuration.value || !wizard.range.value) return ''
  const [start, end] = wizard.range.value
  return `${formats.time(minutesToTimeInput(start))} – ${formats.time(minutesToTimeInput(end % 1440))}`
})
</script>

<template>
  <time-off-step-header-mobile :step="1" :title="t('quickCreate.timeOff.steps.when')" />

  <ion-content class="time-off-when">
    <appointment-slot-picker-mobile
      :date="state.date"
      :slot-minutes="state.startMinutes"
      :user-id="scheduling.userId.value"
      :time-zone="scheduling.timeZone.value"
      :schedule="scheduling.schedule.value"
      :step-minutes="scheduling.stepMinutes.value"
      :duration-minutes="state.durationMinutes"
      :first-day-of-week="scheduling.firstDayOfWeek.value"
      :hour-cycle="scheduling.hourCycle.value"
      :allow-conflicts="false"
      :hide-slots="state.allDay"
      @update:date="wizard.setDate"
      @update:slot-minutes="state.startMinutes = $event"
    >
      <template #before-slots>
        <inset-list class="time-off-when__options">
          <ion-item>
            <ion-icon slot="start" :icon="sunnyOutline" aria-hidden="true" />
            <ion-toggle
              :checked="state.allDay"
              :disabled="!wizard.canBeAllDay.value"
              justify="space-between"
              @ion-change="wizard.setAllDay($event.detail.checked)"
            >
              <span class="time-off-when__toggle-label">{{ t('timeBlocks.form.allDay') }}</span>
              <span class="time-off-when__toggle-note">
                {{
                  wizard.canBeAllDay.value
                    ? t('quickCreate.timeOff.allDayDescription')
                    : t('quickCreate.timeOff.allDayUnavailable')
                }}
              </span>
            </ion-toggle>
          </ion-item>
        </inset-list>

        <section v-if="!state.allDay" class="time-off-when__duration">
          <h4>{{ t('quickCreate.timeOff.duration') }}</h4>
          <div class="time-off-when__chips" role="radiogroup">
            <button
              v-for="minutes in TIME_OFF_DURATIONS"
              :key="minutes"
              type="button"
              role="radio"
              class="time-off-when__chip"
              :class="{ 'time-off-when__chip--active': state.durationMinutes === minutes }"
              :aria-checked="state.durationMinutes === minutes"
              @click="wizard.setDuration(minutes)"
            >
              {{ formats.duration(minutes) }}
            </button>
            <button
              type="button"
              role="radio"
              class="time-off-when__chip"
              :class="{ 'time-off-when__chip--active': isCustomDuration }"
              :aria-checked="isCustomDuration"
              @click="openRange"
            >
              {{
                isCustomDuration
                  ? formats.duration(state.durationMinutes)
                  : t('quickCreate.timeOff.customDuration')
              }}
            </button>
          </div>
        </section>
      </template>

      <template #manual>
        <div class="time-off-when__manual">
          <ion-button
            fill="clear"
            size="small"
            class="time-off-when__manual-button"
            @click="openRange"
          >
            <ion-icon slot="start" :icon="timeOutline" aria-hidden="true" />
            {{ t('quickCreate.appointment.dateTime.manual') }}
          </ion-button>
          <span v-if="manualSelection" class="time-off-when__manual-value">
            {{ t('quickCreate.appointment.dateTime.selected') }}:
            <strong>{{ manualSelection }}</strong>
          </span>
        </div>
      </template>
    </appointment-slot-picker-mobile>

    <ion-modal
      :is-open="isRangeOpen"
      class="time-off-when__sheet"
      :breakpoints="[0, 1]"
      :initial-breakpoint="1"
      :handle="true"
      @did-dismiss="isRangeOpen = false"
    >
      <ion-header class="ion-no-border">
        <ion-toolbar>
          <ion-buttons slot="start">
            <ion-button
              fill="clear"
              color="dark"
              :aria-label="t('common.close')"
              @click="isRangeOpen = false"
            >
              <ion-icon slot="icon-only" :icon="closeOutline" aria-hidden="true" />
            </ion-button>
          </ion-buttons>
          <ion-title>{{ t('quickCreate.timeOff.range') }}</ion-title>
          <ion-buttons slot="end">
            <ion-button strong @click="applyRange">{{ t('common.done') }}</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <div class="time-off-when__sheet-body">
        <div class="time-off-when__wheels">
          <div class="time-off-when__wheel">
            <span>{{ t('quickCreate.timeOff.from') }}</span>
            <ion-datetime
              presentation="time"
              prefer-wheel
              :value="toWheelValue(draftStart)"
              :locale="locale"
              :hour-cycle="scheduling.hourCycle.value"
              :minute-values="minuteValues"
              @ion-change="onStartChange"
            />
          </div>
          <div class="time-off-when__wheel">
            <span>{{ t('quickCreate.timeOff.to') }}</span>
            <ion-datetime
              presentation="time"
              prefer-wheel
              :value="toWheelValue(draftEnd)"
              :locale="locale"
              :hour-cycle="scheduling.hourCycle.value"
              :minute-values="minuteValues"
              @ion-change="onEndChange"
            />
          </div>
        </div>
        <p v-if="rangeError" class="time-off-when__error" role="alert">
          <ion-icon :icon="alertCircleOutline" aria-hidden="true" />
          {{ rangeError }}
        </p>
      </div>
    </ion-modal>
  </ion-content>

  <action-footer-mobile>
    <span>{{ t('quickCreate.timeOff.title') }}</span>
    <strong v-if="summary">{{ summary }}</strong>
    <strong v-else class="time-off-when__pending">
      {{ t('quickCreate.timeOff.selectTime') }}
    </strong>
    <template #action>
      <ion-button :disabled="!wizard.isWhenValid.value" @click="next">
        {{ t('quickCreate.appointment.next') }}
        <ion-icon slot="end" :icon="arrowForwardOutline" aria-hidden="true" />
      </ion-button>
    </template>
  </action-footer-mobile>
</template>

<style scoped>
.time-off-when {
  --padding-top: 24px;
}

.time-off-when__options {
  margin-block-end: 0;
}

.time-off-when__options ion-icon[slot='start'] {
  color: var(--ion-color-warning-shade, var(--ion-color-medium));
}

.time-off-when__options ion-toggle {
  padding-block: 10px;
}

.time-off-when__toggle-label,
.time-off-when__toggle-note {
  display: block;
}

.time-off-when__toggle-note {
  margin-top: 2px;
  color: var(--ion-color-medium);
  font-size: 13px;
  white-space: normal;
}

.time-off-when__duration {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.time-off-when__duration h4 {
  margin: 0;
  padding: 0 32px;
  color: var(--ion-color-medium);
  font-size: 13px;
  font-weight: 400;
}

/* Horizontally scrollable on narrow phones, edge-to-edge with a 16px inset. */
.time-off-when__chips {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 0 16px 2px;
  scrollbar-width: none;
}

.time-off-when__chips::-webkit-scrollbar {
  display: none;
}

.time-off-when__chip {
  flex-shrink: 0;
  min-height: 36px;
  padding: 0 14px;
  border: 1.5px solid transparent;
  border-radius: 999px;
  background: var(--se-surface-card, var(--ion-background-color));
  color: var(--ion-text-color);
  font: inherit;
  font-size: 0.88rem;
  font-weight: 600;
  white-space: nowrap;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}

.time-off-when__chip--active {
  border-color: var(--ion-color-primary);
  background: rgba(var(--ion-color-primary-rgb), 0.12);
  color: var(--ion-color-primary-shade);
}

.time-off-when__manual {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 4px 12px;
  padding: 0 16px 0 6px;
}

.time-off-when__manual-button {
  font-weight: 600;
  text-transform: none;
}

.time-off-when__manual-value {
  color: var(--ion-color-medium);
  font-size: 0.82rem;
}

.time-off-when__manual-value strong {
  color: var(--ion-text-color);
}

.time-off-when__pending {
  color: var(--ion-color-medium);
  font-weight: 500;
}

.time-off-when__sheet {
  --height: auto;
}

.time-off-when__sheet ion-toolbar {
  --background: var(--se-surface-page, var(--ion-background-color));
}

.time-off-when__sheet-body {
  padding: 4px 16px calc(16px + var(--safe-area-bottom, 0px));
  background: var(--se-surface-page, var(--ion-background-color));
}

.time-off-when__wheels {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.time-off-when__wheel {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.time-off-when__wheel > span {
  color: var(--ion-color-medium);
  font-size: 13px;
  font-weight: 600;
}

.time-off-when__wheel ion-datetime {
  --background: transparent;
  --background-rgb: var(--se-surface-page-rgb);
  --wheel-fade-background-rgb: var(--se-surface-page-rgb);
  --wheel-highlight-background: var(--se-surface-card, var(--ion-background-color));
  --wheel-highlight-border-radius: 12px;

  width: 100%;
  min-width: 0;
}

.time-off-when__error {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin: 12px 0 0;
  color: var(--ion-color-danger);
  font-size: 0.85rem;
}
</style>
