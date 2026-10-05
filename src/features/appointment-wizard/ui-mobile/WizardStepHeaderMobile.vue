<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonHeader,
  IonIcon,
  IonProgressBar,
  IonTitle,
  IonToolbar,
} from '@ionic/vue'
import { arrowBackOutline, closeOutline } from 'ionicons/icons'
import type { WizardStep } from '../model/appointment-wizard'
import { useAppointmentWizardMobile } from '../model/wizard-mobile-context'

// Shared chrome of every wizard step: close on the root step, native back
// (pops the modal's ion-nav) on the others, the step title and a progress bar.
const props = defineProps<{
  step: WizardStep
  title: string
}>()

const { t } = useI18n()
const wizard = useAppointmentWizardMobile()
const position = computed(() => wizard.positionOf(props.step))
</script>

<template>
  <ion-header class="wizard-step-header ion-no-border">
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button
          v-if="step === 1"
          fill="clear"
          color="dark"
          :aria-label="t('common.close')"
          @click="wizard.close"
        >
          <ion-icon slot="icon-only" :icon="closeOutline" aria-hidden="true" />
        </ion-button>
        <ion-back-button
          v-else
          text=""
          :icon="arrowBackOutline"
          color="dark"
          :aria-label="t('quickCreate.actions.back')"
        />
      </ion-buttons>
      <ion-title>
        <span class="wizard-step-header__title">{{ title }}</span>
        <span class="wizard-step-header__counter">
          {{ t('quickCreate.appointment.stepOf', { step: position, total: wizard.totalSteps }) }}
        </span>
      </ion-title>
    </ion-toolbar>
    <ion-progress-bar class="wizard-step-header__progress" :value="position / wizard.totalSteps" />
    <slot />
  </ion-header>
</template>

<style scoped>
.wizard-step-header ion-toolbar {
  --background: var(--se-surface-page, var(--ion-background-color));
}

.wizard-step-header ion-title {
  line-height: 1.2;
}

.wizard-step-header__title,
.wizard-step-header__counter {
  display: block;
}

.wizard-step-header__title {
  font-size: 1rem;
  font-weight: 700;
}

.wizard-step-header__counter {
  margin-top: 1px;
  color: var(--ion-color-medium);
  font-size: 0.72rem;
  font-weight: 500;
}

.wizard-step-header__progress {
  --background: var(--se-separator, var(--ion-background-color-step-150));

  height: 3px;
}
</style>
