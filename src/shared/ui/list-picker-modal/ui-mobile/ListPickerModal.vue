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
import { checkmark } from 'ionicons/icons'

// Native Ionic single-select picker rendered as an iOS card modal
// (https://ionicframework.com/docs/api/modal#card-modal). Pass the tab's
// `ion-router-outlet` as `presentingElement` to get the card presentation.
// Optionally searchable for long lists (e.g. time zones).
type PickerValue = string | number

interface PickerItem {
  value: PickerValue
  label: string
}

const props = defineProps<{
  isOpen: boolean
  title: string
  items: readonly PickerItem[]
  modelValue: PickerValue
  searchable?: boolean
  presentingElement?: HTMLElement | null
}>()

const emit = defineEmits<{
  'update:isOpen': [boolean]
  'update:modelValue': [PickerValue]
}>()

const query = ref('')

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
    :presenting-element="presentingElement ?? undefined"
    @did-dismiss="close"
  >
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button @click="close">{{ $t('common.done') }}</ion-button>
        </ion-buttons>
        <ion-title>{{ title }}</ion-title>
      </ion-toolbar>
      <ion-toolbar v-if="searchable">
        <ion-searchbar v-model="query" :placeholder="$t('common.search')" :debounce="150" />
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list>
        <ion-item
          v-for="item in filteredItems"
          :key="String(item.value)"
          button
          :detail="false"
          @click="select(item.value)"
        >
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
