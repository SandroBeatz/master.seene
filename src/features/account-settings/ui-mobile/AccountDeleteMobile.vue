<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonTitle,
  IonContent,
  IonFooter,
  IonItem,
  IonInput,
  IonLabel,
  IonNote,
  IonIcon,
  IonSpinner,
  alertController,
  isPlatform,
  toastController,
} from '@ionic/vue'
import { alertCircleOutline, closeOutline, trashOutline } from 'ionicons/icons'
import { useSessionStore } from '@entities/session'
import { supabase } from '@shared/lib/supabase'
import { InsetList } from '@shared/ui/inset-list/index.mobile'

defineProps<{
  presentingElement?: HTMLElement | null
}>()

const { t } = useI18n()
const router = useRouter()
const sessionStore = useSessionStore()

const username = computed(() => sessionStore.profile?.username ?? '')
const isOpen = ref(false)
const step = ref<1 | 2>(1)
const typedUsername = ref('')
const submitted = ref(false)
const isLoading = ref(false)
const allowDismiss = ref(false)
const spinnerName = isPlatform('ios') ? 'dots' : 'crescent'

const usernameMatches = computed(
  () => typedUsername.value.trim() === username.value && username.value.length > 0,
)
const isDirty = computed(() => typedUsername.value.length > 0 || step.value === 2)

function open() {
  step.value = 1
  typedUsername.value = ''
  submitted.value = false
  allowDismiss.value = false
  isOpen.value = true
}

async function confirmDiscard(): Promise<boolean> {
  const alert = await alertController.create({
    header: t('common.unsavedChanges'),
    message: t('common.unsavedChangesConfirm'),
    buttons: [
      { text: t('common.cancel'), role: 'cancel' },
      { text: t('common.discard'), role: 'destructive' },
    ],
  })
  await alert.present()
  return (await alert.onDidDismiss()).role === 'destructive'
}

function canDismiss(): boolean | Promise<boolean> {
  if (isLoading.value) return false
  if (allowDismiss.value || !isDirty.value) return true
  return confirmDiscard()
}

async function close() {
  if (isLoading.value) return
  if (isDirty.value && !(await confirmDiscard())) return
  allowDismiss.value = true
  isOpen.value = false
}

function continueDelete() {
  submitted.value = true
  if (usernameMatches.value) step.value = 2
}

async function onConfirmDelete() {
  const userId = sessionStore.session?.user.id
  if (!userId || isLoading.value) return

  isLoading.value = true
  try {
    const { error } = await supabase
      .from('master_profile')
      .update({ deactivated_at: new Date().toISOString() })
      .eq('user_id', userId)

    if (error) {
      const toast = await toastController.create({
        message: `${t('settings.account.delete.errorToast')}: ${error.message}`,
        duration: 2500,
        color: 'danger',
        position: 'top',
      })
      await toast.present()
      return
    }

    await supabase.auth.signOut()
    allowDismiss.value = true
    isOpen.value = false
    const toast = await toastController.create({
      message: t('settings.account.delete.deactivatedToast'),
      duration: 3000,
      color: 'warning',
      position: 'top',
    })
    await toast.present()
    await router.replace('/login')
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <inset-list :header="$t('settings.account.dangerZoneLabel')">
    <ion-item lines="none" class="danger-item">
      <div class="danger-card">
        <h2>{{ $t('settings.account.delete.sectionTitle') }}</h2>
        <p>{{ $t('settings.account.delete.sectionDescription') }}</p>
        <ion-button expand="block" color="danger" @click="open">
          <ion-icon slot="start" :icon="trashOutline" aria-hidden="true" />
          {{ $t('settings.account.delete.button') }}
        </ion-button>
      </div>
    </ion-item>
  </inset-list>

  <ion-modal
    :is-open="isOpen"
    :presenting-element="presentingElement ?? undefined"
    :can-dismiss="canDismiss"
    @did-dismiss="isOpen = false"
  >
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button
            fill="clear"
            color="dark"
            :disabled="isLoading"
            :aria-label="$t('common.close')"
            @click="close"
          >
            <ion-icon slot="icon-only" :icon="closeOutline" aria-hidden="true" />
          </ion-button>
        </ion-buttons>
        <ion-title>
          {{
            step === 1
              ? $t('settings.account.delete.step1Title')
              : $t('settings.account.delete.step2Title')
          }}
        </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="ion-padding-vertical">
      <template v-if="step === 1">
        <p class="modal-description">
          {{ $t('settings.account.delete.step1Description', { username }) }}
        </p>
        <inset-list>
          <ion-item
            lines="none"
            :class="{ 'ion-invalid': submitted && !usernameMatches, 'ion-touched': submitted }"
          >
            <ion-label position="stacked">{{
              $t('settings.account.delete.usernameLabel')
            }}</ion-label>
            <ion-input
              v-model="typedUsername"
              autocomplete="off"
              autocapitalize="off"
              :placeholder="$t('settings.account.delete.usernamePlaceholder')"
              enterkeyhint="done"
              @keyup.enter="continueDelete"
            />
          </ion-item>
        </inset-list>
        <ion-note v-if="submitted && !usernameMatches" color="danger" class="field-error">
          {{ $t('settings.account.delete.usernameMismatch') }}
        </ion-note>
      </template>

      <div v-else class="final-warning">
        <ion-icon :icon="alertCircleOutline" color="danger" aria-hidden="true" />
        <p>{{ $t('settings.account.delete.step2Description') }}</p>
      </div>
    </ion-content>

    <ion-footer class="ion-no-border">
      <ion-toolbar>
        <ion-button
          v-if="step === 1"
          class="submit-button"
          expand="block"
          color="danger"
          :disabled="!usernameMatches"
          @click="continueDelete"
        >
          {{ $t('settings.account.delete.continueButton') }}
        </ion-button>
        <ion-button
          v-else
          class="submit-button"
          expand="block"
          color="danger"
          :disabled="isLoading"
          @click="onConfirmDelete"
        >
          <span :class="{ 'loading-label': isLoading }">
            {{ $t('settings.account.delete.finalConfirmButton') }}
          </span>
          <ion-spinner v-if="isLoading" class="button-spinner" :name="spinnerName" />
        </ion-button>
      </ion-toolbar>
    </ion-footer>
  </ion-modal>
</template>

<style scoped>
.danger-item {
  --padding-start: 0;
  --inner-padding-end: 0;
}

.danger-card {
  width: 100%;
  padding: 18px;
  border: 1px solid color-mix(in srgb, var(--ion-color-danger) 55%, transparent);
  border-radius: 12px;
}

.danger-card h2,
.danger-card p {
  margin: 0;
}

.danger-card h2 {
  color: var(--ion-color-danger);
  font-size: 1rem;
  font-weight: 700;
}

.danger-card p {
  margin-top: 7px;
  color: var(--ion-color-medium);
  font-size: 0.85rem;
  line-height: 1.45;
}

.danger-card ion-button {
  min-height: 46px;
  margin: 16px 0 0;
  --border-radius: 12px;
}

ion-header ion-toolbar {
  --background: var(--se-surface-page, #f2f2f7);
}

.modal-description {
  margin: 0 32px 18px;
  color: var(--ion-color-medium);
  font-size: 0.88rem;
  line-height: 1.45;
}

ion-content ion-item {
  --padding-top: 8px;
  --padding-bottom: 8px;
}

ion-content ion-label {
  margin-bottom: 6px;
  color: var(--ion-color-medium);
  font-size: 0.78rem;
}

.field-error {
  display: block;
  padding: 8px 32px 0;
  font-size: 0.75rem;
}

.final-warning {
  display: flex;
  gap: 12px;
  margin: 8px 16px;
  padding: 18px;
  border: 1px solid color-mix(in srgb, var(--ion-color-danger) 45%, transparent);
  border-radius: 14px;
  background: color-mix(in srgb, var(--ion-color-danger) 7%, transparent);
}

.final-warning ion-icon {
  flex: 0 0 auto;
  font-size: 24px;
}

.final-warning p {
  margin: 0;
  color: var(--ion-color-medium);
  font-size: 0.9rem;
  line-height: 1.45;
}

ion-footer ion-toolbar {
  --padding-top: 16px;
  --padding-bottom: 16px;
  --padding-start: 16px;
  --padding-end: 16px;
}

.submit-button {
  position: relative;
  min-height: 48px;
  margin: 0;
  --border-radius: 12px;
}

.loading-label {
  opacity: 0;
}

.button-spinner {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
</style>
