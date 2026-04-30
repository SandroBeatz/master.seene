<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TableColumn, TableRow } from '@nuxt/ui'
import { useClientsQuery, useRemoveClientMutation, type Client } from '@entities/client'
import { useSessionStore } from '@entities/session'
import { ClientFormDialog } from '@features/client-form'
import { ClientDeleteConfirm } from '@features/client-delete'
import { ClientDetailsPanel } from '@widgets/client-details-panel'

const { t } = useI18n()
const toast = useToast()
const sessionStore = useSessionStore()

const userId = computed(() => sessionStore.session?.user.id ?? '')

const { data: clients, isLoading } = useClientsQuery(userId)
const removeMutation = useRemoveClientMutation(userId)

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

// Table columns
const columns = computed<TableColumn<Client>[]>(() => [
  {
    id: 'name',
    accessorFn: (row) => [row.first_name, row.last_name].filter(Boolean).join(' '),
    header: t('clients.table.name'),
  },
  {
    accessorKey: 'phone',
    header: t('clients.table.phone'),
  },
  {
    id: 'lastVisit',
    header: t('clients.table.lastVisit'),
    cell: () => '—',
  },
  {
    accessorKey: 'notes',
    header: t('clients.table.notes'),
    cell: ({ row }) => {
      const notes = row.original.notes
      if (!notes) return '—'
      return notes.length > 60 ? notes.substring(0, 60) + '…' : notes
    },
  },
])

// Slideover
const slideoverOpen = ref(false)
const selectedClient = ref<Client | null>(null)

function onRowSelect(_e: Event, row: TableRow<Client>) {
  selectedClient.value = row.original
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

        <UPageCard variant="soft">
          <!-- Loading -->
          <div v-if="isLoading" class="space-y-3">
            <USkeleton v-for="i in 5" :key="i" class="h-12 w-full" />
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

          <!-- Table -->
          <UTable
            v-else
            :data="filtered"
            :columns="columns"
            class="cursor-pointer"
            @select="onRowSelect"
          />
        </UPageCard>
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
