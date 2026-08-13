<script setup lang="ts">
import { computed, onUnmounted, ref, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import { createReusableTemplate } from '@vueuse/core'
import { useIsMobile } from '@shared/lib/viewport'
import { useMobilePushActions } from '@widgets/mobile-shell'
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

const { data: categories, isPending } = useServiceCategoriesQuery(userId)
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

const isMobile = useIsMobile()

// On mobile the add button lives in the push header — register it there rather
// than rendering it in the page body. Cleared on unmount so it doesn't leak to
// the next screen.
const { setActions, clearActions } = useMobilePushActions()
watchEffect(() => {
  if (isMobile.value && !isPending.value) {
    setActions([
      {
        icon: 'i-lucide-plus',
        ariaLabel: t('settings.serviceCategories.addButton'),
        onClick: openCreate,
      },
    ])
  } else {
    clearActions()
  }
})
onUnmounted(clearActions)

// Reused across the two layouts so the markup isn't duplicated: desktop wraps
// it in a UCard, mobile drops the card and renders flush inside the p-4 gutter.
const [DefineHeaderText, ReuseHeaderText] = createReusableTemplate()
const [DefineBody, ReuseBody] = createReusableTemplate()

const hostUI = {
  root: 'rounded-xl shadow-panel ring-0 divide-y-0',
  header: 'pb-0',
}
</script>

<template>
  <DefineHeaderText>
    <div class="flex flex-col gap-1">
      <Typography variant="h4" class="text-highlighted font-bold">
        {{ t('settings.serviceCategories.title') }}
      </Typography>
      <p class="text-sm text-muted">{{ t('settings.serviceCategories.subtitle') }}</p>
    </div>
  </DefineHeaderText>

  <DefineBody>
    <div class="flex flex-col gap-2">
      <!-- Loading skeletons -->
      <template v-if="isPending">
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
    </div>
  </DefineBody>

  <!-- Desktop: card surface with the add button in the header. -->
  <UCard v-if="!isMobile" :ui="hostUI">
    <template #header>
      <div class="flex items-start justify-between gap-3">
        <ReuseHeaderText />
        <UButton
          v-if="!isPending"
          icon="i-lucide-plus"
          color="primary"
          square
          :aria-label="t('settings.serviceCategories.addButton')"
          @click="openCreate"
        />
      </div>
    </template>
    <ReuseBody />
  </UCard>

  <!-- Mobile: no card; the add button is registered into the push header. -->
  <div v-else class="flex flex-col gap-4">
    <ReuseHeaderText />
    <ReuseBody />
  </div>

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
