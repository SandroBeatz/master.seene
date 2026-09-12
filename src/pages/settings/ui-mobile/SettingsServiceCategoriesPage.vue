<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  IonLabel,
  IonIcon,
  IonSpinner,
  IonFab,
  IonFabButton,
  alertController,
  toastController,
} from '@ionic/vue'
import { add, createOutline, pricetagOutline, trash } from 'ionicons/icons'
import {
  useDeleteServiceCategoryMutation,
  useServiceCategoriesQuery,
  type ServiceCategory,
} from '@entities/service-category'
import { useSessionStore } from '@entities/session'
import { ServiceCategoryFormMobile } from '@features/service-category-form/index.mobile'

const { t } = useI18n()
const sessionStore = useSessionStore()
const userId = computed(() => sessionStore.session?.user.id ?? '')

const { data: categories, isPending } = useServiceCategoriesQuery(userId)
const deleteMutation = useDeleteServiceCategoryMutation(userId)
const list = computed(() => categories.value ?? [])

const isFormOpen = ref(false)
const formMode = ref<'create' | 'edit'>('create')
const editing = ref<ServiceCategory | null>(null)
const presentingElement = ref<HTMLElement | null>(null)

onMounted(() => {
  presentingElement.value = document.querySelector('ion-router-outlet')
})

function openCreate() {
  formMode.value = 'create'
  editing.value = null
  isFormOpen.value = true
}

function openEdit(category: ServiceCategory) {
  formMode.value = 'edit'
  editing.value = category
  isFormOpen.value = true
}

async function showToast(message: string, color: 'success' | 'danger') {
  const toast = await toastController.create({ message, duration: 2000, color, position: 'top' })
  await toast.present()
}

async function deleteCategory(category: ServiceCategory) {
  try {
    await deleteMutation.mutateAsync(category.id)
    await showToast(t('settings.serviceCategories.deleteSuccess'), 'success')
  } catch {
    await showToast(t('settings.serviceCategories.deleteError'), 'danger')
  }
}

async function confirmDelete(category: ServiceCategory) {
  const alert = await alertController.create({
    header: t('settings.serviceCategories.deleteConfirmTitle'),
    message: t('settings.serviceCategories.deleteConfirmBody', { name: category.name }),
    buttons: [
      { text: t('settings.serviceCategories.form.cancel'), role: 'cancel' },
      {
        text: t('settings.serviceCategories.deleteAction'),
        role: 'destructive',
        handler: () => {
          void deleteCategory(category)
        },
      },
    ],
  })
  await alert.present()
  await alert.onDidDismiss()
}

async function onSwipeEdit(category: ServiceCategory, event: Event) {
  const sliding = (event.currentTarget as HTMLElement | null)?.closest('ion-item-sliding') as
    | (HTMLElement & { close: () => Promise<void> })
    | null
  await sliding?.close()
  openEdit(category)
}

async function onSwipeDelete(category: ServiceCategory, event: Event) {
  const sliding = (event.currentTarget as HTMLElement | null)?.closest('ion-item-sliding') as
    | (HTMLElement & { close: () => Promise<void> })
    | null
  await confirmDelete(category)
  await sliding?.close()
}
</script>

<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/settings" />
        </ion-buttons>
        <ion-title>{{ $t('settings.serviceCategories.title') }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-header collapse="condense">
        <ion-toolbar>
          <ion-title size="large">{{ $t('settings.serviceCategories.title') }}</ion-title>
        </ion-toolbar>
      </ion-header>

      <div v-if="isPending" class="flex justify-center py-10">
        <ion-spinner />
      </div>

      <div v-else-if="list.length === 0" class="se-empty-state">
        <span class="se-empty-icon">
          <ion-icon :icon="pricetagOutline" aria-hidden="true" />
        </span>
        <p>{{ $t('settings.serviceCategories.empty') }}</p>
      </div>

      <ion-list v-else inset>
        <ion-item-sliding v-for="category in list" :key="category.id">
          <ion-item button detail @click="openEdit(category)">
            <span slot="start" class="se-category-tile">
              <ion-icon :icon="pricetagOutline" aria-hidden="true" />
            </span>
            <ion-label>
              <h2>{{ category.name }}</h2>
            </ion-label>
          </ion-item>

          <ion-item-options side="end">
            <ion-item-option
              color="medium"
              :aria-label="$t('common.edit')"
              @click="onSwipeEdit(category, $event)"
            >
              <ion-icon slot="icon-only" :icon="createOutline" />
            </ion-item-option>
            <ion-item-option
              color="danger"
              :aria-label="$t('settings.serviceCategories.deleteAction')"
              @click="onSwipeDelete(category, $event)"
            >
              <ion-icon slot="icon-only" :icon="trash" />
            </ion-item-option>
          </ion-item-options>
        </ion-item-sliding>
      </ion-list>

      <ion-fab v-if="!isPending" slot="fixed" vertical="bottom" horizontal="end">
        <ion-fab-button
          :aria-label="$t('settings.serviceCategories.addButton')"
          @click="openCreate"
        >
          <ion-icon :icon="add" />
        </ion-fab-button>
      </ion-fab>

      <service-category-form-mobile
        v-model:is-open="isFormOpen"
        :mode="formMode"
        :category="editing"
        :presenting-element="presentingElement"
      />
    </ion-content>
  </ion-page>
</template>

<style scoped>
.se-category-tile,
.se-empty-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ion-color-primary);
  background: color-mix(in srgb, var(--ion-color-primary) 12%, transparent);
}

.se-category-tile {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  margin-inline-end: 12px;
  border-radius: 12px;
  font-size: 20px;
}

.se-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 320px;
  padding: 56px 24px;
  margin: 0 auto;
  color: var(--ion-color-medium);
  text-align: center;
}

.se-empty-icon {
  width: 56px;
  height: 56px;
  margin-bottom: 14px;
  border-radius: 18px;
  font-size: 28px;
}

.se-empty-state p {
  margin: 0;
  line-height: 1.45;
}
</style>
