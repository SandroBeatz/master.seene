<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonSearchbar,
  IonList,
  IonItemGroup,
  IonItemDivider,
  IonItem,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  IonAvatar,
  IonLabel,
  IonSpinner,
  useIonRouter,
  alertController,
  toastController,
} from '@ionic/vue'
import { add, star, starOutline, trash } from 'ionicons/icons'
import {
  useClientsQuery,
  useToggleFavoriteClientMutation,
  useRemoveClientMutation,
  type Client,
} from '@entities/client'
import { ClientFormMobile } from '@features/client-form/index.mobile'
import { useSessionStore } from '@entities/session'

const { t } = useI18n()
const sessionStore = useSessionStore()
const userId = computed(() => sessionStore.session?.user.id ?? '')
const ionRouter = useIonRouter()

// The exact same Colada query the desktop clients page uses — shared cache,
// shared Supabase call. Nothing about data fetching is duplicated for mobile.
const { data: clients, isPending } = useClientsQuery(userId)
const toggleFavorite = useToggleFavoriteClientMutation(userId)
const removeClient = useRemoveClientMutation(userId)

const query = ref('')
const isAddOpen = ref(false)

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

function goToClient(c: Client) {
  ionRouter.push(`/clients/${c.id}`)
}

function onToggleFavorite(c: Client) {
  toggleFavorite.mutate({ id: c.id, is_favorite: !c.is_favorite })
}

async function showToast(message: string, color: 'success' | 'danger') {
  const toast = await toastController.create({ message, duration: 2000, color, position: 'top' })
  await toast.present()
}

async function deleteClient(c: Client) {
  try {
    await removeClient.mutateAsync(c.id)
    await showToast(t('clients.deleteSuccess'), 'success')
  } catch {
    await showToast(t('clients.deleteError'), 'danger')
  }
}

// Swipe reveals a destructive option; confirm before deleting and collapse the
// sliding item afterwards so a cancelled swipe doesn't stay stuck open.
async function onSwipeDelete(c: Client, ev: Event) {
  const sliding = (ev.currentTarget as HTMLElement | null)?.closest('ion-item-sliding') as
    | (HTMLElement & { close: () => Promise<void> })
    | null
  const alert = await alertController.create({
    header: t('clients.delete.title'),
    message: t('clients.delete.message', { name: clientName(c) }),
    buttons: [
      { text: t('clients.delete.cancel'), role: 'cancel' },
      {
        text: t('clients.delete.confirm'),
        role: 'destructive',
        handler: () => {
          void deleteClient(c)
        },
      },
    ],
  })
  await alert.present()
  await alert.onDidDismiss()
  await sliding?.close()
}
</script>

<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ $t('clients.pageTitle') }}</ion-title>
        <ion-buttons slot="end">
          <ion-button :aria-label="$t('clients.addButton')" @click="isAddOpen = true">
            <ion-icon slot="icon-only" :icon="add" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar>
        <ion-searchbar v-model="query" :placeholder="$t('clients.searchPlaceholder')" />
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <!-- Condensed large title: collapses into the top toolbar on scroll (iOS). -->
      <ion-header collapse="condense">
        <ion-toolbar>
          <ion-title size="large">{{ $t('clients.pageTitle') }}</ion-title>
        </ion-toolbar>
      </ion-header>

      <div v-if="isPending" class="flex justify-center py-10">
        <ion-spinner />
      </div>

      <div v-else-if="!filtered.length" class="px-6 py-16 text-center">
        <p class="text-lg font-semibold">{{ $t('clients.emptyTitle') }}</p>
        <p class="mt-1 text-sm text-gray-500">{{ $t('clients.emptyDescription') }}</p>
      </div>

      <ion-list v-else>
        <ion-item-group v-if="favorites.length">
          <ion-item-divider sticky>
            <ion-label>{{ $t('clients.section.favorites') }}</ion-label>
          </ion-item-divider>
          <ion-item-sliding v-for="c in favorites" :key="c.id">
            <ion-item button detail @click="goToClient(c)">
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
              <ion-button
                slot="end"
                class="favorite-btn"
                fill="clear"
                color="warning"
                :aria-label="$t('clients.card.removeFavorite')"
                @click.stop="onToggleFavorite(c)"
              >
                <ion-icon slot="icon-only" :icon="star" />
              </ion-button>
            </ion-item>
            <ion-item-options side="end">
              <ion-item-option
                color="danger"
                :aria-label="$t('clients.details.deleteButton')"
                @click="onSwipeDelete(c, $event)"
              >
                <ion-icon slot="icon-only" :icon="trash" />
              </ion-item-option>
            </ion-item-options>
          </ion-item-sliding>
        </ion-item-group>

        <ion-item-group v-if="others.length">
          <ion-item-divider sticky>
            <ion-label>{{ $t('clients.section.others') }}</ion-label>
          </ion-item-divider>
          <ion-item-sliding v-for="c in others" :key="c.id">
            <ion-item button detail @click="goToClient(c)">
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
              <ion-button
                slot="end"
                class="favorite-btn"
                fill="clear"
                color="medium"
                :aria-label="$t('clients.card.addFavorite')"
                @click.stop="onToggleFavorite(c)"
              >
                <ion-icon slot="icon-only" :icon="starOutline" />
              </ion-button>
            </ion-item>
            <ion-item-options side="end">
              <ion-item-option
                color="danger"
                :aria-label="$t('clients.details.deleteButton')"
                @click="onSwipeDelete(c, $event)"
              >
                <ion-icon slot="icon-only" :icon="trash" />
              </ion-item-option>
            </ion-item-options>
          </ion-item-sliding>
        </ion-item-group>
      </ion-list>

      <client-form-mobile v-model:is-open="isAddOpen" mode="create" :presenting-element="presentingElement" />
    </ion-content>
  </ion-page>
</template>

<style scoped>
/* Keep the detail chevron off the screen edge and give the favorite star
   breathing room from the client name. */
ion-item {
  --inner-padding-end: 12px;
}

/* Large condensed title sits flush to the edge by default — inset it. */
ion-header[collapse='condense'] ion-toolbar {
  --padding-start: 16px;
  --padding-end: 16px;
}

ion-title[size='large'] {
  padding-inline-start: 16px;
  padding-inline-end: 16px;
}

ion-item-divider {
  --padding-start: 0;
  padding-inline-end: 16px;
  font-weight: 600;
}

/* The label is a slotted light-DOM child, so scoped padding reliably indents
   the section title (dividers otherwise bleed to the list edge). */
ion-item-divider ion-label {
  padding-inline-start: 16px;
}

ion-avatar[slot='start'] {
  margin-inline-end: 12px;
}

.favorite-btn {
  margin-inline-start: 8px;
}
</style>
