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
import { useMasterPreferencesStore } from '@entities/master'
import { useFormats } from '@shared/lib/formats'
import { useLocaleStore } from '@shared/lib/locale'
import { useIsMobile } from '@shared/lib/viewport'
import type { Appointment } from '@entities/appointment'
import type { Service } from '@entities/service'
import type { CompleteSaleDto } from '@entities/sale'
import { AppointmentCheckoutModal } from '@features/appointment-checkout'
import { AppointmentFormDialog } from '@features/appointment-form'
import { useAppointmentPreview } from '@widgets/appointment-preview-panel'
import { Typography, useConfirm } from '@shared/ui'
import MobileNextUpActionsDrawer from './shared/MobileNextUpActionsDrawer.vue'
import MobileNextUpCard from './shared/MobileNextUpCard.vue'

const { t } = useI18n()
const toast = useToast()
const confirm = useConfirm()
const preview = useAppointmentPreview()
const cache = useQueryCache()
const sessionStore = useSessionStore()
const masterPreferencesStore = useMasterPreferencesStore()
const formats = useFormats()
const localeStore = useLocaleStore()
const isMobile = useIsMobile()
const userId = computed(() => sessionStore.session?.user.id ?? '')

const { data: appointments, isPending } = useActionableAppointmentsQuery(userId)
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
const actionsAppointment = ref<Appointment | null>(null)
const isActionsOpen = ref(false)
const editingAppointment = ref<Appointment | null>(null)
const isEditOpen = ref(false)

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
  () =>
    appointments.value
      ?.filter((a) => a.status !== 'pending')
      .slice()
      .sort(byStartAsc) ?? [],
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

const mobileAppointments = computed(() => sections.value.flatMap((section) => section.items))
const actionsClientName = computed(() =>
  actionsAppointment.value ? getClientName(actionsAppointment.value) : '',
)

// Header badge: total count across both sections (sections show their own breakdown).
const actionableCount = computed(() => appointments.value?.length ?? 0)

// On mobile, an empty state just wastes vertical space — hide the whole widget instead.
const showWidget = computed(() => !isMobile.value || isPending.value || actionableCount.value > 0)

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

function attentionLabel(appointment: Appointment): string | undefined {
  if (appointment.status !== 'pending') return undefined
  if (slotEnded(appointment)) return t('home.nextUp.slotPassed')
  if (isOnline(appointment)) {
    return t('home.nextUp.waitingFor', { time: waitingLabel(appointment.created_at) })
  }
  return undefined
}

function attentionTone(appointment: Appointment): 'warning' | 'error' | undefined {
  if (appointment.status !== 'pending') return undefined
  if (slotEnded(appointment)) return 'error'
  if (isOnline(appointment)) return 'warning'
  return undefined
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

async function refreshHomeData() {
  await Promise.all([
    cache.invalidateQueries({ key: ['appointments', userId.value] }),
    cache.invalidateQueries({ key: ['appointments-actionable', userId.value] }),
    cache.invalidateQueries({ key: ['analytics-v2'] }),
  ])
}

async function handleConfirm(appointment: Appointment) {
  confirmingId.value = appointment.id
  try {
    await updateMutation.mutateAsync({ id: appointment.id, status: 'confirmed' })
    await refreshHomeData()
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
    await refreshHomeData()
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
    await refreshHomeData()
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

function handlePrimary(appointment: Appointment) {
  if (appointment.status === 'pending') {
    void handleConfirm(appointment)
    return
  }
  handleComplete(appointment)
}

function openActions(appointment: Appointment) {
  actionsAppointment.value = appointment
  isActionsOpen.value = true
}

function handleEdit(appointment: Appointment) {
  editingAppointment.value = appointment
  isEditOpen.value = true
}

function handleEditOpenChange(open: boolean) {
  isEditOpen.value = open
  if (!open) editingAppointment.value = null
}

async function handleEditSaved() {
  isEditOpen.value = false
  editingAppointment.value = null
  await refreshHomeData()
}

function openPreview(appointment: Appointment) {
  preview.open({ appointment })
}

async function handleCheckoutConfirm(payload: CompleteSaleDto) {
  try {
    await completeSaleMutation.mutateAsync(payload)
    isCheckoutOpen.value = false
    checkoutAppointment.value = null
    await refreshHomeData()
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
  root: 'rounded-lg shadow-panel ring-0 divide-y-0 md:rounded-xl',
  header: 'pb-0',
}
const cardUI = {
  root: 'h-full rounded-md shadow-none md:rounded-lg',
}
</script>

<template>
  <UCard v-if="showWidget" :ui="hostUI">
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
      <div v-if="isMobile" class="overflow-hidden">
        <div class="flex gap-2">
          <USkeleton
            v-for="i in 2"
            :key="i"
            class="h-72 w-[92%] shrink-0 rounded-md md:rounded-lg"
          />
        </div>
      </div>

      <div v-else class="space-y-2">
        <div
          v-for="i in 3"
          :key="i"
          class="flex items-center gap-4 rounded-md border border-default bg-default p-4 md:rounded-lg"
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
      :ui="{ root: 'rounded-md border border-dashed border-default md:rounded-lg' }"
    />

    <UCarousel
      v-else-if="isMobile"
      v-slot="{ item: appt }"
      :items="mobileAppointments"
      align="start"
      auto-height
      wheel-gestures
      class="-mx-4 w-[calc(100%+2rem)] min-w-0 sm:-mx-6 sm:w-[calc(100%+3rem)]"
      :ui="{
        container: 'ms-0 items-start transition-[height] duration-200',
        item:
          mobileAppointments.length > 1
            ? 'flex basis-[92%] px-2 py-1'
            : 'flex basis-full px-2 py-1',
      }"
    >
      <MobileNextUpCard
        :appointment="appt"
        :client="getClient(appt) ?? null"
        :client-name="getClientName(appt)"
        :service-names="getServiceNames(appt)"
        :time-label="formatTime(appt.start_at)"
        :date-label="dateLabel(appt.start_at)"
        :duration-label="t('home.nextUp.minutesLabel', { n: appt.duration })"
        :price-label="formats.price(appt.price)"
        :attention-label="attentionLabel(appt)"
        :attention-tone="attentionTone(appt)"
        :primary-loading="appt.status === 'pending' && confirmingId === appt.id"
        @open="openPreview(appt)"
        @primary="handlePrimary(appt)"
        @more="openActions(appt)"
      />
    </UCarousel>

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
                color="success"
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

  <MobileNextUpActionsDrawer
    v-if="isMobile"
    v-model:open="isActionsOpen"
    :appointment="actionsAppointment"
    :client-name="actionsClientName"
    :time-label="actionsAppointment ? formatTime(actionsAppointment.start_at) : ''"
    :date-label="actionsAppointment ? dateLabel(actionsAppointment.start_at) : ''"
    :declining="decliningId === actionsAppointment?.id"
    :marking-no-show="markingNoShowId === actionsAppointment?.id"
    @edit="handleEdit"
    @decline="handleDecline"
    @no-show="handleNoShow"
  />

  <AppointmentFormDialog
    v-if="editingAppointment"
    :open="isEditOpen"
    :appointment="editingAppointment"
    :time-zone="masterPreferencesStore.timeZone"
    @update:open="handleEditOpenChange"
    @saved="handleEditSaved"
  />
</template>
