<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonTitle,
  IonSearchbar,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
} from '@ionic/vue'
import { checkmark, closeOutline } from 'ionicons/icons'

// Native Ionic single-select picker. Long lists use the existing iOS card
// presentation; short lists can opt into a content-sized sheet via `sheet`.
// Optionally searchable for long lists (e.g. time zones).
type PickerValue = string | number

interface PickerItem {
  value: PickerValue
  label: string
  swatchColor?: string
}

const props = defineProps<{
  isOpen: boolean
  title: string
  items: readonly PickerItem[]
  modelValue: PickerValue
  searchable?: boolean
  sheet?: boolean
  presentingElement?: HTMLElement | null
}>()

const emit = defineEmits<{
  'update:isOpen': [boolean]
  'update:modelValue': [PickerValue]
}>()

const query = ref('')

const sheetStyle = computed(() => {
  if (!props.sheet) return undefined
  const height = 88 + props.items.length * 49
  return { '--height': `min(${height}px, 82vh)` }
})

// Clear the filter whenever the sheet opens so a stale query never hides the
// list on reopen.
watch(
  () => props.isOpen,
  (open) => {
    if (open) query.value = ''
  },
)

const filteredItems = computed(() => {
  if (!props.searchable) return props.items
  const q = query.value.trim().toLowerCase()
  if (!q) return props.items
  return props.items.filter((item) => item.label.toLowerCase().includes(q))
})

function close() {
  emit('update:isOpen', false)
}

function select(value: PickerValue) {
  emit('update:modelValue', value)
  close()
}
</script>

<template>
  <ion-modal
    :is-open="isOpen"
    :class="{ 'list-picker-modal--sheet': sheet }"
    :style="sheetStyle"
    :presenting-element="sheet ? undefined : (presentingElement ?? undefined)"
    :breakpoints="sheet ? [0, 1] : undefined"
    :initial-breakpoint="sheet ? 1 : undefined"
    :handle="sheet"
    @did-dismiss="close"
  >
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button
            v-if="sheet"
            fill="clear"
            color="dark"
            :aria-label="$t('common.close')"
            @click="close"
          >
            <ion-icon slot="icon-only" :icon="closeOutline" aria-hidden="true" />
          </ion-button>
          <ion-button v-else @click="close">{{ $t('common.done') }}</ion-button>
        </ion-buttons>
        <ion-title>{{ title }}</ion-title>
      </ion-toolbar>
      <ion-toolbar v-if="searchable">
        <ion-searchbar v-model="query" :placeholder="$t('common.search')" :debounce="150" />
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list :inset="sheet">
        <ion-item
          v-for="item in filteredItems"
          :key="String(item.value)"
          button
          :detail="false"
          @click="select(item.value)"
        >
          <span
            v-if="item.swatchColor"
            slot="start"
            class="picker-swatch"
            :style="{ backgroundColor: item.swatchColor }"
            aria-hidden="true"
          />
          <ion-label>{{ item.label }}</ion-label>
          <ion-icon
            v-if="item.value === modelValue"
            slot="end"
            :icon="checkmark"
            color="primary"
            aria-hidden="true"
          />
        </ion-item>
      </ion-list>
    </ion-content>
  </ion-modal>
</template>

<style scoped>
.list-picker-modal--sheet {
  --border-radius: 16px 16px 0 0;
}

.list-picker-modal--sheet ion-toolbar {
  --background: var(--se-surface-page, var(--ion-background-color));
}

.picker-swatch {
  width: 22px;
  height: 22px;
  margin-inline-end: 14px;
  border-radius: 50%;
  flex-shrink: 0;
}
</style>
