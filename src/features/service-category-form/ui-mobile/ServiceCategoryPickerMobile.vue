<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonList,
  IonItem,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  IonLabel,
  IonIcon,
  IonFab,
  IonFabButton,
  alertController,
  toastController,
} from '@ionic/vue'
import { add, checkmark, createOutline, trash } from 'ionicons/icons'
import {
  useServiceCategoriesQuery,
  useDeleteServiceCategoryMutation,
  type ServiceCategory,
} from '@entities/service-category'
import { useSessionStore } from '@entities/session'
import ServiceCategoryFormMobile from './ServiceCategoryFormMobile.vue'

const props = defineProps<{
  isOpen: boolean
  // Currently selected category id (null = no category / "all services").
  selectedId: string | null
  // Parent modal element — lets this modal stack as an iOS card on top of it.
  presentingElement?: HTMLElement | null
}>()

const emit = defineEmits<{
  'update:isOpen': [boolean]
  select: [id: string | null]
}>()

const { t } = useI18n()
const sessionStore = useSessionStore()
const userId = computed(() => sessionStore.session?.user.id ?? '')

const { data: categories } = useServiceCategoriesQuery(userId)
const deleteMutation = useDeleteServiceCategoryMutation(userId)

// Nested create/edit form.
const isFormOpen = ref(false)
const formMode = ref<'create' | 'edit'>('create')
const editing = ref<ServiceCategory | null>(null)

// Present the nested create/edit form off this modal's own element so it stacks
// as a further iOS card (see Ionic "card modal" docs).
const selfModal = ref<{ $el: HTMLElement } | null>(null)
const selfModalEl = computed(() => selfModal.value?.$el ?? null)

function close() {
  emit('update:isOpen', false)
}

// Picking a category (or "none") reports the choice and dismisses the picker.
function pick(id: string | null) {
  emit('select', id)
  close()
}

function openCreate() {
  formMode.value = 'create'
  editing.value = null
  isFormOpen.value = true
}

function openEdit(category: ServiceCategory, ev?: Event) {
  ev?.stopPropagation()
  formMode.value = 'edit'
  editing.value = category
  isFormOpen.value = true
}

// A freshly created category is auto-selected; an edit just refreshes the list.
function onFormSaved(category: ServiceCategory) {
  if (formMode.value === 'create') pick(category.id)
}

async function showToast(message: string, color: 'success' | 'danger') {
  const toast = await toastController.create({ message, duration: 2000, color, position: 'top' })
  await toast.present()
}

async function deleteCategory(category: ServiceCategory) {
  try {
    await deleteMutation.mutateAsync(category.id)
    // Clearing the current selection keeps the service consistent if its
    // category was just removed.
    if (props.selectedId === category.id) emit('select', null)
    await showToast(t('settings.serviceCategories.deleteSuccess'), 'success')
  } catch {
    await showToast(t('settings.serviceCategories.deleteError'), 'danger')
  }
}

async function onSwipeDelete(category: ServiceCategory, ev: Event) {
  const sliding = (ev.currentTarget as HTMLElement | null)?.closest('ion-item-sliding') as
    | (HTMLElement & { close: () => Promise<void> })
    | null
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
  await sliding?.close()
}
</script>

<template>
  <ion-modal
    ref="selfModal"
    :is-open="isOpen"
    :presenting-element="presentingElement ?? undefined"
    @did-dismiss="close"
  >
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button @click="close">{{ $t('services.form.cancel') }}</ion-button>
        </ion-buttons>
        <ion-title>{{ $t('settings.serviceCategories.title') }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding-vertical">
      <ion-list inset>
        <!-- "No category" option. -->
        <ion-item button :detail="false" @click="pick(null)">
          <ion-label>{{ $t('services.form.allServices') }}</ion-label>
          <ion-icon v-if="selectedId === null" slot="end" :icon="checkmark" color="primary" />
        </ion-item>
      </ion-list>

      <ion-list v-if="categories?.length" inset>
        <ion-item-sliding v-for="category in categories" :key="category.id">
          <ion-item button :detail="false" @click="pick(category.id)">
            <ion-label>{{ category.name }}</ion-label>
            <ion-icon
              v-if="selectedId === category.id"
              slot="end"
              :icon="checkmark"
              color="primary"
            />
          </ion-item>
          <ion-item-options side="end">
            <ion-item-option
              color="medium"
              :aria-label="$t('settings.serviceCategories.form.titleEdit')"
              @click="openEdit(category, $event)"
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

      <p v-else class="px-6 py-10 text-center text-sm text-gray-500">
        {{ $t('settings.serviceCategories.empty') }}
      </p>

      <ion-fab slot="fixed" vertical="bottom" horizontal="end">
        <ion-fab-button :aria-label="$t('settings.serviceCategories.addButton')" @click="openCreate">
          <ion-icon :icon="add" />
        </ion-fab-button>
      </ion-fab>

      <service-category-form-mobile
        v-model:is-open="isFormOpen"
        :mode="formMode"
        :category="editing"
        :presenting-element="selfModalEl"
        @saved="onFormSaved"
      />
    </ion-content>
  </ion-modal>
</template>
