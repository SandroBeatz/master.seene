<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
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
import { useMobilePushTitle } from '@widgets/mobile-shell'

const { t } = useI18n()
const toast = useToast()
const route = useRoute()
const router = useRouter()
const sessionStore = useSessionStore()
const { setTitle } = useMobilePushTitle()

const userId = computed(() => sessionStore.session?.user.id ?? '')
const { data: clients } = useClientsQuery(userId)
const removeMutation = useRemoveClientMutation(userId)
const toggleFavoriteMutation = useToggleFavoriteClientMutation(userId)

const clientId = computed(() => String(route.params.id))
const client = computed(() => clients.value?.find((c) => c.id === clientId.value) ?? null)

watchEffect(() => {
  if (client.value) {
    setTitle([client.value.first_name, client.value.last_name].filter(Boolean).join(' '))
  }
})

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
  <ClientDetailsPanel
    v-if="client"
    :client="client"
    @edit="formOpen = true"
    @delete="deleteOpen = true"
    @toggle-favorite="toggleFavorite"
    @close="goBack"
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
</template>
