<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  useClientsQuery,
  useRemoveClientMutation,
  useToggleFavoriteClientMutation,
  type Client,
} from '@entities/client'
import {
  useAppointmentsQuery,
  lastVisitDate,
  type Appointment,
} from '@entities/appointment'
import { useSessionStore } from '@entities/session'
import { ClientFormDialog } from '@features/client-form'
import { ClientDeleteConfirm } from '@features/client-delete'
import { ClientDetailsPanel } from '@widgets/client-details-panel'
import ClientCard from './ClientCard.vue'

const { t } = useI18n()
const toast = useToast()
const sessionStore = useSessionStore()

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

const filtered = computed(() => {
  const list = clients.value ?? []
  const q = debouncedQuery.value.trim().toLowerCase()
  if (!q) return list
  return list.filter((c) =>
    [c.first_name, c.last_name, c.phone].join(' ').toLowerCase().includes(q),
  )
})

const favoriteClients = computed(() => filtered.value.filter((c) => c.is_favorite))
const otherClients = computed(() => filtered.value.filter((c) => !c.is_favorite))

// Slideover
const slideoverOpen = ref(false)
const selectedClient = ref<Client | null>(null)

function openDetails(client: Client) {
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
  <UTheme
    :ui="{
      page: { root: 'px-12 py-3 w-full max-w-7xl mx-auto' },
      pageHeader: { root: 'border-none pb-2' },
    }"
  >
    <UPage as="main">
      <UPageHeader :title="$t('clients.pageTitle')">
        <template #links>
          <UButton leading-icon="i-lucide-user-plus" color="neutral" @click="openCreate">
            {{ $t('clients.addButton') }}
          </UButton>
        </template>
      </UPageHeader>

      <UPageBody>
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
          <UButton
            leading-icon="i-lucide-user-plus"
            color="primary"
            class="mt-4"
            @click="openCreate"
          >
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
      </UPageBody>
    </UPage>
  </UTheme>

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
