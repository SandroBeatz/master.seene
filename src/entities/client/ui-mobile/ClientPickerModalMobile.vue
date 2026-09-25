<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  IonAvatar,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonModal,
  IonSearchbar,
  IonTitle,
  IonToolbar,
} from '@ionic/vue'
import { checkmarkCircle, closeOutline, peopleOutline } from 'ionicons/icons'
import { InsetList } from '@shared/ui/inset-list/index.mobile'
import type { Client } from '../model/types'

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

function clientName(client: Client): string {
  return [client.first_name, client.last_name].filter(Boolean).join(' ') || client.phone
}

function initials(client: Client): string {
  return (
    [client.first_name, client.last_name]
      .filter(Boolean)
      .map((part) => part?.[0]?.toUpperCase() ?? '')
      .join('')
      .slice(0, 2) || '?'
  )
}

const filteredClients = computed(() => {
  const value = query.value.trim().toLocaleLowerCase()
  const clients = value
    ? props.clients.filter((client) =>
        `${clientName(client)} ${client.phone}`.toLocaleLowerCase().includes(value),
      )
    : props.clients

  return [...clients].sort((first, second) =>
    clientName(first).localeCompare(clientName(second), undefined, { sensitivity: 'base' }),
  )
})

const sections = computed(() =>
  [
    {
      key: 'favorites',
      title: t('clients.section.favorites'),
      clients: filteredClients.value.filter((client) => client.is_favorite),
    },
    {
      key: 'others',
      title: t('clients.section.others'),
      clients: filteredClients.value.filter((client) => !client.is_favorite),
    },
  ].filter((section) => section.clients.length > 0),
)

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
      <template v-if="filteredClients.length">
        <inset-list
          v-for="section in sections"
          :key="section.key"
          class="client-picker-modal__list"
          :header="section.title"
          sticky-header
          :data-testid="`client-picker-section-${section.key}`"
        >
          <ion-item
            v-for="client in section.clients"
            :key="client.id"
            button
            :detail="false"
            class="client-picker-modal__item"
            :class="{ 'client-picker-modal__item--selected': client.id === modelValue }"
            :aria-pressed="client.id === modelValue"
            @click="select(client)"
          >
            <ion-avatar slot="start" class="client-picker-modal__avatar" aria-hidden="true">
              <span v-if="client.emoji">{{ client.emoji }}</span>
              <span v-else>{{ initials(client) }}</span>
            </ion-avatar>
            <ion-label>
              <h2>{{ clientName(client) }}</h2>
              <p>{{ client.phone }}</p>
            </ion-label>
            <ion-icon
              v-if="client.id === modelValue"
              slot="end"
              :icon="checkmarkCircle"
              color="primary"
              aria-hidden="true"
            />
          </ion-item>
        </inset-list>
      </template>

      <div v-else class="client-picker-modal__empty">
        <ion-icon :icon="peopleOutline" color="medium" aria-hidden="true" />
        <h2>
          {{ clients.length ? t('clients.picker.noResults') : t('clients.emptyTitle') }}
        </h2>
        <p v-if="!clients.length">{{ t('clients.emptyDescription') }}</p>
      </div>
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

.client-picker-modal__list {
  --se-sticky-header-cover: 16px;
  --se-sticky-header-top: -8px;
}

.client-picker-modal__item {
  --min-height: 64px;
}

.client-picker-modal__item--selected {
  --background: rgba(var(--ion-color-primary-rgb), 0.1);
}

.client-picker-modal__avatar {
  display: grid;
  width: 42px;
  height: 42px;
  margin-inline: 0 12px;
  background: var(--ion-background-color-step-100);
  color: var(--ion-text-color);
  place-items: center;
  font-size: 0.9rem;
  font-weight: 700;
}

.client-picker-modal__item ion-label h2,
.client-picker-modal__item ion-label p {
  margin: 0;
}

.client-picker-modal__item ion-label h2 {
  font-size: 0.95rem;
  font-weight: 600;
}

.client-picker-modal__item ion-label p {
  margin-top: 2px;
  color: var(--ion-color-medium);
  font-size: 0.8rem;
}

.client-picker-modal__item > ion-icon[slot='end'] {
  font-size: 22px;
}

.client-picker-modal__empty {
  display: grid;
  min-height: 50vh;
  align-content: center;
  justify-items: center;
  gap: 8px;
  padding: 24px;
  text-align: center;
}

.client-picker-modal__empty > ion-icon {
  font-size: 2.5rem;
}

.client-picker-modal__empty h2,
.client-picker-modal__empty p {
  margin: 0;
}

.client-picker-modal__empty p {
  max-width: 280px;
  color: var(--ion-color-medium);
}
</style>
