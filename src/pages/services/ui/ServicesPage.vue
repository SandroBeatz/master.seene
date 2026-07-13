<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  useDeleteServiceMutation,
  useServicesQuery,
  useUpdateServiceMutation,
  type Service,
} from '@entities/service'
import { useServiceCategoriesQuery } from '@entities/service-category'
import { useSessionStore } from '@entities/session'
import { ServiceFormModal } from '@features/service-form'
import { useFormats } from '@shared/lib/formats'
import { Page } from '@shared/ui'

const { t } = useI18n()
const toast = useToast()
const sessionStore = useSessionStore()
const f = useFormats()

const userId = computed(() => sessionStore.session?.user.id ?? '')

const { data: services, isPending, error } = useServicesQuery(userId)
const { data: categories } = useServiceCategoriesQuery(userId)
const deleteMutation = useDeleteServiceMutation(userId)
const updateMutation = useUpdateServiceMutation(userId)

// Header summary — total and active counts.
const summary = computed(() => {
  const list = services.value ?? []
  if (!list.length) return undefined
  const active = list.filter((s) => s.is_active).length
  return t('services.countSummary', { total: list.length, active })
})

// Category filter chips.
const activeCategory = ref<string>('all')

const categoryChips = computed(() => {
  const list = services.value ?? []
  const chips = [{ id: 'all', label: t('services.filterAll'), count: list.length }]
  for (const c of categories.value ?? []) {
    chips.push({
      id: c.id,
      label: c.name,
      count: list.filter((s) => s.category_id === c.id).length,
    })
  }
  return chips
})

const filteredServices = computed(() => {
  const list = services.value ?? []
  const scoped =
    activeCategory.value === 'all'
      ? list
      : list.filter((s) => s.category_id === activeCategory.value)
  // Inactive services always sink to the bottom; within each group order by
  // creation date (oldest first).
  return [...scoped].sort((a, b) => {
    if (a.is_active !== b.is_active) return a.is_active ? -1 : 1
    return a.created_at.localeCompare(b.created_at)
  })
})

// Form modal
const isFormOpen = ref(false)
const editingService = ref<Service | null>(null)

function openCreate() {
  editingService.value = null
  isFormOpen.value = true
}

function openEdit(service: Service) {
  editingService.value = service
  isFormOpen.value = true
}

// Inline active toggle
const updatingId = ref<string | null>(null)

async function toggleActive(service: Service, value: boolean) {
  updatingId.value = service.id
  try {
    await updateMutation.mutateAsync({ id: service.id, is_active: value })
  } catch {
    toast.add({ title: t('services.form.errorTitle'), color: 'error' })
  } finally {
    updatingId.value = null
  }
}

// Delete confirm modal
const isDeleteOpen = ref(false)
const deletingService = ref<Service | null>(null)
const isDeleting = ref(false)

function openDelete(service: Service) {
  deletingService.value = service
  isDeleteOpen.value = true
}

async function confirmDelete() {
  if (!deletingService.value) return
  isDeleting.value = true
  try {
    await deleteMutation.mutateAsync(deletingService.value.id)
    isDeleteOpen.value = false
    deletingService.value = null
  } catch {
    toast.add({ title: t('services.form.errorTitle'), color: 'error' })
  } finally {
    isDeleting.value = false
  }
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours && mins)
    return `${t('services.durationHours', { n: hours })} ${t('services.form.minutesLabel', { n: mins })}`
  if (hours) return t('services.durationHours', { n: hours })
  return t('services.form.minutesLabel', { n: mins })
}
</script>

<template>
  <Page :title="$t('services.title')" :description="summary">
    <template #header-right>
      <UButton leading-icon="i-lucide-plus" color="neutral" @click="openCreate">
        {{ $t('services.addService') }}
      </UButton>
    </template>

    <!-- Error -->
    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      :title="$t('services.loadError')"
      :description="(error as Error).message"
      leading-icon="i-lucide-alert-circle"
      class="mb-6"
    />

    <!-- Loading (only the very first load, never on background refetch) -->
    <div v-else-if="isPending" class="space-y-3">
      <div
        v-for="i in 5"
        :key="i"
        class="flex items-center gap-4 rounded-xl bg-default px-5 py-4 ring-1 ring-default"
      >
        <div class="min-w-0 flex-1 space-y-2">
          <USkeleton class="h-3 w-16" />
          <USkeleton class="h-4 w-1/3" />
          <USkeleton class="h-3 w-2/3" />
        </div>
        <USkeleton class="h-6 w-16 rounded-full" />
        <USkeleton class="h-5 w-12" />
        <USkeleton class="h-5 w-9 rounded-full" />
      </div>
    </div>

    <!-- Empty -->
    <UEmpty
      v-else-if="!services?.length"
      icon="i-lucide-scissors"
      :title="$t('services.emptyTitle')"
      :description="$t('services.emptyDescription')"
      class="py-16"
    >
      <UButton leading-icon="i-lucide-plus" color="primary" class="mt-4" @click="openCreate">
        {{ $t('services.addFirstService') }}
      </UButton>
    </UEmpty>

    <template v-else>
      <!-- Category filters -->
      <div class="mb-6 flex flex-wrap gap-2">
        <UButton
          v-for="chip in categoryChips"
          :key="chip.id"
          color="neutral"
          :variant="activeCategory === chip.id ? 'solid' : 'soft'"
          size="sm"
          class="rounded-full"
          @click="activeCategory = chip.id"
        >
          {{ chip.label }}
          <span
            class="ml-1 tabular-nums"
            :class="activeCategory === chip.id ? 'opacity-70' : 'text-dimmed'"
          >
            {{ chip.count }}
          </span>
        </UButton>
      </div>

      <!-- Services list -->
      <div class="space-y-3">
        <div
          v-for="service in filteredServices"
          :key="service.id"
          class="relative flex items-center gap-4 rounded-xl bg-default py-4 pl-8 pr-4 ring-1 ring-default transition-opacity"
          :class="{ 'opacity-55': !service.is_active }"
        >
          <span
            class="absolute inset-y-3 left-3 w-1.5 rounded-full"
            :style="{ backgroundColor: service.color }"
          />

          <div class="min-w-0 flex-1">
            <p class="text-xs font-medium uppercase tracking-wide text-dimmed">
              {{ service.category?.name ?? $t('services.form.allServices') }}
            </p>
            <p class="truncate font-semibold">{{ service.name }}</p>
            <p v-if="service.description" class="mt-0.5 line-clamp-2 max-w-md text-sm text-muted">
              {{ service.description }}
            </p>
          </div>

          <UBadge
            color="neutral"
            variant="soft"
            size="lg"
            class="shrink-0 rounded-full"
            leading-icon="i-lucide-clock"
            :label="formatDuration(service.duration)"
          />

          <span class="w-20 shrink-0 text-right font-semibold tabular-nums">
            {{ f.price(service.price) }}
          </span>

          <USwitch
            :model-value="service.is_active"
            :disabled="updatingId === service.id"
            :aria-label="$t('services.toggleAvailabilityAria')"
            class="shrink-0"
            @update:model-value="(v: boolean) => toggleActive(service, v)"
          />

          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            icon="i-lucide-pencil"
            :aria-label="$t('common.edit')"
            @click="openEdit(service)"
          />
          <UButton
            color="error"
            variant="ghost"
            size="sm"
            icon="i-lucide-trash-2"
            :aria-label="$t('common.delete')"
            @click="openDelete(service)"
          />
        </div>
      </div>
    </template>
  </Page>

  <!-- Create / Edit modal -->
  <ServiceFormModal v-model="isFormOpen" :service="editingService" />

  <!-- Delete confirm modal -->
  <UModal
    v-model:open="isDeleteOpen"
    :title="$t('services.deleteConfirmTitle')"
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <p class="text-sm text-muted">
        {{ $t('services.deleteConfirmBody', { name: deletingService?.name }) }}
      </p>
    </template>
    <template #footer="{ close }">
      <UButton color="neutral" variant="outline" @click="close">
        {{ $t('services.form.cancel') }}
      </UButton>
      <UButton color="error" :loading="isDeleting" @click="confirmDelete">
        {{ $t('services.deleteAction') }}
      </UButton>
    </template>
  </UModal>
</template>
