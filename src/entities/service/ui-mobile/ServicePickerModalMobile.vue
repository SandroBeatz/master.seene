<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonModal,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
} from '@ionic/vue'
import { checkmarkCircle, closeOutline, cutOutline, ellipseOutline } from 'ionicons/icons'
import { useFormats } from '@shared/lib/formats'
import { InsetList } from '@shared/ui/inset-list/index.mobile'
import type { Service, ServiceCategory } from '../model/types'

const ALL_CATEGORIES = 'all'

const props = defineProps<{
  isOpen: boolean
  services: Service[]
  modelValue: string[]
  presentingElement?: HTMLElement | null
}>()

const emit = defineEmits<{
  'update:isOpen': [value: boolean]
  'update:modelValue': [value: string[]]
  select: [services: Service[]]
}>()

const { t } = useI18n()
const formats = useFormats()
const query = ref('')
const activeCategory = ref(ALL_CATEGORIES)
const draftIds = ref<string[]>([])

const availableServices = computed(() =>
  props.services.filter((service) => service.is_active || props.modelValue.includes(service.id)),
)

const categories = computed(() => {
  const uniqueCategories = new Map<string, ServiceCategory>()
  for (const service of availableServices.value) {
    if (service.category) uniqueCategories.set(service.category.id, service.category)
  }
  return [...uniqueCategories.values()].sort((first, second) =>
    first.name.localeCompare(second.name, undefined, { sensitivity: 'base' }),
  )
})

const categoryChips = computed(() => [
  {
    id: ALL_CATEGORIES,
    label: t('services.filterAll'),
    count: availableServices.value.length,
  },
  ...categories.value.map((category) => ({
    id: category.id,
    label: category.name,
    count: availableServices.value.filter((service) => service.category_id === category.id).length,
  })),
])

const filteredServices = computed(() => {
  const search = query.value.trim().toLocaleLowerCase()
  return availableServices.value.filter((service) => {
    const matchesCategory =
      activeCategory.value === ALL_CATEGORIES || service.category_id === activeCategory.value
    const matchesSearch =
      !search ||
      `${service.name} ${service.category?.name ?? ''}`.toLocaleLowerCase().includes(search)
    return matchesCategory && matchesSearch
  })
})

const serviceById = computed(
  () => new Map(props.services.map((service) => [service.id, service] as const)),
)
const selectedServices = computed(() =>
  draftIds.value
    .map((id) => serviceById.value.get(id))
    .filter((service): service is Service => Boolean(service)),
)
const selectedDuration = computed(() =>
  selectedServices.value.reduce((total, service) => total + service.duration, 0),
)
const selectedPrice = computed(() =>
  selectedServices.value.reduce((total, service) => total + service.price, 0),
)

watch(
  () => props.isOpen,
  (open) => {
    if (!open) return
    draftIds.value = [...props.modelValue]
    query.value = ''
    activeCategory.value = ALL_CATEGORIES
  },
  { immediate: true },
)

watch(categoryChips, (chips) => {
  if (!chips.some((chip) => chip.id === activeCategory.value)) {
    activeCategory.value = ALL_CATEGORIES
  }
})

function isSelected(serviceId: string): boolean {
  return draftIds.value.includes(serviceId)
}

function toggle(service: Service) {
  if (!service.is_active && !isSelected(service.id)) return
  draftIds.value = isSelected(service.id)
    ? draftIds.value.filter((id) => id !== service.id)
    : [...draftIds.value, service.id]
}

function close() {
  emit('update:isOpen', false)
}

function confirm() {
  if (!selectedServices.value.length) return
  const ids = selectedServices.value.map((service) => service.id)
  emit('update:modelValue', ids)
  emit('select', selectedServices.value)
  close()
}
</script>

<template>
  <ion-modal
    :is-open="isOpen"
    class="service-picker-modal"
    :presenting-element="presentingElement ?? undefined"
    @did-dismiss="close"
  >
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button fill="clear" color="dark" :aria-label="t('common.close')" @click="close">
            <ion-icon slot="icon-only" :icon="closeOutline" aria-hidden="true" />
          </ion-button>
        </ion-buttons>
        <ion-title>{{ t('services.picker.title') }}</ion-title>
      </ion-toolbar>

      <ion-toolbar>
        <ion-searchbar
          v-model="query"
          :placeholder="t('services.picker.searchPlaceholder')"
          :debounce="150"
          autofocus
        />
      </ion-toolbar>

      <ion-toolbar v-if="categoryChips.length > 1" class="service-picker-modal__filters-toolbar">
        <div class="service-picker-modal__filters">
          <ion-segment v-model="activeCategory" scrollable :aria-label="t('services.filterLabel')">
            <ion-segment-button
              v-for="category in categoryChips"
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
      </ion-toolbar>
    </ion-header>

    <ion-content class="service-picker-modal__content ion-padding-vertical">
      <inset-list v-if="filteredServices.length" data-testid="service-picker-list">
        <ion-item
          v-for="service in filteredServices"
          :key="service.id"
          button
          :detail="false"
          class="service-picker-modal__item"
          :class="{ 'service-picker-modal__item--selected': isSelected(service.id) }"
          :aria-pressed="isSelected(service.id)"
          :disabled="!service.is_active && !isSelected(service.id)"
          :data-testid="`service-picker-item-${service.id}`"
          @click="toggle(service)"
        >
          <span
            slot="start"
            class="service-picker-modal__color"
            :style="{ backgroundColor: service.color }"
            aria-hidden="true"
          />
          <ion-label>
            <p v-if="service.category?.name" class="service-picker-modal__category">
              {{ service.category.name }}
            </p>
            <h2>{{ service.name }}</h2>
            <p class="service-picker-modal__meta">
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

      <div v-else class="service-picker-modal__empty">
        <ion-icon :icon="cutOutline" color="medium" aria-hidden="true" />
        <h2>
          {{ services.length ? t('services.picker.noResults') : t('services.picker.empty') }}
        </h2>
      </div>
    </ion-content>

    <ion-footer class="service-picker-modal__footer ion-no-border">
      <ion-toolbar>
        <div class="service-picker-modal__footer-row">
          <div class="service-picker-modal__summary">
            <span>{{
              t('services.picker.selectedCount', { count: selectedServices.length })
            }}</span>
            <strong>
              {{ formats.duration(selectedDuration) }} · {{ formats.price(selectedPrice) }}
            </strong>
          </div>
          <ion-button :disabled="!selectedServices.length" @click="confirm">
            {{ t('common.done') }}
          </ion-button>
        </div>
      </ion-toolbar>
    </ion-footer>
  </ion-modal>
</template>

<style scoped>
.service-picker-modal ion-toolbar,
.service-picker-modal__content {
  --background: var(--se-surface-page, var(--ion-background-color));
}

.service-picker-modal ion-searchbar {
  padding-block: 0 8px;
}

.service-picker-modal__filters-toolbar {
  --min-height: 44px;
}

.service-picker-modal__filters {
  overflow-x: auto;
  padding: 0 16px 8px;
  scrollbar-width: none;
}

.service-picker-modal__filters::-webkit-scrollbar {
  display: none;
}

.service-picker-modal__filters ion-segment {
  width: max-content;
  min-width: 100%;
}

.service-picker-modal__filters ion-segment-button {
  min-width: auto;
  min-height: 34px;
  --padding-start: 14px;
  --padding-end: 14px;
}

.service-picker-modal__filters ion-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
}

.service-picker-modal__filters small {
  font-size: 0.68rem;
  font-weight: 700;
  opacity: 0.7;
}

.service-picker-modal__item {
  --min-height: 70px;
  --padding-top: 7px;
  --padding-bottom: 7px;
}

.service-picker-modal__item--selected {
  --background: rgba(var(--ion-color-primary-rgb), 0.1);
}

.service-picker-modal__color {
  width: 12px;
  height: 12px;
  margin-inline-end: 14px;
  border-radius: 50%;
  flex-shrink: 0;
}

.service-picker-modal__item ion-label h2,
.service-picker-modal__item ion-label p {
  overflow: hidden;
  margin: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.service-picker-modal__category {
  color: var(--ion-color-medium);
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.035em;
  text-transform: uppercase;
}

.service-picker-modal__item ion-label h2 {
  margin-top: 2px;
  font-size: 0.95rem;
  font-weight: 600;
}

.service-picker-modal__meta {
  margin-top: 3px !important;
  color: var(--ion-color-medium);
  font-size: 0.78rem;
  font-variant-numeric: tabular-nums;
}

.service-picker-modal__item > ion-icon[slot='end'] {
  font-size: 22px;
}

.service-picker-modal__empty {
  display: grid;
  min-height: 50vh;
  align-content: center;
  justify-items: center;
  gap: 8px;
  padding: 24px;
  text-align: center;
}

.service-picker-modal__empty > ion-icon {
  font-size: 2.5rem;
}

.service-picker-modal__empty h2 {
  margin: 0;
  font-size: 1.05rem;
}

.service-picker-modal__footer ion-toolbar {
  --background: var(--se-surface-card, var(--ion-background-color));
  --padding-start: 16px;
  --padding-end: 16px;
  --padding-top: 10px;
  --padding-bottom: calc(8px + var(--safe-area-bottom, 0px));
}

.service-picker-modal__footer-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.service-picker-modal__summary {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
  font-size: 0.82rem;
}

.service-picker-modal__summary span {
  color: var(--ion-color-medium);
}

.service-picker-modal__summary strong {
  font-variant-numeric: tabular-nums;
}

.service-picker-modal__footer ion-button {
  flex: 0 0 auto;
  margin: 0;
  text-transform: none;
}
</style>
