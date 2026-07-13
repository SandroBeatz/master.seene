<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  useDeleteServiceCategoryMutation,
  useServiceCategoriesQuery,
  type ServiceCategory,
} from '@entities/service-category'
import { useSessionStore } from '@entities/session'
import { ServiceCategoryFormModal } from '@features/service-category-form'
import { Typography } from '@shared/ui'

const { t } = useI18n()
const toast = useToast()
const sessionStore = useSessionStore()

const userId = computed(() => sessionStore.session?.user.id ?? '')

const { data: categories, isLoading } = useServiceCategoriesQuery(userId)
const deleteMutation = useDeleteServiceCategoryMutation(userId)

// --- Create / edit ---------------------------------------------------------
const isFormOpen = ref(false)
const editing = ref<ServiceCategory | null>(null)

function openCreate() {
  editing.value = null
  isFormOpen.value = true
}

function openEdit(category: ServiceCategory) {
  editing.value = category
  isFormOpen.value = true
}

// --- Delete ----------------------------------------------------------------
const isDeleteOpen = ref(false)
const deleting = ref<ServiceCategory | null>(null)
const isDeleting = ref(false)

function openDelete(category: ServiceCategory) {
  deleting.value = category
  isDeleteOpen.value = true
}

async function confirmDelete() {
  if (!deleting.value) return
  isDeleting.value = true
  try {
    await deleteMutation.mutateAsync(deleting.value.id)
    toast.add({ title: t('settings.serviceCategories.deleteSuccess'), color: 'success' })
    isDeleteOpen.value = false
    deleting.value = null
  } catch {
    toast.add({ title: t('settings.serviceCategories.deleteError'), color: 'error' })
  } finally {
    isDeleting.value = false
  }
}

const hostUI = {
  root: 'rounded-xl shadow-panel ring-0 divide-y-0',
  header: 'pb-0',
}
</script>

<template>
  <UCard :ui="hostUI">
    <template #header>
      <Typography variant="h5" class="text-highlighted font-bold">
        {{ t('settings.serviceCategories.title') }}
      </Typography>
      <p class="mt-1 text-sm text-muted">{{ t('settings.serviceCategories.subtitle') }}</p>
    </template>

    <div class="flex flex-col gap-2">
      <!-- Loading skeletons -->
      <template v-if="isLoading">
        <div
          v-for="i in 3"
          :key="i"
          class="flex items-center gap-3 rounded-lg border border-default bg-background p-3"
        >
          <USkeleton class="size-9 shrink-0 rounded-lg" />
          <USkeleton class="h-4 w-1/3" />
        </div>
      </template>

      <!-- Empty -->
      <p
        v-else-if="!categories?.length"
        class="rounded-lg border border-dashed border-default px-3 py-8 text-center text-sm text-muted"
      >
        {{ t('settings.serviceCategories.empty') }}
      </p>

      <!-- List -->
      <template v-else>
        <div
          v-for="category in categories"
          :key="category.id"
          class="flex items-center gap-3 rounded-lg border border-default bg-background p-3 transition-colors hover:bg-elevated"
        >
          <button
            type="button"
            class="flex min-w-0 flex-1 items-center gap-3 text-left"
            @click="openEdit(category)"
          >
            <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-elevated">
              <UIcon name="i-lucide-tag" class="size-4.5 text-muted" />
            </div>
            <span class="min-w-0 flex-1 truncate text-sm font-bold">{{ category.name }}</span>
          </button>

          <UButton
            icon="i-lucide-pencil"
            color="neutral"
            variant="ghost"
            size="sm"
            :aria-label="$t('common.edit')"
            @click="openEdit(category)"
          />
          <UButton
            icon="i-lucide-trash-2"
            color="neutral"
            variant="ghost"
            size="sm"
            :aria-label="$t('common.delete')"
            @click="openDelete(category)"
          />
        </div>
      </template>

      <UButton
        v-if="!isLoading"
        leading-icon="i-lucide-plus"
        color="primary"
        variant="link"
        class="mt-1 self-start"
        @click="openCreate"
      >
        {{ t('settings.serviceCategories.addButton') }}
      </UButton>
    </div>
  </UCard>

  <ServiceCategoryFormModal v-model="isFormOpen" :category="editing" />

  <UModal
    v-model:open="isDeleteOpen"
    :title="$t('settings.serviceCategories.deleteConfirmTitle')"
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <p class="text-sm text-muted">
        {{ $t('settings.serviceCategories.deleteConfirmBody', { name: deleting?.name }) }}
      </p>
    </template>
    <template #footer="{ close }">
      <UButton color="neutral" variant="outline" @click="close">
        {{ $t('settings.serviceCategories.form.cancel') }}
      </UButton>
      <UButton color="error" :loading="isDeleting" @click="confirmDelete">
        {{ $t('settings.serviceCategories.deleteAction') }}
      </UButton>
    </template>
  </UModal>
</template>
