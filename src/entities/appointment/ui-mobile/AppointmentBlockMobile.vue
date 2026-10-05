<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { IonIcon } from '@ionic/vue'
import type { EffectiveAppointmentStatus } from '../model/types'
import { getMobileAppointmentStatusIcon } from './status-icon'

export interface AppointmentBlockService {
  id: string
  name: string
  color: string
}

/**
 * - `full` — time range, client and services on separate lines (≥ 45 min).
 * - `compact` — start time + client, then services (short visits).
 * - `micro` — one line for slivers in a dense time grid (≈ 15 min).
 */
export type AppointmentBlockDensity = 'full' | 'compact' | 'micro'

// Timeline card for one appointment — the shared look of the home schedule and
// the calendar time grid: service-tinted fill, accent rail, status icon. The
// parent owns positioning and gestures; the card fills its box.
const props = withDefaults(
  defineProps<{
    clientName: string
    timeRange: string
    startLabel: string
    durationLabel: string
    serviceNames: string
    services: readonly AppointmentBlockService[]
    priceLabel: string | null
    accentColor: string | null
    status: EffectiveAppointmentStatus
    isGroup?: boolean
    density?: AppointmentBlockDensity
    active?: boolean
  }>(),
  { isGroup: false, density: 'full', active: false },
)

const { t } = useI18n()
const statusMeta = computed(() => getMobileAppointmentStatusIcon(props.status))
const statusLabel = computed(() => t(`appointments.status.${props.status}`))
</script>

<template>
  <div
    class="appointment-block"
    :class="[
      `appointment-block--${density}`,
      { 'appointment-block--group': isGroup, 'appointment-block--active': active },
    ]"
    :style="{ '--appointment-block-accent': accentColor || 'var(--se-separator)' }"
  >
    <span class="appointment-block__rail" aria-hidden="true" />

    <div v-if="density !== 'full'" class="appointment-block__compact-row">
      <strong>{{ startLabel }}</strong>
      <span>{{ clientName }}</span>
      <ion-icon
        :icon="statusMeta.icon"
        :color="statusMeta.color"
        :aria-label="statusLabel"
        :title="statusLabel"
      />
    </div>
    <p v-if="density === 'compact'" class="appointment-block__compact-meta">
      {{ serviceNames }}<template v-if="priceLabel"> · {{ priceLabel }}</template>
    </p>

    <template v-if="density === 'full'">
      <div class="appointment-block__time-row">
        <span>
          <strong>{{ timeRange }}</strong>
          <small>· {{ durationLabel }}</small>
        </span>
        <ion-icon
          :icon="statusMeta.icon"
          :color="statusMeta.color"
          :aria-label="statusLabel"
          :title="statusLabel"
        />
      </div>
      <p class="appointment-block__client">{{ clientName }}</p>

      <ul v-if="isGroup" class="appointment-block__services">
        <li v-for="service in services" :key="service.id">
          <span :style="{ backgroundColor: service.color }" aria-hidden="true" />
          <small>{{ service.name }}</small>
        </li>
      </ul>
      <p v-else class="appointment-block__meta">
        {{ serviceNames }}<template v-if="priceLabel"> · {{ priceLabel }}</template>
      </p>
      <p v-if="isGroup && priceLabel" class="appointment-block__meta">{{ priceLabel }}</p>
    </template>
  </div>
</template>

<style scoped>
.appointment-block {
  position: relative;
  display: flex;
  height: 100%;
  box-sizing: border-box;
  flex-direction: column;
  overflow: hidden;
  padding: 5px 10px 5px 12px;
  border-radius: 9px;
  background: var(--se-surface-card);
  background: color-mix(in srgb, var(--appointment-block-accent) 14%, var(--se-surface-card));
  color: var(--ion-text-color);
  text-align: start;
  transition:
    transform 160ms ease,
    box-shadow 160ms ease;
}

.appointment-block--group {
  border: 1px solid var(--se-separator);
  background: var(--se-surface-muted);
}

.appointment-block--micro {
  justify-content: center;
  padding-block: 0;
}

.appointment-block--active {
  transform: scale(1.025);
  box-shadow: 0 8px 24px rgb(0 0 0 / 18%);
}

.appointment-block p {
  margin: 0;
}

.appointment-block__rail {
  position: absolute;
  inset-block: 5px;
  inset-inline-start: 0;
  width: 4px;
  border-radius: 0 999px 999px 0;
  background: var(--appointment-block-accent);
}

.appointment-block--micro .appointment-block__rail {
  inset-block: 2px;
}

.appointment-block__compact-row,
.appointment-block__time-row {
  display: flex;
  align-items: center;
}

.appointment-block__compact-row {
  min-width: 0;
  align-items: flex-start;
  gap: 7px;
}

.appointment-block--micro .appointment-block__compact-row {
  align-items: center;
}

.appointment-block__compact-row strong,
.appointment-block__compact-row span {
  overflow: hidden;
  font-size: 0.7rem;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.appointment-block__compact-row strong {
  flex: 0 0 auto;
  font-variant-numeric: tabular-nums;
}

.appointment-block__compact-row span {
  min-width: 0;
}

.appointment-block__compact-row ion-icon {
  margin-inline-start: auto;
  flex: 0 0 auto;
  font-size: 14px;
}

.appointment-block__compact-meta {
  overflow: hidden;
  margin-top: 3px !important;
  color: var(--ion-color-medium);
  font-size: 0.64rem;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.appointment-block__time-row {
  justify-content: space-between;
  gap: 6px;
  font-size: 0.7rem;
  font-variant-numeric: tabular-nums;
  line-height: 1.15;
}

.appointment-block__time-row span {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 5px;
}

.appointment-block__time-row strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.appointment-block__time-row small {
  color: var(--ion-color-medium);
  font-size: 0.62rem;
  white-space: nowrap;
}

.appointment-block__time-row ion-icon {
  flex: 0 0 auto;
  font-size: 15px;
}

.appointment-block__client {
  overflow: hidden;
  margin-top: 3px !important;
  font-size: 0.75rem;
  font-weight: 650;
  line-height: 1.15;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.appointment-block__meta {
  overflow: hidden;
  margin-top: 2px !important;
  color: var(--ion-color-medium);
  font-size: 0.62rem;
  line-height: 1.15;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.appointment-block__services {
  display: grid;
  gap: 2px;
  margin: 4px 0 0;
  padding: 0;
  list-style: none;
}

.appointment-block__services li {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 6px;
}

.appointment-block__services li > span {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  flex: 0 0 auto;
}

.appointment-block__services small {
  overflow: hidden;
  color: var(--ion-color-medium);
  font-size: 0.6rem;
  line-height: 1.1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (prefers-reduced-motion: reduce) {
  .appointment-block {
    transition: none;
  }
}
</style>
