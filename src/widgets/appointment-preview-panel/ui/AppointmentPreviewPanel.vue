<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { BadgeProps } from '@nuxt/ui'
import { getEffectiveAppointmentStatusView, type Appointment } from '@entities/appointment'
import type { Client } from '@entities/client'
import type { Service } from '@entities/service'
import type { TimeFormat } from '@entities/master'
import { getDateTimeInputValue } from '@shared/lib/time-zone'
import { useFormats } from '@shared/lib/formats'
import { useNowMinute } from '@shared/lib/now'
import type { Sale, SaleItem } from '@entities/sale'
import {
  APPOINTMENT_ACTION_CONFIG,
  type AppointmentAction,
  type AppointmentActionKey,
  type AppointmentTagKey,
} from '../config/action-config'
import { formatDurationChip } from '../lib/format-duration'

const props = defineProps<{
  appointment: Appointment
  client?: Client | null
  services?: Service[]
  timeZone: string
  timeFormat: TimeFormat
  loading?: boolean
  isNew?: boolean
  sale?: (Sale & { items: SaleItem[] }) | null
}>()

const emit = defineEmits<{
  edit: []
  cancel: []
  confirm: []
  complete: []
  decline: []
  no_show: []
  delete: []
  close: []
}>()

const { t } = useI18n()
const formats = useFormats()
const now = useNowMinute()

// Display status reflects the effective (time-derived) state; the action set
// stays keyed by the stored status (actions depend on the real state).
const statusView = computed(() => getEffectiveAppointmentStatusView(props.appointment, now.value))
const actions = computed(() => APPOINTMENT_ACTION_CONFIG[props.appointment.status])

const clientName = computed(() => {
  if (!props.client) return t('appointments.unknownClient')
  return [props.client.first_name, props.client.last_name].filter(Boolean).join(' ')
})

const initials = computed(() => {
  const parts = [props.client?.first_name, props.client?.last_name].filter(Boolean) as string[]
  if (!parts.length) return '?'
  return parts
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2)
})

const selectedServices = computed(() =>
  props.appointment.service_ids
    .map((id) => props.services?.find((service) => service.id === id))
    .filter((service): service is Service => Boolean(service)),
)

const startParts = computed(() => getDateTimeInputValue(props.appointment.start_at, props.timeZone))
const endParts = computed(() => {
  const end = new Date(
    new Date(props.appointment.start_at).getTime() + props.appointment.duration * 60_000,
  )
  return getDateTimeInputValue(end, props.timeZone)
})

const formattedDate = computed(() => {
  if (!startParts.value.date) return '—'
  const date = new Date(`${startParts.value.date}T00:00:00`)
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
})

const timeRange = computed(() => {
  const start = formats.time(startParts.value.time, props.timeFormat)
  const end = formats.time(endParts.value.time, props.timeFormat)
  return `${start} – ${end}`
})

const durationChip = computed(() => formatDurationChip(props.appointment.duration, t))

const total = computed(() => {
  if (props.appointment.price != null) return props.appointment.price
  return selectedServices.value.reduce((sum, service) => sum + (service.price ?? 0), 0)
})

const isActionable = computed(
  () => props.appointment.status === 'pending' || props.appointment.status === 'confirmed',
)
const hasRiskNote = computed(
  () => Boolean(props.appointment.notes) && /allerg|аллерг/i.test(props.appointment.notes ?? ''),
)

const phoneHref = computed(() => (props.client?.phone ? `tel:${props.client.phone}` : undefined))
const whatsappHref = computed(() => {
  const phone = props.client?.phone
  if (!phone) return undefined

  const normalized = phone.trim().startsWith('+')
    ? `+${phone.replace(/\D/g, '')}`
    : phone.replace(/\D/g, '')

  return normalized ? `https://wa.me/${normalized.replace(/^\+/, '')}` : undefined
})

const TAG_VIEW: Record<
  AppointmentTagKey,
  { icon: string; color: NonNullable<BadgeProps['color']>; labelKey: string }
> = {
  online_booking: {
    icon: 'i-lucide-globe',
    color: 'info',
    labelKey: 'appointments.preview.tags.onlineBooking',
  },
  new_client: {
    icon: 'i-lucide-sparkles',
    color: 'primary',
    labelKey: 'appointments.preview.tags.newClient',
  },
  paid: {
    icon: 'i-lucide-circle-check',
    color: 'success',
    labelKey: 'appointments.preview.tags.paid',
  },
}

function isTagVisible(tag: AppointmentTagKey): boolean {
  if (tag === 'online_booking') return props.appointment.source === 'online_booking'
  if (tag === 'new_client') return Boolean(props.isNew)
  return Boolean(props.sale)
}
const visibleTags = computed(() => actions.value.tags.filter(isTagVisible))

function tagLabel(tag: AppointmentTagKey): string {
  if (tag === 'paid') {
    return t(TAG_VIEW.paid.labelKey, { amount: formats.price(props.sale?.amount ?? 0) })
  }
  return t(TAG_VIEW[tag].labelKey)
}

const primary = computed(() => actions.value.primary)
const secondary = computed(() => actions.value.secondary)

const menuItems = computed(() => {
  const toItem = (action: AppointmentAction) => ({
    label: t(action.labelKey),
    icon: action.icon,
    color: action.key === 'delete' ? ('error' as const) : undefined,
    onSelect: () => runAction(action.key),
  })
  const regular = actions.value.menu.filter((action) => action.key !== 'delete').map(toItem)
  const danger = actions.value.menu.filter((action) => action.key === 'delete').map(toItem)
  return danger.length ? [regular, danger] : [regular]
})

function runAction(key: AppointmentActionKey) {
  switch (key) {
    case 'confirm':
      return emit('confirm')
    case 'decline':
      return emit('decline')
    case 'complete':
      return emit('complete')
    case 'cancel':
      return emit('cancel')
    case 'edit':
      return emit('edit')
    case 'no_show':
      return emit('no_show')
    case 'delete':
      return emit('delete')
  }
}
</script>

<template>
  <div class="flex h-full flex-col">
    <header class="flex items-center justify-between gap-2 border-b border-default p-3">
      <UButton
        color="neutral"
        variant="ghost"
        icon="i-lucide-x"
        size="sm"
        :aria-label="$t('common.close')"
        @click="emit('close')"
      />
      <UBadge :color="statusView.color" :icon="statusView.icon" variant="soft" size="lg">
        {{ $t(statusView.labelKey) }}
      </UBadge>
      <UDropdownMenu :items="menuItems" :ui="{ content: 'w-48' }">
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-more-horizontal"
          size="sm"
          :aria-label="$t('common.edit')"
        />
      </UDropdownMenu>
    </header>

    <div class="flex-1 overflow-y-auto">
      <div class="space-y-5 p-5">
        <div class="flex items-center gap-3">
          <UAvatar :text="initials" :alt="clientName" size="lg" />
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <p class="truncate text-lg font-semibold">{{ clientName }}</p>
              <UBadge v-if="isNew" color="primary" variant="soft" size="sm" class="shrink-0">
                {{ $t('appointments.preview.tags.newClient') }}
              </UBadge>
            </div>
            <p class="text-sm text-muted">
              {{ client?.phone || $t('appointments.preview.noPhone') }}
            </p>
          </div>
        </div>

        <div class="space-y-2 rounded-lg bg-primary/10 p-4">
          <div class="flex items-center gap-2 text-sm font-medium">
            <UIcon name="i-lucide-calendar" class="size-4 shrink-0 text-primary" />
            <span>{{ formattedDate }}</span>
          </div>
          <div class="flex items-center gap-2 text-sm font-medium">
            <UIcon name="i-lucide-clock" class="size-4 shrink-0 text-primary" />
            <span>{{ timeRange }}</span>
            <UBadge color="neutral" variant="soft" size="sm" class="ml-1">{{
              durationChip
            }}</UBadge>
          </div>
        </div>

        <div v-if="visibleTags.length" class="flex flex-wrap gap-2">
          <UBadge
            v-for="tag in visibleTags"
            :key="tag"
            :color="TAG_VIEW[tag].color"
            :icon="TAG_VIEW[tag].icon"
            variant="soft"
          >
            {{ tagLabel(tag) }}
          </UBadge>
        </div>

        <div
          v-if="isActionable && appointment.notes"
          class="rounded-lg p-3 text-sm"
          :class="hasRiskNote ? 'bg-warning/10' : 'bg-elevated'"
        >
          <div
            class="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase"
            :class="hasRiskNote ? 'text-warning' : 'text-muted'"
          >
            <UIcon v-if="hasRiskNote" name="i-lucide-triangle-alert" class="size-3.5 shrink-0" />
            {{
              hasRiskNote ? $t('appointments.preview.riskNote') : $t('appointments.preview.notes')
            }}
          </div>
          <p class="whitespace-pre-wrap">{{ appointment.notes }}</p>
        </div>

        <USeparator />

        <section class="space-y-3">
          <p class="text-xs font-semibold uppercase text-muted">
            {{ $t('appointments.preview.client') }}
          </p>
          <div class="space-y-2 text-sm">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-phone" class="size-4 shrink-0 text-muted" />
              <span>{{ client?.phone || $t('appointments.preview.noPhone') }}</span>
            </div>
            <div v-if="client?.email" class="flex items-center gap-2">
              <UIcon name="i-lucide-mail" class="size-4 shrink-0 text-muted" />
              <span>{{ client.email }}</span>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <UButton
              :href="phoneHref"
              :disabled="!phoneHref"
              color="neutral"
              variant="soft"
              leading-icon="i-lucide-phone"
              block
            >
              {{ $t('appointments.preview.callClient') }}
            </UButton>
            <UButton
              :href="whatsappHref"
              :disabled="!whatsappHref"
              target="_blank"
              rel="noopener"
              color="success"
              variant="soft"
              leading-icon="i-lucide-message-circle"
              block
            >
              {{ $t('appointments.preview.whatsappClient') }}
            </UButton>
          </div>
        </section>

        <USeparator />

        <section class="space-y-2">
          <p class="text-xs font-semibold uppercase text-muted">
            {{ $t('appointments.preview.services') }}
          </p>
          <div v-if="selectedServices.length">
            <div
              v-for="service in selectedServices"
              :key="service.id"
              class="flex items-center justify-between gap-3 border-b border-default py-2.5"
            >
              <div class="min-w-0">
                <p class="truncate text-sm font-medium">{{ service.name }}</p>
                <p class="text-xs text-muted">{{ formatDurationChip(service.duration, t) }}</p>
              </div>
              <span class="shrink-0 text-sm font-medium">{{ formats.price(service.price) }}</span>
            </div>
            <div class="flex items-center justify-between gap-3 pt-3">
              <span class="text-xs font-semibold uppercase text-muted">
                {{ $t('appointments.preview.total') }}
              </span>
              <span class="text-lg font-semibold">{{ formats.price(total) }}</span>
            </div>
          </div>
          <p v-else class="text-sm text-muted">{{ $t('appointments.preview.noServices') }}</p>
        </section>

        <template v-if="!isActionable && appointment.notes">
          <USeparator />
          <section class="space-y-2">
            <p class="text-xs font-semibold uppercase text-muted">
              {{ $t('appointments.preview.notes') }}
            </p>
            <p class="whitespace-pre-wrap text-sm">{{ appointment.notes }}</p>
          </section>
        </template>

        <template v-if="appointment.status === 'completed' && sale">
          <USeparator />
          <section class="space-y-3">
            <p class="text-xs font-semibold uppercase text-muted">
              {{ $t('checkout.paymentInfo') }}
            </p>
            <div class="grid grid-cols-2 gap-3">
              <div class="rounded-md bg-elevated p-3">
                <p class="text-xs text-muted">{{ $t('checkout.paidAmount') }}</p>
                <p class="mt-1 text-sm font-medium">{{ formats.price(sale.amount) }}</p>
              </div>
              <div class="rounded-md bg-elevated p-3">
                <p class="text-xs text-muted">{{ $t('checkout.paidVia') }}</p>
                <p class="mt-1 flex items-center gap-1.5 text-sm font-medium">
                  <span
                    v-if="sale.payment_type"
                    class="inline-block size-2 shrink-0 rounded-full"
                    :style="{ backgroundColor: sale.payment_type.color }"
                  />
                  {{ sale.payment_type?.name ?? '—' }}
                </p>
              </div>
            </div>
          </section>
        </template>
      </div>
    </div>

    <div v-if="primary || secondary" class="space-y-2 border-t border-default p-4">
      <UButton
        v-if="primary"
        :color="primary.color"
        :variant="primary.variant"
        :leading-icon="primary.icon"
        :loading="loading"
        size="lg"
        block
        @click="runAction(primary.key)"
      >
        {{ $t(primary.labelKey) }}
      </UButton>
      <UButton
        v-if="secondary"
        :color="secondary.color"
        :variant="secondary.variant"
        :leading-icon="secondary.icon"
        :loading="loading"
        block
        @click="runAction(secondary.key)"
      >
        {{ $t(secondary.labelKey) }}
      </UButton>
    </div>
  </div>
</template>
