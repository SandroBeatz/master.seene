<script setup lang="ts">
import { ref } from 'vue'
import { IonContent, IonPage } from '@ionic/vue'
import type { Appointment } from '@entities/appointment'
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

const actions = ref<HomeActionsExpose | null>(null)

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
    </ion-content>
  </ion-page>
</template>

<style scoped>
.home-content {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 12px 14px calc(14px + var(--safe-area-bottom, 0px));
}
</style>
