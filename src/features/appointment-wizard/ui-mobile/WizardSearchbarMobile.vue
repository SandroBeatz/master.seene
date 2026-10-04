<script setup lang="ts">
import { IonSearchbar } from '@ionic/vue'

// Search field pinned under a step header (client / services steps): a roomy
// rounded card on the page surface, aligned with the inset lists below.
// Deliberately not wrapped in `ion-toolbar` — a toolbar holding a searchbar
// drops its own vertical padding, and iOS adds side padding to the searchbar.
defineProps<{ placeholder: string }>()

const query = defineModel<string>({ required: true })
</script>

<template>
  <div class="wizard-searchbar">
    <ion-searchbar v-model="query" :placeholder="placeholder" :debounce="150" />
  </div>
</template>

<style scoped>
.wizard-searchbar {
  padding: 16px 16px 12px;
  background: var(--se-surface-page, var(--ion-background-color));
}

.wizard-searchbar ion-searchbar {
  --background: var(--se-surface-card, var(--ion-background-color));
  --border-radius: 14px;
  --box-shadow: 0 1px 4px rgb(0 0 0 / 7%);
  --icon-color: var(--ion-color-medium);
  --placeholder-color: var(--ion-color-medium);
  --placeholder-opacity: 1;

  min-height: 0;
  padding: 0;
  padding-inline: 0;
  font-size: 1rem;
}

.wizard-searchbar ion-searchbar :deep(.searchbar-input-container) {
  min-height: 48px;
}

.wizard-searchbar ion-searchbar :deep(.searchbar-input) {
  min-height: 48px;
  font-size: 1rem;
}

/* Material pins the icon 11px from the top — re-centre it in the taller field. */
.wizard-searchbar ion-searchbar.md :deep(.searchbar-search-icon) {
  top: calc((48px - 1.3125rem) / 2);
}

.ion-palette-dark .wizard-searchbar ion-searchbar {
  --box-shadow: none;
}
</style>
