<script setup lang="ts">
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
import type { TimeOffStep } from '../model/time-off-wizard-mobile-context'
import { useTimeOffWizardMobile } from '../model/time-off-wizard-mobile-context'

// Step chrome matching the appointment wizard: close on the first step, native
// back (pops the modal's ion-nav) on the second, title + "step N of 2" + progress.
const TOTAL_STEPS = 2

defineProps<{
  step: TimeOffStep
  title: string
}>()

const { t } = useI18n()
const { close } = useTimeOffWizardMobile()
</script>

<template>
  <ion-header class="time-off-step-header ion-no-border">
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button
          v-if="step === 1"
          fill="clear"
          color="dark"
          :aria-label="t('common.close')"
          @click="close"
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
        <span class="time-off-step-header__title">{{ title }}</span>
        <span class="time-off-step-header__counter">
          {{ t('quickCreate.timeOff.stepOf', { step, total: TOTAL_STEPS }) }}
        </span>
      </ion-title>
    </ion-toolbar>
    <ion-progress-bar class="time-off-step-header__progress" :value="step / TOTAL_STEPS" />
  </ion-header>
</template>

<style scoped>
.time-off-step-header ion-toolbar {
  --background: var(--se-surface-page, var(--ion-background-color));
}

.time-off-step-header ion-title {
  line-height: 1.2;
}

.time-off-step-header__title,
.time-off-step-header__counter {
  display: block;
}

.time-off-step-header__title {
  font-size: 1rem;
  font-weight: 700;
}

.time-off-step-header__counter {
  margin-top: 1px;
  color: var(--ion-color-medium);
  font-size: 0.72rem;
  font-weight: 500;
}

.time-off-step-header__progress {
  --background: var(--se-separator, var(--ion-background-color-step-150));

  height: 3px;
}
</style>
