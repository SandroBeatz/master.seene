<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { IonButton, IonContent, IonIcon, IonItem, IonTextarea } from '@ionic/vue'
import { checkmarkOutline } from 'ionicons/icons'
import { ActionFooterMobile } from '@shared/ui/action-footer/index.mobile'
import { InsetList } from '@shared/ui/inset-list/index.mobile'
import { TIME_OFF_REASONS } from '../../model/time-off-wizard-mobile'
import { useTimeOffWizardMobile } from '../../model/time-off-wizard-mobile-context'
import TimeOffStepHeaderMobile from '../TimeOffStepHeaderMobile.vue'
import { ButtonSpinner } from '@shared/ui/button-spinner/index.mobile'

const { t } = useI18n()
const { wizard, isEditing, summary, isSaving, submit } = useTimeOffWizardMobile()
const { state } = wizard
</script>

<template>
  <time-off-step-header-mobile :step="2" :title="t('quickCreate.timeOff.steps.reason')" />

  <ion-content class="time-off-reason">
    <section class="time-off-reason__quick">
      <h4>{{ t('quickCreate.timeOff.reasonsTitle') }}</h4>
      <div class="time-off-reason__chips">
        <button
          v-for="reason in TIME_OFF_REASONS"
          :key="reason"
          type="button"
          class="time-off-reason__chip"
          @click="wizard.addReason(t(`quickCreate.timeOff.reasons.${reason}`))"
        >
          {{ t(`quickCreate.timeOff.reasons.${reason}`) }}
        </button>
      </div>
    </section>

    <inset-list :header="t('quickCreate.timeOff.comment')">
      <ion-item>
        <ion-textarea
          v-model="state.notes"
          :maxlength="500"
          :rows="4"
          auto-grow
          :placeholder="t('quickCreate.timeOff.commentPlaceholder')"
          :aria-label="t('quickCreate.timeOff.comment')"
        />
      </ion-item>
    </inset-list>
    <p class="time-off-reason__hint">{{ t('quickCreate.timeOff.commentHint') }}</p>
  </ion-content>

  <action-footer-mobile>
    <span>{{ t('quickCreate.timeOff.title') }}</span>
    <strong>{{ summary }}</strong>
    <template #action>
      <ion-button :disabled="isSaving || (isEditing && !wizard.isChanged.value)" @click="submit">
        <button-spinner v-if="isSaving" slot="start" />
        <ion-icon v-else slot="start" :icon="checkmarkOutline" aria-hidden="true" />
        {{ isEditing ? t('quickCreate.timeOff.save') : t('quickCreate.timeOff.create') }}
      </ion-button>
    </template>
  </action-footer-mobile>
</template>

<style scoped>
.time-off-reason {
  --padding-top: 20px;
}

.time-off-reason__quick {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 22px;
}

.time-off-reason__quick h4 {
  margin: 0;
  padding: 0 32px;
  color: var(--ion-color-medium);
  font-size: 13px;
  font-weight: 400;
}

.time-off-reason__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 0 16px;
}

.time-off-reason__chip {
  min-height: 36px;
  padding: 0 14px;
  border: 0;
  border-radius: 999px;
  background: var(--se-surface-card, var(--ion-background-color));
  color: var(--ion-text-color);
  font: inherit;
  font-size: 0.88rem;
  font-weight: 600;
  -webkit-tap-highlight-color: transparent;
}

.time-off-reason__chip:active {
  background: rgba(var(--ion-color-primary-rgb), 0.12);
  color: var(--ion-color-primary-shade);
}

.time-off-reason ion-textarea {
  --padding-top: 12px;
  --padding-bottom: 12px;
}

.time-off-reason__hint {
  margin: 8px 0 0;
  padding: 0 32px;
  color: var(--ion-color-medium);
  font-size: 12px;
}
</style>
