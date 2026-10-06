<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { alertController, toastController } from '@ionic/vue'
import {
  useRemoveAppointmentMutation,
  useUpdateAppointmentMutation,
  type Appointment,
  type AppointmentStatus,
  type UpdateAppointmentDto,
} from '@entities/appointment'
import { useClientsQuery, type Client } from '@entities/client'
import { useMasterPreferencesStore } from '@entities/master'
import { usePaymentTypesQuery, type PaymentType } from '@entities/payment-type/index.mobile'
import {
  useCompleteSaleMutation,
  useSaleByAppointmentQuery,
  useUpdateSaleDetailsMutation,
  useUpdateSaleMutation,
  type CompleteSaleDto,
  type UpdateSaleDetailsDto,
} from '@entities/sale'
import { useServicesQuery, type Service } from '@entities/service/index.mobile'
import { useSessionStore } from '@entities/session'
import {
  AppointmentActionsDrawerMobile,
  AppointmentDetailsMobile,
  AppointmentEditMobile,
  AppointmentRescheduleMobile,
  type MobileAppointmentMenuAction,
  type MobileAppointmentMoreAction,
} from '@features/appointment-actions/index.mobile'
import { AppointmentCheckoutMobile } from '@features/appointment-checkout/index.mobile'
import { useFormats } from '@shared/lib/formats'
import { getDateTimeInputValue } from '@shared/lib/time-zone'

// Every Ionic overlay that acts on an existing appointment — details, edit,
// reschedule, status drawer, checkout — plus the mutations behind them. A page
// mounts one host and drives it through the exposed methods, so the home
// screen and the calendar share identical flows.
const { t } = useI18n()
const formats = useFormats()
const sessionStore = useSessionStore()
const masterPreferencesStore = useMasterPreferencesStore()
const userId = computed(() => sessionStore.session?.user.id ?? '')

const { data: clients } = useClientsQuery(userId)
const { data: services } = useServicesQuery(userId)
const { data: paymentTypes } = usePaymentTypesQuery(userId)
const updateMutation = useUpdateAppointmentMutation(userId)
const removeMutation = useRemoveAppointmentMutation(userId)
const completeSaleMutation = useCompleteSaleMutation(userId)
const updateSaleMutation = useUpdateSaleMutation(userId)
const updateSaleDetailsMutation = useUpdateSaleDetailsMutation(userId)

const clientById = computed(
  () => new Map((clients.value ?? []).map((client) => [client.id, client])),
)
const serviceById = computed(
  () => new Map((services.value ?? []).map((service) => [service.id, service])),
)

const detailsAppointment = ref<Appointment | null>(null)
const detailsOpen = ref(false)
const actionsAppointment = ref<Appointment | null>(null)
const actionsOpen = ref(false)
const editingAppointment = ref<Appointment | null>(null)
const editOpen = ref(false)
const rescheduleAppointment = ref<Appointment | null>(null)
const rescheduleOpen = ref(false)
const checkoutAppointment = ref<Appointment | null>(null)
const checkoutOpen = ref(false)
const checkoutPresentingElement = ref<HTMLElement | null>(null)
const pendingDetailsSuccessToast = ref<string | null>(null)
const pendingEditAfterDetails = ref<Appointment | null>(null)
const processingIds = ref<ReadonlySet<string>>(new Set())
const detailsAppointmentId = computed(() =>
  detailsAppointment.value?.status === 'completed' ? detailsAppointment.value.id : undefined,
)
const detailsSaleQuery = useSaleByAppointmentQuery(detailsAppointmentId)
const presentingElement = ref<HTMLElement | null>(null)

onMounted(() => {
  presentingElement.value = document.querySelector('ion-router-outlet')
})

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

function formatTime(isoString: string): string {
  const { time } = getDateTimeInputValue(isoString, masterPreferencesStore.timeZone)
  return formats.time(time, masterPreferencesStore.timeFormat)
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

/** Applies a local patch to the appointment shown in the details sheet. */
function patchDetails(appointmentId: string, patch: Partial<Appointment>) {
  if (detailsAppointment.value?.id === appointmentId) {
    detailsAppointment.value = { ...detailsAppointment.value, ...patch }
  }
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

/**
 * Runs one mutation for an appointment with the shared busy flag and toasts.
 * Returns false when skipped (already busy) or failed.
 */
async function runForAppointment(
  appointmentId: string,
  task: () => Promise<unknown>,
  messages: { success: string; error: string },
): Promise<boolean> {
  if (isProcessing(appointmentId)) return false
  setProcessing(appointmentId, true)
  try {
    await task()
    await showToast(messages.success, 'success')
    return true
  } catch {
    await showToast(messages.error, 'danger')
    return false
  } finally {
    setProcessing(appointmentId, false)
  }
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
    if (detailsOpen.value && detailsAppointment.value?.id === appointment.id) {
      pendingDetailsSuccessToast.value = successMessage
      detailsOpen.value = false
    } else {
      await showToast(successMessage, 'success')
    }
  } catch {
    await showToast(t('appointments.preview.statusUpdateError'), 'danger')
  } finally {
    setProcessing(appointment.id, false)
  }
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

async function confirmAndUpdateStatus(
  appointment: Appointment,
  status: AppointmentStatus,
  copy: { header: string; message: string; confirmLabel: string; success: string },
) {
  if (isProcessing(appointment.id)) return
  const confirmed = await confirmDestructiveAction(copy)
  if (!confirmed) return
  await updateStatus(appointment, status, copy.success)
}

function handleDecline(appointment: Appointment) {
  return confirmAndUpdateStatus(appointment, 'cancelled', {
    header: t('home.nextUp.declineConfirmTitle'),
    message: t('home.nextUp.declineConfirmDescription', { name: getClientName(appointment) }),
    confirmLabel: t('home.nextUp.decline'),
    success: t('home.nextUp.declineSuccess'),
  })
}

function handleNoShow(appointment: Appointment) {
  return confirmAndUpdateStatus(appointment, 'no_show', {
    header: t('home.nextUp.noShowConfirmTitle'),
    message: t('home.nextUp.noShowConfirmDescription', { name: getClientName(appointment) }),
    confirmLabel: t('home.nextUp.noShowConfirm'),
    success: t('home.nextUp.noShowSuccess'),
  })
}

function handleCancel(appointment: Appointment) {
  return confirmAndUpdateStatus(appointment, 'cancelled', {
    header: t('appointments.preview.cancelConfirmTitle'),
    message: t('appointments.preview.cancelConfirmMessage'),
    confirmLabel: t('appointments.preview.cancelAppointment'),
    success: t('appointments.preview.statusUpdateSuccess'),
  })
}

async function openDetails(appointment: Appointment) {
  if (isProcessing(appointment.id)) return
  detailsAppointment.value = appointment
  await nextTick()
  detailsOpen.value = true
}

async function openCheckout(
  appointment: Appointment,
  nestedPresentingElement?: HTMLElement | null,
) {
  if (isProcessing(appointment.id)) return
  checkoutAppointment.value = appointment
  checkoutPresentingElement.value = nestedPresentingElement ?? presentingElement.value
  await nextTick()
  checkoutOpen.value = true
}

/** Footer action: confirm a pending request, otherwise check out. */
function primary(appointment: Appointment, nestedPresentingElement?: HTMLElement | null) {
  if (appointment.status === 'pending') {
    void updateStatus(appointment, 'confirmed', t('home.nextUp.confirmSuccess'))
    return
  }
  void openCheckout(appointment, nestedPresentingElement)
}

async function presentEdit(appointment: Appointment) {
  editingAppointment.value = appointment
  await nextTick()
  editOpen.value = true
}

async function openEdit(appointment: Appointment) {
  if (isProcessing(appointment.id)) return
  if (detailsOpen.value) {
    pendingEditAfterDetails.value = appointment
    detailsOpen.value = false
    return
  }
  await presentEdit(appointment)
}

async function openReschedule(appointment: Appointment) {
  if (isProcessing(appointment.id)) return
  rescheduleAppointment.value = appointment
  await nextTick()
  rescheduleOpen.value = true
}

async function openActions(appointment: Appointment) {
  if (isProcessing(appointment.id)) return
  actionsAppointment.value = appointment
  await nextTick()
  actionsOpen.value = true
}

async function remove(appointment: Appointment) {
  if (isProcessing(appointment.id)) return
  const confirmed = await confirmDestructiveAction({
    header: t('appointments.delete.title'),
    message:
      detailsAppointment.value?.id === appointment.id && detailsSaleQuery.data.value
        ? t('appointments.delete.messageWithSale')
        : t('appointments.delete.message'),
    confirmLabel: t('appointments.delete.confirm'),
  })
  if (!confirmed) return

  await runForAppointment(
    appointment.id,
    async () => {
      await removeMutation.mutateAsync(appointment.id)
      if (detailsAppointment.value?.id === appointment.id) detailsOpen.value = false
      if (editingAppointment.value?.id === appointment.id) editOpen.value = false
    },
    { success: t('appointments.form.successDelete'), error: t('appointments.form.errorDelete') },
  )
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

function markAppointmentCompleted(appointmentId: string) {
  if (checkoutAppointment.value?.id === appointmentId) {
    checkoutAppointment.value = { ...checkoutAppointment.value, status: 'completed' }
  }
  patchDetails(appointmentId, { status: 'completed' })
}

async function handleCheckoutConfirm(payload: CompleteSaleDto) {
  const appointment = checkoutAppointment.value
  if (!appointment || isProcessing(appointment.id)) return
  setProcessing(appointment.id, true)
  try {
    await completeSaleMutation.mutateAsync(payload)
    markAppointmentCompleted(appointment.id)
    // Ionic evaluates canDismiss when isOpen changes. Clear loading first so
    // the controlled close cannot be rejected by the modal.
    setProcessing(appointment.id, false)
    checkoutOpen.value = false
    await showToast(t('checkout.successTitle'), 'success')
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (message.includes('already_completed')) {
      markAppointmentCompleted(appointment.id)
      setProcessing(appointment.id, false)
      checkoutOpen.value = false
      await showToast(t('checkout.alreadyCompleted'), 'warning')
    } else {
      await showToast(t('checkout.errorTitle'), 'danger')
    }
  } finally {
    setProcessing(appointment.id, false)
  }
}

async function finishDetailsDismiss() {
  detailsOpen.value = false
  // Keep `detailsAppointment` set so the inline ion-modal stays mounted.
  // Ionic reparents inline modals to <ion-app>; removing the element via v-if
  // after dismiss triggers "Cannot read properties of null (reading 'insertBefore')".

  const successMessage = pendingDetailsSuccessToast.value
  pendingDetailsSuccessToast.value = null
  if (successMessage) await showToast(successMessage, 'success')

  const pendingEdit = pendingEditAfterDetails.value
  pendingEditAfterDetails.value = null
  if (pendingEdit) await presentEdit(pendingEdit)
}

async function handleDrawerAction(action: MobileAppointmentMoreAction) {
  const appointment = actionsAppointment.value
  if (!appointment) return
  actionsOpen.value = false

  if (action === 'decline') await handleDecline(appointment)
  else if (action === 'cancel') await handleCancel(appointment)
  else await handleNoShow(appointment)
}

async function handleDetailsAction(appointment: Appointment, action: MobileAppointmentMenuAction) {
  if (action === 'decline') await handleDecline(appointment)
  else if (action === 'cancel') await handleCancel(appointment)
  else if (action === 'no_show') await handleNoShow(appointment)
  else await remove(appointment)
}

async function handleClientSelect(appointment: Appointment, client: Client) {
  if (appointment.client_id === client.id) return

  await runForAppointment(
    appointment.id,
    async () => {
      await updateMutation.mutateAsync({ id: appointment.id, client_id: client.id })
      patchDetails(appointment.id, { client_id: client.id })
    },
    {
      success: t('appointments.preview.clientUpdateSuccess'),
      error: t('appointments.preview.clientUpdateError'),
    },
  )
}

async function handleServicesSelect(appointment: Appointment, selectedServices: Service[]) {
  if (!selectedServices.length) return

  const serviceIds = selectedServices.map((service) => service.id)
  if (
    serviceIds.length === appointment.service_ids.length &&
    serviceIds.every((id, index) => id === appointment.service_ids[index])
  ) {
    return
  }

  const duration = selectedServices.reduce((total, service) => total + service.duration, 0)
  const price = selectedServices.reduce((total, service) => total + service.price, 0)

  await runForAppointment(
    appointment.id,
    async () => {
      await updateMutation.mutateAsync({
        id: appointment.id,
        service_ids: serviceIds,
        duration,
        price,
      })
      patchDetails(appointment.id, { service_ids: serviceIds, duration, price })
    },
    {
      success: t('appointments.preview.servicesUpdateSuccess'),
      error: t('appointments.preview.servicesUpdateError'),
    },
  )
}

async function handleDateTimeSelect(appointment: Appointment, startAt: string) {
  if (new Date(startAt).getTime() === new Date(appointment.start_at).getTime()) return

  await runForAppointment(
    appointment.id,
    async () => {
      await updateMutation.mutateAsync({ id: appointment.id, start_at: startAt })
      patchDetails(appointment.id, { start_at: startAt })
    },
    {
      success: t('appointments.preview.dateTimeUpdateSuccess'),
      error: t('appointments.preview.dateTimeUpdateError'),
    },
  )
}

async function handlePaymentTypeSelect(appointment: Appointment, paymentType: PaymentType) {
  const sale = detailsSaleQuery.data.value
  if (!sale || sale.payment_type_id === paymentType.id) return

  await runForAppointment(
    appointment.id,
    () =>
      updateSaleMutation.mutateAsync({
        id: sale.id,
        appointmentId: appointment.id,
        patch: { payment_type_id: paymentType.id },
      }),
    {
      success: t('checkout.paymentMethodUpdateSuccess'),
      error: t('checkout.paymentMethodUpdateError'),
    },
  )
}

async function handleSaleAmountSave(appointment: Appointment, details: UpdateSaleDetailsDto) {
  const sale = detailsSaleQuery.data.value
  if (!sale) return

  await runForAppointment(
    appointment.id,
    () =>
      updateSaleDetailsMutation.mutateAsync({
        id: sale.id,
        appointmentId: appointment.id,
        details,
      }),
    { success: t('checkout.amountUpdateSuccess'), error: t('checkout.amountUpdateError') },
  )
}

defineExpose({
  processingIds,
  isProcessing,
  openDetails,
  openEdit,
  openReschedule,
  openActions,
  primary,
  remove,
})
</script>

<template>
  <appointment-details-mobile
    v-if="detailsAppointment"
    :is-open="detailsOpen"
    :appointment="detailsAppointment"
    :client="getClient(detailsAppointment)"
    :clients="clients ?? []"
    :services="services ?? []"
    :payment-types="paymentTypes ?? []"
    :time-zone="masterPreferencesStore.timeZone"
    :time-format="masterPreferencesStore.timeFormat"
    :sale="detailsSaleQuery.data.value"
    :sale-loading="detailsSaleQuery.isPending.value"
    :primary-loading="isProcessing(detailsAppointment.id)"
    :presenting-element="presentingElement"
    @update:is-open="detailsOpen = $event"
    @did-dismiss="finishDetailsDismiss"
    @select-client="handleClientSelect(detailsAppointment, $event)"
    @select-services="handleServicesSelect(detailsAppointment, $event)"
    @select-date-time="handleDateTimeSelect(detailsAppointment, $event)"
    @select-payment-type="handlePaymentTypeSelect(detailsAppointment, $event)"
    @save-sale-amount="handleSaleAmountSave(detailsAppointment, $event)"
    @primary="primary(detailsAppointment, $event)"
    @action="handleDetailsAction(detailsAppointment, $event)"
  />

  <appointment-edit-mobile
    v-if="editingAppointment"
    :is-open="editOpen"
    :appointment="editingAppointment"
    :clients="clients ?? []"
    :services="services ?? []"
    :time-zone="masterPreferencesStore.timeZone"
    :on-save="saveEdit"
    @update:is-open="editOpen = $event"
  />

  <appointment-reschedule-mobile
    v-if="rescheduleAppointment"
    v-model:is-open="rescheduleOpen"
    :appointment="rescheduleAppointment"
    :time-zone="masterPreferencesStore.timeZone"
    :presenting-element="presentingElement"
    @save="handleDateTimeSelect(rescheduleAppointment, $event)"
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
    :available-services="services ?? []"
    :payment-types="paymentTypes ?? []"
    :presenting-element="checkoutPresentingElement"
    :loading="isProcessing(checkoutAppointment.id)"
    @update:is-open="checkoutOpen = false"
    @did-dismiss="checkoutOpen = false"
    @confirm="handleCheckoutConfirm"
  />
</template>
