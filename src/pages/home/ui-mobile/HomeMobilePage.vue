<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { IonContent, IonFab, IonFabButton, IonIcon, IonPage } from '@ionic/vue'
import { add } from 'ionicons/icons'
import type { Appointment } from '@entities/appointment'
import { AppointmentWizardMobile } from '@features/appointment-wizard/index.mobile'
import {
  HomeActionsMobile,
  HomeHeaderMobile,
  HomeOverviewMobile,
  HomeScheduleMobile,
} from '@widgets/home/index.mobile'

interface HomeActionsExpose {
  openAppointment: (appointment: Appointment) => void
  editAppointment: (appointment: Appointment) => void
  deleteAppointment: (appointment: Appointment) => Promise<void>
}

const { t } = useI18n()
const actions = ref<HomeActionsExpose | null>(null)
const isWizardOpen = ref(false)
const presentingElement = ref<HTMLElement | null>(null)

onMounted(() => {
  presentingElement.value = document.querySelector('ion-router-outlet')
})

function openAppointment(appointment: Appointment) {
  actions.value?.openAppointment(appointment)
}

function handleScheduleAction(appointment: Appointment, action: 'details' | 'edit' | 'delete') {
  if (action === 'details') actions.value?.openAppointment(appointment)
  else if (action === 'edit') actions.value?.editAppointment(appointment)
  else void actions.value?.deleteAppointment(appointment)
}
</script>

<template>
  <ion-page>
    <home-header-mobile />
    <ion-content :fullscreen="true">
      <main class="home-content">
        <home-overview-mobile />
        <home-actions-mobile ref="actions" />
        <home-schedule-mobile @select="openAppointment" @action="handleScheduleAction" />
      </main>

      <ion-fab slot="fixed" vertical="bottom" horizontal="end" class="home-fab">
        <ion-fab-button
          :aria-label="t('quickCreate.menu.appointment')"
          @click="isWizardOpen = true"
        >
          <ion-icon :icon="add" aria-hidden="true" />
        </ion-fab-button>
      </ion-fab>
    </ion-content>

    <appointment-wizard-mobile
      v-model:is-open="isWizardOpen"
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
