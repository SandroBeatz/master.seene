<script setup lang="ts">
import type { EventApi } from '@fullcalendar/core'
import { computed } from 'vue'
import { useFormats } from '@shared/lib/formats'
import type { CalendarAppointmentEventDetails } from '../model/calendar-events'

const props = defineProps<{
  event: EventApi
  timeText: string
  isMobile: boolean
}>()

const formats = useFormats()
const details = computed(() => props.event.extendedProps as CalendarAppointmentEventDetails)
const serviceNames = computed(() => details.value.serviceNames || '—')
const priceLabel = computed(() => {
  const price = details.value.appointment.price
  return price == null ? null : formats.price(price)
})
</script>

<template>
  <div
    class="flex h-full w-full flex-col gap-0.5 overflow-hidden text-left"
    :class="isMobile ? 'calendar-mobile-appointment-card px-2 py-1' : 'px-1.5 py-1'"
  >
    <template v-if="isMobile">
      <div class="flex min-w-0 items-center gap-1.5">
        <span class="shrink-0 text-[11px] font-semibold tabular-nums leading-tight">
          {{ timeText }}
        </span>
        <span
          class="calendar-mobile-appointment-tiny-summary min-w-0 flex-1 truncate text-[11px] leading-tight"
        >
          {{ details.clientName }} · {{ serviceNames }}
        </span>
        <div class="ml-auto flex shrink-0 items-center gap-0.5">
          <UIcon
            v-if="details.isOnline"
            name="i-lucide-globe"
            class="size-3 text-muted"
            :aria-label="$t('calendar.event.onlineHint')"
            :title="$t('calendar.event.onlineHint')"
          />
          <UIcon
            :name="details.statusIcon"
            class="size-3 shrink-0"
            :class="details.statusColorClass"
            :aria-label="$t(details.statusLabelKey)"
            :title="$t(details.statusLabelKey)"
          />
        </div>
      </div>

      <p class="calendar-mobile-appointment-summary min-w-0 truncate text-[11px] leading-tight">
        <span class="font-medium">{{ details.clientName }}</span>
        <span class="text-muted">
          · {{ serviceNames }}<template v-if="priceLabel"> · {{ priceLabel }}</template>
        </span>
      </p>

      <div class="calendar-mobile-appointment-details min-w-0">
        <span class="mt-0.5 block truncate text-xs font-medium leading-tight">
          {{ details.clientName }}
        </span>

        <ul v-if="details.isGroup" class="mt-1 space-y-0.5">
          <li
            v-for="(service, index) in details.serviceList"
            :key="index"
            class="flex items-center gap-1.5"
          >
            <span
              class="size-2 shrink-0 rounded-full"
              :style="{ backgroundColor: service.color }"
            />
            <span class="truncate text-[10px] leading-tight text-muted">{{ service.name }}</span>
          </li>
        </ul>
        <p
          v-if="details.isGroup && priceLabel"
          class="mt-1 text-[10px] font-medium leading-tight text-muted"
        >
          {{ priceLabel }}
        </p>
        <p
          v-else-if="!details.isGroup"
          class="mt-0.5 truncate text-[10px] leading-tight text-muted"
        >
          {{ serviceNames }}<template v-if="priceLabel"> · {{ priceLabel }}</template>
        </p>
      </div>
    </template>

    <template v-else>
      <div class="flex items-start justify-between gap-1">
        <span class="truncate text-[11px] font-semibold tabular-nums leading-tight">
          {{ timeText }}
        </span>
        <div class="mt-px flex shrink-0 items-center gap-0.5">
          <UIcon
            v-if="details.isOnline"
            name="i-lucide-globe"
            class="size-3 opacity-70"
            :aria-label="$t('calendar.event.onlineHint')"
            :title="$t('calendar.event.onlineHint')"
          />
          <UIcon
            :name="details.statusIcon"
            class="size-3 opacity-70"
            :aria-label="$t(details.statusLabelKey)"
            :title="$t(details.statusLabelKey)"
          />
        </div>
      </div>
      <span class="truncate text-[11px] font-medium leading-tight">{{ details.clientName }}</span>
      <ul class="space-y-px">
        <li
          v-for="(service, index) in details.serviceList"
          :key="index"
          class="flex items-center gap-1"
        >
          <span
            v-if="details.isGroup"
            class="size-1.5 shrink-0 rounded-full"
            :style="{ backgroundColor: service.color }"
          />
          <span class="truncate text-[10px] leading-tight opacity-80">{{ service.name }}</span>
        </li>
      </ul>
    </template>
  </div>
</template>
