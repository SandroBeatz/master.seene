<script setup lang="ts" generic="T extends string | number">
import { computed } from 'vue'
import { IonIcon } from '@ionic/vue'
import type { SegmentedControlItem } from '../model/types'

// Compact segmented control with a sliding thumb. Hand-rolled instead of
// ion-segment because Ionic renders that one completely differently per mode
// (iOS pill vs Material underline tabs) — this looks the same on both. Segments
// are equal-width, so the thumb position is just the selected index.
const props = defineProps<{
  items: readonly SegmentedControlItem<T>[]
  ariaLabel?: string
}>()

const model = defineModel<T>({ required: true })

const selectedIndex = computed(() =>
  Math.max(
    props.items.findIndex((item) => item.value === model.value),
    0,
  ),
)

const thumbStyle = computed(() => ({
  width: `calc((100% - 2 * var(--se-segment-pad)) / ${props.items.length})`,
  transform: `translateX(${selectedIndex.value * 100}%)`,
}))
</script>

<template>
  <div class="se-segmented" role="radiogroup" :aria-label="ariaLabel">
    <span class="se-segmented__thumb" :style="thumbStyle" aria-hidden="true" />
    <button
      v-for="item in items"
      :key="String(item.value)"
      type="button"
      role="radio"
      class="se-segmented__item"
      :class="{ 'se-segmented__item--active': item.value === model }"
      :aria-checked="item.value === model"
      :aria-label="item.ariaLabel"
      @click="model = item.value"
    >
      <ion-icon v-if="item.icon" :icon="item.icon" aria-hidden="true" />
      <span v-if="item.label">{{ item.label }}</span>
    </button>
  </div>
</template>

<style scoped>
.se-segmented {
  /* Design tokens — sizing here, colors from the global surface tokens. */
  --se-segment-height: 32px;
  --se-segment-pad: 2px;
  --se-segment-radius: 9px;
  --se-segment-min-width: 40px;
  --se-segment-track: var(--se-surface-muted, var(--ion-background-color-step-50));
  --se-segment-thumb: var(--se-surface-card, var(--ion-background-color));
  --se-segment-color: var(--ion-color-medium);
  --se-segment-color-active: var(--ion-color-primary);

  position: relative;
  display: inline-flex;
  height: var(--se-segment-height);
  padding: var(--se-segment-pad);
  border-radius: var(--se-segment-radius);
  background: var(--se-segment-track);
  isolation: isolate;
}

/* In dark the card is a lighter step than the track only barely — lift the
   thumb one more step so it still reads as raised. */
.ion-palette-dark .se-segmented {
  --se-segment-thumb: var(--ion-background-color-step-250);
}

.se-segmented__thumb {
  position: absolute;
  top: var(--se-segment-pad);
  bottom: var(--se-segment-pad);
  left: var(--se-segment-pad);
  z-index: -1;
  border-radius: calc(var(--se-segment-radius) - var(--se-segment-pad));
  background: var(--se-segment-thumb);
  box-shadow:
    0 1px 3px rgb(0 0 0 / 0.12),
    0 1px 1px rgb(0 0 0 / 0.04);
  transition: transform 0.25s cubic-bezier(0.3, 0.7, 0.2, 1);
}

.se-segmented__item {
  display: inline-flex;
  flex: 1 1 0;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: var(--se-segment-min-width);
  padding: 0 10px;
  border: 0;
  border-radius: calc(var(--se-segment-radius) - var(--se-segment-pad));
  background: transparent;
  color: var(--se-segment-color);
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  transition: color 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.se-segmented__item--active {
  color: var(--se-segment-color-active);
  font-weight: 600;
}

.se-segmented__item ion-icon {
  font-size: 17px;
}

.se-segmented__item:focus-visible {
  outline: 2px solid var(--ion-color-primary);
  outline-offset: 1px;
}
</style>
