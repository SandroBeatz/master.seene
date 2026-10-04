<script setup lang="ts">
import { IonSearchbar, IonToolbar } from '@ionic/vue'

// Search field pinned under a step header (client / services steps): a roomy
// rounded card on the page surface, aligned with the inset lists below.
defineProps<{ placeholder: string }>()

const query = defineModel<string>({ required: true })
</script>

<template>
  <ion-toolbar class="wizard-searchbar">
    <ion-searchbar v-model="query" :placeholder="placeholder" :debounce="150" />
  </ion-toolbar>
</template>

<style scoped>
.wizard-searchbar {
  --background: var(--se-surface-page, var(--ion-background-color));
  --padding-start: 16px;
  --padding-end: 16px;
  --padding-top: 20px;
  --padding-bottom: 8px;
}

.wizard-searchbar ion-searchbar {
  --background: var(--se-surface-card, var(--ion-background-color));
  --border-radius: 14px;
  --box-shadow: 0 1px 4px rgb(0 0 0 / 7%);
  --icon-color: var(--ion-color-medium);
  --placeholder-color: var(--ion-color-medium);
  --placeholder-opacity: 1;

  padding: 0;
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
