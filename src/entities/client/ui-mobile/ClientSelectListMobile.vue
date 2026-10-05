<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { IonAvatar, IonIcon, IonItem, IonLabel } from '@ionic/vue'
import { checkmarkCircle, peopleOutline } from 'ionicons/icons'
import { InsetList } from '@shared/ui/inset-list/index.mobile'
import type { Client } from '../model/types'

// Searchable favorites/others client list. Shared by the picker modal and
// in-flow pages (e.g. the appointment wizard's client step); the host owns the
// search field and passes its `query` in.
const props = defineProps<{
  clients: Client[]
  modelValue: string | null
  query: string
}>()

const emit = defineEmits<{
  select: [client: Client]
}>()

const { t } = useI18n()

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
  const value = props.query.trim().toLocaleLowerCase()
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
</script>

<template>
  <div class="client-select-list">
    <template v-if="filteredClients.length">
      <inset-list
        v-for="section in sections"
        :key="section.key"
        class="client-select-list__list"
        :header="section.title"
        sticky-header
        :data-testid="`client-picker-section-${section.key}`"
      >
        <ion-item
          v-for="client in section.clients"
          :key="client.id"
          button
          :detail="false"
          class="client-select-list__item"
          :class="{ 'client-select-list__item--selected': client.id === modelValue }"
          :aria-pressed="client.id === modelValue"
          @click="emit('select', client)"
        >
          <ion-avatar slot="start" class="client-select-list__avatar" aria-hidden="true">
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

    <div v-else class="client-select-list__empty">
      <ion-icon :icon="peopleOutline" color="medium" aria-hidden="true" />
      <h2>
        {{ clients.length ? t('clients.picker.noResults') : t('clients.emptyTitle') }}
      </h2>
      <p v-if="!clients.length">{{ t('clients.emptyDescription') }}</p>
    </div>
  </div>
</template>

<style scoped>
.client-select-list__list {
  --se-sticky-header-cover: 16px;
  --se-sticky-header-top: -8px;
}

.client-select-list__item {
  --min-height: 64px;
}

.client-select-list__item--selected {
  --background: rgba(var(--ion-color-primary-rgb), 0.1);
}

.client-select-list__avatar {
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

.client-select-list__item ion-label h2,
.client-select-list__item ion-label p {
  margin: 0;
}

.client-select-list__item ion-label h2 {
  font-size: 0.95rem;
  font-weight: 600;
}

.client-select-list__item ion-label p {
  margin-top: 2px;
  color: var(--ion-color-medium);
  font-size: 0.8rem;
}

.client-select-list__item > ion-icon[slot='end'] {
  font-size: 22px;
}

.client-select-list__empty {
  display: grid;
  min-height: 50vh;
  align-content: center;
  justify-items: center;
  gap: 8px;
  padding: 24px;
  text-align: center;
}

.client-select-list__empty > ion-icon {
  font-size: 2.5rem;
}

.client-select-list__empty h2,
.client-select-list__empty p {
  margin: 0;
}

.client-select-list__empty p {
  max-width: 280px;
  color: var(--ion-color-medium);
}
</style>
