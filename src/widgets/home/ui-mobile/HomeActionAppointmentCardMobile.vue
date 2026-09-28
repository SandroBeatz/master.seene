<script setup lang="ts">
import { computed, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { IonAvatar, IonBadge, IonButton, IonCard, IonIcon, IonSpinner } from '@ionic/vue'
import {
  alertCircleOutline,
  chatbubbleEllipsesOutline,
  checkmarkCircleOutline,
  checkmarkDoneOutline,
  closeCircleOutline,
  globeOutline,
  hourglassOutline,
  personRemoveOutline,
  timeOutline,
} from 'ionicons/icons'
import { getEffectiveAppointmentStatus, type Appointment } from '@entities/appointment'
import type { Client } from '@entities/client'

const props = withDefaults(
  defineProps<{
    appointment: Appointment
    client: Client | null
    clientName: string
    serviceNames: string
    serviceColors: string[]
    dateLabel: string
    timeLabel: string
    durationLabel: string
    priceLabel: string
    attentionLabel?: string
    attentionTone?: 'warning' | 'error'
    primaryLoading?: boolean
    now?: Date
  }>(),
  {
    attentionLabel: undefined,
    attentionTone: undefined,
    primaryLoading: false,
    now: () => new Date(),
  },
)

const emit = defineEmits<{
  open: []
  primary: []
  note: []
  actions: []
}>()

const { t } = useI18n()

const isPending = computed(() => props.appointment.status === 'pending')
const isOnline = computed(() => props.appointment.source === 'online_booking')
const effectiveStatus = computed(() => getEffectiveAppointmentStatus(props.appointment, props.now))
const statusLabel = computed(() => t(`appointments.status.${effectiveStatus.value}`))

const statusMeta = computed(() => {
  switch (effectiveStatus.value) {
    case 'pending':
      return { icon: timeOutline, color: 'warning' }
    case 'confirmed':
      return { icon: checkmarkCircleOutline, color: 'primary' }
    case 'ongoing':
      return { icon: hourglassOutline, color: 'success' }
    case 'past':
      return { icon: checkmarkDoneOutline, color: 'medium' }
    case 'completed':
      return { icon: checkmarkDoneOutline, color: 'success' }
    case 'cancelled':
      return { icon: closeCircleOutline, color: 'medium' }
    case 'no_show':
      return { icon: personRemoveOutline, color: 'danger' }
    case 'expired':
      return { icon: alertCircleOutline, color: 'medium' }
  }

  return { icon: timeOutline, color: 'medium' }
})

const primaryLabel = computed(() =>
  isPending.value ? t('home.nextUp.confirm') : t('home.nextUp.complete'),
)
const primaryIcon = computed(() =>
  isPending.value ? checkmarkCircleOutline : checkmarkDoneOutline,
)
const primaryColor = computed(() => (isPending.value ? 'secondary' : 'primary'))

const initials = computed(() => {
  const parts = [props.client?.first_name, props.client?.last_name].filter(Boolean) as string[]
  return (
    parts
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('')
      .slice(0, 2) || '?'
  )
})

const accentColor = computed(
  () =>
    props.serviceColors[0] ??
    (props.appointment.status === 'pending'
      ? 'var(--ion-color-warning)'
      : 'var(--ion-color-tertiary)'),
)
const cardStyle = computed(() => ({ '--appointment-accent': accentColor.value }))

const HOLD_DELAY_MS = 550
const HOLD_MOVE_TOLERANCE_PX = 10
let holdTimer: ReturnType<typeof setTimeout> | undefined
let holdStartX = 0
let holdStartY = 0
let suppressNextClick = false

function clearHoldTimer() {
  if (holdTimer) clearTimeout(holdTimer)
  holdTimer = undefined
}

function startHold(event: PointerEvent) {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  clearHoldTimer()
  suppressNextClick = false
  holdStartX = event.clientX
  holdStartY = event.clientY
  holdTimer = setTimeout(() => {
    holdTimer = undefined
    suppressNextClick = true
    emit('actions')
  }, HOLD_DELAY_MS)
}

function trackHold(event: PointerEvent) {
  if (!holdTimer) return
  const movedX = Math.abs(event.clientX - holdStartX)
  const movedY = Math.abs(event.clientY - holdStartY)
  if (movedX > HOLD_MOVE_TOLERANCE_PX || movedY > HOLD_MOVE_TOLERANCE_PX) clearHoldTimer()
}

function openPreview() {
  clearHoldTimer()
  if (suppressNextClick) {
    suppressNextClick = false
    return
  }
  emit('open')
}

function openActionsFromContextMenu() {
  clearHoldTimer()
  if (suppressNextClick) return
  suppressNextClick = true
  emit('actions')
}

onBeforeUnmount(clearHoldTimer)
</script>

<template>
  <ion-card class="action-card" :style="cardStyle">
    <article
      class="action-card__content"
      role="button"
      tabindex="0"
      :aria-label="`${clientName}, ${dateLabel} ${timeLabel}`"
      @click="openPreview"
      @keydown.enter.prevent="emit('open')"
      @pointerdown="startHold"
      @pointermove="trackHold"
      @pointerup="clearHoldTimer"
      @pointercancel="clearHoldTimer"
      @pointerleave="clearHoldTimer"
      @contextmenu.prevent="openActionsFromContextMenu"
    >
      <div class="action-card__topline">
        <span class="action-card__date">{{ dateLabel }} · {{ timeLabel }}</span>

        <div class="action-card__badges">
          <ion-badge
            class="action-card__status"
            :color="statusMeta.color"
            :aria-label="statusLabel"
            :title="statusLabel"
          >
            <ion-icon :icon="statusMeta.icon" aria-hidden="true" />
          </ion-badge>
          <ion-badge
            v-if="isOnline"
            class="action-card__status"
            color="tertiary"
            :aria-label="t('home.nextUp.badgeOnline')"
            :title="t('home.nextUp.badgeOnlineHint')"
          >
            <ion-icon :icon="globeOutline" aria-hidden="true" />
          </ion-badge>
        </div>
      </div>

      <div class="action-card__person">
        <ion-avatar class="action-card__avatar" aria-hidden="true">
          <span v-if="client?.emoji" class="action-card__emoji">{{ client.emoji }}</span>
          <span v-else>{{ initials }}</span>
        </ion-avatar>

        <div class="action-card__details">
          <h3 class="action-card__name">{{ clientName }}</h3>
          <p class="action-card__services">{{ serviceNames }}</p>
          <p class="action-card__meta">{{ durationLabel }} · {{ priceLabel }}</p>
          <p
            v-if="attentionLabel"
            class="action-card__attention"
            :class="`action-card__attention--${attentionTone ?? 'warning'}`"
          >
            {{ attentionLabel }}
          </p>
        </div>
      </div>

      <div class="action-card__actions" @pointerdown.stop>
        <ion-button
          class="action-card__primary"
          size="small"
          :color="primaryColor"
          :disabled="primaryLoading"
          :aria-busy="primaryLoading"
          @click.stop="emit('primary')"
        >
          <ion-spinner v-if="primaryLoading" slot="start" name="crescent" />
          <ion-icon v-else slot="start" :icon="primaryIcon" aria-hidden="true" />
          {{ primaryLabel }}
        </ion-button>
        <ion-button
          v-if="appointment.notes"
          class="action-card__note"
          fill="clear"
          size="small"
          color="medium"
          :aria-label="t('home.nextUp.viewNote')"
          @click.stop="emit('note')"
        >
          <ion-icon slot="icon-only" :icon="chatbubbleEllipsesOutline" aria-hidden="true" />
        </ion-button>
      </div>
    </article>
  </ion-card>
</template>

<style scoped>
.action-card {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 190px;
  margin: 0;
  overflow: hidden;
  border-radius: 16px;
  background: var(--se-surface-card);
  box-shadow: 0 1px 3px rgb(0 0 0 / 7%);
  -webkit-touch-callout: none;
}

.action-card::before {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, var(--appointment-accent), transparent 58%);
  content: '';
  opacity: 0.1;
  pointer-events: none;
}

.action-card::after {
  position: absolute;
  inset-block: 12px;
  inset-inline-start: 0;
  width: 3px;
  border-radius: 0 999px 999px 0;
  background: var(--appointment-accent);
  content: '';
}

.action-card__content {
  position: relative;
  z-index: 1;
  display: flex;
  min-height: 190px;
  flex-direction: column;
  padding: 14px;
  outline: none;
}

.action-card__content:focus-visible {
  box-shadow: inset 0 0 0 2px var(--ion-color-primary);
}

.action-card__topline,
.action-card__person,
.action-card__actions {
  display: flex;
  align-items: center;
}

.action-card__topline {
  justify-content: space-between;
  gap: 10px;
}

.action-card__date {
  overflow: hidden;
  padding: 4px 8px;
  border-radius: 7px;
  background: var(--se-surface-muted, var(--ion-background-color-step-50));
  color: var(--ion-color-medium);
  font-size: 0.72rem;
  font-weight: 600;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.action-card__badges {
  display: flex;
  flex: 0 0 auto;
  gap: 5px;
}

.action-card__status {
  display: flex;
  width: 27px;
  height: 27px;
  align-items: center;
  justify-content: center;
  padding: 0;
  border-radius: 999px;
}

.action-card__status ion-icon {
  font-size: 15px;
}

.action-card__person {
  min-width: 0;
  align-items: flex-start;
  gap: 11px;
  margin-top: 14px;
}

.action-card__avatar {
  display: flex;
  width: 42px;
  height: 42px;
  flex: 0 0 42px;
  align-items: center;
  justify-content: center;
  background: var(--se-avatar-surface);
  color: var(--se-avatar-foreground);
  font-size: 0.78rem;
  font-weight: 700;
}

.action-card__emoji {
  font-size: 1.2rem;
}

.action-card__details {
  min-width: 0;
  flex: 1;
}

.action-card__name,
.action-card__services,
.action-card__meta,
.action-card__attention {
  margin: 0;
}

.action-card__name,
.action-card__services,
.action-card__meta {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.action-card__name {
  color: var(--ion-text-color);
  font-size: 0.94rem;
  font-weight: 700;
  line-height: 1.25;
}

.action-card__services,
.action-card__meta {
  color: var(--ion-color-medium);
  font-size: 0.75rem;
  line-height: 1.35;
}

.action-card__services {
  margin-top: 2px;
}

.action-card__meta {
  margin-top: 1px;
  font-weight: 600;
}

.action-card__attention {
  margin-top: 5px;
  font-size: 0.72rem;
  font-weight: 650;
  line-height: 1.25;
}

.action-card__attention--warning {
  color: var(--ion-color-warning-shade);
}

.action-card__attention--error {
  color: var(--ion-color-danger);
}

.action-card__actions {
  gap: 5px;
  margin-top: auto;
  padding-top: 13px;
}

.action-card__primary {
  --border-radius: 999px;
  --padding-start: 12px;
  --padding-end: 14px;

  min-height: 34px;
  margin: 0;
  font-size: 0.76rem;
  font-weight: 650;
  text-transform: none;
}

.action-card__primary ion-icon[slot='start'],
.action-card__primary ion-spinner[slot='start'] {
  margin-inline-end: 6px;
}

.action-card__note {
  --border-radius: 999px;
  --padding-start: 8px;
  --padding-end: 8px;

  min-width: 34px;
  min-height: 34px;
  margin: 0 0 0 auto;
}
</style>
