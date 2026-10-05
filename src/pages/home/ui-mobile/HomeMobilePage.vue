<script setup lang="ts">
import { onMounted, ref, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { IonContent, IonFab, IonFabButton, IonIcon, IonPage } from '@ionic/vue'
import { add } from 'ionicons/icons'
import type { Appointment } from '@entities/appointment'
import type { MobileAppointmentQuickAction } from '@features/appointment-actions/index.mobile'
import { AppointmentWizardMobile } from '@features/appointment-wizard/index.mobile'
import { TimeOffWizardMobile } from '@features/time-off-wizard/index.mobile'
import { AppointmentPreviewHostMobile } from '@widgets/appointment-preview-panel/index.mobile'
import {
  HomeActionsMobile,
  HomeHeaderMobile,
  HomeOverviewMobile,
  HomeScheduleMobile,
} from '@widgets/home/index.mobile'
import HomeCreateSheetMobile from './HomeCreateSheetMobile.vue'

const { t } = useI18n()
const preview = useTemplateRef('preview')
const isCreateSheetOpen = ref(false)
const isWizardOpen = ref(false)
const isTimeOffOpen = ref(false)
const presentingElement = ref<HTMLElement | null>(null)

onMounted(() => {
  presentingElement.value = document.querySelector('ion-router-outlet')
})

function onCreateSelect(kind: 'appointment' | 'timeOff') {
  if (kind === 'appointment') isWizardOpen.value = true
  else isTimeOffOpen.value = true
}

function handleQuickAction(appointment: Appointment, action: MobileAppointmentQuickAction) {
  if (action === 'details') void preview.value?.openDetails(appointment)
  else if (action === 'reschedule') void preview.value?.openReschedule(appointment)
  else if (action === 'edit') void preview.value?.openEdit(appointment)
  else void preview.value?.remove(appointment)
}
</script>

<template>
  <ion-page>
    <home-header-mobile />
    <ion-content :fullscreen="true">
      <main class="home-content">
        <home-overview-mobile />
        <home-actions-mobile
          :busy-ids="preview?.processingIds"
          @open="preview?.openDetails($event)"
          @primary="preview?.primary($event)"
          @actions="preview?.openActions($event)"
        />
        <home-schedule-mobile @select="preview?.openDetails($event)" @action="handleQuickAction" />
      </main>

      <ion-fab slot="fixed" vertical="bottom" horizontal="end" class="home-fab">
        <ion-fab-button :aria-label="t('quickCreate.menu.title')" @click="isCreateSheetOpen = true">
          <ion-icon :icon="add" aria-hidden="true" />
        </ion-fab-button>
      </ion-fab>
    </ion-content>

    <appointment-preview-host-mobile ref="preview" />
    <home-create-sheet-mobile v-model:is-open="isCreateSheetOpen" @select="onCreateSelect" />
    <appointment-wizard-mobile
      v-model:is-open="isWizardOpen"
      :presenting-element="presentingElement"
    />
    <time-off-wizard-mobile
      v-model:is-open="isTimeOffOpen"
      :presenting-element="presentingElement"
    />
  </ion-page>
</template>

<style scoped>
.home-content {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 12px 14px calc(88px + var(--safe-area-bottom, 0px));
}

.home-fab {
  margin: 0 4px 4px 0;
}
</style>
