<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  useUpdateAppointmentMutation,
  useRemoveAppointmentMutation,
  useClientAppointmentsCountQuery,
  type Appointment,
  type AppointmentStatus,
} from '@entities/appointment'
import { useClientsQuery } from '@entities/client'
import { useServicesQuery, type Service } from '@entities/service'
import { usePaymentTypesQuery } from '@entities/payment-type'
import { useMasterPreferencesStore } from '@entities/master'
import { useSessionStore } from '@entities/session'
import {
  useCompleteSaleMutation,
  useUpdateSaleMutation,
  useSaleByAppointmentQuery,
  type CompleteSaleDto,
} from '@entities/sale'
import { AppointmentCheckoutModal } from '@features/appointment-checkout'
import { ComingSoon, useConfirm } from '@shared/ui'
import type { AppointmentEditPayload } from '../model/edit-payload'
import MobileAppointmentSheet from './MobileAppointmentSheet.vue'

const props = defineProps<{ appointment: Appointment }>()

// `open` is driven by `useOverlay` via the OverlayProvider (v-model:open); `after:leave`
// lets the provider unmount the instance once the closing transition finishes.
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ close: []; 'after:leave': [] }>()

const { t } = useI18n()
const toast = useToast()
const confirm = useConfirm()
const sessionStore = useSessionStore()
const masterPreferencesStore = useMasterPreferencesStore()

const userId = computed(() => sessionStore.session?.user.id ?? '')

// Local copy so status changes are reflected in the sheet without a refetch.
// The overlay instance is reused across opens (see `useAppointmentPreview`), so
// we must re-sync whenever a different appointment is passed in — otherwise the
// sheet keeps showing the first one that was ever opened.
const current = ref<Appointment>(props.appointment)
watch(
  () => props.appointment,
  (appointment) => {
    if (appointment) current.value = appointment
  },
)
const currentId = computed(() => current.value.id)
const clientId = computed(() => current.value.client_id)

const { data: clients } = useClientsQuery(userId)
const { data: services } = useServicesQuery(userId)
const { data: paymentTypes } = usePaymentTypesQuery(userId)
const { data: sale } = useSaleByAppointmentQuery(currentId)
const { data: clientAppointmentsCount } = useClientAppointmentsCountQuery(clientId)

const updateMutation = useUpdateAppointmentMutation(userId)
const removeMutation = useRemoveAppointmentMutation(userId)
const completeSaleMutation = useCompleteSaleMutation(userId)
const updateSaleMutation = useUpdateSaleMutation(userId)

// "New client" = this appointment is the client's only one (their first visit).
const isNew = computed(() => (clientAppointmentsCount.value ?? 0) <= 1)
const isBusy = computed(() => updateMutation.isLoading.value || removeMutation.isLoading.value)

const isCheckoutOpen = ref(false)
const isNotifyOpen = ref(false)

const client = computed(() => clients.value?.find((c) => c.id === current.value.client_id) ?? null)

const selectedServices = computed(() =>
  current.value.service_ids
    .map((id) => services.value?.find((s) => s.id === id))
    .filter((s): s is Service => Boolean(s)),
)

async function updateStatus(status: AppointmentStatus) {
  try {
    current.value = await updateMutation.mutateAsync({ id: current.value.id, status })
    toast.add({ title: t('appointments.preview.statusUpdateSuccess'), color: 'success' })
  } catch {
    toast.add({ title: t('appointments.preview.statusUpdateError'), color: 'error' })
  }
}

async function handleCancel() {
  const confirmed = await confirm({
    title: t('appointments.preview.cancelConfirmTitle'),
    description: t('appointments.preview.cancelConfirmMessage'),
    confirmLabel: t('appointments.preview.cancelAppointment'),
    cancelLabel: t('appointments.preview.keepAppointment'),
    color: 'error',
    icon: 'i-lucide-triangle-alert',
  })
  if (!confirmed) return
  await updateStatus('cancelled')
}

async function handleDecline() {
  const confirmed = await confirm({
    title: t('appointments.preview.declineConfirmTitle'),
    description: t('appointments.preview.declineConfirmMessage'),
    confirmLabel: t('appointments.preview.declineRequest'),
    cancelLabel: t('appointments.preview.keepRequest'),
    color: 'error',
    icon: 'i-lucide-triangle-alert',
  })
  if (!confirmed) return
  await updateStatus('cancelled')
}

async function handleNoShow() {
  const confirmed = await confirm({
    title: t('appointments.preview.noShowConfirmTitle'),
    description: t('appointments.preview.noShowConfirmMessage'),
    confirmLabel: t('appointments.preview.markNoShow'),
    cancelLabel: t('common.cancel'),
    color: 'error',
    icon: 'i-lucide-user-x',
  })
  if (!confirmed) return
  await updateStatus('no_show')
}

async function handleDelete() {
  const confirmed = await confirm({
    title: t('appointments.delete.title'),
    description: sale.value
      ? t('appointments.delete.messageWithSale')
      : t('appointments.delete.message'),
    confirmLabel: t('appointments.delete.confirm'),
    cancelLabel: t('appointments.delete.cancel'),
    color: 'error',
    icon: 'i-lucide-triangle-alert',
  })
  if (!confirmed) return
  try {
    await removeMutation.mutateAsync(current.value.id)
    toast.add({ title: t('appointments.form.successDelete'), color: 'success' })
    open.value = false
  } catch {
    toast.add({ title: t('appointments.form.errorDelete'), color: 'error' })
  }
}

async function handleSave(payload: AppointmentEditPayload) {
  try {
    const updated = await updateMutation.mutateAsync({
      id: payload.id,
      client_id: payload.client_id,
      service_ids: payload.service_ids,
      start_at: payload.start_at,
      duration: payload.duration,
      price: payload.price,
    })
    if (payload.sale) {
      await updateSaleMutation.mutateAsync({
        id: payload.sale.id,
        appointmentId: payload.id,
        patch: {
          payment_type_id: payload.sale.payment_type_id,
          amount: payload.sale.amount,
        },
      })
    }
    current.value = updated
    toast.add({ title: t('appointments.form.successEdit'), color: 'success' })
  } catch (error) {
    toast.add({ title: t('appointments.form.errorTitle'), color: 'error' })
    // Re-throw so the sheet keeps the user's draft and stays in edit mode.
    throw error
  }
}

async function handleCheckoutConfirm(payload: CompleteSaleDto) {
  try {
    await completeSaleMutation.mutateAsync(payload)
    current.value = { ...current.value, status: 'completed' }
    isCheckoutOpen.value = false
    toast.add({ title: t('checkout.successTitle'), color: 'success' })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (message.includes('already_completed')) {
      toast.add({ title: t('checkout.alreadyCompleted'), color: 'warning' })
      isCheckoutOpen.value = false
    } else {
      toast.add({ title: t('checkout.errorTitle'), color: 'error' })
    }
  }
}
</script>

<template>
  <MobileAppointmentSheet
    v-model:open="open"
    :appointment="current"
    :clients="clients ?? []"
    :services="services ?? []"
    :payment-types="paymentTypes ?? []"
    :sale="sale"
    :is-new="isNew"
    :time-zone="masterPreferencesStore.timeZone"
    :time-format="masterPreferencesStore.timeFormat"
    :loading="isBusy"
    :on-save="handleSave"
    @cancel="handleCancel"
    @confirm="updateStatus('confirmed')"
    @complete="isCheckoutOpen = true"
    @decline="handleDecline"
    @no_show="handleNoShow"
    @delete="handleDelete"
    @notify="isNotifyOpen = true"
    @after:leave="emit('after:leave')"
  />

  <AppointmentCheckoutModal
    :open="isCheckoutOpen"
    :appointment="current"
    :client="client"
    :services="selectedServices"
    :payment-types="paymentTypes ?? []"
    :loading="completeSaleMutation.isLoading.value"
    @update:open="isCheckoutOpen = $event"
    @confirm="handleCheckoutConfirm"
  />

  <!-- Notify-client entry point — placeholder until the notification flow ships. -->
  <UModal v-model:open="isNotifyOpen" :title="$t('appointments.preview.notifyTitle')">
    <template #body>
      <ComingSoon
        :title="$t('appointments.preview.notifyTitle')"
        :description="$t('appointments.preview.notifyComingSoon')"
        icon="i-lucide-message-circle"
      />
    </template>
  </UModal>
</template>
