<script setup lang="ts">
import type { Appointment } from '@entities/appointment'
import type { Client } from '@entities/client'
import type { Service } from '@entities/service'
import { useI18n } from 'vue-i18n'
import { computed } from 'vue'

const props = defineProps<{
  appointments: Appointment[]
  clients: Client[]
  services: Service[]
  loading: boolean
}>()

const { t } = useI18n()

interface TimelineItem {
  appointment: Appointment
  time: string
  clientName: string
  serviceNames: string
}

const items = computed<TimelineItem[]>(() =>
  props.appointments
    .filter((a) => ['pending', 'confirmed', 'completed'].includes(a.status))
    .map((a) => {
      const client = props.clients.find((c) => c.id === a.client_id)
      const clientName = client
        ? [client.first_name, client.last_name].filter(Boolean).join(' ')
        : t('appointments.unknownClient')
      const svcList = a.service_ids
        .map((id) => props.services.find((s) => s.id === id)?.name)
        .filter(Boolean)
        .join(', ')
      const time = new Intl.DateTimeFormat(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(new Date(a.start_at))
      return { appointment: a, time, clientName, serviceNames: svcList || '—' }
    }),
)
</script>

<template>
  <div class="space-y-2">
    <div v-if="loading" class="space-y-2">
      <div v-for="i in 3" :key="i" class="h-12 w-full animate-pulse rounded-xl bg-elevated" />
    </div>

    <div
      v-else-if="!items.length"
      class="flex items-center justify-center gap-2 rounded-xl border border-dashed border-default px-4 py-6"
    >
      <UIcon name="i-lucide-calendar-x" class="size-5 text-muted" />
      <p class="text-sm text-muted">{{ t('home.upcoming.empty') }}</p>
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="item in items"
        :key="item.appointment.id"
        class="flex items-center gap-3 rounded-xl border border-default bg-default px-4 py-3"
      >
        <span class="shrink-0 text-sm font-semibold tabular-nums text-primary">{{ item.time }}</span>
        <div class="min-w-0">
          <p class="truncate text-sm font-medium">{{ item.clientName }}</p>
          <p class="truncate text-xs text-muted">{{ item.serviceNames }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
