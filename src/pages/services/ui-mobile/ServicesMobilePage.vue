<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonButton,
  IonIcon,
  IonContent,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonList,
  IonItem,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  IonReorderGroup,
  IonReorder,
  IonFab,
  IonFabButton,
  IonSpinner,
  alertController,
  toastController,
  type ItemReorderEventDetail,
} from '@ionic/vue'
import { add, checkmark, swapVertical, trash } from 'ionicons/icons'
import {
  useServicesQuery,
  useDeleteServiceMutation,
  type Service,
} from '@entities/service'
import { useServiceCategoriesQuery } from '@entities/service-category'
import { ServiceFormMobile } from '@features/service-form/index.mobile'
import { useSessionStore } from '@entities/session'
import { useFormats } from '@shared/lib/formats'

const { t } = useI18n()
const sessionStore = useSessionStore()
const userId = computed(() => sessionStore.session?.user.id ?? '')
const f = useFormats()

// The same Colada queries the desktop services page uses — shared cache, shared
// Supabase calls. Nothing about data fetching is duplicated for mobile.
const { data: services, isPending } = useServicesQuery(userId)
const { data: categories } = useServiceCategoriesQuery(userId)
const deleteMutation = useDeleteServiceMutation(userId)

// Category filter — 'all' plus one entry per category, each with a live count.
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
  // creation date (oldest first) — mirrors the desktop page.
  return [...scoped].sort((a, b) => {
    if (a.is_active !== b.is_active) return a.is_active ? -1 : 1
    return a.created_at.localeCompare(b.created_at)
  })
})

// --- Reorder ---------------------------------------------------------------
// A local, mutable copy of the visible list so drag-reordering has something to
// move. Not persisted yet — the manual order lives only until the data or the
// active filter changes.
const reorderEnabled = ref(false)
const displayList = ref<Service[]>([])
watch(
  filteredServices,
  (list) => {
    displayList.value = [...list]
  },
  { immediate: true },
)

function handleReorder(ev: CustomEvent<ItemReorderEventDetail>) {
  displayList.value = ev.detail.complete([...displayList.value])
}

// --- Create / edit ---------------------------------------------------------
const isFormOpen = ref(false)
const formMode = ref<'create' | 'edit'>('create')
const editing = ref<Service | null>(null)

// The top-level router outlet is the "presenting element" that lets the modal
// render as an iOS card (full-height sheet with the page scaled behind it).
const presentingElement = ref<HTMLElement | null>(null)
onMounted(() => {
  presentingElement.value = document.querySelector('ion-router-outlet')
})

function openCreate() {
  formMode.value = 'create'
  editing.value = null
  isFormOpen.value = true
}

function openEdit(service: Service) {
  formMode.value = 'edit'
  editing.value = service
  isFormOpen.value = true
}

async function showToast(message: string, color: 'success' | 'danger') {
  const toast = await toastController.create({ message, duration: 2000, color, position: 'top' })
  await toast.present()
}

// --- Delete ----------------------------------------------------------------
async function deleteService(service: Service) {
  try {
    await deleteMutation.mutateAsync(service.id)
    await showToast(t('services.deleteSuccess'), 'success')
  } catch {
    await showToast(t('services.deleteError'), 'danger')
  }
}

// Shared confirm dialog — used both by the swipe action and by the form's
// delete button (edit mode).
async function confirmDelete(service: Service) {
  const alert = await alertController.create({
    header: t('services.deleteConfirmTitle'),
    message: t('services.deleteConfirmBody', { name: service.name }),
    buttons: [
      { text: t('services.form.cancel'), role: 'cancel' },
      {
        text: t('services.deleteAction'),
        role: 'destructive',
        handler: () => {
          void deleteService(service)
        },
      },
    ],
  })
  await alert.present()
  await alert.onDidDismiss()
}

// Swipe reveals a destructive option; confirm before deleting and collapse the
// sliding item afterwards so a cancelled swipe doesn't stay stuck open.
async function onSwipeDelete(service: Service, ev: Event) {
  const sliding = (ev.currentTarget as HTMLElement | null)?.closest('ion-item-sliding') as
    | (HTMLElement & { close: () => Promise<void> })
    | null
  await confirmDelete(service)
  await sliding?.close()
}

function categoryName(service: Service): string {
  return service.category?.name ?? t('services.form.allServices')
}
</script>

<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/settings" />
        </ion-buttons>
        <ion-title>{{ $t('services.title') }}</ion-title>
        <ion-buttons slot="end">
          <ion-button
            :aria-label="reorderEnabled ? $t('services.reorderDone') : $t('services.reorder')"
            @click="reorderEnabled = !reorderEnabled"
          >
            <ion-icon slot="icon-only" :icon="reorderEnabled ? checkmark : swapVertical" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-header collapse="condense">
        <ion-toolbar>
          <ion-title size="large">{{ $t('services.title') }}</ion-title>
        </ion-toolbar>
      </ion-header>

      <div v-if="isPending" class="flex justify-center py-10">
        <ion-spinner />
      </div>

      <template v-else>
        <!-- Category filter — horizontally scrollable so many categories fit. -->
        <ion-segment
          v-if="categoryChips.length > 1"
          v-model="activeCategory"
          scrollable
          class="se-category-filter"
        >
          <ion-segment-button v-for="chip in categoryChips" :key="chip.id" :value="chip.id">
            <ion-label>{{ chip.label }} ({{ chip.count }})</ion-label>
          </ion-segment-button>
        </ion-segment>

        <div v-if="!filteredServices.length" class="px-6 py-16 text-center">
          <p class="text-lg font-semibold">{{ $t('services.emptyTitle') }}</p>
          <p class="mt-1 text-sm text-gray-500">{{ $t('services.emptyDescription') }}</p>
        </div>

        <ion-list v-else>
          <ion-reorder-group :disabled="!reorderEnabled" @ion-item-reorder="handleReorder">
            <ion-item-sliding v-for="service in displayList" :key="service.id">
              <ion-item
                button
                :detail="!reorderEnabled"
                :class="{ 'se-inactive': !service.is_active }"
                @click="openEdit(service)"
              >
                <span
                  slot="start"
                  class="se-color-dot"
                  :style="{ backgroundColor: service.color }"
                />
                <ion-label>
                  <p class="se-category">{{ categoryName(service) }}</p>
                  <h2>{{ service.name }}</h2>
                  <p>{{ f.duration(service.duration) }} · {{ f.price(service.price) }}</p>
                </ion-label>
                <ion-reorder slot="end" />
              </ion-item>
              <ion-item-options side="end">
                <ion-item-option
                  color="danger"
                  :aria-label="$t('services.deleteAction')"
                  @click="onSwipeDelete(service, $event)"
                >
                  <ion-icon slot="icon-only" :icon="trash" />
                </ion-item-option>
              </ion-item-options>
            </ion-item-sliding>
          </ion-reorder-group>
        </ion-list>
      </template>

      <!-- Primary add action, bottom-right per Material/iOS FAB pattern. -->
      <ion-fab slot="fixed" vertical="bottom" horizontal="end">
        <ion-fab-button :aria-label="$t('services.addService')" @click="openCreate">
          <ion-icon :icon="add" />
        </ion-fab-button>
      </ion-fab>

      <service-form-mobile
        v-model:is-open="isFormOpen"
        :mode="formMode"
        :service="editing"
        :presenting-element="presentingElement"
        @delete="confirmDelete"
      />
    </ion-content>
  </ion-page>
</template>

<style scoped>
.se-color-dot {
  width: 6px;
  align-self: stretch;
  margin-block: 12px;
  margin-inline-end: 12px;
  border-radius: 9999px;
  flex-shrink: 0;
}

.se-category {
  font-size: 0.7rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--ion-color-medium);
}

.se-inactive {
  opacity: 0.55;
}

.se-category-filter {
  padding-inline: 12px;
  margin-block: 8px;
}
</style>
