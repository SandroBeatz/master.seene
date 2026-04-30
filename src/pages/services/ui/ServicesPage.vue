<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDeleteServiceMutation, useServicesQuery, type Service } from '@entities/service'
import { useSessionStore } from '@entities/session'
import { ServiceFormModal } from '@features/service-form'

const { t } = useI18n()
const toast = useToast()
const sessionStore = useSessionStore()

const userId = computed(() => sessionStore.session?.user.id ?? '')

const { data: services, isLoading, error, refetch } = useServicesQuery(userId)
const deleteMutation = useDeleteServiceMutation(userId)

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

function formatDuration(minutes: number) {
  return t('services.form.minutesLabel', { n: minutes })
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(price)
}

const cardActions = (service: Service) => [
  [
    {
      label: t('common.edit'),
      icon: 'i-lucide-pencil',
      onSelect: () => openEdit(service),
    },
  ],
  [
    {
      label: t('common.delete'),
      icon: 'i-lucide-trash-2',
      color: 'error' as const,
      onSelect: () => openDelete(service),
    },
  ],
]
</script>

<template>
  <UTheme
    :ui="{
      page: { root: 'px-12 py-3 w-full max-w-7xl mx-auto' },
      pageHeader: { root: 'border-none pb-2' },
    }"
  >
    <UPage as="main">
      <UPageHeader :title="$t('services.title')">
        <template #links>
          <UButton leading-icon="i-lucide-plus" color="neutral" @click="openCreate">
            {{ $t('services.addService') }}
          </UButton>
        </template>
      </UPageHeader>

      <UPageBody>
        <UPageCard variant="soft">
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

          <!-- Loading -->
          <div v-else-if="isLoading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <UCard v-for="i in 6" :key="i">
              <div class="space-y-3">
                <USkeleton class="h-5 w-3/4" />
                <USkeleton class="h-4 w-full" />
                <USkeleton class="h-4 w-1/2" />
              </div>
            </UCard>
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

          <!-- Services grid -->
          <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <UCard v-for="service in services" :key="service.id">
              <template #header>
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <p class="font-semibold text-base truncate">{{ service.name }}</p>
                    <p v-if="service.description" class="text-sm text-muted truncate mt-0.5">
                      {{ service.description }}
                    </p>
                  </div>
                  <UDropdownMenu :items="cardActions(service)" :ui="{ content: 'w-40' }">
                    <UButton
                      color="neutral"
                      variant="ghost"
                      icon="i-lucide-more-horizontal"
                      size="sm"
                    />
                  </UDropdownMenu>
                </div>
              </template>

              <div class="flex flex-wrap items-center gap-3 text-sm">
                <div class="flex items-center gap-1.5 text-muted">
                  <UIcon name="i-lucide-clock" class="size-4 shrink-0" />
                  {{ formatDuration(service.duration) }}
                </div>
                <div class="flex items-center gap-1.5 font-medium">
                  <UIcon name="i-lucide-wallet" class="size-4 shrink-0 text-muted" />
                  {{ formatPrice(service.price) }}
                </div>
              </div>

              <template #footer>
                <div class="flex items-center justify-between gap-2">
                  <UBadge
                    :label="service.category?.name ?? $t('services.form.allServices')"
                    color="neutral"
                    variant="soft"
                    size="sm"
                  />
                  <UBadge
                    :label="service.is_active ? $t('services.active') : $t('services.inactive')"
                    :color="service.is_active ? 'success' : 'neutral'"
                    variant="soft"
                    size="sm"
                  />
                </div>
              </template>
            </UCard>
          </div>
        </UPageCard>
      </UPageBody>
    </UPage>
  </UTheme>

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
