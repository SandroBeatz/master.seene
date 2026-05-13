<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import draggable from 'vuedraggable'
import {
  ensureDefaultPaymentType,
  updatePaymentTypeSortOrders,
  useDeletePaymentTypeMutation,
  usePaymentTypesQuery,
  type PaymentType,
} from '@entities/payment-type'
import { useSessionStore } from '@entities/session'
import { PaymentTypeFormModal } from '@features/payment-type-form'

const { t } = useI18n()
const toast = useToast()
const sessionStore = useSessionStore()

const userId = computed(() => sessionStore.session?.user.id ?? '')

const { data: paymentTypes } = usePaymentTypesQuery(userId)
const deleteMutation = useDeletePaymentTypeMutation(userId)

onMounted(async () => {
  if (userId.value) {
    await ensureDefaultPaymentType(userId.value)
  }
})

// Local copy for drag-and-drop reordering
const sortedList = ref<PaymentType[]>([])

watch(
  paymentTypes,
  (val) => {
    if (val) sortedList.value = [...val]
  },
  { immediate: true },
)

async function onDragEnd() {
  const updates = sortedList.value
    .map((pt, index) => ({ id: pt.id, sort_order: index }))
    .filter((item, index) => {
      const original = paymentTypes.value?.[index]
      return !original || original.id !== item.id || original.sort_order !== item.sort_order
    })

  if (updates.length === 0) return

  try {
    await updatePaymentTypeSortOrders(sortedList.value.map((pt, i) => ({ id: pt.id, sort_order: i })))
  } catch {
    toast.add({ title: t('settings.paymentTypes.deleteError'), color: 'error' })
    // revert
    if (paymentTypes.value) sortedList.value = [...paymentTypes.value]
  }
}

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

// Delete confirmation
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
</script>

<template>
  <UTheme
    :ui="{
      page: {
        root: 'p-0',
      },
      pageHeader: {
        root: 'pt-0 pb-4 border-none',
      },
    }"
  >
    <UPage>
      <UPageHeader :title="$t('settings.paymentTypes.title')">
        <template #links>
          <UButton leading-icon="i-lucide-plus" color="primary" @click="openCreate">
            {{ $t('settings.paymentTypes.addButton') }}
          </UButton>
        </template>
      </UPageHeader>

      <UPageBody>
        <div v-if="sortedList.length > 0" class="flex flex-col gap-2">
          <draggable
            v-model="sortedList"
            item-key="id"
            handle=".drag-handle"
            class="flex flex-col gap-2"
            @end="onDragEnd"
          >
            <template #item="{ element: pt }">
              <div
                class="flex items-center gap-3 p-3 rounded-lg border border-default bg-background hover:bg-elevated transition-colors"
              >
                <UIcon
                  name="i-lucide-grip-vertical"
                  class="drag-handle cursor-grab text-muted shrink-0"
                />
                <div
                  class="w-4 h-4 rounded-full shrink-0"
                  :style="{ backgroundColor: pt.color }"
                />
                <span class="flex-1 text-sm font-medium">{{ pt.name }}</span>
                <UBadge v-if="pt.is_default" variant="soft" color="neutral" size="sm">
                  {{ $t('settings.paymentTypes.defaultBadge') }}
                </UBadge>
                <div class="flex items-center gap-1">
                  <UButton
                    icon="i-lucide-pencil"
                    color="neutral"
                    variant="ghost"
                    size="sm"
                    @click="openEdit(pt)"
                  />
                  <UTooltip
                    :text="pt.is_default ? $t('settings.paymentTypes.deleteDisabledTooltip') : ''"
                    :disabled="!pt.is_default"
                  >
                    <UButton
                      icon="i-lucide-trash-2"
                      color="error"
                      variant="ghost"
                      size="sm"
                      :disabled="pt.is_default"
                      @click="openDelete(pt)"
                    />
                  </UTooltip>
                </div>
              </div>
            </template>
          </draggable>
        </div>

        <UCard v-else variant="soft">
          <div class="flex flex-col items-center gap-2 py-8 text-center">
            <UIcon name="i-lucide-credit-card" class="text-4xl text-muted" />
            <p class="font-medium">{{ $t('settings.paymentTypes.emptyTitle') }}</p>
            <p class="text-sm text-muted">{{ $t('settings.paymentTypes.emptyDescription') }}</p>
          </div>
        </UCard>
      </UPageBody>
    </UPage>
  </UTheme>

  <PaymentTypeFormModal
    v-model="isFormOpen"
    :payment-type="editingPaymentType"
  />

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
