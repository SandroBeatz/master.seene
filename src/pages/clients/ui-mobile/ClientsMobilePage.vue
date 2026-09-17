<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButton,
  IonIcon,
  IonContent,
  IonSearchbar,
  IonItem,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  IonAvatar,
  IonLabel,
  IonFab,
  IonFabButton,
  IonSpinner,
  useIonRouter,
} from '@ionic/vue'
import { add, calendarOutline, createOutline, star, starOutline } from 'ionicons/icons'
import { useClientsQuery, useToggleFavoriteClientMutation, type Client } from '@entities/client'
import { ClientFormMobile } from '@features/client-form/index.mobile'
import { useSessionStore } from '@entities/session'
import { InsetList } from '@shared/ui/inset-list/index.mobile'

const { t } = useI18n()
const sessionStore = useSessionStore()
const userId = computed(() => sessionStore.session?.user.id ?? '')
const ionRouter = useIonRouter()

// The exact same Colada query the desktop clients page uses — shared cache,
// shared Supabase call. Nothing about data fetching is duplicated for mobile.
const { data: clients, isPending } = useClientsQuery(userId)
const toggleFavorite = useToggleFavoriteClientMutation(userId)

const query = ref('')
const favoriteLoadingId = ref<string | null>(null)
const isFormOpen = ref(false)
const formMode = ref<'create' | 'edit'>('create')
const editing = ref<Client | null>(null)

// The top-level router outlet is the "presenting element" that lets the modal
// render as an iOS card (full-height sheet with the page scaled behind it).
const presentingElement = ref<HTMLElement | null>(null)
onMounted(() => {
  presentingElement.value = document.querySelector('ion-router-outlet')
})

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

const favorites = computed(() => filtered.value.filter((c) => c.is_favorite))
const others = computed(() => filtered.value.filter((c) => !c.is_favorite))
const clientSections = computed(() =>
  [
    { key: 'favorites', title: t('clients.section.favorites'), clients: favorites.value },
    { key: 'others', title: t('clients.section.others'), clients: others.value },
  ].filter((section) => section.clients.length > 0),
)

function goToClient(c: Client) {
  ionRouter.push(`/clients/${c.id}`)
}

async function onToggleFavorite(c: Client) {
  if (favoriteLoadingId.value) return
  favoriteLoadingId.value = c.id
  try {
    await toggleFavorite.mutateAsync({ id: c.id, is_favorite: !c.is_favorite })
  } catch {
    // Keep the current favorite state when the request fails.
  } finally {
    favoriteLoadingId.value = null
  }
}

function openCreate() {
  formMode.value = 'create'
  editing.value = null
  isFormOpen.value = true
}

function openEdit(client: Client) {
  formMode.value = 'edit'
  editing.value = client
  isFormOpen.value = true
}

async function closeSlidingItem(event: Event) {
  const sliding = (event.currentTarget as HTMLElement | null)?.closest('ion-item-sliding') as
    | (HTMLElement & { close: () => Promise<void> })
    | null
  await sliding?.close()
}

async function onSwipeEdit(client: Client, event: Event) {
  await closeSlidingItem(event)
  openEdit(client)
}

// Booking is intentionally a UI-only placeholder in this task. Closing the
// sliding item gives the tap native feedback without starting a booking flow.
async function onSwipeBooking(event: Event) {
  await closeSlidingItem(event)
}
</script>

<template>
  <ion-page>
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>{{ $t('clients.pageTitle') }}</ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <ion-searchbar
          v-model="query"
          class="clients-search"
          :placeholder="$t('clients.searchPlaceholder')"
        />
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="clients-content ion-padding-vertical">
      <div v-if="isPending" class="loading-state" aria-live="polite">
        <ion-spinner name="crescent" />
      </div>

      <div v-else-if="!filtered.length" class="empty-state">
        <h2>{{ $t('clients.emptyTitle') }}</h2>
        <p>{{ $t('clients.emptyDescription') }}</p>
      </div>

      <template v-else>
        <inset-list
          v-for="section in clientSections"
          :key="section.key"
          class="clients-list"
          :header="section.title"
          full-width
          sticky-header
        >
          <ion-item-sliding v-for="client in section.clients" :key="client.id">
            <ion-item class="client-item" button detail @click="goToClient(client)">
              <ion-avatar slot="start" class="client-avatar">
                <span v-if="client.emoji" class="client-avatar__emoji">{{ client.emoji }}</span>
                <span v-else>{{ initials(client) }}</span>
              </ion-avatar>
              <ion-label class="client-copy">
                <h2>{{ clientName(client) }}</h2>
                <p>{{ client.phone }}</p>
              </ion-label>
              <ion-button
                slot="end"
                class="favorite-btn"
                fill="clear"
                :color="client.is_favorite ? 'warning' : 'medium'"
                :aria-label="
                  client.is_favorite
                    ? $t('clients.card.removeFavorite')
                    : $t('clients.card.addFavorite')
                "
                :aria-busy="favoriteLoadingId === client.id"
                :disabled="favoriteLoadingId !== null"
                @click.stop="onToggleFavorite(client)"
              >
                <ion-spinner
                  v-if="favoriteLoadingId === client.id"
                  slot="icon-only"
                  class="favorite-spinner"
                  name="crescent"
                />
                <ion-icon
                  v-else
                  slot="icon-only"
                  :icon="client.is_favorite ? star : starOutline"
                  aria-hidden="true"
                />
              </ion-button>
            </ion-item>
            <ion-item-options side="start">
              <ion-item-option
                color="primary"
                :aria-label="$t('clients.actions.booking')"
                @click="onSwipeBooking($event)"
              >
                <ion-icon slot="icon-only" :icon="calendarOutline" aria-hidden="true" />
              </ion-item-option>
            </ion-item-options>
            <ion-item-options side="end">
              <ion-item-option
                color="medium"
                :aria-label="$t('clients.actions.edit')"
                @click="onSwipeEdit(client, $event)"
              >
                <ion-icon slot="icon-only" :icon="createOutline" aria-hidden="true" />
              </ion-item-option>
            </ion-item-options>
          </ion-item-sliding>
        </inset-list>
      </template>

      <ion-fab v-if="!isPending" slot="fixed" vertical="bottom" horizontal="end">
        <ion-fab-button :aria-label="$t('clients.addButton')" @click="openCreate">
          <ion-icon :icon="add" aria-hidden="true" />
        </ion-fab-button>
      </ion-fab>

      <client-form-mobile
        v-model:is-open="isFormOpen"
        :mode="formMode"
        :client="editing"
        :presenting-element="presentingElement"
      />
    </ion-content>
  </ion-page>
</template>

<style scoped>
ion-header ion-toolbar.ios {
  --padding-start: 16px;
  --padding-end: 16px;
}

ion-header ion-toolbar {
  --background: var(--se-surface-page, #f2f2f7);
}

.clients-search {
  padding-block: 0 8px;
  --box-shadow: none;
}

.clients-content {
  --padding-bottom: 84px;
}

.clients-list {
  --se-sticky-header-cover: 16px;
  --se-sticky-header-top: -8px;
}

.loading-state {
  display: flex;
  justify-content: center;
  padding: 28px 16px;
}

.empty-state {
  padding: 44px 32px;
  text-align: center;
}

.empty-state h2,
.empty-state p {
  margin: 0;
}

.empty-state h2 {
  font-size: 1.05rem;
  font-weight: 600;
}

.empty-state p {
  margin-top: 5px;
  color: var(--ion-color-medium);
  font-size: 0.85rem;
  line-height: 1.4;
}

ion-item-sliding {
  background: var(--se-surface-card, #fff);
}

ion-item-sliding:not(:last-child) {
  border-bottom: 1px solid var(--se-separator, rgb(0 0 0 / 11%));
}

.client-item {
  --min-height: 72px;
  --padding-top: 8px;
  --padding-bottom: 8px;
  --background: var(--se-surface-card, #fff) !important;
  --border-width: 0;
  --inner-border-width: 0;
  --inner-padding-end: 12px;
}

.client-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  margin-inline-end: 12px;
  background: var(--ion-color-step-100, #e8e8ed);
  color: var(--ion-text-color);
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.client-avatar__emoji {
  font-size: 1.25rem;
}

.client-copy {
  min-width: 0;
}

.client-copy h2,
.client-copy p {
  overflow: hidden;
  margin: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.client-copy h2 {
  font-size: 0.98rem;
  font-weight: 600;
  line-height: 1.25;
}

.client-copy p {
  margin-top: 4px;
  color: var(--ion-color-medium);
  font-size: 0.8rem;
  line-height: 1.25;
}

.favorite-btn {
  margin-inline-start: 8px;
}

.favorite-spinner {
  width: 20px;
  height: 20px;
}

ion-fab {
  margin-inline-end: 8px;
  margin-bottom: 8px;
}
</style>
