<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import draggable from 'vuedraggable'
import {
  ensureSystemPaymentTypes,
  updatePaymentTypeSortOrders,
  useDeletePaymentTypeMutation,
  usePaymentTypesQuery,
  useSetPaymentTypeActiveMutation,
  type PaymentType,
  type PaymentTypeKind,
} from '@entities/payment-type'
import { useSessionStore } from '@entities/session'
import { PaymentTypeFormModal } from '@features/payment-type-form'
import { Typography } from '@shared/ui'

const { t } = useI18n()
const toast = useToast()
const sessionStore = useSessionStore()

const userId = computed(() => sessionStore.session?.user.id ?? '')

const { data: paymentTypes, isLoading } = usePaymentTypesQuery(userId)
const deleteMutation = useDeletePaymentTypeMutation(userId)
const setActiveMutation = useSetPaymentTypeActiveMutation(userId)

onMounted(async () => {
  if (userId.value) {
    await ensureSystemPaymentTypes(userId.value)
  }
})

// --- Display helpers -------------------------------------------------------
const KIND_ICON: Record<PaymentTypeKind, string> = {
  cash: 'i-lucide-banknote',
  card: 'i-lucide-credit-card',
  custom: 'i-lucide-circle-dollar-sign',
}

function methodIcon(pt: PaymentType): string {
  return KIND_ICON[pt.kind]
}

function methodName(pt: PaymentType): string {
  if (pt.kind === 'cash') return t('settings.paymentTypes.system.cash.name')
  if (pt.kind === 'card') return t('settings.paymentTypes.system.card.name')
  return pt.name
}

function methodSubtitle(pt: PaymentType): string {
  if (pt.kind === 'cash') return t('settings.paymentTypes.system.cash.subtitle')
  if (pt.kind === 'card') return t('settings.paymentTypes.system.card.subtitle')
  return ''
}

// Local copy of the full list so drag-and-drop can reorder any method optimistically.
const sortedList = ref<PaymentType[]>([])

watch(
  paymentTypes,
  (val) => {
    if (val) sortedList.value = [...val]
  },
  { immediate: true },
)

async function onDragEnd() {
  // Skip if the order didn't actually change (vuedraggable fires @end on any drop).
  const current = sortedList.value.map((pt) => pt.id).join()
  const original = (paymentTypes.value ?? []).map((pt) => pt.id).join()
  if (current === original) return

  const updates = sortedList.value.map((pt, i) => ({ id: pt.id, sort_order: i }))
  try {
    await updatePaymentTypeSortOrders(updates)
    toast.add({ title: t('settings.paymentTypes.reorderSuccess'), color: 'success' })
  } catch {
    toast.add({ title: t('settings.paymentTypes.saveError'), color: 'error' })
    if (paymentTypes.value) sortedList.value = [...paymentTypes.value]
  }
}

async function onToggle(pt: PaymentType, value: boolean) {
  try {
    await setActiveMutation.mutateAsync({ id: pt.id, is_active: value })
  } catch {
    toast.add({ title: t('settings.paymentTypes.saveError'), color: 'error' })
  }
}

// --- Create / edit ---------------------------------------------------------
const isFormOpen = ref(false)
const editingPaymentType = ref<PaymentType | null>(null)

function openCreate() {
  editingPaymentType.value = null
  isFormOpen.value = true
}

function openEdit(pt: PaymentType) {
  editingPaymentType.value = pt
  isFormOpen.value = true
}

// --- Delete (custom only) --------------------------------------------------
const isDeleteOpen = ref(false)
const deletingPaymentType = ref<PaymentType | null>(null)
const isDeleting = ref(false)

function openDelete(pt: PaymentType) {
  deletingPaymentType.value = pt
  isDeleteOpen.value = true
}

async function confirmDelete() {
  if (!deletingPaymentType.value) return
  isDeleting.value = true
  try {
    await deleteMutation.mutateAsync(deletingPaymentType.value.id)
    toast.add({ title: t('settings.paymentTypes.deleteSuccess'), color: 'success' })
    isDeleteOpen.value = false
    deletingPaymentType.value = null
  } catch {
    toast.add({ title: t('settings.paymentTypes.deleteError'), color: 'error' })
  } finally {
    isDeleting.value = false
  }
}

// Nuxt UI overrides
const hostUI = {
  root: 'rounded-xl shadow-panel ring-0 divide-y-0',
  header: 'pb-0',
}
</script>

<template>
  <UCard :ui="hostUI">
    <template #header>
      <Typography variant="h5" class="text-highlighted font-bold">
        {{ t('settings.paymentTypes.title') }}
      </Typography>
      <p class="mt-1 text-sm text-muted">{{ t('settings.paymentTypes.subtitle') }}</p>
    </template>

    <div class="flex flex-col gap-2">
      <!-- Loading skeletons -->
      <template v-if="isLoading">
        <div
          v-for="i in 3"
          :key="i"
          class="flex items-center gap-3 rounded-lg border border-default bg-background p-3"
        >
          <USkeleton class="size-4 shrink-0 rounded" />
          <USkeleton class="size-12 shrink-0 rounded-xl" />
          <div class="flex-1 space-y-2">
            <USkeleton class="h-4 w-1/3" />
            <USkeleton class="h-3 w-1/4" />
          </div>
          <USkeleton class="h-6 w-11 shrink-0 rounded-full" />
        </div>
      </template>

      <draggable
        v-else
        v-model="sortedList"
        item-key="id"
        handle=".drag-handle"
        class="flex flex-col gap-2"
        @end="onDragEnd"
      >
        <template #item="{ element: pt }">
          <div
            class="flex items-center gap-3 rounded-lg border border-default bg-background p-3 transition-colors hover:bg-elevated"
          >
            <UIcon
              name="i-lucide-grip-vertical"
              class="drag-handle shrink-0 cursor-grab text-muted"
            />

            <!-- Custom method: tile + name are clickable to edit -->
            <button
              v-if="pt.kind === 'custom'"
              type="button"
              class="flex min-w-0 flex-1 items-center gap-3 text-left"
              @click="openEdit(pt)"
            >
              <div
                class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-opacity"
                :class="{ 'opacity-50': !pt.is_active }"
                :style="{ backgroundColor: `${pt.color}1a` }"
              >
                <UIcon
                  name="i-lucide-circle-dollar-sign"
                  class="size-5"
                  :style="{ color: pt.color }"
                />
              </div>
              <span
                class="min-w-0 flex-1 truncate text-sm font-bold transition-opacity"
                :class="{ 'opacity-50': !pt.is_active }"
                >{{ pt.name }}</span
              >
            </button>

            <!-- System method: neutral tile, fixed i18n name + subtitle -->
            <div v-else class="flex min-w-0 flex-1 items-center gap-3">
              <div
                class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-elevated transition-opacity"
                :class="{ 'opacity-50': !pt.is_active }"
              >
                <UIcon :name="methodIcon(pt)" class="size-5 text-muted" />
              </div>
              <div
                class="min-w-0 flex-1 transition-opacity"
                :class="{ 'opacity-50': !pt.is_active }"
              >
                <p class="truncate text-sm font-bold">{{ methodName(pt) }}</p>
                <p class="truncate text-xs text-muted">{{ methodSubtitle(pt) }}</p>
              </div>
            </div>

            <UButton
              v-if="pt.kind === 'custom'"
              icon="i-lucide-trash-2"
              color="neutral"
              variant="ghost"
              size="sm"
              @click="openDelete(pt)"
            />
            <USwitch :model-value="pt.is_active" @update:model-value="onToggle(pt, $event)" />
          </div>
        </template>
      </draggable>

      <UButton
        v-if="!isLoading"
        leading-icon="i-lucide-plus"
        color="primary"
        variant="link"
        class="mt-1 self-start"
        @click="openCreate"
      >
        {{ t('settings.paymentTypes.addCustomButton') }}
      </UButton>
    </div>
  </UCard>

  <PaymentTypeFormModal v-model="isFormOpen" :payment-type="editingPaymentType" />

  <UModal
    v-model:open="isDeleteOpen"
    :title="$t('settings.paymentTypes.deleteConfirmTitle')"
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <p class="text-sm text-muted">
        {{ $t('settings.paymentTypes.deleteConfirmBody', { name: deletingPaymentType?.name }) }}
      </p>
    </template>
    <template #footer="{ close }">
      <UButton color="neutral" variant="outline" @click="close">
        {{ $t('settings.paymentTypes.form.cancel') }}
      </UButton>
      <UButton color="error" :loading="isDeleting" @click="confirmDelete">
        {{ $t('settings.paymentTypes.deleteAction') }}
      </UButton>
    </template>
  </UModal>
</template>
