<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  IonAvatar,
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonPopover,
  IonSkeletonText,
  IonSpinner,
  IonTitle,
  IonToolbar,
  isPlatform,
  toastController,
} from '@ionic/vue'
import {
  alertCircleOutline,
  calendarOutline,
  callOutline,
  checkmarkCircleOutline,
  checkmarkDoneOutline,
  closeCircleOutline,
  closeOutline,
  createOutline,
  ellipsisHorizontal,
  globeOutline,
  hourglassOutline,
  logoWhatsapp,
  notificationsOutline,
  personRemoveOutline,
  timeOutline,
  trashOutline,
  walletOutline,
} from 'ionicons/icons'
import {
  getEffectiveAppointmentStatus,
  type Appointment,
  type EffectiveAppointmentStatus,
} from '@entities/appointment'
import type { Client } from '@entities/client'
import type { TimeFormat } from '@entities/master'
import type { Sale } from '@entities/sale'
import type { Service } from '@entities/service'
import { useFormats } from '@shared/lib/formats'
import { useNowMinute } from '@shared/lib/now'
import { getDateTimeInputValue } from '@shared/lib/time-zone'
import { InsetList } from '@shared/ui/inset-list/index.mobile'
import {
  getMobileAppointmentFooterAction,
  getMobileAppointmentMenuActions,
  type MobileAppointmentMenuAction,
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
  primaryLoading?: boolean
  presentingElement?: HTMLElement | null
}>()

const emit = defineEmits<{
  'update:isOpen': [value: boolean]
  'did-dismiss': []
  primary: []
  action: [action: MobileAppointmentMenuAction]
}>()

const { t, locale } = useI18n()
const formats = useFormats()
const now = useNowMinute()
const spinnerName = isPlatform('ios') ? 'dots' : 'crescent'

const STATUS_META: Record<EffectiveAppointmentStatus, { icon: string; color: string }> = {
  pending: { icon: timeOutline, color: 'warning' },
  confirmed: { icon: checkmarkCircleOutline, color: 'primary' },
  ongoing: { icon: hourglassOutline, color: 'success' },
  past: { icon: alertCircleOutline, color: 'warning' },
  completed: { icon: checkmarkDoneOutline, color: 'success' },
  cancelled: { icon: closeCircleOutline, color: 'medium' },
  no_show: { icon: personRemoveOutline, color: 'danger' },
  expired: { icon: alertCircleOutline, color: 'medium' },
}

const effectiveStatus = computed(() => getEffectiveAppointmentStatus(props.appointment, now.value))
const statusMeta = computed(() => STATUS_META[effectiveStatus.value])
const statusLabel = computed(() => t(`appointments.preview.sessionStatus.${effectiveStatus.value}`))

// Semi-transparent wash of the service colors behind the header; several
// services blend into one gradient, none falls back to the plain page.
const accentStyle = computed(() => {
  const colors = props.services.map(({ color }) => `color-mix(in srgb, ${color} 38%, transparent)`)
  if (!colors.length) return undefined
  const stops = colors.length === 1 ? [colors[0], colors[0]] : colors
  return { '--session-accent': `linear-gradient(120deg, ${stops.join(', ')})` }
})

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

const isOnline = computed(() => props.appointment.source === 'online_booking')

const phoneHref = computed(() => (props.client?.phone ? `tel:${props.client.phone}` : undefined))
const whatsappHref = computed(() => {
  const normalized = props.client?.phone?.replace(/\D/g, '')
  return normalized ? `https://wa.me/${normalized}` : undefined
})

const startParts = computed(() => getDateTimeInputValue(props.appointment.start_at, props.timeZone))
const endParts = computed(() => {
  const end = new Date(
    new Date(props.appointment.start_at).getTime() + props.appointment.duration * 60_000,
  )
  return getDateTimeInputValue(end, props.timeZone)
})

function formatCalendarDate(date: string, options: Intl.DateTimeFormatOptions): string {
  if (!date) return '—'
  const formatted = new Intl.DateTimeFormat(locale.value, { ...options, timeZone: 'UTC' }).format(
    new Date(`${date}T00:00:00Z`),
  )
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

const dateLabel = computed(() =>
  formatCalendarDate(startParts.value.date, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }),
)
const timeLabel = computed(() => {
  const start = formats.time(startParts.value.time, props.timeFormat)
  const end = formats.time(endParts.value.time, props.timeFormat)
  return `${start} – ${end}`
})

const missingServiceCount = computed(() =>
  Math.max(0, props.appointment.service_ids.length - props.services.length),
)
const serviceSubtotal = computed(() =>
  props.services.reduce((sum, service) => sum + service.price, 0),
)
const isCompleted = computed(() => props.appointment.status === 'completed')
const finalAmount = computed(
  () => props.sale?.amount ?? props.appointment.price ?? serviceSubtotal.value,
)
// The catalogue sum is the reference price; it is unreliable when a service
// has been deleted, so no strikethrough is shown in that case.
const originalAmount = computed(() => {
  if (missingServiceCount.value || !props.services.length) return null
  return Math.abs(finalAmount.value - serviceSubtotal.value) >= 0.005 ? serviceSubtotal.value : null
})
const priceChangeLabel = computed(() =>
  props.sale ? t('appointments.preview.priceChanged') : t('appointments.preview.customPrice'),
)

const footerAction = computed(() => getMobileAppointmentFooterAction(effectiveStatus.value))
const footerLabel = computed(() =>
  footerAction.value === 'confirm'
    ? t('appointments.preview.confirmAppointment')
    : t('appointments.preview.completeAppointment'),
)

const MENU_ACTION_META: Record<MobileAppointmentMenuAction, { icon: string; labelKey: string }> = {
  edit: { icon: createOutline, labelKey: 'common.edit' },
  decline: { icon: closeCircleOutline, labelKey: 'appointments.preview.declineRequest' },
  cancel: { icon: closeCircleOutline, labelKey: 'appointments.preview.cancelAppointment' },
  no_show: { icon: personRemoveOutline, labelKey: 'appointments.preview.markNoShow' },
  delete: { icon: trashOutline, labelKey: 'common.delete' },
}

const menuActions = computed(() =>
  getMobileAppointmentMenuActions(props.appointment.status).map((action) => ({
    action,
    ...MENU_ACTION_META[action],
  })),
)

const menuOpen = ref(false)
const menuEvent = ref<Event>()
const pendingMenuAction = ref<MobileAppointmentMenuAction | null>(null)
const detailsModal = ref<{ $el: HTMLElement } | null>(null)
const detailsModalEl = computed(() => detailsModal.value?.$el ?? null)
const dateTimeModalOpen = ref(false)

function openMenu(event: Event) {
  menuEvent.value = event
  menuOpen.value = true
}

function selectMenuAction(action: MobileAppointmentMenuAction) {
  pendingMenuAction.value = action
  menuOpen.value = false
}

// Emit only after the popover is gone so follow-up overlays (alerts, the edit
// modal) never stack on top of a closing popover.
function onMenuDidDismiss() {
  menuOpen.value = false
  const action = pendingMenuAction.value
  pendingMenuAction.value = null
  if (action) emit('action', action)
}

async function notifyClient() {
  const toast = await toastController.create({
    message: t('appointments.preview.notifyComingSoon'),
    duration: 2200,
    position: 'top',
  })
  await toast.present()
}

function close() {
  if (props.primaryLoading) return
  emit('update:isOpen', false)
}

function onDidDismiss() {
  dateTimeModalOpen.value = false
  emit('update:isOpen', false)
  emit('did-dismiss')
}

function runPrimary() {
  if (props.primaryLoading) return
  emit('primary')
}
</script>

<template>
  <ion-modal
    ref="detailsModal"
    :is-open="isOpen"
    class="appointment-details-mobile"
    :style="accentStyle"
    :presenting-element="presentingElement ?? undefined"
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
        <ion-buttons slot="end">
          <ion-button
            fill="clear"
            color="dark"
            :disabled="primaryLoading"
            :aria-label="t('appointments.preview.actions')"
            aria-haspopup="menu"
            :aria-expanded="menuOpen"
            @click="openMenu"
          >
            <ion-icon slot="icon-only" :icon="ellipsisHorizontal" aria-hidden="true" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="appointment-details-mobile__content">
      <main class="appointment-details-mobile__body">
        <header class="appointment-status">
          <ion-badge class="appointment-status__badge" :color="statusMeta.color">
            <ion-icon :icon="statusMeta.icon" aria-hidden="true" />
            <span>{{ statusLabel }}</span>
          </ion-badge>
        </header>

        <inset-list
          class="appointment-date-group"
          :style="{ '--se-list-inset-x': '0px', '--se-group-gap': '0px' }"
        >
          <ion-item button :detail="true" lines="none" @click="dateTimeModalOpen = true">
            <ion-icon slot="start" :icon="calendarOutline" color="primary" aria-hidden="true" />
            <ion-label>
              <h2>{{ dateLabel }}</h2>
              <p>{{ timeLabel }}</p>
            </ion-label>
          </ion-item>
        </inset-list>

        <ion-card class="preview-card">
          <div class="client-card">
            <div class="client-card__person">
              <ion-avatar :style="avatarStyle" aria-hidden="true">
                <span v-if="client?.emoji">{{ client.emoji }}</span>
                <span v-else>{{ initials }}</span>
              </ion-avatar>
              <div class="client-card__text">
                <h2>
                  <span>{{ clientName }}</span>
                  <ion-badge
                    v-if="isOnline"
                    color="tertiary"
                    class="client-card__online"
                    :aria-label="t('home.nextUp.badgeOnline')"
                    :title="t('home.nextUp.badgeOnlineHint')"
                  >
                    <ion-icon :icon="globeOutline" aria-hidden="true" />
                  </ion-badge>
                </h2>
                <p>{{ client?.phone || t('appointments.preview.noPhone') }}</p>
              </div>
            </div>

            <div class="contact-actions">
              <ion-button
                class="contact-action contact-action--call"
                fill="clear"
                :href="phoneHref"
                :disabled="!phoneHref"
              >
                <span class="contact-action__inner">
                  <ion-icon :icon="callOutline" aria-hidden="true" />
                  <span>{{ t('appointments.preview.callClient') }}</span>
                </span>
              </ion-button>
              <ion-button
                class="contact-action contact-action--whatsapp"
                fill="clear"
                :href="whatsappHref"
                :disabled="!whatsappHref"
                target="_blank"
                rel="noopener"
              >
                <span class="contact-action__inner">
                  <ion-icon :icon="logoWhatsapp" aria-hidden="true" />
                  <span>{{ t('appointments.preview.whatsappClient') }}</span>
                </span>
              </ion-button>
              <ion-button
                class="contact-action contact-action--notify"
                fill="clear"
                @click="notifyClient"
              >
                <span class="contact-action__inner">
                  <ion-icon :icon="notificationsOutline" aria-hidden="true" />
                  <span>{{ t('appointments.preview.notifyClient') }}</span>
                </span>
              </ion-button>
            </div>
          </div>
        </ion-card>

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
              <span slot="end" class="service-price">{{ formats.price(service.price) }}</span>
            </ion-item>
            <ion-item v-if="missingServiceCount">
              <span slot="start" class="service-color service-color--missing" aria-hidden="true" />
              <ion-label class="ion-text-wrap">
                <h2>{{ t('appointments.preview.missingService', { n: missingServiceCount }) }}</h2>
                <p>{{ t('appointments.preview.missingServiceHint') }}</p>
              </ion-label>
            </ion-item>
          </ion-list>
          <p v-else class="card-empty">{{ t('appointments.preview.noServices') }}</p>

          <div class="price-total">
            <div class="price-total__label">
              <span>{{ t('appointments.preview.total') }}</span>
              <small v-if="originalAmount != null">{{ priceChangeLabel }}</small>
            </div>
            <div class="price-total__amount">
              <s v-if="originalAmount != null">{{ formats.price(originalAmount) }}</s>
              <strong>{{ formats.price(finalAmount) }}</strong>
            </div>
          </div>

          <div v-if="isCompleted" class="payment">
            <div v-if="saleLoading" class="payment__loading" aria-busy="true">
              <ion-skeleton-text :animated="true" />
            </div>
            <div
              v-else-if="sale"
              class="payment__method"
              :style="{ '--payment-color': sale.payment_type?.color }"
            >
              <span class="payment__icon" aria-hidden="true">
                <ion-icon :icon="walletOutline" />
              </span>
              <span class="payment__text">
                <small>{{ t('checkout.paidVia') }}</small>
                <strong>{{ sale.payment_type?.name ?? '—' }}</strong>
              </span>
              <ion-icon
                class="payment__check"
                :icon="checkmarkCircleOutline"
                color="success"
                aria-hidden="true"
              />
            </div>
            <p v-else class="card-empty">{{ t('appointments.preview.paymentUnavailable') }}</p>
          </div>
        </ion-card>

        <section v-if="appointment.notes">
          <h3 class="section-title">{{ t('appointments.preview.notes') }}</h3>
          <ion-card class="preview-card">
            <p class="notes-card">{{ appointment.notes }}</p>
          </ion-card>
        </section>
      </main>

      <ion-popover
        :is-open="menuOpen"
        :event="menuEvent"
        alignment="end"
        class="appointment-menu"
        @did-dismiss="onMenuDidDismiss"
      >
        <ion-list lines="full" role="menu">
          <ion-item
            v-for="item in menuActions"
            :key="item.action"
            button
            :detail="false"
            role="menuitem"
            :lines="item.action === 'delete' ? 'none' : 'full'"
            @click="selectMenuAction(item.action)"
          >
            <ion-label :color="item.action === 'delete' ? 'danger' : undefined">
              {{ t(item.labelKey) }}
            </ion-label>
            <ion-icon
              slot="end"
              :icon="item.icon"
              :color="item.action === 'delete' ? 'danger' : 'medium'"
              aria-hidden="true"
            />
          </ion-item>
        </ion-list>
      </ion-popover>

      <ion-modal
        :is-open="dateTimeModalOpen"
        :presenting-element="detailsModalEl ?? undefined"
        @did-dismiss="dateTimeModalOpen = false"
      >
        <ion-header class="ion-no-border">
          <ion-toolbar>
            <ion-buttons slot="start">
              <ion-button
                fill="clear"
                color="dark"
                :aria-label="t('common.close')"
                @click="dateTimeModalOpen = false"
              >
                <ion-icon slot="icon-only" :icon="closeOutline" aria-hidden="true" />
              </ion-button>
            </ion-buttons>
            <ion-title>{{ t('appointments.preview.dateTimeTitle') }}</ion-title>
          </ion-toolbar>
        </ion-header>

        <ion-content class="date-time-placeholder ion-padding">
          <div class="date-time-placeholder__content">
            <ion-icon :icon="calendarOutline" color="primary" aria-hidden="true" />
            <h2>{{ t('common.comingSoon') }}</h2>
            <p>{{ t('appointments.preview.dateTimeComingSoon') }}</p>
          </div>
        </ion-content>
      </ion-modal>
    </ion-content>

    <ion-footer v-if="footerAction" class="appointment-action-footer ion-no-border">
      <ion-toolbar>
        <ion-button
          expand="block"
          size="large"
          :color="footerAction === 'confirm' ? 'primary' : 'success'"
          :disabled="primaryLoading"
          :aria-busy="primaryLoading"
          @click="runPrimary"
        >
          <ion-spinner v-if="primaryLoading" :name="spinnerName" />
          <template v-else>
            <ion-icon
              slot="start"
              :icon="footerAction === 'confirm' ? checkmarkCircleOutline : checkmarkDoneOutline"
              aria-hidden="true"
            />
            {{ footerLabel }}
          </template>
        </ion-button>
      </ion-toolbar>
    </ion-footer>
  </ion-modal>
</template>

<style scoped>
/*
 * The accent lives on the modal surface itself so it stays anchored under the
 * header while the cards scroll over it: service wash, faded into the page.
 */
.appointment-details-mobile::part(content) {
  background:
    linear-gradient(to bottom, transparent, var(--se-surface-page) 280px) top / 100% 280px no-repeat,
    var(--session-accent, transparent) top / 100% 280px no-repeat,
    var(--se-surface-page, var(--ion-background-color));
}

.appointment-details-mobile ion-toolbar {
  --background: transparent;
  --border-width: 0;
}

.appointment-details-mobile__content {
  --background: transparent;
}

.appointment-details-mobile__body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0 16px 24px;
}

.appointment-status {
  display: flex;
  align-items: flex-start;
  padding: 2px 4px 4px;
}

.appointment-status__badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 10px;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 650;
}

.appointment-status__badge ion-icon {
  font-size: 1rem;
}

.appointment-date-group ion-label h2,
.appointment-date-group ion-label p {
  margin: 0;
}

.appointment-date-group ion-label h2 {
  font-size: 0.95rem;
  font-weight: 600;
}

.appointment-date-group ion-label p {
  margin-top: 2px;
  color: var(--ion-color-medium);
  font-size: 0.8rem;
  font-variant-numeric: tabular-nums;
}

.preview-card {
  margin: 0;
  overflow: hidden;
  border-radius: 16px;
  background: var(--se-surface-card, var(--ion-card-background));
  box-shadow: 0 1px 4px rgb(0 0 0 / 7%);
  color: var(--ion-text-color);
}

.preview-card h2,
.preview-card p {
  margin: 0;
}

.client-card {
  padding: 16px;
}

.client-card__person {
  display: flex;
  align-items: center;
  gap: 13px;
}

.client-card__person ion-avatar {
  display: grid;
  width: 52px;
  height: 52px;
  flex: 0 0 52px;
  background: var(--avatar-background);
  color: var(--avatar-color);
  place-items: center;
  font-size: 1.1rem;
  font-weight: 750;
}

.client-card__text {
  min-width: 0;
  flex: 1;
}

.client-card__text h2 {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 1.05rem;
  font-weight: 700;
}

.client-card__text h2 > span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.client-card__online {
  display: inline-grid;
  width: 20px;
  height: 20px;
  flex: 0 0 auto;
  padding: 0;
  border-radius: 999px;
  place-items: center;
  font-size: 12px;
}

.client-card__text p {
  margin-top: 3px;
  color: var(--ion-color-medium);
  font-size: 0.86rem;
}

.contact-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-top: 14px;
}

.contact-action {
  --border-radius: 12px;
  --padding-start: 4px;
  --padding-end: 4px;
  --padding-top: 10px;
  --padding-bottom: 10px;
  --background: var(--se-surface-page);
  --color: var(--action-color);

  height: auto;
  margin: 0;
  text-transform: none;
}

.contact-action--call {
  --action-color: var(--ion-color-primary);
}

.contact-action--whatsapp {
  --action-color: var(--ion-color-success);
}

.contact-action--notify {
  --action-color: var(--ion-color-warning-shade);
}

.contact-action__inner {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.contact-action__inner ion-icon {
  font-size: 22px;
}

.contact-action__inner span {
  max-width: 100%;
  overflow: hidden;
  color: var(--ion-text-color);
  font-size: 0.72rem;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-card ion-list,
.preview-card ion-item {
  --background: transparent;
}

.preview-card ion-item {
  --min-height: 58px;
  --padding-start: 16px;
  --inner-padding-end: 16px;
  --border-color: var(--se-separator);
}

.preview-card ion-label h2 {
  font-size: 0.95rem;
  font-weight: 600;
}

.preview-card ion-label p {
  margin-top: 2px;
  color: var(--ion-color-medium);
  font-size: 0.78rem;
}

.service-color {
  width: 10px;
  height: 10px;
  margin-inline-end: 14px;
  border-radius: 999px;
}

.service-color--missing {
  border: 1px dashed var(--ion-color-medium);
  background: transparent;
}

.service-price {
  font-size: 0.92rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.card-empty {
  padding: 14px 16px;
  color: var(--ion-color-medium);
  font-size: 0.9rem;
}

.price-total {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
}

.price-total__label {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.price-total__label span {
  font-size: 1rem;
  font-weight: 650;
}

.price-total__label small {
  color: var(--ion-color-medium);
  font-size: 0.74rem;
}

.price-total__amount {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-variant-numeric: tabular-nums;
}

.price-total__amount s {
  color: var(--ion-color-medium);
  font-size: 0.9rem;
}

.price-total__amount strong {
  font-size: 1.3rem;
  font-weight: 750;
}

.payment {
  padding: 0 12px 12px;
}

.payment__loading ion-skeleton-text {
  height: 56px;
  margin: 0;
  border-radius: 12px;
}

.payment__method {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  background: color-mix(
    in srgb,
    var(--payment-color, var(--ion-color-medium)) 12%,
    var(--se-surface-card)
  );
}

.payment__icon {
  display: grid;
  width: 36px;
  height: 36px;
  flex: 0 0 36px;
  border-radius: 10px;
  background: var(--payment-color, var(--ion-color-medium));
  color: var(--se-surface-card);
  place-items: center;
  font-size: 18px;
}

.payment__text {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.date-time-placeholder {
  --background: var(--se-surface-page, var(--ion-background-color));
}

.date-time-placeholder__content {
  display: grid;
  min-height: 100%;
  align-content: center;
  justify-items: center;
  gap: 8px;
  padding: 24px;
  text-align: center;
}

.date-time-placeholder__content > ion-icon {
  font-size: 3rem;
}

.date-time-placeholder__content h2,
.date-time-placeholder__content p {
  margin: 0;
}

.date-time-placeholder__content p {
  max-width: 280px;
  color: var(--ion-color-medium);
}

.payment__text small {
  color: var(--ion-color-medium);
  font-size: 0.72rem;
}

.payment__text strong {
  overflow: hidden;
  font-size: 0.95rem;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.payment__check {
  flex: 0 0 auto;
  font-size: 22px;
}

.section-title {
  margin: 4px 0 7px 6px;
  color: var(--ion-color-medium);
  font-size: 0.72rem;
  font-weight: 650;
  letter-spacing: 0.055em;
  text-transform: uppercase;
}

.notes-card {
  padding: 14px 16px;
  font-size: 0.92rem;
  line-height: 1.5;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.appointment-action-footer ion-toolbar {
  --padding-start: 16px;
  --padding-end: 16px;
  --padding-top: 8px;
  --padding-bottom: 8px;
}

.appointment-action-footer ion-button {
  --border-radius: 14px;

  margin: 0;
  font-weight: 650;
  text-transform: none;
}

.appointment-menu {
  --width: 230px;
}

.ion-palette-dark .preview-card {
  box-shadow: none;
}
</style>
