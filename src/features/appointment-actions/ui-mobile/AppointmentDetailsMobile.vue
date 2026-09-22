<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  IonAvatar,
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonChip,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonNote,
  IonSkeletonText,
  IonSpinner,
  IonTitle,
  IonToolbar,
  isPlatform,
} from '@ionic/vue'
import {
  calendarOutline,
  callOutline,
  checkmarkDoneOutline,
  closeOutline,
  createOutline,
  ellipsisHorizontal,
  globeOutline,
  logoWhatsapp,
  pricetagOutline,
  sparklesOutline,
  timeOutline,
  trashOutline,
  walletOutline,
} from 'ionicons/icons'
import { getEffectiveAppointmentStatus, type Appointment } from '@entities/appointment'
import type { Client } from '@entities/client'
import type { TimeFormat } from '@entities/master'
import type { Sale } from '@entities/sale'
import type { Service } from '@entities/service'
import { useFormats } from '@shared/lib/formats'
import { getDateTimeInputValue } from '@shared/lib/time-zone'
import {
  getMobileAppointmentFooterActions,
  getMobileAppointmentMoreActions,
} from '../model/action-set'

const props = defineProps<{
  isOpen: boolean
  appointment: Appointment
  client?: Client | null
  services: Service[]
  timeZone: string
  timeFormat: TimeFormat
  sale?: Sale | null
  saleLoading?: boolean
  isNew?: boolean
  primaryLoading?: boolean
}>()

const emit = defineEmits<{
  'update:isOpen': [value: boolean]
  'did-dismiss': []
  primary: []
  more: []
  edit: []
  delete: []
}>()

const { t, locale } = useI18n()
const formats = useFormats()
const spinnerName = isPlatform('ios') ? 'dots' : 'crescent'

const clientName = computed(() => {
  if (!props.client) return t('appointments.unknownClient')
  return [props.client.first_name, props.client.last_name].filter(Boolean).join(' ')
})

const initials = computed(() => {
  const value = clientName.value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
  return value || '—'
})

const avatarStyle = computed(() => {
  const palette = [
    ['#ffe4e6', '#9f1239'],
    ['#ffedd5', '#9a3412'],
    ['#d1fae5', '#065f46'],
    ['#ccfbf1', '#115e59'],
    ['#dbeafe', '#1e40af'],
    ['#e0e7ff', '#3730a3'],
    ['#fae8ff', '#86198f'],
  ] as const
  const seed = props.client?.id ?? clientName.value
  let hash = 0
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) | 0
  }
  const [background, color] = palette[Math.abs(hash) % palette.length]!
  return { '--avatar-background': background, '--avatar-color': color }
})

const effectiveStatus = computed(() => getEffectiveAppointmentStatus(props.appointment))
const statusLabel = computed(() => t(`appointments.status.${effectiveStatus.value}`))
const statusColor = computed(() => {
  if (effectiveStatus.value === 'pending') return 'warning'
  if (effectiveStatus.value === 'ongoing' || effectiveStatus.value === 'completed') return 'success'
  if (effectiveStatus.value === 'confirmed') return 'tertiary'
  if (effectiveStatus.value === 'no_show') return 'danger'
  return 'medium'
})

const startParts = computed(() => getDateTimeInputValue(props.appointment.start_at, props.timeZone))
const endParts = computed(() => {
  const end = new Date(
    new Date(props.appointment.start_at).getTime() + props.appointment.duration * 60_000,
  )
  return getDateTimeInputValue(end, props.timeZone)
})

function formatCalendarDate(date: string): string {
  if (!date) return '—'
  const formatted = new Intl.DateTimeFormat(locale.value, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`))
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

const dateLabel = computed(() => formatCalendarDate(startParts.value.date))
const timeLabel = computed(() => {
  const start = formats.time(startParts.value.time, props.timeFormat)
  const end = formats.time(endParts.value.time, props.timeFormat)
  return `${start} – ${end}`
})
const crossesDayBoundary = computed(() => startParts.value.date !== endParts.value.date)
const endDateLabel = computed(() =>
  crossesDayBoundary.value ? formatCalendarDate(endParts.value.date) : null,
)

const serviceSubtotal = computed(() =>
  props.services.reduce((sum, service) => sum + service.price, 0),
)
const total = computed(() => props.appointment.price ?? serviceSubtotal.value)
const hasCustomPrice = computed(
  () =>
    props.appointment.price != null &&
    Math.abs(props.appointment.price - serviceSubtotal.value) > Number.EPSILON,
)
const missingServiceCount = computed(() =>
  Math.max(0, props.appointment.service_ids.length - props.services.length),
)

const phoneHref = computed(() => (props.client?.phone ? `tel:${props.client.phone}` : undefined))
const whatsappHref = computed(() => {
  const normalized = props.client?.phone?.replace(/\D/g, '')
  return normalized ? `https://wa.me/${normalized}` : undefined
})

const showOnlineBookingTag = computed(
  () =>
    props.appointment.source === 'online_booking' &&
    ['pending', 'confirmed', 'expired'].includes(props.appointment.status),
)
const showNewClientTag = computed(
  () =>
    Boolean(props.isNew) && ['pending', 'confirmed', 'no_show'].includes(props.appointment.status),
)

const footerActions = computed(() => getMobileAppointmentFooterActions(props.appointment.status))
const hasMoreActions = computed(
  () => getMobileAppointmentMoreActions(props.appointment.status).length > 0,
)
const primaryLabel = computed(() => {
  if (footerActions.value.primary === 'confirm') return t('appointments.preview.confirmAppointment')
  if (footerActions.value.primary === 'complete')
    return t('appointments.preview.completeAppointment')
  if (footerActions.value.primary === 'edit') return t('common.edit')
  return t('common.delete')
})
const primaryIcon = computed(() => {
  if (footerActions.value.primary === 'edit') return createOutline
  if (footerActions.value.primary === 'delete') return trashOutline
  return checkmarkDoneOutline
})
const primaryColor = computed(() => {
  if (footerActions.value.primary === 'delete') return 'danger'
  if (footerActions.value.primary === 'edit') return 'primary'
  return 'success'
})

function close() {
  if (props.primaryLoading) return
  emit('update:isOpen', false)
}

function onDidDismiss() {
  emit('update:isOpen', false)
  emit('did-dismiss')
}

function runPrimary() {
  if (props.primaryLoading) return
  if (footerActions.value.primary === 'edit') emit('edit')
  else if (footerActions.value.primary === 'delete') emit('delete')
  else emit('primary')
}
</script>

<template>
  <ion-modal
    :is-open="isOpen"
    class="appointment-details-mobile"
    :can-dismiss="!primaryLoading"
    @did-dismiss="onDidDismiss"
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
            <ion-icon slot="icon-only" :icon="ellipsisHorizontal" aria-hidden="true" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="appointment-details-mobile__content">
      <main class="appointment-details-mobile__body">
        <ion-card class="preview-card preview-card--client">
          <ion-card-content>
            <div class="client-summary">
              <ion-avatar :style="avatarStyle" :aria-label="clientName">
                <span v-if="client?.emoji">{{ client.emoji }}</span>
                <span v-else>{{ initials }}</span>
              </ion-avatar>

              <div class="client-summary__content">
                <div class="client-summary__title-row">
                  <h2>{{ clientName }}</h2>
                  <ion-badge :color="statusColor">{{ statusLabel }}</ion-badge>
                </div>
                <p>{{ client?.phone || t('appointments.preview.noPhone') }}</p>
                <p v-if="client?.email" class="client-summary__email">{{ client.email }}</p>
              </div>
            </div>

            <div v-if="showOnlineBookingTag || showNewClientTag" class="client-tags">
              <ion-chip v-if="showOnlineBookingTag" color="tertiary">
                <ion-icon :icon="globeOutline" aria-hidden="true" />
                <ion-label>{{ t('appointments.preview.tags.onlineBooking') }}</ion-label>
              </ion-chip>
              <ion-chip v-if="showNewClientTag" color="primary">
                <ion-icon :icon="sparklesOutline" aria-hidden="true" />
                <ion-label>{{ t('appointments.preview.tags.newClient') }}</ion-label>
              </ion-chip>
            </div>

            <div class="contact-actions">
              <ion-button :href="phoneHref" :disabled="!phoneHref" fill="outline" color="medium">
                <ion-icon slot="start" :icon="callOutline" aria-hidden="true" />
                {{ t('appointments.preview.callClient') }}
              </ion-button>
              <ion-button
                :href="whatsappHref"
                :disabled="!whatsappHref"
                target="_blank"
                rel="noopener"
                fill="outline"
                color="success"
              >
                <ion-icon slot="start" :icon="logoWhatsapp" aria-hidden="true" />
                {{ t('appointments.preview.whatsappClient') }}
              </ion-button>
            </div>
          </ion-card-content>
        </ion-card>

        <ion-card class="preview-card">
          <ion-list lines="full">
            <ion-item>
              <ion-icon slot="start" :icon="calendarOutline" color="primary" aria-hidden="true" />
              <ion-label class="ion-text-wrap">
                <p>{{ t('appointments.preview.date') }}</p>
                <h2>{{ dateLabel }}</h2>
              </ion-label>
            </ion-item>
            <ion-item lines="none">
              <ion-icon slot="start" :icon="timeOutline" color="primary" aria-hidden="true" />
              <ion-label class="ion-text-wrap">
                <p>{{ t('appointments.preview.time') }}</p>
                <h2>{{ timeLabel }}</h2>
                <p class="appointment-time__duration">
                  {{ formats.duration(appointment.duration) }}
                  <template v-if="endDateLabel"> · {{ endDateLabel }}</template>
                </p>
              </ion-label>
            </ion-item>
          </ion-list>
        </ion-card>

        <section>
          <h3 class="section-title">{{ t('appointments.preview.services') }}</h3>
          <ion-card class="preview-card">
            <ion-list v-if="services.length || missingServiceCount" lines="full">
              <ion-item v-for="service in services" :key="service.id">
                <span
                  slot="start"
                  class="service-color"
                  :style="{ backgroundColor: service.color }"
                  aria-hidden="true"
                />
                <ion-label class="ion-text-wrap">
                  <h2>{{ service.name }}</h2>
                  <p>{{ formats.duration(service.duration) }}</p>
                </ion-label>
                <ion-note slot="end" class="service-price">{{
                  formats.price(service.price)
                }}</ion-note>
              </ion-item>
              <ion-item v-if="missingServiceCount" color="light">
                <span
                  slot="start"
                  class="service-color service-color--missing"
                  aria-hidden="true"
                />
                <ion-label class="ion-text-wrap">
                  <h2>
                    {{ t('appointments.preview.missingService', { n: missingServiceCount }) }}
                  </h2>
                  <p>{{ t('appointments.preview.missingServiceHint') }}</p>
                </ion-label>
              </ion-item>
            </ion-list>
            <ion-card-content v-else class="empty-services">
              {{ t('appointments.preview.noServices') }}
            </ion-card-content>

            <div class="price-summary">
              <div v-if="hasCustomPrice" class="price-summary__subtotal">
                <span>{{ t('appointments.preview.serviceSubtotal') }}</span>
                <span>{{ formats.price(serviceSubtotal) }}</span>
              </div>
              <div class="price-summary__total">
                <span>
                  {{ t('appointments.preview.total') }}
                  <ion-badge v-if="hasCustomPrice" color="tertiary">
                    {{ t('appointments.preview.customPrice') }}
                  </ion-badge>
                </span>
                <strong>{{ formats.price(total) }}</strong>
              </div>
            </div>
          </ion-card>
        </section>

        <section v-if="appointment.notes">
          <h3 class="section-title">{{ t('appointments.preview.notes') }}</h3>
          <ion-card class="preview-card">
            <ion-card-content class="notes-card">{{ appointment.notes }}</ion-card-content>
          </ion-card>
        </section>

        <section v-if="appointment.status === 'completed'">
          <h3 class="section-title">{{ t('checkout.paymentInfo') }}</h3>
          <ion-card class="preview-card">
            <ion-card-content v-if="saleLoading" class="payment-loading" aria-busy="true">
              <ion-skeleton-text :animated="true" />
              <ion-skeleton-text :animated="true" />
            </ion-card-content>
            <ion-list v-else-if="sale" lines="full">
              <ion-item>
                <ion-icon slot="start" :icon="walletOutline" color="success" aria-hidden="true" />
                <ion-label>
                  <p>{{ t('checkout.paidAmount') }}</p>
                  <h2>{{ formats.price(sale.amount) }}</h2>
                </ion-label>
              </ion-item>
              <ion-item lines="none">
                <ion-icon slot="start" :icon="pricetagOutline" color="medium" aria-hidden="true" />
                <ion-label>
                  <p>{{ t('checkout.paidVia') }}</p>
                  <h2 class="payment-type">
                    <span
                      v-if="sale.payment_type"
                      :style="{ backgroundColor: sale.payment_type.color }"
                      aria-hidden="true"
                    />
                    {{ sale.payment_type?.name ?? '—' }}
                  </h2>
                </ion-label>
              </ion-item>
            </ion-list>
            <ion-card-content v-else class="payment-missing">
              {{ t('appointments.preview.paymentUnavailable') }}
            </ion-card-content>
          </ion-card>
        </section>
      </main>
    </ion-content>

    <ion-footer class="appointment-action-footer ion-no-border">
      <ion-toolbar>
        <div class="action-dock">
          <div class="action-dock__slot">
            <template v-if="footerActions.showDeleteSideAction">
              <ion-button
                class="action-circle action-circle--side"
                shape="round"
                fill="solid"
                color="danger"
                :disabled="primaryLoading"
                :aria-label="t('common.delete')"
                @click="emit('delete')"
              >
                <ion-icon slot="icon-only" :icon="trashOutline" aria-hidden="true" />
              </ion-button>
              <span>{{ t('common.delete') }}</span>
            </template>
          </div>

          <div class="action-dock__slot action-dock__slot--primary">
            <ion-button
              class="action-circle action-circle--primary"
              shape="round"
              fill="solid"
              :color="primaryColor"
              :disabled="primaryLoading"
              :aria-label="primaryLabel"
              :aria-busy="primaryLoading"
              @click="runPrimary"
            >
              <ion-spinner v-if="primaryLoading" :name="spinnerName" />
              <ion-icon v-else slot="icon-only" :icon="primaryIcon" aria-hidden="true" />
            </ion-button>
            <span>{{ primaryLabel }}</span>
          </div>

          <div class="action-dock__slot">
            <template v-if="footerActions.showEditSideAction">
              <ion-button
                class="action-circle action-circle--side"
                shape="round"
                fill="solid"
                color="primary"
                :disabled="primaryLoading"
                :aria-label="t('common.edit')"
                @click="emit('edit')"
              >
                <ion-icon slot="icon-only" :icon="createOutline" aria-hidden="true" />
              </ion-button>
              <span>{{ t('common.edit') }}</span>
            </template>
          </div>
        </div>
      </ion-toolbar>
    </ion-footer>
  </ion-modal>
</template>

<style scoped>
.appointment-details-mobile ion-toolbar,
.appointment-details-mobile__content {
  --background: var(--se-surface-page, var(--ion-background-color));
}

.appointment-details-mobile__body {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 10px 14px 24px;
}

.preview-card {
  margin: 0;
  overflow: hidden;
  border-radius: 16px;
  background: var(--se-surface-card, var(--ion-card-background));
  box-shadow: 0 1px 4px rgb(0 0 0 / 7%);
}

.preview-card ion-list,
.preview-card ion-item {
  --background: transparent;
}

.preview-card ion-item {
  --min-height: 66px;
  --padding-start: 16px;
  --inner-padding-end: 16px;
}

.preview-card ion-item > ion-icon[slot='start'] {
  margin-inline-end: 14px;
  font-size: 22px;
}

.preview-card ion-label p {
  margin-bottom: 3px;
  color: var(--ion-color-medium);
  font-size: 0.76rem;
}

.preview-card ion-label h2 {
  font-size: 0.95rem;
  font-weight: 650;
}

.preview-card--client ion-card-content {
  padding: 18px 16px 15px;
}

.client-summary {
  display: flex;
  align-items: center;
  gap: 13px;
}

.client-summary ion-avatar {
  display: grid;
  width: 58px;
  height: 58px;
  flex: 0 0 58px;
  background: var(--avatar-background);
  color: var(--avatar-color);
  place-items: center;
  font-size: 1.2rem;
  font-weight: 750;
}

.client-summary__content {
  min-width: 0;
  flex: 1;
}

.client-summary__title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.client-summary h2,
.client-summary p {
  margin: 0;
}

.client-summary h2 {
  min-width: 0;
  overflow: hidden;
  font-size: 1.08rem;
  font-weight: 750;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.client-summary ion-badge {
  flex: 0 0 auto;
  font-size: 0.66rem;
}

.client-summary p {
  margin-top: 4px;
  color: var(--ion-color-medium);
  font-size: 0.84rem;
}

.client-summary__email {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.client-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 13px;
}

.client-tags ion-chip {
  height: 27px;
  margin: 0;
  font-size: 0.72rem;
}

.contact-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;
  margin-top: 15px;
}

.contact-actions ion-button {
  --border-radius: 12px;

  min-height: 42px;
  margin: 0;
  text-transform: none;
}

.appointment-time__duration {
  margin-top: 4px !important;
}

.section-title {
  margin: 0 0 7px 6px;
  color: var(--ion-color-medium);
  font-size: 0.72rem;
  font-weight: 650;
  letter-spacing: 0.055em;
  text-transform: uppercase;
}

.service-color {
  width: 12px;
  height: 12px;
  margin-inline-end: 16px;
  border-radius: 999px;
}

.service-color--missing {
  border: 1px dashed var(--ion-color-medium);
  background: transparent;
}

.service-price {
  margin: 0;
  color: var(--ion-text-color);
  font-size: 0.9rem;
  font-weight: 650;
}

.empty-services,
.payment-missing {
  color: var(--ion-color-medium);
  font-size: 0.9rem;
}

.price-summary {
  padding: 13px 16px 15px;
}

.price-summary__subtotal,
.price-summary__total,
.price-summary__total > span {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.price-summary__subtotal {
  margin-bottom: 8px;
  color: var(--ion-color-medium);
  font-size: 0.78rem;
}

.price-summary__total > span {
  justify-content: flex-start;
  color: var(--ion-color-medium);
  font-size: 0.78rem;
  font-weight: 650;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.price-summary__total ion-badge {
  font-size: 0.6rem;
  letter-spacing: 0;
  text-transform: none;
}

.price-summary__total strong {
  font-size: 1.16rem;
}

.notes-card {
  color: var(--ion-text-color);
  font-size: 0.92rem;
  line-height: 1.5;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.payment-loading {
  display: grid;
  gap: 10px;
}

.payment-loading ion-skeleton-text {
  width: 70%;
  height: 18px;
  margin: 0;
  border-radius: 7px;
}

.payment-loading ion-skeleton-text:last-child {
  width: 48%;
}

.payment-type {
  display: flex;
  align-items: center;
  gap: 7px;
}

.payment-type > span {
  width: 9px;
  height: 9px;
  border-radius: 999px;
}

.appointment-action-footer ion-toolbar {
  --min-height: 96px;

  border-top: 1px solid var(--se-separator, var(--ion-color-step-150));
}

.action-dock {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-items: end;
  padding: 7px 20px calc(7px + var(--safe-area-bottom, 0px));
}

.action-dock__slot {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  color: var(--ion-color-medium);
  font-size: 0.68rem;
  line-height: 1.1;
  text-align: center;
}

.action-dock__slot--primary {
  color: var(--ion-text-color);
  font-weight: 650;
}

.action-circle {
  --border-radius: 999px;
  --box-shadow: 0 5px 14px rgb(0 0 0 / 14%);
  --padding-start: 0;
  --padding-end: 0;

  margin: 0;
}

.action-circle--side {
  width: 48px;
  height: 48px;
}

.action-circle--primary {
  width: 62px;
  height: 62px;
}

.action-circle--side ion-icon {
  font-size: 21px;
}

.action-circle--primary ion-icon {
  font-size: 28px;
}

@media (prefers-color-scheme: dark) {
  .preview-card {
    box-shadow: 0 1px 4px rgb(0 0 0 / 22%);
  }
}
</style>
