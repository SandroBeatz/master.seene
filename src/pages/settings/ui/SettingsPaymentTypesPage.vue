<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import { createReusableTemplate } from '@vueuse/core'
import { useIsMobile } from '@shared/lib/viewport'
import { useMobilePushActions } from '@widgets/mobile-shell'
import {
  ensureSystemPaymentTypes,
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

// Server already returns methods in their sort order; the list is read-only now.
const list = computed(() => paymentTypes.value ?? [])

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

const isMobile = useIsMobile()

// On mobile the add button lives in the push header — register it there rather
// than rendering it in the page body. Cleared on unmount so it doesn't leak to
// the next screen.
const { setActions, clearActions } = useMobilePushActions()
watchEffect(() => {
  if (isMobile.value && !isLoading.value) {
    setActions([
      {
        icon: 'i-lucide-plus',
        ariaLabel: t('settings.paymentTypes.addCustomButton'),
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
      <Typography variant="h5" class="text-highlighted font-bold">
        {{ t('settings.paymentTypes.title') }}
      </Typography>
      <p class="text-sm text-muted">{{ t('settings.paymentTypes.subtitle') }}</p>
    </div>
  </DefineHeaderText>

  <DefineBody>
    <div class="flex flex-col gap-2">
      <!-- Loading skeletons -->
      <template v-if="isLoading">
        <div
          v-for="i in 3"
          :key="i"
          class="flex items-center gap-3 rounded-lg border border-default bg-background p-3"
        >
          <USkeleton class="size-12 shrink-0 rounded-xl" />
          <div class="flex-1 space-y-2">
            <USkeleton class="h-4 w-1/3" />
            <USkeleton class="h-3 w-1/4" />
          </div>
          <USkeleton class="h-6 w-11 shrink-0 rounded-full" />
        </div>
      </template>

      <template v-else>
        <div
          v-for="pt in list"
          :key="pt.id"
          class="flex items-center gap-3 rounded-lg border border-default bg-background p-3 transition-colors hover:bg-elevated"
        >
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
            <div class="min-w-0 flex-1 transition-opacity" :class="{ 'opacity-50': !pt.is_active }">
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
            :aria-label="t('settings.paymentTypes.deleteAction')"
            @click="openDelete(pt)"
          />
          <USwitch :model-value="pt.is_active" @update:model-value="onToggle(pt, $event)" />
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
          v-if="!isLoading"
          icon="i-lucide-plus"
          color="primary"
          square
          :aria-label="t('settings.paymentTypes.addCustomButton')"
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
