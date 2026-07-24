<script setup lang="ts">
import type { Appointment } from '@entities/appointment'

interface ServiceItem {
  name: string
  color: string
}

interface AppointmentBlock {
  appointment: Appointment
  clientName: string
  serviceList: ServiceItem[]
  serviceNames: string
  isGroup: boolean
  accentColor: string | null
  barColor: string
  statusIcon: string
  statusColorClass: string
  startLabel: string
  timeRange: string
  durationLabel: string
  priceLabel: string | null
  compact: boolean
  top: number
  height: number
}

defineProps<{
  block: AppointmentBlock
  left: number
}>()

const emit = defineEmits<{
  select: [appointment: Appointment]
}>()
</script>

<template>
  <div
    data-testid="appointment-block"
    class="appt-card absolute overflow-hidden rounded-sm pr-2.5 pl-3 text-left transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    :class="block.isGroup ? 'bg-elevated border border-default' : ''"
    :style="{
      top: block.top + 'px',
      height: block.height + 'px',
      left: left + 'px',
      right: '0px',
      paddingTop: '5px',
      paddingBottom: '5px',
      '--accent-bar': block.barColor,
      ...(block.isGroup || !block.accentColor ? {} : { backgroundColor: block.accentColor + '14' }),
    }"
    @click="emit('select', block.appointment)"
  >
    <span
      aria-hidden="true"
      class="absolute top-1/2 -translate-y-1/2 left-0 w-1 h-[calc(100%-10px)] rounded-sm"
      :style="{ background: 'var(--accent-bar, var(--ui-border))' }"
    />

    <div v-if="block.compact" class="flex items-center gap-1.5">
      <span class="shrink-0 text-[11px] leading-tight font-semibold tabular-nums">
        {{ block.startLabel }}
      </span>
      <span class="truncate text-[11px] leading-tight">{{ block.clientName }}</span>
      <UIcon
        :name="block.statusIcon"
        class="ml-auto size-3 shrink-0"
        :class="block.statusColorClass"
      />
    </div>

    <template v-else>
      <div class="flex items-center justify-between gap-1">
        <span class="flex min-w-0 items-center gap-1">
          <span class="text-[11px] leading-tight font-semibold tabular-nums">
            {{ block.timeRange }}
          </span>
          <span class="shrink-0 text-[10px] leading-tight tabular-nums text-muted">
            · {{ block.durationLabel }}
          </span>
        </span>
        <UIcon :name="block.statusIcon" class="size-3.5 shrink-0" :class="block.statusColorClass" />
      </div>
      <p class="mt-0.5 truncate text-xs leading-tight font-medium">{{ block.clientName }}</p>

      <ul v-if="block.isGroup" class="mt-1 space-y-0.5">
        <li
          v-for="(service, index) in block.serviceList"
          :key="index"
          class="flex items-center gap-1.5"
        >
          <span class="size-2 shrink-0 rounded-full" :style="{ backgroundColor: service.color }" />
          <span class="truncate text-[10px] leading-tight text-muted">{{ service.name }}</span>
        </li>
      </ul>
      <p
        v-if="block.isGroup && block.priceLabel"
        class="mt-1 text-[10px] leading-tight font-medium text-muted"
      >
        {{ block.priceLabel }}
      </p>

      <p v-else class="mt-0.5 truncate text-[10px] leading-tight text-muted">
        {{ block.serviceNames
        }}<template v-if="block.priceLabel"> · {{ block.priceLabel }}</template>
      </p>
    </template>
  </div>
</template>
