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
import { useLocaleStore } from '@shared/lib/locale'
import type { Appointment } from '@entities/appointment'
import type { Service } from '@entities/service'
import type { CompleteSaleDto } from '@entities/sale'
import { AppointmentCheckoutModal } from '@features/appointment-checkout'
import { useAppointmentPreview } from '@widgets/appointment-preview-panel'
import { Typography, useConfirm } from '@shared/ui'

const { t } = useI18n()
const toast = useToast()
const confirm = useConfirm()
const preview = useAppointmentPreview()
const cache = useQueryCache()
const sessionStore = useSessionStore()
const formats = useFormats()
const localeStore = useLocaleStore()
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
const confirmingId = ref<string | null>(null)
const markingNoShowId = ref<string | null>(null)

// Three distinct jobs sharing one feed: pending requests the client is still
// waiting on, pending requests whose slot has already passed (the master never
// replied — they need a decision, not just a tap), and past confirmed
// appointments that still need a checkout.
const byStartAsc = (a: Appointment, b: Appointment) =>
  new Date(a.start_at).getTime() - new Date(b.start_at).getTime()

function slotEnded(appointment: Appointment): boolean {
  return new Date(appointment.start_at).getTime() + appointment.duration * 60_000 <= Date.now()
}

const requests = computed(
  () =>
    appointments.value
      ?.filter((a) => a.status === 'pending' && !slotEnded(a))
      .slice()
      .sort(byStartAsc) ?? [],
)
const needsDecision = computed(
  () =>
    appointments.value
      ?.filter((a) => a.status === 'pending' && slotEnded(a))
      .slice()
      .sort(byStartAsc) ?? [],
)
const toFinish = computed(
  () => appointments.value?.filter((a) => a.status !== 'pending').slice().sort(byStartAsc) ?? [],
)

const sections = computed(() =>
  [
    {
      id: 'requests' as const,
      title: t('home.nextUp.sectionRequests'),
      count: t('home.nextUp.sectionRequestsCount', { n: requests.value.length }),
      items: requests.value,
    },
    {
      id: 'needsDecision' as const,
      title: t('home.nextUp.sectionNeedsDecision'),
      count: t('home.nextUp.sectionNeedsDecisionCount', { n: needsDecision.value.length }),
      items: needsDecision.value,
    },
    {
      id: 'toFinish' as const,
      title: t('home.nextUp.sectionToFinish'),
      count: t('home.nextUp.sectionToFinishCount', { n: toFinish.value.length }),
      items: toFinish.value,
    },
  ].filter((s) => s.items.length > 0),
)

// Header badge: total count across both sections (sections show their own breakdown).
const actionableCount = computed(() => appointments.value?.length ?? 0)

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
  const d = new Date(isoString)
  const hhmm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return formats.time(hhmm)
}

// Compact "how long the client has been waiting" label since they booked online.
function waitingLabel(isoString: string): string {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(isoString).getTime()) / 60_000))
  if (minutes < 60) return t('home.nextUp.unitMinShort', { n: minutes })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t('home.nextUp.unitHourShort', { n: hours })
  return t('home.nextUp.unitDayShort', { n: Math.floor(hours / 24) })
}

function isOnline(appointment: Appointment): boolean {
  return appointment.source === 'online_booking'
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function isToday(isoString: string): boolean {
  return isSameCalendarDay(new Date(isoString), new Date())
}

function isTomorrow(isoString: string): boolean {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return isSameCalendarDay(new Date(isoString), tomorrow)
}

function dateLabel(isoString: string): string {
  if (isToday(isoString)) return t('home.nextUp.today')
  if (isTomorrow(isoString)) return t('home.nextUp.tomorrow')
  return new Intl.DateTimeFormat(localeStore.current, { day: 'numeric', month: 'short' }).format(
    new Date(isoString),
  )
}

// Accent color by status: pending → amber (primary), confirmed → violet.
// Used as a fallback when none of the appointment's services define a color.
function accentBarClass(status: Appointment['status']): string {
  return status === 'pending' ? 'bg-primary' : 'bg-secondary'
}

function getServiceColors(appointment: Appointment): string[] {
  return appointment.service_ids
    .map((id) => services.value?.find((s) => s.id === id)?.color)
    .filter((c): c is string => Boolean(c))
}

// Accent bar from service colors: solid for one service, vertical gradient for several.
function accentBarStyle(appointment: Appointment): Record<string, string> {
  const colors = getServiceColors(appointment)
  if (colors.length === 0) return {}
  if (colors.length === 1) return { background: colors[0]! }
  return { background: `linear-gradient(to bottom, ${colors.join(', ')})` }
}

function accentTextClass(status: Appointment['status']): string {
  return status === 'pending' ? 'text-primary' : 'text-secondary'
}

async function handleConfirm(appointment: Appointment) {
  confirmingId.value = appointment.id
  try {
    await updateMutation.mutateAsync({ id: appointment.id, status: 'confirmed' })
    cache.invalidateQueries({ key: ['analytics'] })
    await refresh()
  } catch {
    toast.add({ title: t('appointments.preview.statusUpdateError'), color: 'error' })
  } finally {
    confirmingId.value = null
  }
}

async function handleDecline(appointment: Appointment) {
  const confirmed = await confirm({
    title: t('home.nextUp.declineConfirmTitle'),
    description: t('home.nextUp.declineConfirmDescription', { name: getClientName(appointment) }),
    confirmLabel: t('home.nextUp.decline'),
    color: 'error',
    icon: 'i-lucide-triangle-alert',
  })
  if (!confirmed) return

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

async function handleNoShow(appointment: Appointment) {
  const confirmed = await confirm({
    title: t('home.nextUp.noShowConfirmTitle'),
    description: t('home.nextUp.noShowConfirmDescription', { name: getClientName(appointment) }),
    confirmLabel: t('home.nextUp.noShowConfirm'),
    color: 'neutral',
    icon: 'i-lucide-user-x',
  })
  if (!confirmed) return

  markingNoShowId.value = appointment.id
  try {
    await updateMutation.mutateAsync({ id: appointment.id, status: 'no_show' })
    cache.invalidateQueries({ key: ['analytics'] })
    await refresh()
  } catch {
    toast.add({ title: t('appointments.preview.statusUpdateError'), color: 'error' })
  } finally {
    markingNoShowId.value = null
  }
}

function handleComplete(appointment: Appointment) {
  checkoutAppointment.value = appointment
  isCheckoutOpen.value = true
}

function openPreview(appointment: Appointment) {
  preview.open({ appointment })
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

// Nuxt UI overrides
const hostUI = {
  root: 'rounded-xl shadow-panel ring-0 divide-y-0',
  header: 'pb-0',
}
const cardUI = {
  root: 'h-full rounded-xl shadow-none',
}
</script>

<template>
  <UCard :ui="hostUI">
    <template #header>
      <div class="flex items-center justify-between">
        <Typography variant="h5" class="text-highlighted font-bold">{{
          t('home.nextUp.title')
        }}</Typography>
        <UBadge
          v-if="actionableCount > 0"
          color="warning"
          variant="soft"
          size="sm"
          class="rounded-full px-3 py-1"
        >
          {{ t('home.nextUp.needAction', { n: actionableCount }) }}
        </UBadge>
      </div>
    </template>

    <template v-if="isPending">
      <div class="space-y-2">
        <div
          v-for="i in 3"
          :key="i"
          class="flex items-center gap-4 rounded-2xl border border-default bg-default p-4"
        >
          <USkeleton class="h-16 w-20 shrink-0 rounded-xl" />
          <USkeleton class="size-10 shrink-0 rounded-full" />
          <div class="flex-1 space-y-1.5">
            <USkeleton class="h-4 w-36" />
            <USkeleton class="h-3 w-48" />
          </div>
          <USkeleton class="h-4 w-12" />
          <USkeleton class="h-8 w-20 rounded-lg" />
        </div>
      </div>
    </template>

    <UEmpty
      v-else-if="!appointments?.length"
      variant="naked"
      icon="i-lucide-check-circle"
      :title="t('home.nextUp.noAppointments')"
      :ui="{ root: 'rounded-lg border border-dashed border-default' }"
    />

    <div v-else class="space-y-6">
      <section v-for="section in sections" :key="section.id" class="space-y-2">
        <div class="flex items-center justify-between px-1">
          <Typography variant="endnote" class="font-semibold text-muted uppercase tracking-wide">
            {{ section.title }}
          </Typography>
          <Typography variant="endnote" class="font-medium text-dimmed">
            {{ section.count }}
          </Typography>
        </div>

        <UCard v-for="appt in section.items" :key="appt.id" :ui="cardUI">
          <div
            class="flex cursor-pointer flex-col gap-4 lg:flex-row lg:items-center"
            role="button"
            tabindex="0"
            @click="openPreview(appt)"
            @keydown.enter="openPreview(appt)"
          >
          <div class="flex min-w-20 shrink-0 items-stretch gap-4">
            <span
              class="w-1 rounded-full"
              :class="accentBarClass(appt.status)"
              :style="accentBarStyle(appt)"
            />
            <div class="flex flex-col justify-center">
              <Typography variant="h6" class="font-bold text-highlighted">
                {{ formatTime(appt.start_at) }}
              </Typography>
              <Typography
                variant="endnote"
                class="font-semibold"
                :class="isToday(appt.start_at) ? accentTextClass(appt.status) : 'text-muted'"
              >
                {{ dateLabel(appt.start_at) }}
              </Typography>
              <Typography variant="endnote" class="font-semibold text-dimmed mt-1">
                {{ t('home.nextUp.minutesLabel', { n: appt.duration }) }}
              </Typography>
            </div>
          </div>

          <div class="flex min-w-0 flex-1 items-center gap-4">
            <UAvatar :alt="getClientName(appt)" size="2xl" class="text-sm shrink-0" />

            <div class="min-w-0 flex-1">
              <Typography variant="caption" class="font-semibold text-highlighted">
                {{ getClientName(appt) }}
              </Typography>
              <Typography variant="endnote" class="text-muted">
                {{ getServiceNames(appt) }}
              </Typography>
              <div class="flex flex-wrap items-center gap-2 pt-1.5">
                <UBadge v-if="appt.status === 'pending'" color="warning" variant="soft" size="sm">
                  {{ t('home.nextUp.statusPending') }}
                </UBadge>
                <UBadge v-else color="secondary" variant="soft" size="sm">
                  {{ t('home.nextUp.statusToFinish') }}
                </UBadge>
                <UTooltip v-if="isOnline(appt)" :text="t('home.nextUp.badgeOnlineHint')">
                  <UBadge color="info" variant="soft" size="sm" leading-icon="i-lucide-globe">
                    {{ t('home.nextUp.badgeOnline') }}
                  </UBadge>
                </UTooltip>
                <Typography
                  v-if="appt.status === 'pending' && slotEnded(appt)"
                  variant="endnote"
                  class="font-medium text-error"
                >
                  {{ t('home.nextUp.slotPassed') }}
                </Typography>
                <Typography
                  v-else-if="appt.status === 'pending' && isOnline(appt)"
                  variant="endnote"
                  class="font-medium text-warning"
                >
                  {{ t('home.nextUp.waitingFor', { time: waitingLabel(appt.created_at) }) }}
                </Typography>
              </div>
            </div>
          </div>

          <Typography class="shrink-0 font-bold text-highlighted">
            {{ formats.price(appt.price) }}
          </Typography>

          <div v-if="appt.status === 'pending'" class="flex shrink-0 gap-2" @click.stop>
            <UButton
              size="sm"
              color="neutral"
              variant="outline"
              leading-icon="i-lucide-x"
              :loading="decliningId === appt.id"
              @click="handleDecline(appt)"
            >
              {{ t('home.nextUp.decline') }}
            </UButton>
            <UButton
              size="sm"
              color="primary"
              :loading="confirmingId === appt.id"
              @click="handleConfirm(appt)"
            >
              {{ t('home.nextUp.confirm') }}
            </UButton>
          </div>

          <div v-else class="flex shrink-0 gap-2" @click.stop>
            <UButton
              size="sm"
              color="neutral"
              variant="ghost"
              leading-icon="i-lucide-user-x"
              :loading="markingNoShowId === appt.id"
              @click="handleNoShow(appt)"
            >
              {{ t('home.nextUp.noShow') }}
            </UButton>
            <UButton
              size="sm"
              color="secondary"
              variant="soft"
              leading-icon="i-lucide-badge-check"
              @click="handleComplete(appt)"
            >
              {{ t('home.nextUp.complete') }}
            </UButton>
          </div>
        </div>
        </UCard>
      </section>
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
