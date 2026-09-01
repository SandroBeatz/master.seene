<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonSearchbar,
  IonList,
  IonItem,
  IonAvatar,
  IonLabel,
  IonSpinner,
} from '@ionic/vue'
import { useClientsQuery, type Client } from '@entities/client'
import { useSessionStore } from '@entities/session'

const sessionStore = useSessionStore()
const userId = computed(() => sessionStore.session?.user.id ?? '')

// The exact same Colada query the desktop clients page uses — shared cache,
// shared Supabase call. Nothing about data fetching is duplicated for mobile.
const { data: clients, isPending } = useClientsQuery(userId)

const query = ref('')

function clientName(c: Client): string {
  return [c.first_name, c.last_name].filter(Boolean).join(' ')
}

function initials(c: Client): string {
  const parts = [c.first_name, c.last_name].filter(Boolean) as string[]
  return (
    parts
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('')
      .slice(0, 2) || '?'
  )
}

const filtered = computed(() => {
  const list = clients.value ?? []
  const q = query.value.trim().toLowerCase()
  const scoped = q
    ? list.filter((c) => [c.first_name, c.last_name, c.phone].join(' ').toLowerCase().includes(q))
    : list
  return [...scoped].sort((a, b) =>
    clientName(a).localeCompare(clientName(b), undefined, { sensitivity: 'base' }),
  )
})
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ $t('clients.pageTitle') }}</ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <ion-searchbar v-model="query" :placeholder="$t('clients.searchPlaceholder')" />
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div v-if="isPending" class="flex justify-center py-10">
        <ion-spinner />
      </div>

      <div v-else-if="!filtered.length" class="px-6 py-16 text-center">
        <p class="text-lg font-semibold">{{ $t('clients.emptyTitle') }}</p>
        <p class="mt-1 text-sm text-gray-500">{{ $t('clients.emptyDescription') }}</p>
      </div>

      <ion-list v-else>
        <ion-item
          v-for="c in filtered"
          :key="c.id"
          button
          detail
          :router-link="`/tabs/clients/${c.id}`"
        >
          <ion-avatar
            slot="start"
            class="flex items-center justify-center bg-gray-100 text-sm font-semibold text-gray-700"
          >
            <span v-if="c.emoji">{{ c.emoji }}</span>
            <span v-else>{{ initials(c) }}</span>
          </ion-avatar>
          <ion-label>
            <h2>{{ clientName(c) }}</h2>
            <p>{{ c.phone }}</p>
          </ion-label>
        </ion-item>
      </ion-list>
    </ion-content>
  </ion-page>
</template>
