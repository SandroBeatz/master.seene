<script setup lang="ts">
import type { Appointment } from '@entities/appointment'
import type { Client } from '@entities/client'
import type { Service } from '@entities/service'
import { useI18n } from 'vue-i18n'
import { computed } from 'vue'

const props = defineProps<{
  appointment: Appointment
  client: Client | undefined
  services: Service[]
  confirmLoading?: boolean
}>()

const emit = defineEmits<{
  confirm: [appointment: Appointment]
  complete: [appointment: Appointment]
}>()

const { t } = useI18n()

const clientName = computed(() => {
  if (!props.client) return t('appointments.unknownClient')
  return [props.client.first_name, props.client.last_name].filter(Boolean).join(' ')
})

const timeLabel = computed(() => {
  const date = new Date(props.appointment.start_at)
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
})

const serviceNames = computed(() =>
  props.services.length ? props.services.map((s) => s.name).join(', ') : '—',
)

const isPast = computed(() => new Date(props.appointment.start_at) < new Date())

const showConfirm = computed(
  () => props.appointment.status === 'pending',
)
</script>

<template>
  <div class="flex items-center justify-between gap-3 rounded-xl border border-default bg-default px-4 py-3">
    <div class="min-w-0">
      <p class="truncate text-sm font-medium">{{ clientName }}</p>
      <p class="mt-0.5 truncate text-xs text-muted">{{ timeLabel }} · {{ serviceNames }}</p>
    </div>
    <div class="flex shrink-0 gap-2">
      <UButton
        v-if="showConfirm && !isPast"
        size="sm"
        color="primary"
        variant="soft"
        :loading="confirmLoading"
        @click="emit('confirm', appointment)"
      >
        {{ t('home.actionAppointments.confirm') }}
      </UButton>
      <UButton
        size="sm"
        color="success"
        variant="soft"
        leading-icon="i-lucide-badge-check"
        @click="emit('complete', appointment)"
      >
        {{ t('home.actionAppointments.complete') }}
      </UButton>
    </div>
  </div>
</template>
