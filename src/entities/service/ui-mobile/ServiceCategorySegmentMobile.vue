<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { IonLabel, IonSegment, IonSegmentButton } from '@ionic/vue'
import type { ServiceCategoryChip } from '../model/use-service-select-filter'

// Horizontally scrollable category filter for service lists. Place inside an
// `ion-toolbar` under the search bar.
defineProps<{
  chips: ServiceCategoryChip[]
}>()

const model = defineModel<string>({ required: true })

const { t } = useI18n()
</script>

<template>
  <div class="service-category-segment">
    <ion-segment v-model="model" scrollable :aria-label="t('services.filterLabel')">
      <ion-segment-button
        v-for="category in chips"
        :key="category.id"
        :value="category.id"
        :data-testid="`service-picker-category-${category.id}`"
      >
        <ion-label>
          <span>{{ category.label }}</span>
          <small>{{ category.count }}</small>
        </ion-label>
      </ion-segment-button>
    </ion-segment>
  </div>
</template>

<style scoped>
.service-category-segment {
  overflow-x: auto;
  padding: 0 16px 8px;
  scrollbar-width: none;
}

.service-category-segment::-webkit-scrollbar {
  display: none;
}

.service-category-segment ion-segment {
  width: max-content;
  min-width: 100%;
}

.service-category-segment ion-segment-button {
  min-width: auto;
  min-height: 34px;
  --padding-start: 14px;
  --padding-end: 14px;
}

.service-category-segment ion-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
}

.service-category-segment small {
  font-size: 0.68rem;
  font-weight: 700;
  opacity: 0.7;
}
</style>
