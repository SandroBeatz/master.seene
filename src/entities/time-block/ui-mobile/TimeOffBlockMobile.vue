<script setup lang="ts">
import { IonIcon } from '@ionic/vue'
import { banOutline } from 'ionicons/icons'

// Neutral timeline card for a timed break / time off — the companion of
// AppointmentBlockMobile. Fills the box the parent positions.
withDefaults(defineProps<{ timeRange: string; label: string; micro?: boolean }>(), {
  micro: false,
})
</script>

<template>
  <article class="time-off-block" :class="{ 'time-off-block--micro': micro }">
    <span class="time-off-block__rail" aria-hidden="true" />
    <div>
      <ion-icon :icon="banOutline" color="medium" aria-hidden="true" />
      <strong>{{ timeRange }}</strong>
      <span v-if="micro">{{ label }}</span>
    </div>
    <p v-if="!micro">{{ label }}</p>
  </article>
</template>

<style scoped>
.time-off-block {
  position: relative;
  height: 100%;
  box-sizing: border-box;
  overflow: hidden;
  padding: 7px 10px 5px 12px;
  border: 1px solid var(--se-separator);
  border-radius: 9px;
  background: var(--se-surface-muted);
  color: var(--ion-text-color);
}

.time-off-block--micro {
  display: flex;
  align-items: center;
  padding-block: 0;
}

.time-off-block__rail {
  position: absolute;
  inset-block: 5px;
  inset-inline-start: 0;
  width: 4px;
  border-radius: 0 999px 999px 0;
  background: var(--se-separator);
}

.time-off-block > div {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 5px;
}

.time-off-block ion-icon {
  flex: 0 0 auto;
  font-size: 13px;
}

.time-off-block strong {
  flex: 0 0 auto;
  font-size: 0.68rem;
  font-variant-numeric: tabular-nums;
}

.time-off-block span,
.time-off-block p {
  overflow: hidden;
  color: var(--ion-color-medium);
  font-size: 0.65rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.time-off-block p {
  margin: 4px 0 0;
}
</style>
