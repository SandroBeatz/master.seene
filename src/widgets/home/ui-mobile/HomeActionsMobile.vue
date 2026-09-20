<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { IonButton, IonCard, IonIcon, IonSkeletonText } from '@ionic/vue'
import { alertCircleOutline } from 'ionicons/icons'
import { useActionableAppointmentsQuery, type Appointment } from '@entities/appointment'
import { useClientsQuery, type Client } from '@entities/client'
import { useServicesQuery, type Service } from '@entities/service'
import { useSessionStore } from '@entities/session'
import { useFormats } from '@shared/lib/formats'
import { useNowMinute } from '@shared/lib/now'
import {
  groupHomeActionableAppointments,
  hasAppointmentSlotEnded,
  minutesSince,
  needsHomeActionWaitingAttention,
} from '../model/home-actionable-appointments'
import HomeActionAppointmentCardMobile from './HomeActionAppointmentCardMobile.vue'

const emit = defineEmits<{
  open: [appointment: Appointment]
  primary: [appointment: Appointment]
  more: [appointment: Appointment]
}>()

const { t } = useI18n()
const formats = useFormats()
const sessionStore = useSessionStore()
const now = useNowMinute()
const userId = computed(() => sessionStore.session?.user.id ?? '')

const { data: appointments, isPending, error, refetch } = useActionableAppointmentsQuery(userId)
const { data: clients } = useClientsQuery(userId)
const { data: services } = useServicesQuery(userId)

const groups = computed(() => groupHomeActionableAppointments(appointments.value ?? [], now.value))
const items = computed(() => groups.value.ordered)
const showWidget = computed(() => isPending.value || Boolean(error.value) || items.value.length > 0)

const clientById = computed(
  () => new Map((clients.value ?? []).map((client) => [client.id, client])),
)
const serviceById = computed(
  () => new Map((services.value ?? []).map((service) => [service.id, service])),
)

const activeIndex = ref(0)
const activeAppointment = computed(() => items.value[activeIndex.value] ?? items.value[0] ?? null)
const activeColors = computed(() =>
  activeAppointment.value ? getServices(activeAppointment.value).map(({ color }) => color) : [],
)
const accentStyle = computed(() => {
  const colors = activeColors.value
  if (!colors.length) return { background: 'transparent' }

  const stops =
    colors.length === 1
      ? `${colors[0]} 0%`
      : colors
          .map((color, index) => `${color} ${Math.round((index / (colors.length - 1)) * 48)}%`)
          .join(', ')

  return { background: `radial-gradient(55% 70% at 0% 50%, ${stops}, transparent 75%)` }
})

watch(
  () => items.value.length,
  (length) => {
    if (activeIndex.value >= length) activeIndex.value = Math.max(0, length - 1)
  },
)

function getClient(appointment: Appointment): Client | null {
  return clientById.value.get(appointment.client_id) ?? null
}

function getClientName(appointment: Appointment): string {
  const client = getClient(appointment)
  return client ? [client.first_name, client.last_name].filter(Boolean).join(' ') : '—'
}

function getServices(appointment: Appointment): Service[] {
  return appointment.service_ids
    .map((id) => serviceById.value.get(id))
    .filter((service): service is Service => Boolean(service))
}

function getServiceNames(appointment: Appointment): string {
  return (
    getServices(appointment)
      .map(({ name }) => name)
      .join(', ') || '—'
  )
}

function formatTime(isoString: string): string {
  const date = new Date(isoString)
  const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  return formats.time(time)
}

function waitingLabel(appointment: Appointment): string {
  const minutes = minutesSince(appointment.created_at, now.value)
  if (minutes < 60) return t('home.nextUp.unitMinShort', { n: minutes })

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t('home.nextUp.unitHourShort', { n: hours })
  return t('home.nextUp.unitDayShort', { n: Math.floor(hours / 24) })
}

function attentionLabel(appointment: Appointment): string | undefined {
  if (appointment.status !== 'pending') return undefined
  if (hasAppointmentSlotEnded(appointment, now.value)) return t('home.nextUp.slotPassed')
  if (needsHomeActionWaitingAttention(appointment, now.value)) {
    return t('home.nextUp.waitingFor', { time: waitingLabel(appointment) })
  }
  return undefined
}

function attentionTone(appointment: Appointment): 'warning' | 'error' | undefined {
  if (appointment.status !== 'pending') return undefined
  if (hasAppointmentSlotEnded(appointment, now.value)) return 'error'
  if (needsHomeActionWaitingAttention(appointment, now.value)) return 'warning'
  return undefined
}

function onCarouselScroll(event: Event) {
  const carousel = event.currentTarget as HTMLElement
  const slides = Array.from(carousel.querySelectorAll<HTMLElement>('.actions-carousel__slide'))
  if (!slides.length) return

  let closestIndex = 0
  let closestDistance = Number.POSITIVE_INFINITY
  for (const [index, slide] of slides.entries()) {
    const distance = Math.abs(slide.offsetLeft - carousel.scrollLeft)
    if (distance < closestDistance) {
      closestDistance = distance
      closestIndex = index
    }
  }
  activeIndex.value = closestIndex
}

function retry() {
  void refetch()
}
</script>

<template>
  <section
    v-if="showWidget"
    class="actions-block"
    :aria-label="t('home.nextUp.title')"
    :aria-busy="isPending"
  >
    <div class="actions-block__accent" :style="accentStyle" aria-hidden="true" />

    <div v-if="isPending" class="actions-carousel actions-carousel--loading">
      <ion-card v-for="index in 2" :key="index" class="action-skeleton">
        <ion-skeleton-text :animated="true" class="action-skeleton__date" />
        <div class="action-skeleton__person">
          <ion-skeleton-text :animated="true" class="action-skeleton__avatar" />
          <div>
            <ion-skeleton-text :animated="true" class="action-skeleton__name" />
            <ion-skeleton-text :animated="true" class="action-skeleton__service" />
          </div>
        </div>
        <ion-skeleton-text :animated="true" class="action-skeleton__button" />
      </ion-card>
    </div>

    <div v-else-if="error && !items.length" class="actions-error" role="alert">
      <ion-icon :icon="alertCircleOutline" color="danger" aria-hidden="true" />
      <span>{{ t('home.nextUp.loadError') }}</span>
      <ion-button fill="clear" size="small" @click="retry">
        {{ t('home.nextUp.retry') }}
      </ion-button>
    </div>

    <div
      v-else
      class="actions-carousel"
      :class="{ 'actions-carousel--single': items.length === 1 }"
      role="region"
      :aria-label="t('home.nextUp.carouselLabel')"
      tabindex="0"
      @scroll.passive="onCarouselScroll"
    >
      <div v-for="appointment in items" :key="appointment.id" class="actions-carousel__slide">
        <home-action-appointment-card-mobile
          :appointment="appointment"
          :client="getClient(appointment)"
          :client-name="getClientName(appointment)"
          :service-names="getServiceNames(appointment)"
          :service-colors="getServices(appointment).map(({ color }) => color)"
          :date-label="formats.dateDay(appointment.start_at)"
          :time-label="formatTime(appointment.start_at)"
          :duration-label="t('home.nextUp.minutesLabel', { n: appointment.duration })"
          :price-label="formats.price(appointment.price)"
          :attention-label="attentionLabel(appointment)"
          :attention-tone="attentionTone(appointment)"
          :now="now"
          @open="emit('open', appointment)"
          @primary="emit('primary', appointment)"
          @more="emit('more', appointment)"
        />
      </div>
    </div>
  </section>
</template>

<style scoped>
.actions-block {
  position: relative;
  width: calc(100% + 28px);
  min-width: 0;
  margin-inline: -14px;
}

.actions-block__accent {
  position: absolute;
  inset-block: 12px;
  inset-inline-start: 0;
  width: 78%;
  opacity: 0.3;
  pointer-events: none;
  transition: background 300ms ease;
}

.actions-carousel {
  position: relative;
  z-index: 1;
  display: grid;
  overflow: auto hidden;
  grid-auto-columns: 85%;
  grid-auto-flow: column;
  gap: 10px;
  padding-inline: 14px;
  overscroll-behavior-inline: contain;
  scroll-padding-inline: 14px;
  scroll-snap-type: inline mandatory;
  scrollbar-width: none;
  touch-action: pan-x pan-y;
  -webkit-overflow-scrolling: touch;
}

.actions-carousel::-webkit-scrollbar {
  display: none;
}

.actions-carousel--single {
  grid-auto-columns: calc(100% - 28px);
}

.actions-carousel__slide {
  min-width: 0;
  scroll-snap-align: start;
  scroll-snap-stop: normal;
}

.actions-carousel--loading {
  grid-auto-columns: 85%;
}

.action-skeleton {
  min-height: 190px;
  margin: 0;
  padding: 14px;
  border-radius: 16px;
  background: var(--se-surface-card);
  box-shadow: 0 1px 3px rgb(0 0 0 / 7%);
}

.action-skeleton ion-skeleton-text {
  margin: 0;
  border-radius: 7px;
}

.action-skeleton__date {
  width: 42%;
  height: 23px;
}

.action-skeleton__person {
  display: flex;
  align-items: center;
  gap: 11px;
  margin-top: 18px;
}

.action-skeleton__person > div {
  min-width: 0;
  flex: 1;
}

.action-skeleton__avatar {
  width: 42px;
  height: 42px;
  border-radius: 999px !important;
}

.action-skeleton__name {
  width: 64%;
  height: 16px;
}

.action-skeleton__service {
  width: 86%;
  height: 13px;
  margin-top: 6px !important;
}

.action-skeleton__button {
  width: 42%;
  height: 34px;
  margin-top: 36px !important;
  border-radius: 999px !important;
}

.actions-error {
  position: relative;
  z-index: 1;
  display: flex;
  min-height: 120px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 16px;
  margin-inline: 14px;
  border-radius: 16px;
  background: var(--se-surface-card);
  color: var(--ion-color-medium);
  font-size: 0.82rem;
  text-align: center;
}

.actions-error > ion-icon {
  font-size: 24px;
}

.actions-error ion-button {
  margin: 0;
  text-transform: none;
}

@media (prefers-reduced-motion: reduce) {
  .actions-block__accent {
    transition: none;
  }

  .actions-carousel {
    scroll-behavior: auto;
  }
}
</style>
