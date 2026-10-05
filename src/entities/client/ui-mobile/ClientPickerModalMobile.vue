<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonModal,
  IonSearchbar,
  IonTitle,
  IonToolbar,
} from '@ionic/vue'
import { closeOutline } from 'ionicons/icons'
import type { Client } from '../model/types'
import ClientSelectListMobile from './ClientSelectListMobile.vue'

const props = defineProps<{
  isOpen: boolean
  clients: Client[]
  modelValue: string | null
  presentingElement?: HTMLElement | null
}>()

const emit = defineEmits<{
  'update:isOpen': [value: boolean]
  'update:modelValue': [value: string]
  select: [client: Client]
}>()

const { t } = useI18n()
const query = ref('')

watch(
  () => props.isOpen,
  (open) => {
    if (open) query.value = ''
  },
)

function close() {
  emit('update:isOpen', false)
}

function select(client: Client) {
  emit('update:modelValue', client.id)
  emit('select', client)
  close()
}
</script>

<template>
  <ion-modal
    :is-open="isOpen"
    class="client-picker-modal"
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
        <ion-title>{{ t('clients.picker.title') }}</ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <ion-searchbar
          v-model="query"
          :placeholder="t('clients.searchPlaceholder')"
          :debounce="150"
          autofocus
        />
      </ion-toolbar>
    </ion-header>

    <ion-content class="client-picker-modal__content ion-padding-vertical">
      <client-select-list-mobile
        :clients="clients"
        :model-value="modelValue"
        :query="query"
        @select="select"
      />
    </ion-content>
  </ion-modal>
</template>

<style scoped>
.client-picker-modal ion-toolbar,
.client-picker-modal__content {
  --background: var(--se-surface-page, var(--ion-background-color));
}

.client-picker-modal ion-searchbar {
  padding-block: 0 8px;
}
</style>
