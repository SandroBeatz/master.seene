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
import {
  add,
  arrowBackOutline,
  checkmark,
  createOutline,
  informationCircleOutline,
  swapVertical,
  trashOutline,
} from 'ionicons/icons'
import { useServicesQuery, useDeleteServiceMutation, type Service } from '@entities/service'
import { useServiceCategoriesQuery } from '@entities/service-category'
import { ServiceFormMobile } from '@features/service-form/index.mobile'
import { useSessionStore } from '@entities/session'
import { useFormats } from '@shared/lib/formats'
import { InsetList } from '@shared/ui/inset-list/index.mobile'

const { t } = useI18n()
const sessionStore = useSessionStore()
const userId = computed(() => sessionStore.session?.user.id ?? '')
const formats = useFormats()

const { data: services, isPending } = useServicesQuery(userId)
const { data: categories } = useServiceCategoriesQuery(userId)
const deleteMutation = useDeleteServiceMutation(userId)

const activeCategory = ref<string>('all')
const categoryChips = computed(() => {
  const list = services.value ?? []
  return [
    { id: 'all', label: t('services.filterAll'), count: list.length },
    ...(categories.value ?? []).map((category) => ({
      id: category.id,
      label: category.name,
      count: list.filter((service) => service.category_id === category.id).length,
    })),
  ]
})

watch(categoryChips, (chips) => {
  if (!chips.some((chip) => chip.id === activeCategory.value)) activeCategory.value = 'all'
})

const filteredServices = computed(() => {
  const list = services.value ?? []
  const scoped =
    activeCategory.value === 'all'
      ? list
      : list.filter((service) => service.category_id === activeCategory.value)

  return [...scoped].sort((a, b) => {
    if (a.is_active !== b.is_active) return a.is_active ? -1 : 1
    return a.created_at.localeCompare(b.created_at)
  })
})

const reorderEnabled = ref(false)
const displayList = ref<Service[]>([])
watch(
  filteredServices,
  (list) => {
    displayList.value = [...list]
  },
  { immediate: true },
)

function handleReorder(event: CustomEvent<ItemReorderEventDetail>) {
  displayList.value = event.detail.complete([...displayList.value])
}

const isFormOpen = ref(false)
const formMode = ref<'create' | 'edit'>('create')
const editing = ref<Service | null>(null)
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
  if (reorderEnabled.value) return
  formMode.value = 'edit'
  editing.value = service
  isFormOpen.value = true
}

async function showToast(message: string, color: 'success' | 'danger') {
  const toast = await toastController.create({ message, duration: 2000, color, position: 'top' })
  await toast.present()
}

async function deleteService(service: Service): Promise<boolean> {
  try {
    await deleteMutation.mutateAsync(service.id)
    await showToast(t('services.deleteSuccess'), 'success')
    return true
  } catch {
    await showToast(t('services.deleteError'), 'danger')
    return false
  }
}

async function confirmDelete(service: Service): Promise<boolean> {
  const alert = await alertController.create({
    header: t('services.deleteConfirmTitle'),
    message: t('services.deleteConfirmBody', { name: service.name }),
    buttons: [
      { text: t('services.form.cancel'), role: 'cancel' },
      { text: t('services.deleteAction'), role: 'destructive' },
    ],
  })
  await alert.present()
  if ((await alert.onDidDismiss()).role !== 'destructive') return false
  return deleteService(service)
}

async function onSwipeDelete(service: Service, event: Event) {
  const sliding = (event.currentTarget as HTMLElement | null)?.closest('ion-item-sliding') as
    | (HTMLElement & { close: () => Promise<void> })
    | null
  await confirmDelete(service)
  await sliding?.close()
}

async function onSwipeEdit(service: Service, event: Event) {
  const sliding = (event.currentTarget as HTMLElement | null)?.closest('ion-item-sliding') as
    | (HTMLElement & { close: () => Promise<void> })
    | null
  await sliding?.close()
  openEdit(service)
}

function categoryName(service: Service): string {
  return service.category?.name ?? t('services.form.allServices')
}
</script>

<template>
  <ion-page>
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button
            default-href="/tabs/settings"
            text=""
            :icon="arrowBackOutline"
            color="dark"
          />
        </ion-buttons>
        <ion-title>{{ $t('services.title') }}</ion-title>
        <ion-buttons slot="end">
          <ion-button
            class="reorder-button"
            fill="solid"
            color="light"
            shape="round"
            :aria-label="reorderEnabled ? $t('services.reorderDone') : $t('services.reorder')"
            @click="reorderEnabled = !reorderEnabled"
          >
            <ion-icon
              slot="icon-only"
              :icon="reorderEnabled ? checkmark : swapVertical"
              aria-hidden="true"
            />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="services-content ion-padding-vertical">
      <inset-list>
        <ion-item lines="none" class="hint-item">
          <ion-icon
            slot="start"
            :icon="informationCircleOutline"
            color="primary"
            aria-hidden="true"
          />
          <ion-label class="ion-text-wrap hint-text">{{ $t('services.mobileInfo') }}</ion-label>
        </ion-item>
      </inset-list>

      <div v-if="categoryChips.length > 1" class="category-filter-shell">
        <ion-segment
          v-model="activeCategory"
          class="category-filter"
          scrollable
          :aria-label="$t('services.filterLabel')"
        >
          <ion-segment-button v-for="chip in categoryChips" :key="chip.id" :value="chip.id">
            <ion-label class="segment-label">
              <span>{{ chip.label }}</span>
              <span class="segment-count">{{ chip.count }}</span>
            </ion-label>
          </ion-segment-button>
        </ion-segment>
      </div>

      <div v-if="isPending" class="loading-state" aria-live="polite">
        <ion-spinner name="crescent" />
      </div>

      <div v-else-if="!filteredServices.length" class="empty-state">
        <h2>{{ $t('services.emptyTitle') }}</h2>
        <p>{{ $t('services.emptyDescription') }}</p>
      </div>

      <inset-list v-else>
        <ion-reorder-group :disabled="!reorderEnabled" @ion-item-reorder="handleReorder">
          <ion-item-sliding v-for="service in displayList" :key="service.id">
            <ion-item
              class="service-item"
              :button="!reorderEnabled"
              :detail="!reorderEnabled"
              :class="{ 'service-item--inactive': !service.is_active }"
              @click="openEdit(service)"
            >
              <span
                slot="start"
                class="service-color"
                :style="{ backgroundColor: service.color }"
                aria-hidden="true"
              />
              <ion-label class="service-copy">
                <p class="service-category">{{ categoryName(service) }}</p>
                <h2>{{ service.name }}</h2>
                <p class="service-meta">
                  {{ formats.duration(service.duration) }} · {{ formats.price(service.price) }}
                </p>
              </ion-label>
              <ion-reorder slot="end" />
            </ion-item>
            <ion-item-options v-if="!reorderEnabled" side="end">
              <ion-item-option
                color="medium"
                :aria-label="$t('services.form.editTitleMobile')"
                @click="onSwipeEdit(service, $event)"
              >
                <ion-icon slot="icon-only" :icon="createOutline" aria-hidden="true" />
              </ion-item-option>
              <ion-item-option
                color="danger"
                :aria-label="$t('services.deleteAction')"
                @click="onSwipeDelete(service, $event)"
              >
                <ion-icon slot="icon-only" :icon="trashOutline" aria-hidden="true" />
              </ion-item-option>
            </ion-item-options>
          </ion-item-sliding>
        </ion-reorder-group>
      </inset-list>

      <ion-fab v-if="!isPending" slot="fixed" vertical="bottom" horizontal="end">
        <ion-fab-button :aria-label="$t('services.addService')" @click="openCreate">
          <ion-icon :icon="add" aria-hidden="true" />
        </ion-fab-button>
      </ion-fab>

      <service-form-mobile
        v-model:is-open="isFormOpen"
        :mode="formMode"
        :service="editing"
        :presenting-element="presentingElement"
      />
    </ion-content>
  </ion-page>
</template>

<style scoped>
ion-header ion-toolbar.ios {
  --padding-start: 16px;
  --padding-end: 16px;
}

ion-header ion-toolbar {
  --background: var(--se-surface-page, #f2f2f7);
}

.reorder-button {
  width: 40px;
  height: 40px;
  margin: 0;
  --padding-start: 0;
  --padding-end: 0;
  --border-radius: 50%;
  --box-shadow: 0 1px 4px rgb(0 0 0 / 10%);
}

.services-content {
  --padding-bottom: 84px;
}

.hint-item {
  --padding-top: 7px;
  --padding-bottom: 7px;
}

.hint-item ion-icon[slot='start'] {
  color: var(--ion-color-primary);
  font-size: 22px;
}

.hint-text {
  margin: 0;
  color: var(--ion-color-medium);
  font-size: 0.8rem;
  line-height: 1.4;
}

.category-filter-shell {
  margin: -6px 0 20px;
  padding-inline: 16px;
}

.category-filter {
  width: 100%;
  scrollbar-width: none;
}

.category-filter::-webkit-scrollbar {
  display: none;
}

.category-filter ion-segment-button {
  flex: 0 0 auto;
  min-width: auto;
  min-height: 36px;
  --padding-start: 16px;
  --padding-end: 16px;
  font-size: 0.82rem;
}

.segment-label {
  display: flex;
  align-items: center;
  gap: 7px;
}

.segment-count {
  font-size: 0.7rem;
  font-weight: 700;
  opacity: 0.7;
}

.loading-state {
  display: flex;
  justify-content: center;
  padding: 28px 16px;
}

.empty-state {
  padding: 44px 32px;
  text-align: center;
}

.empty-state h2,
.empty-state p {
  margin: 0;
}

.empty-state h2 {
  font-size: 1.05rem;
  font-weight: 600;
}

.empty-state p {
  margin-top: 5px;
  color: var(--ion-color-medium);
  font-size: 0.85rem;
  line-height: 1.4;
}

ion-item-sliding {
  background: var(--se-surface-card, #fff);
}

ion-item-sliding:not(:last-child) {
  border-bottom: 1px solid var(--se-separator, rgb(0 0 0 / 11%));
}

.service-item {
  --min-height: 70px;
  --padding-top: 7px;
  --padding-bottom: 7px;
  --background: var(--se-surface-card, #fff) !important;
  --border-width: 0;
  --inner-border-width: 0;
}

.service-item--inactive {
  opacity: 0.5;
}

.service-color {
  width: 12px;
  height: 12px;
  margin-inline-end: 14px;
  border-radius: 50%;
  flex-shrink: 0;
}

.service-copy {
  min-width: 0;
}

.service-category,
.service-copy h2,
.service-meta {
  overflow: hidden;
  margin: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.service-category {
  color: var(--ion-color-medium);
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.035em;
  text-transform: uppercase;
}

.service-copy h2 {
  margin-top: 2px;
  font-size: 0.96rem;
  font-weight: 600;
}

.service-meta {
  margin-top: 3px;
  color: var(--ion-color-medium);
  font-size: 0.78rem;
}

ion-fab {
  margin-inline-end: 8px;
  margin-bottom: 8px;
}
</style>
