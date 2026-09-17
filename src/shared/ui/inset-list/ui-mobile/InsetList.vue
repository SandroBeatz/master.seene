<script setup lang="ts">
import { useSlots } from 'vue'
import { IonList } from '@ionic/vue'

// Reusable iOS-style "inset grouped" list. The section header is rendered
// OUTSIDE the rounded card (small, muted) — the way native ion-list[inset]
// can't do, since ion-list-header lives inside the card. Wrap native
// <ion-item>s in the default slot; all card/surface/separator styling is
// self-contained here and driven off Ionic's own theme variables (so it
// tracks light/dark and the accent color automatically).
//
// Kept out of the shared/ui barrel (index.ts, which pulls Nuxt UI) — import via
// @shared/ui/inset-list/index.mobile in the Ionic build target only.
interface Props {
  // Section title shown above the card. Omit (and don't pass the `header` slot)
  // for a headerless group.
  header?: string
  // Keep the native section-header style while pinning it to the top of the
  // content viewport. The page-colored background prevents rows from showing
  // through as the group scrolls underneath it.
  stickyHeader?: boolean
  // Expand the list card to the content edges and remove its corner radius.
  // The default inset appearance remains unchanged for existing consumers.
  fullWidth?: boolean
}

withDefaults(defineProps<Props>(), { stickyHeader: false, fullWidth: false })

const slots = useSlots()
</script>

<template>
  <div class="se-inset-list" :class="{ 'se-inset-list--full-width': fullWidth }">
    <div
      v-if="header || slots.header"
      class="se-inset-list__header"
      :class="{ 'se-inset-list__header--sticky': stickyHeader }"
    >
      <slot name="header">{{ header }}</slot>
    </div>

    <ion-list class="se-inset-list__card" lines="full">
      <slot />
    </ion-list>
  </div>
</template>

<style scoped>
.se-inset-list {
  /* Design tokens — tweak radius/height/spacing here. Colors come from the
     global surface tokens (app-mobile/styles/main.css), which are themselves
     derived from Ionic's stepped color grid — so light/dark are handled
     upstream and nothing is hardcoded. `--ion-color-medium` is always defined
     by Ionic core and reads as the muted section-header gray. */
  --se-list-radius: 12px;
  --se-item-min-height: 48px;
  --se-list-inset-x: 16px;
  --se-group-gap: 22px;
  --se-list-surface: var(--se-surface-card, #fff);
  --se-list-separator: var(--se-separator, rgb(0 0 0 / 0.11));
  --se-list-header-color: var(--ion-color-medium, #8c8c8c);
  --se-list-header-size: 13px;
  --se-list-icon-size: 20px;
  --se-list-icon-gap: 12px;

  margin-block-end: var(--se-group-gap);
  padding-inline: var(--se-list-inset-x);
}

.se-inset-list:last-child {
  margin-block-end: 0;
}

.se-inset-list--full-width {
  --se-list-inset-x: 0px;
  --se-list-radius: 0px;
}

.se-inset-list__header {
  padding: 0 16px 7px;
  color: var(--se-list-header-color);
  font-size: var(--se-list-header-size);
  font-weight: 400;
  line-height: 1.3;
}

.se-inset-list__header--sticky {
  position: sticky;
  top: var(--se-sticky-header-top, 0px);
  z-index: 4;
  margin-inline: calc(var(--se-list-inset-x) * -1);
  padding-inline: calc(var(--se-list-inset-x) + 16px);
  background: var(--se-surface-page, #f2f2f7);
}

.se-inset-list__header--sticky::before {
  position: absolute;
  bottom: 100%;
  inset-inline: 0;
  height: var(--se-sticky-header-cover, 0px);
  background: var(--se-surface-page, #f2f2f7);
  content: '';
  pointer-events: none;
}

.se-inset-list__card {
  padding: 0;
  border-radius: var(--se-list-radius);
  background: var(--se-list-surface);
  overflow: hidden; /* clip item highlight/ripple to the rounded corners */
}

/* Slotted <ion-item>s belong to the parent scope, so reach them with :deep().
   Setting Ionic's custom properties from light DOM is the supported way to
   restyle without piercing the shadow root. */
.se-inset-list__card :deep(ion-item) {
  --background: transparent;
  --min-height: var(--se-item-min-height);
  --padding-start: 16px;
  --inner-padding-end: 16px;
  --border-color: var(--se-list-separator);
  --detail-icon-opacity: 0.3;
}

/* Leading icons: tame the default size and give a clear gap to the label. */
.se-inset-list__card :deep(ion-item ion-icon[slot='start']) {
  margin-inline: 0 var(--se-list-icon-gap);
  font-size: var(--se-list-icon-size);
}

/* Drop the trailing separator on the last row so the card reads as one card. */
.se-inset-list__card :deep(ion-item:last-of-type) {
  --border-width: 0;
  --inner-border-width: 0;
}
</style>
