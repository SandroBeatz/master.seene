<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonModal,
  IonTitle,
  IonToolbar,
} from '@ionic/vue'
import { closeCircleOutline, closeOutline, personRemoveOutline } from 'ionicons/icons'
import type { Appointment } from '@entities/appointment'
import { InsetList } from '@shared/ui/inset-list/index.mobile'
import {
  getMobileAppointmentMoreActions,
  type MobileAppointmentMoreAction,
} from '../model/action-set'

const props = defineProps<{
  isOpen: boolean
  appointment: Appointment
  clientName: string
  dateLabel: string
  timeLabel: string
}>()

const emit = defineEmits<{
  'update:isOpen': [value: boolean]
  select: [action: MobileAppointmentMoreAction]
}>()

const { t } = useI18n()
const pendingAction = ref<MobileAppointmentMoreAction | null>(null)
const actions = computed(() => getMobileAppointmentMoreActions(props.appointment.status))
const drawerStyle = computed(() => ({
  '--height': `min(${132 + actions.value.length * 54}px, 70vh)`,
  '--border-radius': '20px 20px 0 0',
}))

function actionLabel(action: MobileAppointmentMoreAction): string {
  if (action === 'decline') return t('home.nextUp.decline')
  if (action === 'cancel') return t('appointments.preview.cancelAppointment')
  return t('home.nextUp.noShow')
}

function actionIcon(action: MobileAppointmentMoreAction): string {
  return action === 'no_show' ? personRemoveOutline : closeCircleOutline
}

function close() {
  emit('update:isOpen', false)
}

function select(action: MobileAppointmentMoreAction) {
  pendingAction.value = action
  close()
}

function onDidDismiss() {
  emit('update:isOpen', false)
  if (!pendingAction.value) return
  const action = pendingAction.value
  pendingAction.value = null
  emit('select', action)
}
</script>

<template>
  <ion-modal
    :is-open="isOpen"
    class="appointment-actions-drawer"
    :style="drawerStyle"
    :breakpoints="[0, 1]"
    :initial-breakpoint="1"
    :handle="true"
    @did-dismiss="onDidDismiss"
  >
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button fill="clear" color="dark" :aria-label="t('common.close')" @click="close">
            <ion-icon slot="icon-only" :icon="closeOutline" aria-hidden="true" />
          </ion-button>
        </ion-buttons>
        <ion-title>{{ t('appointments.preview.actions') }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="appointment-actions-drawer__content">
      <p class="appointment-actions-drawer__summary">
        <strong>{{ clientName }}</strong>
        <span>{{ dateLabel }} · {{ timeLabel }}</span>
      </p>

      <inset-list>
        <ion-item
          v-for="action in actions"
          :key="action"
          button
          :detail="false"
          lines="full"
          @click="select(action)"
        >
          <ion-icon slot="start" :icon="actionIcon(action)" color="danger" aria-hidden="true" />
          <ion-label color="danger">{{ actionLabel(action) }}</ion-label>
        </ion-item>
      </inset-list>
    </ion-content>
  </ion-modal>
</template>

<style scoped>
.appointment-actions-drawer ion-toolbar,
.appointment-actions-drawer__content {
  --background: var(--se-surface-page, var(--ion-background-color));
}

.appointment-actions-drawer__summary {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin: 12px 30px 4px;
  color: var(--ion-color-medium);
  font-size: 0.78rem;
  line-height: 1.35;
}

.appointment-actions-drawer__summary strong {
  color: var(--ion-text-color);
  font-size: 0.9rem;
}
</style>
