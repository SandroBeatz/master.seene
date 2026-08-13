<script setup lang="ts">
import { computed, onUnmounted, ref, watch, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { createReusableTemplate } from '@vueuse/core'
import {
  useClientsQuery,
  useRemoveClientMutation,
  useToggleFavoriteClientMutation,
  type Client,
} from '@entities/client'
import { useAppointmentsQuery, lastVisitDate, type Appointment } from '@entities/appointment'
import { useSessionStore } from '@entities/session'
import { ClientFormDialog } from '@features/client-form'
import { ClientDeleteConfirm } from '@features/client-delete'
import { ClientDetailsPanel } from '@widgets/client-details-panel'
import { useMobilePushActions } from '@widgets/mobile-shell'
import { Page, Typography } from '@shared/ui'
import { useIsMobile } from '@shared/lib/viewport'
import ClientCard from './ClientCard.vue'

const { t } = useI18n()
const toast = useToast()
const router = useRouter()
const sessionStore = useSessionStore()
const isMobile = useIsMobile()

const userId = computed(() => sessionStore.session?.user.id ?? '')

// `isPending` is true only until the first data arrives; background refetches
// (colada revalidation) keep the existing list visible without a skeleton.
const { data: clients, isPending } = useClientsQuery(userId)
const { data: appointments } = useAppointmentsQuery(userId)
const removeMutation = useRemoveClientMutation(userId)
const toggleFavoriteMutation = useToggleFavoriteClientMutation(userId)

// Map of client id → their last visit date, derived from all appointments once.
const lastVisitByClient = computed(() => {
  const grouped = new Map<string, Appointment[]>()
  for (const appt of appointments.value ?? []) {
    const list = grouped.get(appt.client_id)
    if (list) list.push(appt)
    else grouped.set(appt.client_id, [appt])
  }
  const result = new Map<string, string | null>()
  for (const [clientId, list] of grouped) result.set(clientId, lastVisitDate(list))
  return result
})

async function toggleFavorite(client: Client) {
  const next = !client.is_favorite
  // Keep the open preview's star in sync (its client is a snapshot).
  if (selectedClient.value?.id === client.id) {
    selectedClient.value = { ...selectedClient.value, is_favorite: next }
  }
  try {
    await toggleFavoriteMutation.mutateAsync({ id: client.id, is_favorite: next })
    toast.add({
      title: next ? t('clients.favorite.added') : t('clients.favorite.removed'),
      color: 'success',
    })
  } catch {
    if (selectedClient.value?.id === client.id) {
      selectedClient.value = { ...selectedClient.value, is_favorite: !next }
    }
    toast.add({ title: t('clients.favorite.error'), color: 'error' })
  }
}

// Search with debounce
const query = ref('')
const debouncedQuery = ref('')
let debounceTimer: ReturnType<typeof setTimeout>
watch(query, (val) => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debouncedQuery.value = val
  }, 200)
})

function clientName(c: Client): string {
  return [c.first_name, c.last_name].filter(Boolean).join(' ')
}

const filtered = computed(() => {
  const list = clients.value ?? []
  const q = debouncedQuery.value.trim().toLowerCase()
  const scoped = q
    ? list.filter((c) => [c.first_name, c.last_name, c.phone].join(' ').toLowerCase().includes(q))
    : list
  // Alphabetical by full name (case-insensitive, locale-aware).
  return [...scoped].sort((a, b) =>
    clientName(a).localeCompare(clientName(b), undefined, { sensitivity: 'base' }),
  )
})

const favoriteClients = computed(() => filtered.value.filter((c) => c.is_favorite))
const otherClients = computed(() => filtered.value.filter((c) => !c.is_favorite))

// Slideover
const slideoverOpen = ref(false)
const selectedClient = ref<Client | null>(null)

function openDetails(client: Client) {
  // Mobile: push to a full-screen detail route (back-header flow) instead of
  // the desktop slideover — see settings-clients-detail in the router.
  if (isMobile.value) {
    router.push({ name: 'settings-clients-detail', params: { id: client.id } })
    return
  }
  selectedClient.value = client
  slideoverOpen.value = true
}

// Form dialog
const formOpen = ref(false)
const formMode = ref<'create' | 'edit'>('create')
const editingClient = ref<Client | null>(null)

function openCreate() {
  formMode.value = 'create'
  editingClient.value = null
  formOpen.value = true
}

// On mobile the add button lives in the push header — register it there rather
// than rendering it in the page body. Cleared on unmount so it doesn't leak to
// the next screen.
const { setActions, clearActions } = useMobilePushActions()
watchEffect(() => {
  if (isMobile.value && !isPending.value) {
    setActions([
      {
        icon: 'i-lucide-plus',
        ariaLabel: t('clients.addButton'),
        onClick: openCreate,
      },
    ])
  } else {
    clearActions()
  }
})
onUnmounted(clearActions)

// Shared body (search + list) so it isn't duplicated between the desktop Page
// wrapper and the mobile card-free layout.
const [DefineBody, ReuseBody] = createReusableTemplate()

function openEdit(client?: Client) {
  const c = client ?? selectedClient.value
  if (!c) return
  formMode.value = 'edit'
  editingClient.value = c
  formOpen.value = true
}

// Delete
const deleteOpen = ref(false)
const deletingClient = ref<Client | null>(null)
const isDeleting = ref(false)

function openDeleteConfirm(client?: Client) {
  deletingClient.value = client ?? selectedClient.value
  deleteOpen.value = true
}

async function confirmDelete() {
  if (!deletingClient.value) return
  isDeleting.value = true
  try {
    await removeMutation.mutateAsync(deletingClient.value.id)
    toast.add({ title: t('clients.deleteSuccess'), color: 'success' })
    deleteOpen.value = false
    slideoverOpen.value = false
    selectedClient.value = null
    deletingClient.value = null
  } catch {
    toast.add({ title: t('clients.deleteError'), color: 'error' })
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <DefineBody>
    <!-- Search -->
    <div class="mb-4">
      <UInput
        v-model="query"
        leading-icon="i-lucide-search"
        :placeholder="$t('clients.searchPlaceholder')"
        class="w-full max-w-sm"
      />
    </div>

    <!-- Loading -->
    <div v-if="isPending" class="flex flex-col gap-3">
      <USkeleton v-for="i in 6" :key="i" class="h-[92px] w-full rounded-lg" />
    </div>

    <!-- Empty state -->
    <UEmpty
      v-else-if="!filtered.length"
      icon="i-lucide-users"
      :title="$t('clients.emptyTitle')"
      :description="$t('clients.emptyDescription')"
      class="py-16"
    >
      <UButton leading-icon="i-lucide-user-plus" color="primary" class="mt-4" @click="openCreate">
        {{ $t('clients.addFirstButton') }}
      </UButton>
    </UEmpty>

    <!-- Cards -->
    <div v-else class="flex flex-col gap-6">
      <!-- Favorites -->
      <section v-if="favoriteClients.length" class="flex flex-col gap-3">
        <h3 class="text-xs font-semibold uppercase tracking-wider text-muted">
          {{ $t('clients.section.favorites') }}
        </h3>
        <ClientCard
          v-for="client in favoriteClients"
          :key="client.id"
          :client="client"
          :last-visit="lastVisitByClient.get(client.id) ?? null"
          @select="openDetails(client)"
          @edit="openEdit(client)"
          @toggle-favorite="toggleFavorite(client)"
        />
      </section>

      <!-- Others -->
      <section v-if="otherClients.length" class="flex flex-col gap-3">
        <h3
          v-if="favoriteClients.length"
          class="text-xs font-semibold uppercase tracking-wider text-muted"
        >
          {{ $t('clients.section.others') }}
        </h3>
        <ClientCard
          v-for="client in otherClients"
          :key="client.id"
          :client="client"
          :last-visit="lastVisitByClient.get(client.id) ?? null"
          @select="openDetails(client)"
          @edit="openEdit(client)"
          @toggle-favorite="toggleFavorite(client)"
        />
      </section>
    </div>
  </DefineBody>

  <!-- Desktop: standard page with the add button in the header. -->
  <Page v-if="!isMobile" :title="$t('clients.pageTitle')">
    <template #header-right>
      <UButton leading-icon="i-lucide-user-plus" color="neutral" @click="openCreate">
        {{ $t('clients.addButton') }}
      </UButton>
    </template>
    <ReuseBody />
  </Page>

  <!-- Mobile: card-free layout; the add button is registered into the push header. -->
  <div v-else class="flex flex-col gap-4">
    <div class="flex flex-col gap-1">
      <Typography variant="h4" class="text-highlighted font-bold">
        {{ t('clients.pageTitle') }}
      </Typography>
      <p class="text-sm text-muted">{{ t('clients.subtitle') }}</p>
    </div>
    <ReuseBody />
  </div>

  <!-- Details slideover -->
  <USlideover v-model:open="slideoverOpen" side="right">
    <template #content>
      <ClientDetailsPanel
        v-if="selectedClient"
        :client="selectedClient"
        @edit="openEdit()"
        @delete="openDeleteConfirm()"
        @toggle-favorite="selectedClient && toggleFavorite(selectedClient)"
        @close="slideoverOpen = false"
      />
    </template>
  </USlideover>

  <!-- Create / Edit dialog -->
  <ClientFormDialog
    :open="formOpen"
    :mode="formMode"
    :client="editingClient"
    @update:open="formOpen = $event"
    @saved="formOpen = false"
  />

  <!-- Delete confirm -->
  <ClientDeleteConfirm
    :open="deleteOpen"
    :client="deletingClient"
    :loading="isDeleting"
    @update:open="deleteOpen = $event"
    @confirm="confirmDelete"
    @cancel="deleteOpen = false"
  />
</template>
