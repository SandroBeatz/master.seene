<script setup lang="ts">
import { computed, onUnmounted, ref, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import {
  useClientsQuery,
  useRemoveClientMutation,
  useToggleFavoriteClientMutation,
} from '@entities/client'
import { useSessionStore } from '@entities/session'
import { ClientFormDialog } from '@features/client-form'
import { ClientDeleteConfirm } from '@features/client-delete'
import { ClientDetailsPanel } from '@widgets/client-details-panel'
import { useMobilePushActions, useMobilePushTitle } from '@widgets/mobile-shell'

const { t } = useI18n()
const toast = useToast()
const route = useRoute()
const router = useRouter()
const sessionStore = useSessionStore()
const { setTitle } = useMobilePushTitle()
const { setActions, clearActions } = useMobilePushActions()

const userId = computed(() => sessionStore.session?.user.id ?? '')

// `isPending` is true only until the clients list first arrives; the detail is
// derived from that list, so we show a skeleton until it resolves.
const { data: clients, isPending } = useClientsQuery(userId)
const removeMutation = useRemoveClientMutation(userId)
const toggleFavoriteMutation = useToggleFavoriteClientMutation(userId)

const clientId = computed(() => String(route.params.id))
const client = computed(() => clients.value?.find((c) => c.id === clientId.value) ?? null)

watchEffect(() => {
  if (client.value) {
    setTitle([client.value.first_name, client.value.last_name].filter(Boolean).join(' '))
  }
})

// "…" more-actions button in the push header opens the actions drawer (edit /
// delete). Registered only once the client resolves; cleared on unmount so it
// doesn't leak to the next pushed screen.
const actionsOpen = ref(false)
watchEffect(() => {
  if (client.value) {
    setActions([
      {
        icon: 'i-lucide-ellipsis-vertical',
        ariaLabel: t('clients.details.moreActions'),
        onClick: () => (actionsOpen.value = true),
      },
    ])
  } else {
    clearActions()
  }
})
onUnmounted(clearActions)

function goBack() {
  router.push({ name: 'settings-clients' })
}

async function toggleFavorite() {
  if (!client.value) return
  const next = !client.value.is_favorite
  try {
    await toggleFavoriteMutation.mutateAsync({ id: client.value.id, is_favorite: next })
    toast.add({
      title: next ? t('clients.favorite.added') : t('clients.favorite.removed'),
      color: 'success',
    })
  } catch {
    toast.add({ title: t('clients.favorite.error'), color: 'error' })
  }
}

const formOpen = ref(false)
const deleteOpen = ref(false)
const isDeleting = ref(false)

function openEdit() {
  actionsOpen.value = false
  formOpen.value = true
}

function openDelete() {
  actionsOpen.value = false
  deleteOpen.value = true
}

async function confirmDelete() {
  if (!client.value) return
  isDeleting.value = true
  try {
    await removeMutation.mutateAsync(client.value.id)
    toast.add({ title: t('clients.deleteSuccess'), color: 'success' })
    deleteOpen.value = false
    goBack()
  } catch {
    toast.add({ title: t('clients.deleteError'), color: 'error' })
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <!-- Loading: the clients list is still fetching, so the client isn't resolved yet. -->
  <div v-if="isPending && !client" class="flex flex-col gap-6">
    <div class="flex items-start gap-3">
      <USkeleton class="size-14 shrink-0 rounded-full" />
      <div class="flex-1 space-y-2 pt-1">
        <USkeleton class="h-5 w-40" />
        <USkeleton class="h-4 w-24" />
      </div>
      <USkeleton class="size-11 shrink-0 rounded-lg" />
    </div>
    <USkeleton class="h-11 w-full rounded-lg" />
    <USkeleton class="h-24 w-full rounded-lg" />
    <USkeleton class="h-40 w-full rounded-lg" />
  </div>

  <ClientDetailsPanel
    v-else-if="client"
    :client="client"
    @edit="openEdit"
    @delete="openDelete"
    @toggle-favorite="toggleFavorite"
    @close="goBack"
  />

  <!-- Loaded, but no client with this id (e.g. deleted or bad link). -->
  <UEmpty
    v-else
    icon="i-lucide-user-x"
    :title="$t('clients.details.notFoundTitle')"
    class="py-16"
  />

  <ClientFormDialog
    :open="formOpen"
    mode="edit"
    :client="client"
    @update:open="formOpen = $event"
    @saved="formOpen = false"
  />

  <ClientDeleteConfirm
    :open="deleteOpen"
    :client="client"
    :loading="isDeleting"
    @update:open="deleteOpen = $event"
    @confirm="confirmDelete"
    @cancel="deleteOpen = false"
  />

  <!-- Actions drawer, opened from the push-header "…" button. -->
  <UDrawer
    v-model:open="actionsOpen"
    :title="$t('clients.details.actionsTitle')"
    :ui="{
      content: 'rounded-t-2xl',
      body: 'space-y-2 pb-[calc(1rem+var(--safe-area-bottom))]',
    }"
  >
    <template #body>
      <UButton
        color="neutral"
        variant="soft"
        size="lg"
        block
        leading-icon="i-lucide-pencil"
        class="justify-start"
        @click="openEdit"
      >
        {{ $t('common.edit') }}
      </UButton>
      <UButton
        color="error"
        variant="soft"
        size="lg"
        block
        leading-icon="i-lucide-trash-2"
        class="justify-start"
        @click="openDelete"
      >
        {{ $t('common.delete') }}
      </UButton>
    </template>
  </UDrawer>
</template>
