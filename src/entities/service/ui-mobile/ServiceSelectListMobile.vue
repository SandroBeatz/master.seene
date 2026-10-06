<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { IonIcon, IonItem, IonLabel } from '@ionic/vue'
import { checkmarkCircle, cutOutline, ellipseOutline } from 'ionicons/icons'
import { useFormats } from '@shared/lib/formats'
import { InsetList } from '@shared/ui/inset-list/index.mobile'
import type { Service } from '../model/types'

// Multi-select service rows (color, category, duration · price, check). The
// host owns filtering (see useServiceSelectFilter) and the selection state.
const props = defineProps<{
  services: Service[]
  selectedIds: string[]
  /** Whether the catalog is empty at all (vs. nothing matching the filter). */
  isCatalogEmpty: boolean
}>()

const emit = defineEmits<{
  toggle: [service: Service]
}>()

const { t } = useI18n()
const formats = useFormats()

function isSelected(serviceId: string): boolean {
  return props.selectedIds.includes(serviceId)
}
</script>

<template>
  <inset-list v-if="services.length" data-testid="service-picker-list">
    <ion-item
      v-for="service in services"
      :key="service.id"
      button
      :detail="false"
      class="service-select-list__item"
      :class="{ 'service-select-list__item--selected': isSelected(service.id) }"
      :aria-pressed="isSelected(service.id)"
      :disabled="!service.is_active && !isSelected(service.id)"
      :data-testid="`service-picker-item-${service.id}`"
      @click="emit('toggle', service)"
    >
      <span
        slot="start"
        class="service-select-list__color"
        :style="{ backgroundColor: service.color }"
        aria-hidden="true"
      />
      <ion-label>
        <p v-if="service.category?.name" class="service-select-list__category">
          {{ service.category.name }}
        </p>
        <h2>{{ service.name }}</h2>
        <p class="service-select-list__meta">
          {{ formats.duration(service.duration) }} · {{ formats.price(service.price) }}
        </p>
      </ion-label>
      <ion-icon
        slot="end"
        :icon="isSelected(service.id) ? checkmarkCircle : ellipseOutline"
        :color="isSelected(service.id) ? 'primary' : 'medium'"
        aria-hidden="true"
      />
    </ion-item>
  </inset-list>

  <div v-else class="service-select-list__empty">
    <ion-icon :icon="cutOutline" color="medium" aria-hidden="true" />
    <h2>
      {{ isCatalogEmpty ? t('services.picker.empty') : t('services.picker.noResults') }}
    </h2>
  </div>
</template>

<style scoped>
.service-select-list__item {
  --min-height: 70px;
  --padding-top: 7px;
  --padding-bottom: 7px;
}

.service-select-list__item--selected {
  --background: rgba(var(--ion-color-primary-rgb), 0.1);
}

.service-select-list__color {
  width: 12px;
  height: 12px;
  margin-inline-end: 14px;
  border-radius: 50%;
  flex-shrink: 0;
}

.service-select-list__item ion-label h2,
.service-select-list__item ion-label p {
  overflow: hidden;
  margin: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.service-select-list__category {
  color: var(--ion-color-medium);
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.035em;
  text-transform: uppercase;
}

.service-select-list__item ion-label h2 {
  margin-top: 2px;
  font-size: 0.95rem;
  font-weight: 600;
}

.service-select-list__meta {
  margin-top: 3px !important;
  color: var(--ion-color-medium);
  font-size: 0.78rem;
  font-variant-numeric: tabular-nums;
}

.service-select-list__item > ion-icon[slot='end'] {
  font-size: 22px;
}

.service-select-list__empty {
  display: grid;
  min-height: 50vh;
  align-content: center;
  justify-items: center;
  gap: 8px;
  padding: 24px;
  text-align: center;
}

.service-select-list__empty > ion-icon {
  font-size: 2.5rem;
}

.service-select-list__empty h2 {
  margin: 0;
  font-size: 1.05rem;
}
</style>
