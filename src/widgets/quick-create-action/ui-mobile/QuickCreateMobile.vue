<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  AppointmentWizardMobile,
  type AppointmentPrefill,
} from '@features/appointment-wizard/index.mobile'
import { TimeOffWizardMobile } from '@features/time-off-wizard/index.mobile'
import QuickCreateSheetMobile from './QuickCreateSheetMobile.vue'

// The "+" flow of the Ionic build: a sheet to pick what to create, then the
// appointment or time-off wizard. Pages mount one and call the exposed methods
// (the "+" button opens the menu; a calendar slot jumps straight to a booking).
const isMenuOpen = ref(false)
const isAppointmentOpen = ref(false)
const isTimeOffOpen = ref(false)
const appointmentPrefill = ref<AppointmentPrefill | undefined>(undefined)
const presentingElement = ref<HTMLElement | null>(null)

onMounted(() => {
  presentingElement.value = document.querySelector('ion-router-outlet')
})

function openMenu() {
  isMenuOpen.value = true
}

function openAppointment(prefill?: AppointmentPrefill) {
  appointmentPrefill.value = prefill
  isAppointmentOpen.value = true
}

function openTimeOff() {
  isTimeOffOpen.value = true
}

function onMenuSelect(kind: 'appointment' | 'timeOff') {
  if (kind === 'appointment') openAppointment()
  else openTimeOff()
}

defineExpose({ openMenu, openAppointment, openTimeOff })
</script>

<template>
  <quick-create-sheet-mobile v-model:is-open="isMenuOpen" @select="onMenuSelect" />
  <appointment-wizard-mobile
    v-model:is-open="isAppointmentOpen"
    :prefill="appointmentPrefill"
    :presenting-element="presentingElement"
  />
  <time-off-wizard-mobile v-model:is-open="isTimeOffOpen" :presenting-element="presentingElement" />
</template>
