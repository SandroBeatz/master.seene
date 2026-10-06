<script setup lang="ts">
import { computed, ref, toRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonModal,
  IonSearchbar,
  IonTitle,
  IonToolbar,
} from '@ionic/vue'
import { closeOutline } from 'ionicons/icons'
import { useFormats } from '@shared/lib/formats'
import type { Service } from '../model/types'
import { useServiceSelectFilter } from '../model/use-service-select-filter'
import ServiceCategorySegmentMobile from './ServiceCategorySegmentMobile.vue'
import ServiceSelectListMobile from './ServiceSelectListMobile.vue'

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
const draftIds = ref<string[]>([])

const { query, activeCategory, categoryChips, filteredServices, reset } = useServiceSelectFilter(
  toRef(props, 'services'),
  toRef(props, 'modelValue'),
  computed(() => t('services.filterAll')),
)

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
    reset()
  },
  { immediate: true },
)

function toggle(service: Service) {
  const selected = draftIds.value.includes(service.id)
  if (!service.is_active && !selected) return
  draftIds.value = selected
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
        <service-category-segment-mobile v-model="activeCategory" :chips="categoryChips" />
      </ion-toolbar>
    </ion-header>

    <ion-content class="service-picker-modal__content ion-padding-vertical">
      <service-select-list-mobile
        :services="filteredServices"
        :selected-ids="draftIds"
        :is-catalog-empty="!services.length"
        @toggle="toggle"
      />
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
