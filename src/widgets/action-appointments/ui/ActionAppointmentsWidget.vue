<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSessionStore } from '@entities/session'
import { useActionableAppointmentsQuery, useUpdateAppointmentMutation } from '@entities/appointment'
import { useClientsQuery } from '@entities/client'
import { useServicesQuery } from '@entities/service'
import { usePaymentTypesQuery } from '@entities/payment-type'
import { useCompleteSaleMutation } from '@entities/sale'
import type { Appointment } from '@entities/appointment'
import type { Service } from '@entities/service'
import type { CompleteSaleDto } from '@entities/sale'
import { AppointmentCheckoutModal } from '@features/appointment-checkout'
import ActionAppointmentCard from './ActionAppointmentCard.vue'

const { t } = useI18n()
const toast = useToast()
const sessionStore = useSessionStore()
const userId = computed(() => sessionStore.session?.user.id ?? '')

const { data: appointments, refresh } = useActionableAppointmentsQuery(userId)
const { data: clients } = useClientsQuery(userId)
const { data: services } = useServicesQuery(userId)
const { data: paymentTypes } = usePaymentTypesQuery(userId)

const updateMutation = useUpdateAppointmentMutation(userId)
const completeSaleMutation = useCompleteSaleMutation(userId)

const isCheckoutOpen = ref(false)
const checkoutAppointment = ref<Appointment | null>(null)

const checkoutServices = computed<Service[]>(() => {
  if (!checkoutAppointment.value) return []
  return checkoutAppointment.value.service_ids
    .map((id) => services.value?.find((s) => s.id === id))
    .filter((s): s is Service => Boolean(s))
})

function getClient(appointment: Appointment) {
  return clients.value?.find((c) => c.id === appointment.client_id)
}

function getServices(appointment: Appointment): Service[] {
  return appointment.service_ids
    .map((id) => services.value?.find((s) => s.id === id))
    .filter((s): s is Service => Boolean(s))
}

async function handleConfirm(appointment: Appointment) {
  try {
    await updateMutation.mutateAsync({ id: appointment.id, status: 'confirmed' })
    // Remove from list only if appointment is in the future
    if (new Date(appointment.start_at) > new Date()) {
      await refresh()
    }
  } catch {
    toast.add({ title: t('appointments.preview.statusUpdateError'), color: 'error' })
  }
}

function handleComplete(appointment: Appointment) {
  checkoutAppointment.value = appointment
  isCheckoutOpen.value = true
}

async function handleCheckoutConfirm(payload: CompleteSaleDto) {
  try {
    await completeSaleMutation.mutateAsync(payload)
    isCheckoutOpen.value = false
    checkoutAppointment.value = null
    await refresh()
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
  <div class="space-y-3">
    <p class="text-sm font-semibold text-muted uppercase">
      {{ t('home.actionAppointments.title') }}
    </p>

    <div
      v-if="!appointments?.length"
      class="flex items-center gap-2 rounded-xl border border-dashed border-default px-4 py-6 text-center justify-center"
    >
      <UIcon name="i-lucide-check-circle" class="size-5 text-muted" />
      <p class="text-sm text-muted">{{ t('home.actionAppointments.empty') }}</p>
    </div>

    <div v-else class="space-y-2">
      <ActionAppointmentCard
        v-for="appt in appointments"
        :key="appt.id"
        :appointment="appt"
        :client="getClient(appt)"
        :services="getServices(appt)"
        :confirm-loading="updateMutation.isLoading.value"
        @confirm="handleConfirm"
        @complete="handleComplete"
      />
    </div>
  </div>

  <AppointmentCheckoutModal
    v-if="checkoutAppointment"
    :open="isCheckoutOpen"
    :appointment="checkoutAppointment"
    :services="checkoutServices"
    :payment-types="paymentTypes ?? []"
    :loading="completeSaleMutation.isLoading.value"
    @update:open="isCheckoutOpen = $event"
    @confirm="handleCheckoutConfirm"
  />
</template>
