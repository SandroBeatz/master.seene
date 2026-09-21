<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  IonAvatar,
  IonBadge,
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonModal,
  IonSpinner,
  IonTitle,
  IonToolbar,
  isPlatform,
} from '@ionic/vue'
import {
  calendarOutline,
  checkmarkCircleOutline,
  checkmarkDoneOutline,
  closeOutline,
  timeOutline,
  walletOutline,
} from 'ionicons/icons'
import { getEffectiveAppointmentStatus, type Appointment } from '@entities/appointment'
import type { Client } from '@entities/client'
import { InsetList } from '@shared/ui/inset-list/index.mobile'
import { getMobileAppointmentMoreActions } from '../model/action-set'

const props = defineProps<{
  isOpen: boolean
  appointment: Appointment
  client?: Client | null
  clientName: string
  serviceNames: string
  dateLabel: string
  timeLabel: string
  durationLabel: string
  priceLabel: string
  primaryLoading?: boolean
}>()

const emit = defineEmits<{
  'update:isOpen': [value: boolean]
  primary: []
  more: []
}>()

const { t } = useI18n()
const spinnerName = isPlatform('ios') ? 'dots' : 'crescent'
const initials = computed(() => {
  const value = props.clientName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
  return value || '—'
})
const isPending = computed(() => props.appointment.status === 'pending')
const hasPrimary = computed(
  () => props.appointment.status === 'pending' || props.appointment.status === 'confirmed',
)
const hasMoreActions = computed(
  () => getMobileAppointmentMoreActions(props.appointment.status).length > 0,
)
const primaryLabel = computed(() =>
  isPending.value ? t('home.nextUp.confirm') : t('home.nextUp.complete'),
)
const primaryIcon = computed(() =>
  isPending.value ? checkmarkCircleOutline : checkmarkDoneOutline,
)
const effectiveStatus = computed(() => getEffectiveAppointmentStatus(props.appointment))
const statusLabel = computed(() => t(`appointments.status.${effectiveStatus.value}`))
const statusColor = computed(() => {
  if (effectiveStatus.value === 'pending') return 'warning'
  if (effectiveStatus.value === 'ongoing' || effectiveStatus.value === 'completed') return 'success'
  if (effectiveStatus.value === 'confirmed') return 'tertiary'
  if (effectiveStatus.value === 'no_show') return 'danger'
  return 'medium'
})

function close() {
  if (props.primaryLoading) return
  emit('update:isOpen', false)
}
</script>

<template>
  <ion-modal
    :is-open="isOpen"
    class="appointment-details-mobile"
    :breakpoints="[0, 0.82, 1]"
    :initial-breakpoint="0.82"
    :handle="!primaryLoading"
    :can-dismiss="!primaryLoading"
    @did-dismiss="emit('update:isOpen', false)"
  >
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button
            fill="clear"
            color="dark"
            :disabled="primaryLoading"
            :aria-label="t('common.close')"
            @click="close"
          >
            <ion-icon slot="icon-only" :icon="closeOutline" aria-hidden="true" />
          </ion-button>
        </ion-buttons>
        <ion-title>{{ t('appointments.preview.title') }}</ion-title>
        <ion-buttons slot="end">
          <ion-button
            v-if="hasMoreActions"
            fill="clear"
            color="dark"
            :disabled="primaryLoading"
            :aria-label="t('appointments.preview.actions')"
            @click="emit('more')"
          >
            {{ t('appointments.preview.actions') }}
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="appointment-details-mobile__content">
      <section class="appointment-details-mobile__person">
        <ion-avatar aria-hidden="true">
          <span v-if="client?.emoji">{{ client.emoji }}</span>
          <span v-else>{{ initials }}</span>
        </ion-avatar>
        <div>
          <h2>{{ clientName }}</h2>
          <ion-badge :color="statusColor">{{ statusLabel }}</ion-badge>
        </div>
      </section>

      <inset-list>
        <ion-item lines="full">
          <ion-icon slot="start" :icon="calendarOutline" color="medium" aria-hidden="true" />
          <ion-label>
            <p>{{ t('appointments.preview.date') }}</p>
            <h2>{{ dateLabel }}</h2>
          </ion-label>
        </ion-item>
        <ion-item lines="full">
          <ion-icon slot="start" :icon="timeOutline" color="medium" aria-hidden="true" />
          <ion-label>
            <p>{{ t('appointments.preview.time') }}</p>
            <h2>{{ timeLabel }} · {{ durationLabel }}</h2>
          </ion-label>
        </ion-item>
        <ion-item lines="full">
          <span slot="start" class="appointment-details-mobile__service-dot" aria-hidden="true" />
          <ion-label class="ion-text-wrap">
            <p>{{ t('appointments.preview.services') }}</p>
            <h2>{{ serviceNames }}</h2>
          </ion-label>
        </ion-item>
        <ion-item lines="none">
          <ion-icon slot="start" :icon="walletOutline" color="medium" aria-hidden="true" />
          <ion-label>
            <p>{{ t('appointments.preview.price') }}</p>
            <h2>{{ priceLabel }}</h2>
          </ion-label>
        </ion-item>
      </inset-list>

      <inset-list v-if="appointment.notes" :header="t('appointments.preview.notes')">
        <ion-item lines="none">
          <p class="appointment-details-mobile__notes">{{ appointment.notes }}</p>
        </ion-item>
      </inset-list>
    </ion-content>

    <ion-footer v-if="hasPrimary" class="ion-no-border">
      <ion-toolbar>
        <ion-button
          class="appointment-details-mobile__primary"
          expand="block"
          :color="isPending ? 'secondary' : 'primary'"
          :disabled="primaryLoading"
          :aria-busy="primaryLoading"
          @click="emit('primary')"
        >
          <ion-spinner v-if="primaryLoading" slot="start" :name="spinnerName" />
          <ion-icon v-else slot="start" :icon="primaryIcon" aria-hidden="true" />
          {{ primaryLabel }}
        </ion-button>
      </ion-toolbar>
    </ion-footer>
  </ion-modal>
</template>

<style scoped>
.appointment-details-mobile {
  --border-radius: 20px 20px 0 0;
}

.appointment-details-mobile ion-toolbar,
.appointment-details-mobile__content {
  --background: var(--se-surface-page, var(--ion-background-color));
}

.appointment-details-mobile__person {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px 4px;
}

.appointment-details-mobile__person ion-avatar {
  display: grid;
  width: 48px;
  height: 48px;
  border-radius: 999px;
  background: var(--se-surface-muted, var(--ion-background-color-step-100));
  place-items: center;
  font-weight: 700;
}

.appointment-details-mobile__person h2 {
  margin: 0 0 5px;
  font-size: 1.08rem;
}

.appointment-details-mobile__service-dot {
  width: 12px;
  height: 12px;
  margin-inline-end: 20px;
  border-radius: 999px;
  background: var(--ion-color-secondary);
}

.appointment-details-mobile__notes {
  margin: 0;
  padding-block: 5px;
  line-height: 1.45;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.appointment-details-mobile__primary {
  --border-radius: 12px;

  min-height: 48px;
  margin: 8px 14px calc(8px + var(--safe-area-bottom, 0px));
  text-transform: none;
}

.appointment-details-mobile__primary ion-icon[slot='start'],
.appointment-details-mobile__primary ion-spinner[slot='start'] {
  margin-inline-end: 7px;
}
</style>
