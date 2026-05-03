<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { APPOINTMENT_STATUS_VIEW, type Appointment } from '@entities/appointment'
import type { Client } from '@entities/client'
import type { Service } from '@entities/service'
import type { TimeFormat } from '@entities/master'
import { getDateTimeInputValue } from '@shared/lib/time-zone'
import { useFormats } from '@shared/lib/formats'

const props = defineProps<{
  appointment: Appointment
  client?: Client | null
  services?: Service[]
  timeZone: string
  timeFormat: TimeFormat
  loading?: boolean
}>()

const emit = defineEmits<{
  edit: []
  cancel: []
  confirm: []
  complete: []
}>()

const { t } = useI18n()
const formats = useFormats()
const statusView = computed(() => APPOINTMENT_STATUS_VIEW[props.appointment.status])

const clientName = computed(() => {
  if (!props.client) return t('appointments.unknownClient')
  return [props.client.first_name, props.client.last_name].filter(Boolean).join(' ')
})

const selectedServices = computed(() =>
  props.appointment.service_ids
    .map((id) => props.services?.find((service) => service.id === id))
    .filter((service): service is Service => Boolean(service)),
)

const appointmentDateTime = computed(() => {
  const value = getDateTimeInputValue(props.appointment.start_at, props.timeZone)
  if (!value.date || !value.time) return '—'

  const date = new Date(`${value.date}T00:00:00`)
  const formattedDate = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'full',
  }).format(date)

  return `${formattedDate}, ${formats.time(value.time, props.timeFormat)}`
})

const formattedDuration = computed(() =>
  t('appointments.preview.durationValue', { n: props.appointment.duration }),
)

const formattedPrice = computed(() => formats.price(props.appointment.price))
const phoneHref = computed(() => (props.client?.phone ? `tel:${props.client.phone}` : undefined))
const whatsappHref = computed(() => {
  const phone = props.client?.phone
  if (!phone) return undefined

  const normalized = phone.trim().startsWith('+')
    ? `+${phone.replace(/\D/g, '')}`
    : phone.replace(/\D/g, '')

  return normalized ? `https://wa.me/${normalized.replace(/^\+/, '')}` : undefined
})

const nextStatusAction = computed<'confirm' | 'complete' | null>(() => {
  if (props.appointment.status === 'pending') return 'confirm'
  if (props.appointment.status === 'confirmed') return 'complete'
  return null
})
</script>

<template>
  <div class="flex h-full flex-col">
    <div class="flex-1 overflow-y-auto p-5">
      <div class="mb-5 flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="text-xl font-semibold">{{ clientName }}</p>
          <p class="mt-1 text-sm text-muted">{{ appointmentDateTime }}</p>
        </div>
        <UBadge
          :color="statusView.color"
          :icon="statusView.icon"
          variant="soft"
          class="shrink-0"
        >
          {{ $t(`appointments.status.${appointment.status}`) }}
        </UBadge>
      </div>

      <div class="grid gap-4">
        <section class="space-y-3">
          <div class="flex items-center justify-between gap-3">
            <p class="text-xs font-semibold uppercase text-muted">
              {{ $t('appointments.preview.client') }}
            </p>
            <UButton
              size="sm"
              color="neutral"
              variant="ghost"
              leading-icon="i-lucide-pencil"
              @click="emit('edit')"
            >
              {{ $t('common.edit') }}
            </UButton>
          </div>

          <div class="space-y-2 text-sm">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-phone" class="shrink-0 text-muted" />
              <span>{{ client?.phone || $t('appointments.preview.noPhone') }}</span>
            </div>
            <div v-if="client?.email" class="flex items-center gap-2">
              <UIcon name="i-lucide-mail" class="shrink-0 text-muted" />
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

        <section class="space-y-3">
          <p class="text-xs font-semibold uppercase text-muted">
            {{ $t('appointments.preview.services') }}
          </p>
          <div v-if="selectedServices.length" class="space-y-2">
            <div
              v-for="service in selectedServices"
              :key="service.id"
              class="flex items-center justify-between gap-3 rounded-md border border-default p-3"
            >
              <div class="min-w-0">
                <p class="truncate text-sm font-medium">{{ service.name }}</p>
                <p class="text-xs text-muted">
                  {{ $t('appointments.preview.durationValue', { n: service.duration }) }}
                </p>
              </div>
              <span class="shrink-0 text-sm font-medium">{{ formats.price(service.price) }}</span>
            </div>
          </div>
          <p v-else class="text-sm text-muted">{{ $t('appointments.preview.noServices') }}</p>
        </section>

        <USeparator />

        <section class="grid grid-cols-2 gap-3">
          <div class="rounded-md bg-elevated p-3">
            <p class="text-xs text-muted">{{ $t('appointments.preview.duration') }}</p>
            <p class="mt-1 text-sm font-medium">{{ formattedDuration }}</p>
          </div>
          <div class="rounded-md bg-elevated p-3">
            <p class="text-xs text-muted">{{ $t('appointments.preview.price') }}</p>
            <p class="mt-1 text-sm font-medium">{{ formattedPrice }}</p>
          </div>
        </section>

        <section v-if="appointment.notes" class="space-y-2">
          <p class="text-xs font-semibold uppercase text-muted">
            {{ $t('appointments.preview.notes') }}
          </p>
          <p class="whitespace-pre-wrap text-sm">{{ appointment.notes }}</p>
        </section>
      </div>
    </div>

    <div class="border-t border-default p-4">
      <div class="grid grid-cols-2 gap-2">
        <UButton
          color="error"
          variant="outline"
          leading-icon="i-lucide-x-circle"
          :loading="loading"
          :disabled="appointment.status === 'cancelled'"
          block
          @click="emit('cancel')"
        >
          {{ $t('appointments.preview.cancelAppointment') }}
        </UButton>
        <UButton
          v-if="nextStatusAction === 'confirm'"
          color="primary"
          leading-icon="i-lucide-check-circle"
          :loading="loading"
          block
          @click="emit('confirm')"
        >
          {{ $t('appointments.preview.confirmAppointment') }}
        </UButton>
        <UButton
          v-else-if="nextStatusAction === 'complete'"
          color="success"
          leading-icon="i-lucide-badge-check"
          :loading="loading"
          block
          @click="emit('complete')"
        >
          {{ $t('appointments.preview.completeAppointment') }}
        </UButton>
        <UButton v-else color="neutral" variant="soft" disabled block>
          {{ $t('appointments.preview.noNextAction') }}
        </UButton>
      </div>
    </div>
  </div>
</template>
