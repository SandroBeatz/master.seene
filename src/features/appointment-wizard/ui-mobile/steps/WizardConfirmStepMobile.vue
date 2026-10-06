<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  IonButton,
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonNote,
  IonTextarea,
} from '@ionic/vue'
import {
  calendarOutline,
  checkmarkOutline,
  cutOutline,
  hourglassOutline,
  personCircleOutline,
} from 'ionicons/icons'
import { useFormats } from '@shared/lib/formats'
import { minutesToTimeInput } from '@shared/lib/scheduling'
import { InsetList } from '@shared/ui/inset-list/index.mobile'
import { useAppointmentWizardMobile } from '../../model/wizard-mobile-context'
import { ActionFooterMobile } from '@shared/ui/action-footer/index.mobile'
import WizardStepHeaderMobile from '../WizardStepHeaderMobile.vue'
import { ButtonSpinner } from '@shared/ui/button-spinner/index.mobile'

const { t } = useI18n()
const formats = useFormats()
const wizard = useAppointmentWizardMobile()
const { state } = wizard

const dateLabel = computed(() => {
  const [year = 1970, month = 1, day = 1] = state.date.split('-').map(Number)
  return formats.weekdayDate(new Date(year, month - 1, day))
})
const timeLabel = computed(() => {
  if (state.slotMinutes == null) return ''
  const start = minutesToTimeInput(state.slotMinutes)
  const end = minutesToTimeInput((state.slotMinutes + wizard.totalDuration.value) % (24 * 60))
  return `${formats.time(start)} – ${formats.time(end)}`
})

function onPriceInput(event: CustomEvent<{ value?: string | null }>) {
  const raw = event.detail.value
  const value = raw == null || raw === '' ? null : Number(raw)
  state.price = value != null && Number.isFinite(value) ? Math.max(0, value) : null
  state.priceOverridden = true
}
</script>

<template>
  <wizard-step-header-mobile :step="4" :title="t('quickCreate.appointment.steps.confirm')" />

  <ion-content class="wizard-confirm">
    <inset-list>
      <ion-item button :detail="true" @click="wizard.goTo(1)">
        <ion-icon slot="start" :icon="personCircleOutline" color="medium" aria-hidden="true" />
        <ion-label>
          <p>{{ t('quickCreate.appointment.confirm.client') }}</p>
          <h2>{{ wizard.clientName.value }}</h2>
        </ion-label>
      </ion-item>

      <ion-item button :detail="true" @click="wizard.goTo(2)">
        <ion-icon slot="start" :icon="cutOutline" color="medium" aria-hidden="true" />
        <ion-label class="ion-text-wrap">
          <p>{{ t('quickCreate.appointment.confirm.services') }}</p>
          <h2 v-for="service in wizard.selectedServices.value" :key="service.id">
            <span
              class="wizard-confirm__dot"
              :style="{ backgroundColor: service.color }"
              aria-hidden="true"
            />
            {{ service.name }}
          </h2>
        </ion-label>
      </ion-item>

      <ion-item
        :button="!state.skipDateTime"
        :detail="!state.skipDateTime"
        @click="!state.skipDateTime && wizard.goTo(3)"
      >
        <ion-icon slot="start" :icon="calendarOutline" color="medium" aria-hidden="true" />
        <ion-label>
          <p>{{ t('quickCreate.appointment.confirm.date') }}</p>
          <h2 class="wizard-confirm__date">{{ dateLabel }}</h2>
          <h2>{{ timeLabel }}</h2>
        </ion-label>
      </ion-item>

      <ion-item lines="none">
        <ion-icon slot="start" :icon="hourglassOutline" color="medium" aria-hidden="true" />
        <ion-label>{{ t('quickCreate.appointment.confirm.duration') }}</ion-label>
        <ion-note slot="end">{{ formats.duration(wizard.totalDuration.value) }}</ion-note>
      </ion-item>
    </inset-list>

    <inset-list :header="t('quickCreate.appointment.confirm.price')">
      <ion-item lines="none">
        <ion-input
          type="number"
          inputmode="decimal"
          min="0"
          :value="wizard.effectivePrice.value"
          :aria-label="t('quickCreate.appointment.confirm.price')"
          @ion-input="onPriceInput"
        >
          <span slot="end" class="wizard-confirm__currency">{{ formats.currency().symbol }}</span>
        </ion-input>
      </ion-item>
    </inset-list>

    <inset-list :header="t('quickCreate.appointment.confirm.notes')">
      <ion-item lines="none">
        <ion-textarea
          v-model="state.notes"
          :maxlength="2000"
          :rows="3"
          auto-grow
          :placeholder="t('quickCreate.appointment.confirm.notesPlaceholder')"
          :aria-label="t('quickCreate.appointment.confirm.notes')"
        />
      </ion-item>
    </inset-list>
  </ion-content>

  <action-footer-mobile>
    <span>{{ t('quickCreate.appointment.confirm.price') }}</span>
    <strong>{{ formats.price(wizard.effectivePrice.value) }}</strong>
    <template #action>
      <ion-button
        :disabled="wizard.isCreating.value"
        :aria-busy="wizard.isCreating.value"
        @click="wizard.create"
      >
        <button-spinner v-if="wizard.isCreating.value" slot="start" />
        <ion-icon v-else slot="start" :icon="checkmarkOutline" aria-hidden="true" />
        {{ t('quickCreate.appointment.create') }}
      </ion-button>
    </template>
  </action-footer-mobile>
</template>

<style scoped>
.wizard-confirm {
  --padding-top: 24px;
  --padding-bottom: 24px;
}

ion-item ion-label p {
  margin: 0 0 2px;
  color: var(--ion-color-medium);
  font-size: 0.75rem;
}

ion-item ion-label h2 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
}

ion-item ion-label h2 + h2 {
  margin-top: 3px;
}

.wizard-confirm__date {
  text-transform: capitalize;
}

.wizard-confirm__dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex-shrink: 0;
}

.wizard-confirm__currency {
  color: var(--ion-color-medium);
}
</style>
