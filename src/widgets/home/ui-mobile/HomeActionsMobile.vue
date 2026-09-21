<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  alertController,
  IonButton,
  IonButtons,
  IonCard,
  IonContent,
  IonHeader,
  IonIcon,
  IonModal,
  IonSkeletonText,
  IonTitle,
  IonToolbar,
  toastController,
} from '@ionic/vue'
import { alertCircleOutline, closeOutline } from 'ionicons/icons'
import {
  useActionableAppointmentsQuery,
  useRemoveAppointmentMutation,
  useUpdateAppointmentMutation,
  type Appointment,
  type AppointmentStatus,
  type UpdateAppointmentDto,
} from '@entities/appointment'
import { useClientsQuery, type Client } from '@entities/client'
import { useMasterPreferencesStore } from '@entities/master'
import { usePaymentTypesQuery } from '@entities/payment-type'
import { useCompleteSaleMutation, type CompleteSaleDto } from '@entities/sale'
import { useServicesQuery, type Service } from '@entities/service'
import { useSessionStore } from '@entities/session'
import {
  AppointmentActionsDrawerMobile,
  AppointmentDetailsMobile,
  AppointmentEditMobile,
  type MobileAppointmentMoreAction,
} from '@features/appointment-actions/index.mobile'
import { AppointmentCheckoutMobile } from '@features/appointment-checkout/index.mobile'
import { useFormats } from '@shared/lib/formats'
import { useNowMinute } from '@shared/lib/now'
import { getDateTimeInputValue } from '@shared/lib/time-zone'
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
}>()

const { t } = useI18n()
const formats = useFormats()
const sessionStore = useSessionStore()
const masterPreferencesStore = useMasterPreferencesStore()
const now = useNowMinute()
const userId = computed(() => sessionStore.session?.user.id ?? '')

const { data: appointments, isPending, error, refetch } = useActionableAppointmentsQuery(userId)
const { data: clients } = useClientsQuery(userId)
const { data: services } = useServicesQuery(userId)
const { data: paymentTypes } = usePaymentTypesQuery(userId)
const updateMutation = useUpdateAppointmentMutation(userId)
const removeMutation = useRemoveAppointmentMutation(userId)
const completeSaleMutation = useCompleteSaleMutation(userId)

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
const noteAppointment = ref<Appointment | null>(null)
const detailsAppointment = ref<Appointment | null>(null)
const detailsOpen = ref(false)
const actionsAppointment = ref<Appointment | null>(null)
const actionsOpen = ref(false)
const editingAppointment = ref<Appointment | null>(null)
const checkoutAppointment = ref<Appointment | null>(null)
const checkoutOpen = ref(false)
const pendingAfterDetails = ref<{
  type: 'checkout' | 'actions'
  appointment: Appointment
} | null>(null)
const processingIds = ref<Set<string>>(new Set())
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
  const { time } = getDateTimeInputValue(isoString, masterPreferencesStore.timeZone)
  return formats.time(time, masterPreferencesStore.timeFormat)
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

function openNote(appointment: Appointment) {
  noteAppointment.value = appointment
}

function closeNote() {
  noteAppointment.value = null
}

function isProcessing(appointmentId: string): boolean {
  return processingIds.value.has(appointmentId)
}

function setProcessing(appointmentId: string, processing: boolean) {
  const next = new Set(processingIds.value)
  if (processing) next.add(appointmentId)
  else next.delete(appointmentId)
  processingIds.value = next
}

async function showToast(message: string, color: 'success' | 'danger' | 'warning') {
  const toast = await toastController.create({
    message,
    duration: 2200,
    color,
    position: 'top',
  })
  await toast.present()
}

async function updateStatus(
  appointment: Appointment,
  status: AppointmentStatus,
  successMessage: string,
) {
  if (isProcessing(appointment.id)) return
  setProcessing(appointment.id, true)
  try {
    await updateMutation.mutateAsync({ id: appointment.id, status })
    detailsOpen.value = false
    await showToast(successMessage, 'success')
  } catch {
    await showToast(t('appointments.preview.statusUpdateError'), 'danger')
  } finally {
    setProcessing(appointment.id, false)
  }
}

function handleConfirm(appointment: Appointment) {
  return updateStatus(appointment, 'confirmed', t('home.nextUp.confirmSuccess'))
}

async function confirmDestructiveAction(options: {
  header: string
  message: string
  confirmLabel: string
}): Promise<boolean> {
  const alert = await alertController.create({
    header: options.header,
    message: options.message,
    buttons: [
      { text: t('common.cancel'), role: 'cancel' },
      { text: options.confirmLabel, role: 'destructive' },
    ],
  })
  await alert.present()
  const result = await alert.onDidDismiss()
  return result.role === 'destructive'
}

async function handleDecline(appointment: Appointment) {
  if (isProcessing(appointment.id)) return
  const confirmed = await confirmDestructiveAction({
    header: t('home.nextUp.declineConfirmTitle'),
    message: t('home.nextUp.declineConfirmDescription', {
      name: getClientName(appointment),
    }),
    confirmLabel: t('home.nextUp.decline'),
  })
  if (!confirmed) return
  await updateStatus(appointment, 'cancelled', t('home.nextUp.declineSuccess'))
}

async function handleNoShow(appointment: Appointment) {
  if (isProcessing(appointment.id)) return
  const confirmed = await confirmDestructiveAction({
    header: t('home.nextUp.noShowConfirmTitle'),
    message: t('home.nextUp.noShowConfirmDescription', {
      name: getClientName(appointment),
    }),
    confirmLabel: t('home.nextUp.noShowConfirm'),
  })
  if (!confirmed) return
  await updateStatus(appointment, 'no_show', t('home.nextUp.noShowSuccess'))
}

async function openDetails(appointment: Appointment) {
  if (isProcessing(appointment.id)) return
  detailsAppointment.value = appointment
  await nextTick()
  detailsOpen.value = true
}

async function presentCheckout(appointment: Appointment) {
  checkoutAppointment.value = appointment
  await nextTick()
  checkoutOpen.value = true
}

async function openCheckout(appointment: Appointment) {
  if (isProcessing(appointment.id)) return
  if (detailsOpen.value) {
    pendingAfterDetails.value = { type: 'checkout', appointment }
    detailsOpen.value = false
    return
  }
  await presentCheckout(appointment)
}

function handlePrimary(appointment: Appointment) {
  if (appointment.status === 'pending') {
    void handleConfirm(appointment)
    return
  }
  void openCheckout(appointment)
}

function handleCardOpen(appointment: Appointment) {
  emit('open', appointment)
  openDetails(appointment)
}

function handleCardPrimary(appointment: Appointment) {
  emit('primary', appointment)
  handlePrimary(appointment)
}

function openEdit(appointment: Appointment) {
  if (isProcessing(appointment.id)) return
  detailsOpen.value = false
  editingAppointment.value = appointment
}

async function removeAppointment(appointment: Appointment) {
  if (isProcessing(appointment.id)) return
  const confirmed = await confirmDestructiveAction({
    header: t('appointments.delete.title'),
    message: t('appointments.delete.message'),
    confirmLabel: t('appointments.delete.confirm'),
  })
  if (!confirmed) return

  setProcessing(appointment.id, true)
  try {
    await removeMutation.mutateAsync(appointment.id)
    if (detailsAppointment.value?.id === appointment.id) detailsOpen.value = false
    if (editingAppointment.value?.id === appointment.id) editingAppointment.value = null
    await showToast(t('appointments.form.successDelete'), 'success')
  } catch {
    await showToast(t('appointments.form.errorDelete'), 'danger')
  } finally {
    setProcessing(appointment.id, false)
  }
}

async function saveEdit(payload: UpdateAppointmentDto) {
  const appointmentId = payload.id
  if (isProcessing(appointmentId)) return
  setProcessing(appointmentId, true)
  try {
    await updateMutation.mutateAsync(payload)
    await showToast(t('appointments.form.successEdit'), 'success')
  } catch (error) {
    await showToast(t('appointments.form.errorTitle'), 'danger')
    throw error
  } finally {
    setProcessing(appointmentId, false)
  }
}

async function handleCheckoutConfirm(payload: CompleteSaleDto) {
  const appointment = checkoutAppointment.value
  if (!appointment || isProcessing(appointment.id)) return
  setProcessing(appointment.id, true)
  try {
    await completeSaleMutation.mutateAsync(payload)
    checkoutOpen.value = false
    await showToast(t('checkout.successTitle'), 'success')
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (message.includes('already_completed')) {
      checkoutOpen.value = false
      await showToast(t('checkout.alreadyCompleted'), 'warning')
    } else {
      await showToast(t('checkout.errorTitle'), 'danger')
    }
  } finally {
    setProcessing(appointment.id, false)
  }
}

async function openActions(appointment: Appointment) {
  if (isProcessing(appointment.id)) return
  if (detailsOpen.value) {
    pendingAfterDetails.value = { type: 'actions', appointment }
    detailsOpen.value = false
    return
  }
  actionsAppointment.value = appointment
  await nextTick()
  actionsOpen.value = true
}

async function finishDetailsDismiss() {
  detailsOpen.value = false
  detailsAppointment.value = null

  const pending = pendingAfterDetails.value
  pendingAfterDetails.value = null
  if (!pending) return
  if (pending.type === 'checkout') await presentCheckout(pending.appointment)
  else await openActions(pending.appointment)
}

async function handleDrawerAction(action: MobileAppointmentMoreAction) {
  const appointment = actionsAppointment.value
  if (!appointment) return
  actionsOpen.value = false
  actionsAppointment.value = null

  if (action === 'edit') openEdit(appointment)
  else if (action === 'decline') await handleDecline(appointment)
  else await handleNoShow(appointment)
}

function closeCheckout() {
  checkoutOpen.value = false
}

function finishCheckoutDismiss() {
  checkoutOpen.value = false
  checkoutAppointment.value = null
}

defineExpose({
  openAppointment: openDetails,
  editAppointment: openEdit,
  deleteAppointment: removeAppointment,
})
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
          :primary-loading="isProcessing(appointment.id)"
          :now="now"
          @open="handleCardOpen(appointment)"
          @primary="handleCardPrimary(appointment)"
          @actions="openActions(appointment)"
          @note="openNote(appointment)"
        />
      </div>
    </div>

    <ion-modal
      :is-open="Boolean(noteAppointment)"
      class="appointment-note-modal"
      :breakpoints="[0, 1]"
      :initial-breakpoint="1"
      :handle="true"
      @did-dismiss="closeNote"
    >
      <ion-header class="ion-no-border">
        <ion-toolbar>
          <ion-buttons slot="start">
            <ion-button
              fill="clear"
              color="dark"
              :aria-label="t('common.close')"
              @click="closeNote"
            >
              <ion-icon slot="icon-only" :icon="closeOutline" aria-hidden="true" />
            </ion-button>
          </ion-buttons>
          <ion-title>{{ t('home.nextUp.noteTitle') }}</ion-title>
        </ion-toolbar>
      </ion-header>
      <ion-content class="appointment-note-modal__content">
        <p class="appointment-note-modal__text">{{ noteAppointment?.notes }}</p>
      </ion-content>
    </ion-modal>
  </section>

  <appointment-details-mobile
    v-if="detailsAppointment"
    :is-open="detailsOpen"
    :appointment="detailsAppointment"
    :client="getClient(detailsAppointment)"
    :client-name="getClientName(detailsAppointment)"
    :service-names="getServiceNames(detailsAppointment)"
    :date-label="formats.dateDay(detailsAppointment.start_at)"
    :time-label="formatTime(detailsAppointment.start_at)"
    :duration-label="t('home.nextUp.minutesLabel', { n: detailsAppointment.duration })"
    :price-label="formats.price(detailsAppointment.price)"
    :primary-loading="isProcessing(detailsAppointment.id)"
    @update:is-open="detailsOpen = $event"
    @did-dismiss="finishDetailsDismiss"
    @primary="handlePrimary(detailsAppointment)"
    @more="openActions(detailsAppointment)"
  />

  <appointment-edit-mobile
    v-if="editingAppointment"
    :is-open="Boolean(editingAppointment)"
    :appointment="editingAppointment"
    :clients="clients ?? []"
    :services="services ?? []"
    :time-zone="masterPreferencesStore.timeZone"
    :on-save="saveEdit"
    @update:is-open="editingAppointment = null"
  />

  <appointment-actions-drawer-mobile
    v-if="actionsAppointment"
    :is-open="actionsOpen"
    :appointment="actionsAppointment"
    :client-name="getClientName(actionsAppointment)"
    :date-label="formats.dateDay(actionsAppointment.start_at)"
    :time-label="formatTime(actionsAppointment.start_at)"
    @update:is-open="actionsOpen = $event"
    @select="handleDrawerAction"
  />

  <appointment-checkout-mobile
    v-if="checkoutAppointment"
    :is-open="checkoutOpen"
    :appointment="checkoutAppointment"
    :client="getClient(checkoutAppointment)"
    :services="getServices(checkoutAppointment)"
    :payment-types="paymentTypes ?? []"
    :loading="isProcessing(checkoutAppointment.id)"
    @update:is-open="closeCheckout"
    @did-dismiss="finishCheckoutDismiss"
    @confirm="handleCheckoutConfirm"
  />
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
  gap: 14px;
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

.appointment-note-modal {
  --height: min(320px, 60vh);
  --border-radius: 20px 20px 0 0;
}

.appointment-note-modal ion-toolbar,
.appointment-note-modal__content {
  --background: var(--se-surface-page, var(--ion-background-color));
}

.appointment-note-modal__text {
  margin: 0;
  padding: 18px;
  color: var(--ion-text-color);
  font-size: 0.95rem;
  line-height: 1.5;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
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
