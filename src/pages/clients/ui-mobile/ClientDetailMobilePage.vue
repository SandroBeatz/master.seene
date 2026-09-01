<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonSpinner,
} from '@ionic/vue'
import { useClientsQuery, type Client } from '@entities/client'
import { useSessionStore } from '@entities/session'

const route = useRoute()
const sessionStore = useSessionStore()
const userId = computed(() => sessionStore.session?.user.id ?? '')

// Detail is derived from the shared clients list (already cached from the list
// screen) — no extra fetch, just a lookup by the route param.
const { data: clients, isPending } = useClientsQuery(userId)

const clientId = computed(() => String(route.params.id))
const client = computed<Client | null>(
  () => clients.value?.find((c) => c.id === clientId.value) ?? null,
)

const fullName = computed(() =>
  client.value ? [client.value.first_name, client.value.last_name].filter(Boolean).join(' ') : '',
)

function initials(c: Client): string {
  const parts = [c.first_name, c.last_name].filter(Boolean) as string[]
  return (
    parts
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('')
      .slice(0, 2) || '?'
  )
}
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/clients" />
        </ion-buttons>
        <ion-title>{{ fullName }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div v-if="isPending" class="flex justify-center py-10">
        <ion-spinner />
      </div>

      <div v-else-if="!client" class="px-6 py-16 text-center">
        <p class="text-lg font-semibold">{{ $t('clients.details.notFoundTitle') }}</p>
      </div>

      <template v-else>
        <div class="flex flex-col items-center gap-3 py-6">
          <div
            class="flex size-20 items-center justify-center rounded-full bg-gray-100 text-2xl font-semibold text-gray-700"
          >
            <span v-if="client.emoji">{{ client.emoji }}</span>
            <span v-else>{{ initials(client) }}</span>
          </div>
          <h1 class="text-xl font-bold">{{ fullName }}</h1>
        </div>

        <ion-list inset>
          <ion-item>
            <ion-label>
              <p>{{ $t('clients.form.phoneLabel') }}</p>
              <h3>{{ client.phone }}</h3>
            </ion-label>
          </ion-item>
          <ion-item>
            <ion-label>
              <p>{{ $t('clients.form.emailLabel') }}</p>
              <h3>{{ client.email || $t('clients.details.noEmail') }}</h3>
            </ion-label>
          </ion-item>
        </ion-list>

        <ion-list inset>
          <ion-item>
            <ion-label class="ion-text-wrap">
              <p>{{ $t('clients.details.notes') }}</p>
              <h3>{{ client.notes || $t('clients.details.noNotes') }}</h3>
            </ion-label>
          </ion-item>
        </ion-list>
      </template>
    </ion-content>
  </ion-page>
</template>
