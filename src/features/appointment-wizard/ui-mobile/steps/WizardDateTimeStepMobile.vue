<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { IonButton, IonContent, IonIcon } from '@ionic/vue'
import { arrowForwardOutline } from 'ionicons/icons'
import { AppointmentSlotPickerMobile } from '@entities/appointment/index.mobile'
import { useFormats } from '@shared/lib/formats'
import { minutesToTimeInput } from '@shared/lib/scheduling'
import { useAppointmentWizardMobile } from '../../model/wizard-mobile-context'
import WizardStepFooterMobile from '../WizardStepFooterMobile.vue'
import WizardStepHeaderMobile from '../WizardStepHeaderMobile.vue'

const { t } = useI18n()
const formats = useFormats()
const wizard = useAppointmentWizardMobile()
const { state, scheduling } = wizard

const selectionLabel = computed(() => {
  if (!state.date || state.slotMinutes == null) return ''
  const [year = 1970, month = 1, day = 1] = state.date.split('-').map(Number)
  const date = formats.weekdayDateShort(new Date(year, month - 1, day))
  return `${date} · ${formats.time(minutesToTimeInput(state.slotMinutes))}`
})
</script>

<template>
  <wizard-step-header-mobile :step="3" :title="t('quickCreate.appointment.steps.dateTime')" />

  <ion-content class="wizard-date-time-step">
    <appointment-slot-picker-mobile
      v-model:date="state.date"
      v-model:slot-minutes="state.slotMinutes"
      :user-id="scheduling.userId.value"
      :time-zone="scheduling.timeZone.value"
      :schedule="scheduling.schedule.value"
      :step-minutes="scheduling.stepMinutes.value"
      :duration-minutes="wizard.totalDuration.value"
      :first-day-of-week="scheduling.firstDayOfWeek.value"
      :hour-cycle="scheduling.hourCycle.value"
    />
  </ion-content>

  <wizard-step-footer-mobile>
    <span>{{ formats.duration(wizard.totalDuration.value) }}</span>
    <strong v-if="selectionLabel">{{ selectionLabel }}</strong>
    <strong v-else class="wizard-date-time-step__pending">
      {{ t('quickCreate.appointment.dateTime.selectTime') }}
    </strong>
    <template #action>
      <ion-button :disabled="state.slotMinutes == null" @click="wizard.next(3)">
        {{ t('quickCreate.appointment.next') }}
        <ion-icon slot="end" :icon="arrowForwardOutline" aria-hidden="true" />
      </ion-button>
    </template>
  </wizard-step-footer-mobile>
</template>

<style scoped>
.wizard-date-time-step {
  --padding-top: 12px;
}

.wizard-date-time-step__pending {
  color: var(--ion-color-medium);
  font-weight: 500;
}
</style>
