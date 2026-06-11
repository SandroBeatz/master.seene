<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQueryCache } from '@pinia/colada'
import { useSessionStore } from '@entities/session'
import { useActionableAppointmentsQuery, useUpdateAppointmentMutation } from '@entities/appointment'
import { useClientsQuery } from '@entities/client'
import { useServicesQuery } from '@entities/service'
import { usePaymentTypesQuery } from '@entities/payment-type'
import { useCompleteSaleMutation } from '@entities/sale'
import { useFormats } from '@shared/lib/formats'
import type { Appointment } from '@entities/appointment'
import type { Service } from '@entities/service'
import type { CompleteSaleDto } from '@entities/sale'
import { AppointmentCheckoutModal } from '@features/appointment-checkout'

const { t } = useI18n()
const toast = useToast()
const cache = useQueryCache()
const sessionStore = useSessionStore()
const formats = useFormats()
const userId = computed(() => sessionStore.session?.user.id ?? '')

const { data: appointments, isPending, refresh } = useActionableAppointmentsQuery(userId)
const { data: clients } = useClientsQuery(userId)
const { data: services } = useServicesQuery(userId)
const { data: paymentTypes } = usePaymentTypesQuery(userId)

const updateMutation = useUpdateAppointmentMutation(userId)
const completeSaleMutation = useCompleteSaleMutation(userId)

const isCheckoutOpen = ref(false)
const checkoutAppointment = ref<Appointment | null>(null)
const decliningId = ref<string | null>(null)

const pendingCount = computed(
  () => appointments.value?.filter((a) => a.status === 'pending').length ?? 0,
)

function getClient(appointment: Appointment) {
  return clients.value?.find((c) => c.id === appointment.client_id)
}

function getClientName(appointment: Appointment) {
  const client = getClient(appointment)
  if (!client) return '—'
  return [client.first_name, client.last_name].filter(Boolean).join(' ')
}

function getServiceNames(appointment: Appointment): string {
  return (
    appointment.service_ids
      .map((id) => services.value?.find((s) => s.id === id)?.name)
      .filter(Boolean)
      .join(', ') || '—'
  )
}

function getCheckoutServices(appointment: Appointment): Service[] {
  return appointment.service_ids
    .map((id) => services.value?.find((s) => s.id === id))
    .filter((s): s is Service => Boolean(s))
}

function formatTime(isoString: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(isoString))
}

async function handleConfirm(appointment: Appointment) {
  try {
    await updateMutation.mutateAsync({ id: appointment.id, status: 'confirmed' })
    cache.invalidateQueries({ key: ['analytics'] })
    await refresh()
  } catch {
    toast.add({ title: t('appointments.preview.statusUpdateError'), color: 'error' })
  }
}

async function handleDecline(appointment: Appointment) {
  decliningId.value = appointment.id
  try {
    await updateMutation.mutateAsync({ id: appointment.id, status: 'cancelled' })
    await refresh()
  } catch {
    toast.add({ title: t('appointments.preview.statusUpdateError'), color: 'error' })
  } finally {
    decliningId.value = null
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
    cache.invalidateQueries({ key: ['analytics'] })
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
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h2 class="text-base font-semibold">{{ t('home.nextUp.title') }}</h2>
        <UBadge v-if="pendingCount > 0" color="warning" variant="soft" size="sm">
          {{ t('home.nextUp.needAction', { n: pendingCount }) }}
        </UBadge>
      </div>
    </template>

    <template v-if="isPending">
      <div class="space-y-2">
        <div
          v-for="i in 3"
          :key="i"
          class="flex items-center gap-3 rounded-xl border border-default bg-default px-4 py-3"
        >
          <USkeleton class="h-3 w-10 shrink-0" />
          <USkeleton class="size-8 rounded-full shrink-0" />
          <div class="flex-1 space-y-1.5">
            <USkeleton class="h-4 w-36" />
            <USkeleton class="h-3 w-48" />
          </div>
          <USkeleton class="h-4 w-12" />
          <USkeleton class="h-8 w-20 rounded-lg" />
        </div>
      </div>
    </template>

    <div
      v-else-if="!appointments?.length"
      class="flex items-center gap-2 rounded-xl border border-dashed border-default px-4 py-6 justify-center"
    >
      <UIcon name="i-lucide-check-circle" class="size-5 text-muted" />
      <p class="text-sm text-muted">{{ t('home.nextUp.noAppointments') }}</p>
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="appt in appointments"
        :key="appt.id"
        class="flex items-center gap-3 rounded-xl border border-default bg-default px-4 py-3"
      >
        <!-- Time -->
        <span class="w-10 shrink-0 text-xs font-medium text-muted tabular-nums">
          {{ formatTime(appt.start_at) }}
        </span>

        <!-- Avatar -->
        <UAvatar :alt="getClientName(appt)" size="sm" class="shrink-0" />

        <!-- Info -->
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-1.5">
            <span class="text-sm font-medium truncate">{{ getClientName(appt) }}</span>
            <UBadge v-if="appt.status === 'pending'" color="warning" variant="soft" size="xs">
              {{ t('home.nextUp.statusPending') }}
            </UBadge>
            <UBadge v-else color="neutral" variant="soft" size="xs">
              {{ t('home.nextUp.statusUpcoming') }}
            </UBadge>
          </div>
          <p class="mt-0.5 text-xs text-muted truncate">{{ getServiceNames(appt) }}</p>
        </div>

        <!-- Price -->
        <span class="shrink-0 text-sm font-semibold">
          {{ formats.price(appt.price) }}
        </span>

        <!-- Actions: pending -->
        <template v-if="appt.status === 'pending'">
          <UButton
            size="sm"
            color="neutral"
            variant="ghost"
            :loading="decliningId === appt.id"
            @click="handleDecline(appt)"
          >
            {{ t('home.nextUp.decline') }}
          </UButton>
          <UButton
            size="sm"
            color="primary"
            :loading="updateMutation.isLoading.value && decliningId !== appt.id"
            @click="handleConfirm(appt)"
          >
            {{ t('home.nextUp.confirm') }}
          </UButton>
        </template>

        <!-- Actions: confirmed (past, ready to complete) -->
        <template v-else>
          <UButton
            size="sm"
            color="success"
            variant="soft"
            leading-icon="i-lucide-badge-check"
            @click="handleComplete(appt)"
          >
            {{ t('home.nextUp.complete') }}
          </UButton>
        </template>
      </div>
    </div>
  </UCard>

  <AppointmentCheckoutModal
    v-if="checkoutAppointment"
    :open="isCheckoutOpen"
    :appointment="checkoutAppointment"
    :services="getCheckoutServices(checkoutAppointment)"
    :payment-types="paymentTypes ?? []"
    :loading="completeSaleMutation.isLoading.value"
    @update:open="isCheckoutOpen = $event"
    @confirm="handleCheckoutConfirm"
  />
</template>
